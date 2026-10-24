import type { AiActivity, Backup, Member } from './storage/schema';
import { personas, personaMemberId, residentProfiles } from './ai/personas';
import { random, routineFactor } from './ai/activity';

export const OLT_SETTING = 'olt-rooms';
export const roomDefinitions = [
  { id: 'lounge', name: '自然の談話室', board: 'DAISIZEN:1', context: 'daisizen' },
  { id: 'night', name: '星と道具の部屋', board: 'MITI:9', context: 'daisizen' },
  { id: 'wakaba', name: 'はじめての談話室', board: 'LOCAL-WAKABA:1', context: 'wakaba' },
] as const;
export type OltContext = typeof roomDefinitions[number]['context'];
export const contextRooms = (context: OltContext) => roomDefinitions.filter((r) => r.context === context);
export type RoomId = typeof roomDefinitions[number]['id'];
export interface OltLine {
  id: string; number: number; authorId: string; createdAt: string;
  kind: 'enter' | 'leave' | 'say'; text: string; origin: string;
}
export interface OltPresence { memberId: string; joinedAt: string; until: string }
export interface OltVisitor { clientId: string; memberId: string; until: string }
export interface OltTurn {
  id: string; authorId: string; modelId: string; context: string; until: string;
}
export interface OltRoom {
  id: RoomId; nextNumber: number; lines: OltLine[];
  residents: OltPresence[]; visitors: OltVisitor[];
  observedAt: string; nextTurnAt: string; handledNumber: number; chain: number;
  pending: OltTurn | null;
}
export interface OltState {
  version: 1; windowAt: string; attempts: number; rooms: OltRoom[];
}
export const RETAIN_LINES = 200;
export const VISITOR_LEASE = 45_000;
export const iso = (n: number) => new Date(n).toISOString();
export function emptyOlt(now: string): OltState {
  return { version: 1, windowAt: now, attempts: 0, rooms: roomDefinitions.map(({ id }) => ({
    id, nextNumber: 1, lines: [], residents: [], visitors: [], observedAt: now,
    nextTurnAt: iso(Date.parse(now) + 10_000), handledNumber: 0, chain: 0, pending: null,
  })) };
}
export function oltState(content: Pick<Backup, 'settings'> & Partial<Pick<Backup, 'members'>>, now = new Date().toISOString()): OltState {
  const saved = content.settings.find((s) => s.id === OLT_SETTING)?.value;
  if (saved === undefined) return emptyOlt(now);
  // Validate the complete legacy record before adding anything. No reseeding,
  // budget reset or clock-dependent migration; reads are pure and idempotent.
  validateOlt(saved);
  if (content.members) validateOltMembers(saved, content.members);
  const state = structuredClone(saved) as unknown as OltState;
  if (state.rooms.length === 2) state.rooms.push(emptyOlt(state.windowAt).rooms.find((r) => r.id === 'wakaba')!);
  return state;
}
export function oltAuthorization(content: Pick<Backup, 'settings'>): string {
  const ai = content.settings.find((s) => s.id === 'ai-activity')?.value as unknown as AiActivity | undefined;
  return JSON.stringify([ai?.modelId, !!ai?.consent, !!ai?.maxPosts, residentProfiles(content)]);
}
export function oltEnabled(content: Pick<Backup, 'settings'>) {
  const ai = content.settings.find((s) => s.id === 'ai-activity')?.value as unknown as AiActivity | undefined;
  return ai?.consent && ai.maxPosts > 0 ? ai : undefined;
}
export function appendOlt(room: OltRoom, authorId: string, kind: OltLine['kind'], text: string, origin: string, at: number): OltLine {
  // Logical sequence survives pruning and clocks moving backwards.
  const createdAt = iso(Math.max(at, Date.parse(room.lines.at(-1)?.createdAt ?? iso(at))));
  const number = room.nextNumber++;
  const line = { id: `olt:${room.id}:${number}`, number, authorId, kind, text, origin, createdAt };
  room.lines.push(line); room.lines = room.lines.slice(-RETAIN_LINES);
  if (kind === 'say') {
    room.chain = origin === 'local-human' ? 0 : room.chain + 1;
    room.nextTurnAt = iso(Date.parse(createdAt) + (origin === 'local-human' ? 8_000 : 14_000));
  }
  return line;
}
export function attendance(room: OltRoom, at = Date.now()): string[] {
  return [...new Set([...room.residents.filter((p) => Date.parse(p.until) > at).map((p) => p.memberId),
    ...room.visitors.filter((p) => Date.parse(p.until) > at).map((p) => p.memberId)])];
}

