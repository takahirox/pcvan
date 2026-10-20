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
}
export interface ReadState { memberId: string; forumId: string; lastReadNumber: number }
export interface Session {
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  commandHistory: string[];
}
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface Setting { id: string; value: JsonValue }
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
    public readonly code: 'validation' | 'confirmation-required' | 'quota' | 'blocked' | 'unavailable' | 'storage',
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

export function validateSession(value: unknown): asserts value is Session {
  fields(value, ['lastLoginAt', 'lastLogoutAt', 'commandHistory']);
  if (value.lastLoginAt !== null) timestamp(value.lastLoginAt);
  if (value.lastLogoutAt !== null) timestamp(value.lastLogoutAt);
  if (!Array.isArray(value.commandHistory)) invalid('Expected commandHistory array.');
  value.commandHistory.forEach((line) => string(line, false));
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
        ['displaySecondNumber', 'replyToPostId']);
      string(value.id); string(value.forumId); string(value.authorId); string(value.origin);
      string(value.title, false); string(value.body, false); integer(value.number, 1); timestamp(value.createdAt);
      if (Object.hasOwn(value, 'displaySecondNumber')) integer(value.displaySecondNumber, 0);
      if (Object.hasOwn(value, 'replyToPostId')) string(value.replyToPostId);
      break;
    case 'readStates':
      fields(value, ['memberId', 'forumId', 'lastReadNumber']);
      string(value.memberId); string(value.forumId); integer(value.lastReadNumber, 0);
      break;
    case 'settings':
      fields(value, ['id', 'value']); string(value.id); json(value.value);
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
