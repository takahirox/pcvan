import type { LocalRepository } from '../storage/repository';
import type { Backup, AiActivity } from '../storage/schema';
import { oltEnabled, OLT_ATTEMPT_LIMIT, oltState } from '../olt-state';
import { residentProfiles, personaMemberId } from './personas';
import { buildOltPrompt, OltOutputRejected } from './olt';
import type { createAiControls } from './controls';

/** The browser's one world driver. Attendance/decisions advance while generation
 * is busy; no terminal, visitor or navigation state participates in selection. */
export class ResidentWorld {
  private stepping = false;
  private generating = false;
  private roomTurns = 0;
  private nextStep = 0;
  private task = new AbortController();
  constructor(private readonly actions: {
    repository(): Promise<LocalRepository>;
    read(): Promise<Backup>;
    publish(): Promise<void>;
    ai: ReturnType<typeof createAiControls>;
  }) {}
  suspend() { this.nextStep = 0; this.task.abort(); this.task = new AbortController(); }
  async tick() {
    if (this.stepping || document.visibilityState !== 'visible') return;
    this.stepping = true;
    try {
      const repo = await this.actions.repository();
      if (Date.now() >= this.nextStep) {
        const at = Date.now(); this.nextStep = at + 15_000;
        await repo.advanceWorld(new Date(at).toISOString());
      }
      const content = await this.actions.read();
      const planned = content.settings.find((r) => r.id === 'ai-activity')?.value as unknown as AiActivity | undefined;
      this.actions.ai.refresh(content);
      await this.actions.publish();
      if (planned && !this.generating && !this.actions.ai.busy && document.visibilityState === 'visible') {
        this.generating = true;
        // A model call must never block the next world step or terminal input.
        void this.generate(repo, content, planned).finally(() => { this.generating = false; });
      }
    } finally { this.stepping = false; }
  }
  private async generate(repo: LocalRepository, content: Backup, planned: AiActivity) {
    const ai = this.actions.ai, signal = this.task.signal;
    try {
      if (signal.aborted) return;
      if (!oltEnabled(content)) { ai.olt.idle('モデル未同意・活動休止'); return; }
      const rooms = oltState(content);
      // Earliest ready decision wins across rooms, regardless of human attendance.
      const ready = rooms.rooms.filter((r) => !r.pending || Date.parse(r.pending.until) <= Date.now()).flatMap((r) => (r.decisions ?? []).filter((d) => Date.parse(d.readyAt) <= Date.now())
        .map((d) => ({ room: r, decision: d })))
        .sort((a, b) => a.decision.readyAt.localeCompare(b.decision.readyAt));
      if (rooms.attempts >= OLT_ATTEMPT_LIMIT && Date.now() - Date.parse(rooms.windowAt) < 3_600_000) {
        ai.olt.idle('時間枠の上限'); await ai.tick(planned); return;
      }
      const background = planned.batch?.runs.some((r) => ['pending', 'running'].includes(r.status));
      // At most two OLT turns before giving forum/mail one worker opportunity.
      if (background && (this.roomTurns >= 2 || !ready.length)) {
        this.roomTurns = 0; await ai.tick(planned); return;
      }
      const selected = ready[0];
      if (!selected) {
        const suitable = residentProfiles(content).some((p) => p.frequency > 0 && p.inactivity < 1 && (p.reply > 0 || p.newThread > 0) &&
          rooms.rooms.some((r) => r.residents.some((v) => v.memberId === personaMemberId(p.id))));
        ai.olt.idle(!suitable ? '適任の在室住人なし' : rooms.rooms.some((r) => r.decisions?.length) ? '住人の応答待ち' : '意図的な静けさ');
        return;
      }
      const source = selected.room.lines.find((l) => l.number === selected.decision.targetNumber);
      ai.olt.prepare(source?.id ?? `${selected.room.id}:${selected.decision.authorId}`, source && Date.parse(source.createdAt));
      ai.olt.idle('応答待ち');
      ai.olt.stage('住人の判断');
      await ai.runRoom(async (engine, workerSignal) => {
        let turn = await repo.claimRoomTurn(selected.room.id, undefined, (reason) => ai.olt.stage(reason));
        if (!turn) return;
        this.roomTurns++;
        const token = turn.id;
        let rejectionReason: string | undefined;
        let outcome: 'interrupted' | 'rejected' = 'interrupted';
        try {
          for (let attempt = turn.retry ?? 0; attempt < 2; attempt++) {
            workerSignal.throwIfAborted();
            const snapshot = await this.actions.read();
            const room = oltState(snapshot).rooms.find((r) => r.id === selected.room.id)!;
            ai.olt.stage(attempt ? '再生成開始' : '生成開始');
            const raw = await engine.generate(buildOltPrompt(snapshot, room, turn, rejectionReason), workerSignal);
            ai.olt.stage(attempt ? '再生成終了' : '生成終了');
            workerSignal.throwIfAborted();
            try {
              const committed = await repo.finishRoomTurn(room.id, token, raw, workerSignal);
              ai.olt.stage(committed ? '応答保存' : '期限・在室・設定変更で破棄');
              if (committed) await this.actions.publish();
              break;
            } catch (error) {
              if (!(error instanceof OltOutputRejected)) throw error;
              ai.olt.stage(`不正な応答を拒否（${error.message}）`);
              rejectionReason = error.message;
              if (attempt) { outcome = 'rejected'; break; }
              const retry = await repo.retryRoomTurn(room.id, token, workerSignal);
              if (!retry) { outcome = 'rejected'; break; }
              turn = retry;
            }
          }
        } finally { await repo.finishRoomTurn(selected.room.id, token, undefined, undefined, undefined, outcome).catch(() => {}); }
      }, signal);
    } catch { ai.olt.stage('生成・保存失敗'); }
  }
}