/** One observation, no elapsed-time loop and no closed-tab dialogue. */
export function observeOlt(state: OltState, content: Backup, at: number): void {
  const ai = oltEnabled(content);
  const profiles = residentProfiles(content);
  for (const room of state.rooms) {
    const previous = new Set(room.visitors.map((v) => v.memberId));
    room.visitors = room.visitors.filter((v) => Date.parse(v.until) > at);
    for (const id of previous) if (!room.visitors.some((v) => v.memberId === id)) {
      const expired = Math.max(Date.parse(room.observedAt), Math.min(at, Date.parse(room.observedAt) + VISITOR_LEASE));
      appendOlt(room, id, 'leave', '', 'local-presence', expired);
    }
    room.residents = room.residents.filter((p) => {
      const profile = profiles.find((r) => personaMemberId(r.id) === p.memberId);
      if (ai && profile?.frequency && Date.parse(p.until) > at && routineFactor(profile, at) === 1) return true;
      appendOlt(room, p.memberId, 'leave', '', 'local-presence', Math.min(at, Date.parse(p.until)));
      return false;
    });
    if (room.pending && !room.residents.some((p) => p.memberId === room.pending!.authorId)) room.pending = null;
    if (at - Date.parse(room.observedAt) > 90_000) {
      // On return, a fresh quiet interval; never infer against stale attendance.
      room.pending = null; room.handledNumber = room.nextNumber - 1;
      room.nextTurnAt = iso(at + 15_000); room.chain = 0;
    }
    room.observedAt = iso(Math.max(at, Date.parse(room.observedAt)));
  }
  if (!ai) return;
  // A resident chooses one room per twenty-minute visit window. Reentry/refresh
  // does not roll another chance; routine, absence, interest and silence persist.
  const slot = Math.floor(at / 1_200_000);
  for (const p of profiles) {
    if (!p.frequency || routineFactor(p, at) !== 1) continue;
    const draw = (key: string) => random(`${ai.seed}:olt:${p.id}:${slot}:${key}`);
    if (draw('visit') >= Math.min(.9, p.participation * p.frequency) ||
        random(`${ai.seed}:olt:${p.id}:away:${Math.floor(at / 86_400_000)}`) < .12) continue;
    const preferred = roomDefinitions.filter((r) => p.preferredBoards.includes(r.board));
    const pool = preferred.length && draw('explore') > .15 ? preferred : roomDefinitions;
    const selected = pool[Math.floor(draw('room') * pool.length)]!;
    const room = state.rooms.find((r) => r.id === selected.id)!;
    const start = slot * 1_200_000 + Math.floor(draw('arrival') * 120_000);
    const end = Math.min((slot + 1) * 1_200_000, start + (7 + draw('duration') * 11) * 60_000);
    const memberId = personaMemberId(p.id);
    if (at < start || at >= end || state.rooms.some((r) => r.residents.some((v) => v.memberId === memberId))) continue;
    // Do not repeat a departed visit in the same slot.
    if (room.lines.some((l) => l.authorId === memberId && l.kind === 'enter' && Date.parse(l.createdAt) >= slot * 1_200_000)) continue;
    room.residents.push({ memberId, joinedAt: iso(at), until: iso(end) });
    appendOlt(room, memberId, 'enter', '', 'local-presence', at);
  }
}

