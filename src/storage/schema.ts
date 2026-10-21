import { personas, RESIDENTS_SETTING } from '../ai/personas';
import type { ResidentSettings } from '../ai/personas';
export interface Member { id: string; handle: string; actor: 'human' | 'ai' }
export interface Sig { id: string; keyword: string; title: string }
export interface Forum { id: string; sigId: string; boardNo: number; name: string; nextPostNumber: number }
export interface Post {
  id: string;
  forumId: string;
  number: number;
  displaySecondNumber?: number;
  authorId: string;
  title: string;
  body: string;
  replyToPostId?: string;
  createdAt: string;
  origin: string;
  simulation?: { runId: string; simulatedAt: string; fictional: true };
}
export type AiRunStatus = 'pending' | 'running' | 'committed' | 'failed' | 'cancelled';
export interface AiRun {
  id: string; personaId: string; forumId: string; replyToPostId?: string;
  simulatedAt: string; status: AiRunStatus;
}
export interface AiBatch { id: string; from: string; to: string; modelId: string; runs: AiRun[] }
export interface AiActivity {
  version: 1 | 2; maxPosts: number; modelId: string; lastActivityAt: string; batch: AiBatch | null;
  consent?: boolean; seed?: string; nextDue?: Record<string, string>;
  truncated?: boolean; bootstrap?: boolean; setupDeferred?: boolean;
}
export interface ReadState { memberId: string; forumId: string; lastReadNumber: number }
export interface Session {
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  commandHistory: string[];
}
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface Setting { id: string; value: JsonValue }
export const WORLD_SETTING = 'community-world';
export interface CommunityWorld {
  version: 1; createdAt: string; status: 'seeded' | 'legacy' | 'imported';
  fixture?: 'fictional-community-v1';
}
export const TERMINAL_SETTING = 'terminal-display';
export type TerminalSpeed = '300' | '1200' | '2400' | '9600' | 'instant';
export interface TerminalPreferences {
  version: 1;
  theme: 'white' | 'green' | 'amber';
  speed: TerminalSpeed;
  effects: boolean;
}
export interface Records {
  members: Member;
  sigs: Sig;
  forums: Forum;
  posts: Post;
  readStates: ReadState;
  settings: Setting;
}
export type Store = keyof Records;
export type Key<S extends Store> = S extends 'readStates' ? [string, string] : string;
export type NewPost = Omit<Post, 'id' | 'number' | 'createdAt'>;
export interface Backup {
  format: 'pcvan-local';
  version: 1;
  members: Member[];
  sigs: Sig[];
  forums: Forum[];
  posts: Post[];
  readStates: ReadState[];
  session: Session | null;
  settings: Setting[];
}

export class RepositoryError extends Error {
  constructor(
    public readonly code: 'validation' | 'confirmation-required' | 'quota' | 'blocked' | 'unavailable' | 'storage' | 'stale',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RepositoryError';
  }
}

export function invalid(message: string): never {
  throw new RepositoryError('validation', message);
}

function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Expected an object.');
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) invalid('Expected a plain object.');
}

function fields(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  object(value);
  if (required.some((key) => !Object.hasOwn(value, key)) ||
      Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) {
    invalid(`Expected fields: ${required.join(', ')}; optional: ${optional.join(', ')}.`);
  }
}

function string(value: unknown, nonempty = true): asserts value is string {
  if (typeof value !== 'string' || (nonempty && !value.trim())) invalid('Expected a string.');
}

function integer(value: unknown, minimum: number) {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) invalid(`Expected an integer >= ${minimum}.`);
}

function timestamp(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    invalid('Expected a UTC ISO timestamp with milliseconds.');
  }
}

function json(value: unknown): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach(json); return; }
  object(value);
  Object.values(value).forEach(json);
}

