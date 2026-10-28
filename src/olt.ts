import { profileArgument, renderResidentProfile } from './resident-profile';
import { calendarSetting, serviceDate } from './calendar';
import type { Backup, JsonValue } from './storage/schema';
import type { LocalRepository } from './storage/repository';
import { activeHuman } from './forums';
import { identityToken, penName } from './member-presentation';
import { OLT_SETTING, attendance, oltState, roomDefinitions, contextRooms } from './olt-state';
import type { OltContext, OltLine, OltRoom, OltState, RoomId } from './olt-state';
import { buildOltPrompt, OltOutputRejected } from './ai/olt';
import { residentProfiles, personaMemberId } from './ai/personas';
import type { createAiControls } from './ai/controls';

export const roomHelp = '/PROFILE 宛先ID・表示ID・ハンドル: 公開プロフィール / /WHO: 参加者 / /LIST: 最近の会話 / /JOIN 番号: 移動 / /LEAVE・/BACK: 退出 / /MAIN: MAIN / /HELP: 案内';
export function renderOltDirectory(content: Pick<Backup, 'settings'>, context: OltContext): string[] {
  const state = oltState(content);
  return [context === 'wakaba' ? 'わかばマーク / OLT' : '大自然＆動植物（DAISIZEN） / ＯＬＴ（＊）',
    'OLT / 部屋一覧', ...contextRooms(context).map((d, i) =>
    `${i + 1} ${d.name} / 参加者：${attendance(state.rooms.find((r) => r.id === d.id)!).length}人`),
  'JOIN 番号 または番号: 入室 / WHO 番号: 参加者 / LIST: 部屋一覧',
  'PROFILE 宛先ID・表示ID・ハンドル: 公開プロフィール',
  ...(context === 'wakaba' ? ['初めての質問も、読むだけの参加もどうぞ。返事がない時もあります。'] : []),
  `BACK: ${context === 'wakaba' ? 'わかば' : 'SIG'} / MAIN: MAIN / HELP: 案内`, 'コマンド='];
}
interface OltActions {
  repository(): Promise<LocalRepository>;
  read(): Promise<Backup>;
  print(...lines: string[]): void;
  navigate(line: string): void;
  speechSaved?(): void;
  display?(lines: string[], visible: () => void): void;
  oltContext(): OltContext | null;
  ai: ReturnType<typeof createAiControls>;
}
/** This owner consumes every room line before application/global commands. */
export class TerminalOlt {
  private roomId: RoomId | undefined;
  private seen = 0;
  private visit = 0;
  private submission = 0;
  private working = false;
  private observing = false;
  private task: AbortController | undefined;
  private turnId: string | undefined;
  private liveSince = Date.now();
  private readonly clientId = crypto.randomUUID();
  constructor(private readonly actions: OltActions) {}
  get active() { return !!this.roomId; }
  invalidate() { this.suspend(); this.roomId = undefined; this.seen = 0; }
  suspend() { if (this.task) this.actions.ai.olt?.stage('中止'); this.actions.ai.prioritizeRoom?.(0); this.visit++; this.task?.abort(); this.task = undefined; this.turnId = undefined; this.liveSince = Date.now(); }
  resume() { this.liveSince = Date.now(); }
  observePresence(state: OltState) {
    if (this.turnId && state.rooms.find((r) => r.id === this.roomId)?.pending?.id !== this.turnId) this.task?.abort();
  }
  private who(room: OltRoom, data: Backup) {
    const ids = attendance(room);
    return `参加者：${ids.length}人 / ${ids.map((id) => {
      const member = data.members.find((m) => m.id === id);
      return `(${identityToken(member)}) ${penName(member)}`;
    }).join('、') || '誰もいません'}`;
  }
  private line(line: OltLine, data: Backup) {
    const member = data.members.find((m) => m.id === line.authorId);
    const name = penName(member);
    return `${serviceDate(line.createdAt, calendarSetting(data))} (${identityToken(member)}) ${line.kind === 'say' ? `<${name}> ${line.text}`
      : `* ${name} ${line.kind === 'enter' ? '入室' : '退室'}`}`;
  }
  private show(room: OltRoom, data: Backup, full: boolean) {
    const lines = (full ? room.lines.slice(-40) : room.lines.filter((l) => l.number > this.seen && (l.kind === 'say' || Date.parse(l.createdAt) >= this.liveSince)));
    this.seen = room.nextNumber - 1;
    if (full) this.actions.print(`OLT / ${roomDefinitions.find((d) => d.id === room.id)!.name}`, this.who(room, data));
    if (full && lines.length) this.actions.print('最近の記録（表示日時は発生時刻）');
    if (lines.length) {
      const text = lines.map((l) => this.line(l, data));
      if (!full && lines.some((l) => l.origin.startsWith('local-ai:')) && this.actions.display) {
        const visit = this.visit;
        this.actions.ai.olt.stage('表示キュー');
        this.actions.display(text, () => { if (visit === this.visit) this.actions.ai.olt.stage('表示完了'); });
      } else this.actions.print(...text);
    }
    if (full) this.actions.print(roomHelp, 'そのまま入力: 発言（400文字まで）/ //文字: 先頭の / を発言 / /HANDLE: ハンドル設定', '日時 JST / 発言=');
  }
  async leave() {
    this.invalidate();
    await (await this.actions.repository()).observeRoom(this.clientId);
  }
  async submit(line: string, enteredAt = Date.now()): Promise<boolean> {
    const submission = ++this.submission;
    const context = this.actions.oltContext();
    if (this.roomId && (!context || !contextRooms(context).some((r) => r.id === this.roomId))) await this.leave();
    if (!context) return false;
    const rooms = contextRooms(context);
    const resolve = (selector: string) => rooms.find((_, i) => String(i + 1) === selector);
    const prefix = this.roomId ? '/' : '';
    const guidance = [...rooms.map((_, i) => `JOIN ${i + 1}`), 'WHO', 'LIST', 'BACK', 'MAIN', 'HELP']
      .map((operation) => prefix + operation).join(' / ');
    const input = line.trim(), command = input.toUpperCase();
    const inRoom = !!this.roomId;
    const operation = inRoom ? input.startsWith('/') && !input.startsWith('//') ? input.slice(1) : '' : input;
    const syntax = operation.toUpperCase();
    if (inRoom && ['LEAVE', 'BACK', 'MAIN'].includes(syntax)) {
      await this.leave();
      this.actions.print('部屋を退出しました。');
      if (syntax === 'MAIN') this.actions.navigate('MAIN');
      else this.actions.print(...renderOltDirectory(await this.actions.read(), context));
      return true;
    }
    const argument = profileArgument(operation);
    if (argument !== null) {
      const visit = this.visit, roomId = this.roomId;
      const data = await this.actions.read();
      if (visit === this.visit && submission === this.submission && roomId === this.roomId && context === this.actions.oltContext()) {
        this.actions.print(...renderResidentProfile(data, argument, inRoom), inRoom ? '発言=' : 'コマンド=');
      }
      return true;
    }
    const selected = /^(?:JOIN )?([0-9]+)$/.exec(syntax);
    if (selected && resolve(selected[1]!)) {
      this.suspend(); this.roomId = resolve(selected[1]!)!.id; this.seen = 0;
      const data = await this.actions.read();
      const state = await (await this.actions.repository()).observeRoom(this.clientId, this.roomId, activeHuman(data));
      this.show(state.rooms.find((r) => r.id === this.roomId)!, data, true);
      if (!activeHuman(data)) this.actions.print('読むだけで入室しています。発言するには /HANDLE で登録してください。');
      return true;
    }
    const who = /^WHO(?: ([0-9]+))?$/.exec(syntax);
    if ((selected && !resolve(selected[1]!)) || (who?.[1] && !resolve(who[1]))) {
      this.actions.print(`この一覧にその部屋はありません。${guidance}`); return true;
    }
    if (who || ['HELP', 'LIST'].includes(syntax)) {
      const data = await this.actions.read();
      const state = await (await this.actions.repository()).observeRoom(this.clientId, this.roomId, this.roomId ? activeHuman(data) : undefined);
      if (who) {
        const id = who[1] ? resolve(who[1])!.id : this.roomId;
        for (const r of state.rooms.filter((r) => rooms.some((d) => d.id === r.id) && (!id || r.id === id))) this.actions.print(`${roomDefinitions.find((d) => d.id === r.id)!.name} / ${this.who(r, data)}`);
      } else if (this.roomId) this.show(state.rooms.find((r) => r.id === this.roomId)!, data, true);
      else this.actions.print(...renderOltDirectory({ settings: [{ id: OLT_SETTING, value: state as unknown as JsonValue }] }, context));
      return true;
    }
    if (!this.roomId) {
      if (['BACK', 'MAIN', 'HANDLE', 'SETTINGS', 'ABOUT', 'BACKUP', 'IMPORT', 'RESET', 'LOG', 'STOP'].includes(command)) return false;
      this.actions.print(guidance); return true;
    }
    if (syntax) { this.actions.print('不明な操作です。/HELP / /LEAVE / //文字: /から始まる発言'); return true; }
    if (!line.trim()) { this.actions.print('発言= / /HELP: 案内 / /LEAVE: 退出'); return true; }
    const data = await this.actions.read(), memberId = activeHuman(data);
    if (!memberId) { this.actions.print('発言にはハンドルが必要です。/HANDLE で登録 / /LEAVE: 退出'); return true; }
    const repo = await this.actions.repository();
    await repo.observeRoom(this.clientId, this.roomId, memberId);
    try {
      const saved = await repo.speakRoom(this.roomId, this.clientId, line.startsWith('//') ? line.slice(1) : line);
      this.actions.ai.olt.begin(enteredAt, saved.lines.at(-1)!.id);
      this.show(saved, data, false);
      this.actions.ai.olt.stage('発言保存');
      this.actions.ai.prioritizeRoom(Date.now() + 60_000);
      this.actions.speechSaved?.();
    }
    catch (error) { this.actions.print(String(error)); }
    return true;
  }
  /** Inference never holds the terminal command queue. */
  async tick(quiet: () => boolean) {
    const id = this.roomId, context = this.actions.oltContext(), visit = this.visit;
    if (id && (!context || !contextRooms(context).some((r) => r.id === id))) { await this.leave(); return; }
    const current = () => id === this.roomId && visit === this.visit && context === this.actions.oltContext();
    if (!id || !context || document.visibilityState !== 'visible') return;
    if (this.working) {
      if (this.observing) return;
      this.observing = true;
      try {
        const repo = await this.actions.repository(), data = await this.actions.read();
        if (current() && document.visibilityState === 'visible') {
          const state = await repo.observeRoom(this.clientId, id, activeHuman(data));
          if (current()) this.observePresence(state);
        }
      } finally { this.observing = false; }
      return;
    }
    this.working = true;
    try {
      const repo = await this.actions.repository(), data = await this.actions.read();
      if (!current() || document.visibilityState !== 'visible') return;
      const state = await repo.observeRoom(this.clientId, id, activeHuman(data));
      if (!current()) return;
      if (!quiet()) this.show(state.rooms.find((r) => r.id === id)!, data, false);
      const observed = state.rooms.find((r) => r.id === id)!;
      if (Date.now() < Date.parse(observed.observedAt)) { this.actions.ai.olt.stage('時計の巻き戻り'); return; }
      const waiting = observed.lines.find((l) => l.kind === 'say' && l.origin === 'local-human' && l.number > observed.handledNumber);
      if (waiting && Date.now() - Date.parse(waiting.createdAt) > 60_000) {
        await repo.expireRoomSpeech(id);
        this.actions.ai.olt.stage('返信待ち期限切れ'); this.actions.ai.prioritizeRoom(0); return;
      }
      if (!waiting && Date.now() < Date.parse(observed.nextTurnAt)) return;
      this.actions.ai.olt.prepare(waiting?.id ?? `${id}:${observed.nextTurnAt}`, waiting ? Date.parse(waiting.createdAt) : undefined);
      if (state.attempts >= 24 && Date.now() - Date.parse(state.windowAt) < 3_600_000) {
        this.actions.ai.olt.stage('時間枠の上限'); this.actions.ai.prioritizeRoom(0); return;
      }
      const suitable = residentProfiles(data).some((p) => p.frequency > 0 && p.reply > 0 && p.inactivity < 1 &&
        observed.residents.some((r) => r.memberId === personaMemberId(p.id) && Date.parse(r.until) > Date.now()));
      if (!suitable) { this.actions.ai.olt.stage('適任の在室住人なし'); this.actions.ai.prioritizeRoom(0); return; }
      const task = new AbortController(); this.task = task;
      await this.actions.ai.runRoom(async (engine, signal) => {
        let turn = await repo.claimRoomTurn(id, undefined, (reason) => this.actions.ai.olt.stage(reason));
        this.actions.ai.prioritizeRoom(0);
        if (!turn) return;
        this.turnId = turn.id;
        const token = turn.id;
        try {
          // A retry shares this worker, cancellation signal and original deadline.
          for (let attempt = 0; attempt < 2; attempt++) {
            const snapshot = await this.actions.read(); signal.throwIfAborted();
            if (!current()) { task.abort(); return; }
            const room = oltState(snapshot).rooms.find((r) => r.id === id)!;
            this.actions.ai.olt.stage(attempt ? '再生成開始' : '生成開始');
            const raw = await engine.generate(buildOltPrompt(snapshot, room, turn), signal);
            this.actions.ai.olt.stage(attempt ? '再生成終了' : '生成終了');
            signal.throwIfAborted();
            if (!current()) { task.abort(); return; }
            try {
              const committed = await repo.finishRoomTurn(id, token, raw, signal);
              this.actions.ai.olt.stage(committed ? '応答保存' : '期限・在室・設定変更で破棄');
              if (committed) {
                // A committed token is intentionally gone from presence state.
                // Readback must not mistake that success for a withdrawn turn.
                if (this.turnId === token) this.turnId = undefined;
                const latest = await this.actions.read(); signal.throwIfAborted();
                if (current() && !quiet()) this.show(oltState(latest).rooms.find((r) => r.id === id)!, latest, false);
                else if (current()) this.actions.ai.olt.stage('表示待ち（入力・設定中）');
              }
              break;
            } catch (error) {
              if (!(error instanceof OltOutputRejected)) throw error;
              this.actions.ai.olt.stage('不正な応答を拒否');
              if (attempt) break;
              const retry = await repo.retryRoomTurn(id, token, signal);
              if (!retry) { this.actions.ai.olt.stage('再生成の上限・期限'); break; }
              turn = retry;
            }
          }
        } finally { if (this.turnId === token) this.turnId = undefined; await repo.finishRoomTurn(id, token).catch(() => {}); }
      }, task.signal);
      if (this.task === task) this.task = undefined;
    } finally { this.working = false; }
  }
}
