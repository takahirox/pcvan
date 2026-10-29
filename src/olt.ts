import { profileArgument, renderResidentProfile } from './resident-profile';
import { calendarSetting, serviceDate } from './calendar';
import type { Backup, JsonValue } from './storage/schema';
import type { LocalRepository } from './storage/repository';
import { activeHuman } from './forums';
import { identityToken, penName } from './member-presentation';
import { OLT_SETTING, attendance, oltState, roomDefinitions, contextRooms } from './olt-state';
import type { OltContext, OltLine, OltRoom, RoomId } from './olt-state';
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
  private leaseAt = 0;
  private liveSince = Date.now();
  private readonly clientId = crypto.randomUUID();
  constructor(private readonly actions: OltActions) {}
  get active() { return !!this.roomId; }
  invalidate() { this.suspend(); this.roomId = undefined; this.seen = 0; }
  suspend() { this.visit++; this.liveSince = Date.now(); }
  resume() { this.liveSince = Date.now(); }
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
    const lines = (full ? room.lines.filter((l) => l.kind === 'say').slice(-40) : room.lines.filter((l) => l.number > this.seen && (l.kind === 'say' || Date.parse(l.createdAt) >= this.liveSince)));
    this.seen = room.nextNumber - 1;
    if (full) this.actions.print(`OLT / ${roomDefinitions.find((d) => d.id === room.id)!.name}`, this.who(room, data));
    if (full && lines.length) this.actions.print('最近の記録（表示日時は発生時刻）');
    if (lines.length) {
      const text = lines.map((l) => this.line(l, data));
      if (!full && lines.some((l) => l.origin.startsWith('local-ai:')) && this.actions.display) {
        const visit = this.visit;
        this.actions.ai.olt.stage('表示キュー');
        this.actions.display(text, () => { if (visit === this.visit) this.actions.ai.olt.stage('表示完了'); });
      } else if (!full && this.actions.display) this.actions.display(text, () => {});
      else this.actions.print(...text);
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
      this.actions.speechSaved?.();
    }
    catch (error) { this.actions.print(String(error)); }
    return true;
  }
  /** Presentation and the human presence lease only; the world owns inference. */
  async tick() {
    const id = this.roomId, context = this.actions.oltContext(), visit = this.visit;
    if (id && (!context || !contextRooms(context).some((r) => r.id === id))) { await this.leave(); return; }
    if (!id || !context || this.working || document.visibilityState !== 'visible') return;
    this.working = true;
    try {
      const repo = await this.actions.repository(), data = await this.actions.read();
      if (id !== this.roomId || visit !== this.visit || context !== this.actions.oltContext()) return;
      const renew = Date.now() >= this.leaseAt;
      const state = renew ? await repo.observeRoom(this.clientId, id, activeHuman(data)) : oltState(data);
      if (renew) this.leaseAt = Date.now() + 15_000;
      if (id === this.roomId && visit === this.visit && context === this.actions.oltContext()) this.show(state.rooms.find((r) => r.id === id)!, data, false);
    } finally { this.working = false; }
  }
}