const controlText = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]|<[^>]*>/;
export function validOltText(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && value.length <= 400 && !controlText.test(value);
}
/** Strict reserved-setting validation, including bounds before atomic import. */
export function validateOlt(value: unknown): asserts value is OltState {
  const fail = () => { throw new Error('Invalid bounded OLT state.'); };
  const obj = (v: unknown, keys: string[]): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== keys.length || keys.some((k) => !Object.hasOwn(v, k))) fail();
    return v as Record<string, unknown>;
  };
  const time = (v: unknown) => { if (typeof v !== 'string' || !Number.isFinite(Date.parse(v)) || iso(Date.parse(v)) !== v) fail(); };
  const text = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 256 || controlText.test(v)) fail(); };
  const int = (v: unknown, min = 0) => { if (!Number.isSafeInteger(v) || (v as number) < min) fail(); };
  const state = obj(value, ['version', 'windowAt', 'attempts', 'rooms']);
  if (state.version !== 1) fail(); time(state.windowAt); int(state.attempts);
  if ((state.attempts as number) > 24 || !Array.isArray(state.rooms) || ![2, 3].includes(state.rooms.length)) fail();
  const roomIds = new Set();
  const residentIds = new Set();
  for (const raw of state.rooms as unknown[]) {
    const r = obj(raw, ['id', 'nextNumber', 'lines', 'residents', 'visitors', 'observedAt', 'nextTurnAt', 'handledNumber', 'chain', 'pending']);
    if (!roomDefinitions.some((d) => d.id === r.id) || roomIds.has(r.id)) fail(); roomIds.add(r.id);
    int(r.nextNumber, 1); int(r.handledNumber); int(r.chain);
    if ((r.handledNumber as number) >= (r.nextNumber as number) || (r.chain as number) > 3) fail();
    time(r.observedAt); time(r.nextTurnAt);
    if (!Array.isArray(r.lines) || r.lines.length > RETAIN_LINES) fail();
    let previous = 0, previousTime = '';
    for (const rawLine of r.lines as unknown[]) {
      const l = obj(rawLine, ['id', 'number', 'authorId', 'createdAt', 'kind', 'text', 'origin']);
      int(l.number, 1); text(l.authorId); time(l.createdAt); text(l.origin);
      if (l.id !== `olt:${r.id}:${l.number}` || (l.number as number) <= previous || (l.number as number) >= (r.nextNumber as number) ||
        (l.createdAt as string) < previousTime || !['say', 'enter', 'leave'].includes(l.kind as string)) fail();
      if (l.kind === 'say' ? !validOltText(l.text) || !(l.origin === 'local-human' || (l.origin as string).startsWith('local-ai:webllm:'))
        : l.text !== '' || l.origin !== 'local-presence') fail();
      previous = l.number as number; previousTime = l.createdAt as string;
    }
    for (const key of ['residents', 'visitors']) {
      if (!Array.isArray(r[key]) || (r[key] as unknown[]).length > (key === 'residents' ? 10 : 16)) fail();
      const ids = new Set();
      for (const rawPresence of r[key] as unknown[]) {
        const p = obj(rawPresence, key === 'residents' ? ['memberId', 'joinedAt', 'until'] : ['clientId', 'memberId', 'until']);
        text(p.memberId); time(p.until);
        if (key === 'residents') { time(p.joinedAt); if ((p.until as string) <= (p.joinedAt as string)) fail(); }
        else text(p.clientId);
        const id = key === 'residents' ? p.memberId : p.clientId;
        if (ids.has(id) || (key === 'residents' && residentIds.has(id))) fail(); ids.add(id);
        if (key === 'residents') residentIds.add(id);
      }
    }
    if (r.pending !== null) {
      const p = obj(r.pending, ['id', 'authorId', 'modelId', 'context', 'until']);
      text(p.id); text(p.authorId); text(p.modelId); time(p.until);
      if (typeof p.context !== 'string' || p.context.length > 100_000) fail();
    }
  }
  if (!roomIds.has('lounge') || !roomIds.has('night') || (roomIds.size === 3 && !roomIds.has('wakaba'))) fail();
}
export function validateOltMembers(state: OltState, members: readonly Member[]) {
  for (const room of state.rooms) {
    for (const line of room.lines) {
      const member = members.find((m) => m.id === line.authorId);
      if (!member || (member.actor === 'ai' && !personas.some((p) => personaMemberId(p.id) === member.id)) ||
          (line.kind === 'say' && (member.actor === 'human' ? line.origin !== 'local-human' : !line.origin.startsWith('local-ai:webllm:')))) {
        throw new Error('Invalid OLT author/provenance.');
      }
    }
    for (const p of room.residents) if (!members.some((m) => m.id === p.memberId && m.actor === 'ai') ||
      !personas.some((r) => personaMemberId(r.id) === p.memberId)) throw new Error('Invalid OLT resident.');
    for (const p of room.visitors) if (!members.some((m) => m.id === p.memberId && m.actor === 'human')) throw new Error('Invalid OLT visitor.');
    if (room.pending && !room.residents.some((p) => p.memberId === room.pending!.authorId)) throw new Error('Invalid OLT turn.');
  }
}