export function validateActivity(value: unknown): asserts value is AiActivity {
  object(value);
  const extra = value.version === 2 ? ['consent', 'seed', 'nextDue', 'truncated', 'bootstrap'] : [];
  fields(value, ['version', 'maxPosts', 'modelId', 'lastActivityAt', 'batch', ...extra], value.version === 2 ? ['setupDeferred'] : []);
  if (value.setupDeferred !== undefined && typeof value.setupDeferred !== 'boolean') invalid('Invalid AI setup deferral.');
  if (value.version !== 1 && value.version !== 2) invalid('Unknown AI activity version.');
  if (value.version === 2) {
    if (typeof value.consent !== 'boolean' || typeof value.truncated !== 'boolean' ||
        typeof value.bootstrap !== 'boolean') invalid('Invalid AI consent/state.');
    string(value.seed);
    if (value.seed.length > 128) invalid('AI seed is too long.');
    fields(value.nextDue, personas.map((row) => row.id));
    Object.values(value.nextDue).forEach(timestamp);
  }
  integer(value.maxPosts, 0);
  if ((value.maxPosts as number) > 12) invalid('AI activity cap exceeds 12.');
  string(value.modelId); timestamp(value.lastActivityAt);
  if (value.batch === null) return;
  const batch = value.batch;
  fields(batch, ['id', 'from', 'to', 'modelId', 'runs']);
  string(batch.id); string(batch.modelId); timestamp(batch.from); timestamp(batch.to);
  if (Date.parse(batch.to as string) <= Date.parse(batch.from as string) ||
      !Array.isArray(batch.runs) || batch.runs.length > 12) invalid('Invalid AI activity batch.');
  const ids = new Set<string>();
  for (const run of batch.runs as unknown[]) {
    fields(run, ['id', 'personaId', 'forumId', 'simulatedAt', 'status'], ['replyToPostId']);
    string(run.id); string(run.personaId); string(run.forumId); timestamp(run.simulatedAt);
    if (!personas.some((p) => p.id === run.personaId)) invalid('Unknown AI resident.');
    if (Object.hasOwn(run, 'replyToPostId')) string(run.replyToPostId);
    if (ids.has(run.id) || !(run.id as string).startsWith(`${batch.id}:`) ||
        Date.parse(run.simulatedAt as string) < Date.parse(batch.from as string) ||
        Date.parse(run.simulatedAt as string) > Date.parse(batch.to as string) ||
        !['pending', 'running', 'committed', 'failed', 'cancelled'].includes(run.status as string)) invalid('Invalid AI run.');
    ids.add(run.id);
  }
}

/** Reserved settings are validated before either direct writes or atomic restore. */
export function validateResidents(value: unknown): asserts value is ResidentSettings {
  fields(value, ['version', 'profiles']);
  if (value.version !== 1 || !Array.isArray(value.profiles) || value.profiles.length !== 10) invalid('Expected ten residents.');
  const ids = new Set<string>();
  const boundedText = (text: unknown, max: number) => {
    string(text);
    if (text.length > max || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(text)) invalid('Invalid resident text.');
  };
  for (const row of value.profiles) {
    fields(row, ['id', 'handle', 'occupation', 'routine', 'profile', 'interests', 'preferredBoards',
      'utcOffsetMinutes', 'weekdayHours', 'weekendHours', 'frequency', 'participation',
      'reading', 'newThread', 'reply', 'inactivity', 'affinities']);
    string(row.id);
    if (!personas.some((p) => p.id === row.id) || ids.has(row.id)) invalid('Unknown/duplicate resident.');
    ids.add(row.id);
    boundedText(row.handle, 40); boundedText(row.occupation, 80);
    boundedText(row.routine, 240); boundedText(row.profile, 300);
    if (!Array.isArray(row.interests) || row.interests.length > 8 || !row.interests.length) invalid('Invalid interests.');
    row.interests.forEach((text) => boundedText(text, 40));
    if (!Array.isArray(row.preferredBoards) || row.preferredBoards.length > 12) invalid('Invalid preferred boards.');
    row.preferredBoards.forEach((text) => boundedText(text, 128));
    integer(row.utcOffsetMinutes, -720);
    if ((row.utcOffsetMinutes as number) > 840) invalid('Invalid time zone.');
    for (const hours of [row.weekdayHours, row.weekendHours]) {
      if (!Array.isArray(hours) || hours.length > 24 || new Set(hours).size !== hours.length) invalid('Invalid hours.');
      hours.forEach((hour) => { integer(hour, 0); if (hour > 23) invalid('Invalid hour.'); });
    }
    for (const key of ['frequency', 'participation', 'reading', 'newThread', 'reply', 'inactivity']) {
      if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0 || row[key] > (key === 'frequency' ? 3 : 1)) invalid('Invalid resident activity weight.');
    }
    object(row.affinities);
    if (Object.keys(row.affinities).some((id) => !personas.some((p) => p.id === id)) ||
        Object.values(row.affinities).some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1)) invalid('Invalid affinity.');
  }
}

export function validateSession(value: unknown): asserts value is Session {
  fields(value, ['lastLoginAt', 'lastLogoutAt', 'commandHistory']);
  if (value.lastLoginAt !== null) timestamp(value.lastLoginAt);
  if (value.lastLogoutAt !== null) timestamp(value.lastLogoutAt);
  if (!Array.isArray(value.commandHistory)) invalid('Expected commandHistory array.');
  value.commandHistory.forEach((line) => string(line, false));
}

export function validateTerminalPreferences(value: unknown): asserts value is TerminalPreferences {
  fields(value, ['version', 'theme', 'speed', 'effects']);
  if (value.version !== 1 || !['white', 'green', 'amber'].includes(value.theme as string) ||
      !['300', '1200', '2400', '9600', 'instant'].includes(value.speed as string) ||
      typeof value.effects !== 'boolean') invalid('Invalid terminal display preferences.');
}

