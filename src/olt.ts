import { calendarSetting, serviceDate } from './calendar';
import type { Backup, JsonValue } from './storage/schema';
import type { LocalRepository } from './storage/repository';
import { activeHuman } from './forums';
import { identityToken, penName } from './member-presentation';
import { OLT_SETTING, attendance, oltState, roomDefinitions, contextRooms } from './olt-state';
import type { OltContext, OltLine, OltRoom, RoomId } from './olt-state';
import { buildOltPrompt } from './ai/olt';
import type { createAiControls } from './ai/controls';

export const roomHelp = '/WHO: 参加者 / /LIST: 最近の会話 / /JOIN 番号: 移動 / /LEAVE・/BACK: 退出 / /MAIN: MAIN / /HELP: 案内';
export function renderOltDirectory(content: Pick<Backup, 'settings'>, context: OltContext): string[] {
  const state = oltState(content);
  return [context === 'wakaba' ? 'わかばマーク / OLT' : '大自然＆動植物（DAISIZEN） / ＯＬＴ（＊）',
    'OLT / 部屋一覧', ...contextRooms(context).map((d, i) =>
    `${i + 1} ${d.name} / 参加者：${attendance(state.rooms.find((r) => r.id === d.id)!).length}人`),
  'JOIN 番号 または番号: 入室 / WHO 番号: 参加者 / LIST: 部屋一覧',
  ...(context === 'wakaba' ? ['初めての質問も、読むだけの参加もどうぞ。返事がない時もあります。'] : []),
  `BACK: ${context === 'wakaba' ? 'わかば' : 'SIG'} / MAIN: MAIN / HELP: 案内`, 'コマンド='];
}
interface OltActions {
  repository(): Promise<LocalRepository>;
  read(): Promise<Backup>;
  print(...lines: string[]): void;
  navigate(line: string): void;
  oltContext(): OltContext | null;
  ai: ReturnType<typeof createAiControls>;
}
/** This owner consumes every room line before application/global commands. */
export class TerminalOlt {
  private roomId: RoomId | undefined;
  private seen = 0;
  private visit = 0;
  private working = false;
  private task: AbortController | undefined;
  private readonly clientId = crypto.randomUUID();
  constructor(private readonly actions: OltActions) {}
  get active() { return !!this.roomId; }
  invalidate() { this.suspend(); this.roomId = undefined; this.seen = 0; }
  suspend() { this.visit++; this.task?.abort(); this.task = undefined; }
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
    const lines = (full ? room.lines.slice(-40) : room.lines.filter((l) => l.number > this.seen));
    this.seen = room.nextNumber - 1;
    if (full) this.actions.print(`OLT / ${roomDefinitions.find((d) => d.id === room.id)!.name}`, this.who(room, data));
    if (lines.length) this.actions.print(...lines.map((l) => this.line(l, data)));
    if (full) this.actions.print(roomHelp, 'そのまま入力: 発言（400文字まで）/ //文字: 先頭の / を発言 / /HANDLE: ハンドル設定', '日時 JST / 発言=');
  }
  async leave() {
    this.invalidate();
    await (await this.actions.repository()).observeRoom(this.clientId);
  }
  async submit(line: string): Promise<boolean> {
    const context = this.actions.oltContext();
    if (this.roomId && (!context || !contextRooms(context).some((r) => r.id === this.roomId))) await this.leave();
    if (!context) return false;
    const rooms = contextRooms(context);
    const resolve = (selector: string) => rooms.find((_, i) => String(i + 1) === selector);
    const prefix = this.roomId ? '/' : '';
    const guidance = [...rooms.map((_, i) => `JOIN ${i + 1}`), 'WHO', 'LIST', 'BACK', 'MAIN', 'HELP']
      .map((operation) => prefix + operation).join(' / ');
    const command = line.trim().toUpperCase();
    const inRoom = !!this.roomId;
    const syntax = inRoom ? command.startsWith('/') && !command.startsWith('//') ? command.slice(1) : '' : command;
    if (inRoom && ['LEAVE', 'BACK', 'MAIN'].includes(syntax)) {
      await this.leave();
      this.actions.print('部屋を退出しました。');
      if (syntax === 'MAIN') this.actions.navigate('MAIN');
      else this.actions.print(...renderOltDirectory(await this.actions.read(), context));
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
    try { this.show(await repo.speakRoom(this.roomId, this.clientId, line.startsWith('//') ? line.slice(1) : line), data, false); }
    catch (error) { this.actions.print(String(error)); }
    return true;
  }
  /** Inference never holds the terminal command queue. */
  async tick(quiet: () => boolean) {
    const id = this.roomId, context = this.actions.oltContext(), visit = this.visit;
    if (id && (!context || !contextRooms(context).some((r) => r.id === id))) { await this.leave(); return; }
    const current = () => id === this.roomId && visit === this.visit && context === this.actions.oltContext();
    if (!id || !context || this.working || document.visibilityState !== 'visible') return;
    this.working = true;
    try {
      const repo = await this.actions.repository(), data = await this.actions.read();
      if (!current() || document.visibilityState !== 'visible') return;
      const state = await repo.observeRoom(this.clientId, id, activeHuman(data));
      if (!current()) return;
      if (!quiet()) this.show(state.rooms.find((r) => r.id === id)!, data, false);
      if (quiet()) return;
      const task = new AbortController(); this.task = task;
      await this.actions.ai.runRoom(async (engine, signal) => {
        const turn = await repo.claimRoomTurn(id);
        if (!turn) return;
        try {
          const snapshot = await this.actions.read(); signal.throwIfAborted();
          if (!current()) { task.abort(); return; }
          const room = oltState(snapshot).rooms.find((r) => r.id === id)!;
          const raw = await engine.generate(buildOltPrompt(snapshot, room, turn), signal);
          signal.throwIfAborted();
          if (!current()) { task.abort(); return; }
          await repo.finishRoomTurn(id, turn.id, raw, signal);
        } finally { await repo.finishRoomTurn(id, turn.id).catch(() => {}); }
      }, task.signal);
      if (this.task === task) this.task = undefined;
    } finally { this.working = false; }
  }
}