export function validateRecord<S extends Store>(store: S, value: unknown): asserts value is Records[S] {
  switch (store) {
    case 'members':
      fields(value, ['id', 'handle', 'actor']);
      string(value.id); string(value.handle);
      if (value.actor !== 'human' && value.actor !== 'ai') invalid('Unknown member actor.');
      break;
    case 'sigs':
      fields(value, ['id', 'keyword', 'title']);
      string(value.id); string(value.keyword); string(value.title);
      break;
    case 'forums':
      fields(value, ['id', 'sigId', 'boardNo', 'name', 'nextPostNumber']);
      string(value.id); string(value.sigId); string(value.name);
      integer(value.boardNo, 1); integer(value.nextPostNumber, 1);
      break;
    case 'posts':
      fields(value, ['id', 'forumId', 'number', 'authorId', 'title', 'body', 'createdAt', 'origin'],
        ['displaySecondNumber', 'replyToPostId', 'simulation']);
      string(value.id); string(value.forumId); string(value.authorId); string(value.origin);
      string(value.title, false); string(value.body, false); integer(value.number, 1); timestamp(value.createdAt);
      if (Object.hasOwn(value, 'displaySecondNumber')) integer(value.displaySecondNumber, 0);
      if (Object.hasOwn(value, 'replyToPostId')) string(value.replyToPostId);
      if (Object.hasOwn(value, 'simulation')) {
        const simulation = value.simulation;
        fields(simulation, ['runId', 'simulatedAt', 'fictional']);
        string(simulation.runId); timestamp(simulation.simulatedAt);
        if (simulation.fictional !== true || simulation.runId !== value.id ||
            !(value.origin as string).startsWith('local-ai:webllm:')) invalid('Expected a stable fictional AI run and time.');
      }
      break;
    case 'readStates':
      fields(value, ['memberId', 'forumId', 'lastReadNumber']);
      string(value.memberId); string(value.forumId); integer(value.lastReadNumber, 0);
      break;
    case 'settings':
      fields(value, ['id', 'value']); string(value.id); json(value.value);
      if (value.id === 'ai-activity') validateActivity(value.value);
      if (value.id === RESIDENTS_SETTING) validateResidents(value.value);
      if (value.id === TERMINAL_SETTING) validateTerminalPreferences(value.value);
      if (value.id === WORLD_SETTING) {
        fields(value.value, ['version', 'createdAt', 'status'], ['fixture']);
        const world = value.value;
        timestamp(world.createdAt);
        if (world.version !== 1 || !['seeded', 'legacy', 'imported'].includes(world.status as string) ||
            (world.status === 'seeded' ? world.fixture !== 'fictional-community-v1' : Object.hasOwn(world, 'fixture'))) {
          invalid('Invalid fictional community provenance.');
        }
      }
      break;
  }
}

export const stores = ['members', 'sigs', 'forums', 'posts', 'readStates', 'settings'] as const;

// Validation is pure: no database is opened or modified here.
export function validateBackup(value: unknown): asserts value is Backup {
  fields(value, ['format', 'version', ...stores, 'session']);
  if (value.format !== 'pcvan-local' || value.version !== 1) invalid('Unsupported backup format or version.');
  for (const store of stores) {
    const rows: unknown = value[store];
    if (!Array.isArray(rows)) invalid(`Expected ${store} array.`);
    const keys = new Set<string>();
    for (const row of rows as unknown[]) {
      validateRecord(store, row);
      const key = 'id' in row ? row.id : JSON.stringify([row.memberId, row.forumId]);
      if (keys.has(key)) invalid(`Duplicate ${store} key: ${key}.`);
      keys.add(key);
    }
  }
  if (value.session !== null) validateSession(value.session);
  const backup = value as unknown as Backup;
  const members = new Set(backup.members.map((row) => row.id));
  const sigs = new Set(backup.sigs.map((row) => row.id));
  const forums = new Map(backup.forums.map((row) => [row.id, row]));
  const posts = new Map(backup.posts.map((row) => [row.id, row]));
  const numbers = new Set<string>();
  for (const forum of backup.forums) if (!sigs.has(forum.sigId)) invalid('Forum references a missing SIG.');
  for (const post of backup.posts) {
    const forum = forums.get(post.forumId);
    if (!forum || !members.has(post.authorId)) invalid('Post references a missing forum or author.');
    if (forum.nextPostNumber <= post.number) invalid('Forum nextPostNumber must exceed all its post numbers.');
    const key = JSON.stringify([post.forumId, post.number]);
    if (numbers.has(key)) invalid('Duplicate per-forum post number.');
    numbers.add(key);
    if (post.replyToPostId !== undefined) {
      const parent = posts.get(post.replyToPostId);
      if (!parent || parent.forumId !== post.forumId || parent.number >= post.number) {
        invalid('A reply must reference an earlier post in the same forum.');
      }
    }
  }
  for (const read of backup.readStates) {
    if (!members.has(read.memberId) || !forums.has(read.forumId)) invalid('Read state references a missing member or forum.');
  }
}
