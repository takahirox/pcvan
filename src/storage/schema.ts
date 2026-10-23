import { netNewsGroups, localNetNewsMessageId } from '../netnews';
import { CALENDAR_SETTING, isHistorical } from '../calendar';
import { OLT_SETTING, validateOlt, validateOltMembers } from '../olt-state';
import { personas, personaMemberId, RESIDENTS_SETTING } from '../ai/personas';
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
/** Retained messages are separate from forum posts and OLT attendance. */
export const CONFERENCE_SETTING = 'daisizen-conference';
export const CONFERENCE_ID = 'DAISIZEN';
export interface Contribution {
  id: string; number: number; authorId: string; title: string; body: string;
  createdAt: string; origin: 'local-human' | 'local-seed:conference-v1';
  replyToPostId?: string;
}
export interface ConferenceState {
  version: 1; conferenceId: typeof CONFERENCE_ID; nextNumber: number; contributions: Contribution[];
}
export const NETNEWS_SETTING = 'netnews-local';
export interface LocalNetNewsArticle {
  id: string; group: string; number: number; authorId: string; title: string; body: string;
  createdAt: string; origin: 'local-human'; messageId: string; references: string[];
  parentMessageId?: string;
}
export interface NetNewsState {
  version: 1; nextNumbers: Record<string, number>; contributions: LocalNetNewsArticle[];
}
export type MailDestination = { recipientId: string; internetAddress?: never } | { recipientId?: never; internetAddress: string };
export type Mail = MailDestination & {
  id: string; number: number; senderId: string;
  subject: string; body: string; createdAt: string; origin: string;
  replyToMailId?: string; readAt?: string;
  recipientConfirmation?: { at: string; replyMailId: string; provenance: 'local-resident-reply-v1' };
  simulation?: { runId: string; simulatedAt: string; fictional: true };
}
export interface MailTarget { humanId: string; replyToMailId?: string; publicPostId?: string }
export type AiRunStatus = 'pending' | 'running' | 'committed' | 'failed' | 'cancelled';
export interface AiRun {
  id: string; personaId: string; forumId?: string; replyToPostId?: string;
  simulatedAt: string; status: AiRunStatus; mail?: MailTarget;
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
  fixture?: 'fictional-community-v1'; expansion?: 1;
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
  mail: Mail;
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
  mail?: Mail[];
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
    fields(run, ['id', 'personaId', 'simulatedAt', 'status'], ['forumId', 'replyToPostId', 'mail']);
    if (run.mail !== undefined) {
      fields(run.mail, ['humanId'], ['replyToMailId', 'publicPostId']);
      string(run.mail.humanId);
      if (run.mail.replyToMailId !== undefined) string(run.mail.replyToMailId);
      if (run.mail.publicPostId !== undefined) string(run.mail.publicPostId);
      if (run.replyToPostId !== undefined || (!!run.mail.replyToMailId === !!run.mail.publicPostId)) invalid('Expected one mail context.');
    }
    string(run.id); string(run.personaId); timestamp(run.simulatedAt);
    if (run.mail === undefined) string(run.forumId);
    else if (run.forumId !== undefined) invalid('Mail cannot target a forum.');
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
    case 'mail':
      fields(value, ['id', 'number', 'senderId', 'subject', 'body', 'createdAt', 'origin'],
        ['recipientId', 'internetAddress', 'replyToMailId', 'readAt', 'simulation', 'recipientConfirmation']);
      string(value.id); integer(value.number, 1); string(value.senderId);
      if (Object.hasOwn(value, 'recipientId') === Object.hasOwn(value, 'internetAddress')) invalid('Expected exactly one mail destination.');
      if (Object.hasOwn(value, 'internetAddress')) {
        validateInternetAddress(value.internetAddress);
        if (value.origin !== 'local-human' || ['replyToMailId', 'readAt', 'simulation', 'recipientConfirmation'].some((key) => Object.hasOwn(value, key))) {
          invalid('Internet letters are outbound local saves only.');
        }
      } else string(value.recipientId);
      string(value.origin); timestamp(value.createdAt);
      if (value.id.length > 256 || value.senderId.length > 128 || (typeof value.recipientId === 'string' && value.recipientId.length > 128)) invalid('Mail identity is too long.');
      for (const [key, max] of [['subject', 200], ['body', 20000]] as const) {
        string(value[key]);
        if (value[key].length > max || /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(value[key]) ||
            (key === 'subject' && value[key].includes('\n'))) invalid('Invalid mail text.');
      }
      if (value.replyToMailId !== undefined) { string(value.replyToMailId); if (value.replyToMailId.length > 256) invalid('Mail reference is too long.'); }
      if (value.readAt !== undefined) { timestamp(value.readAt); if (Date.parse(value.readAt as string) < Date.parse(value.createdAt as string)) invalid('Invalid read time.'); }
      if (value.recipientConfirmation !== undefined) {
        fields(value.recipientConfirmation, ['at', 'replyMailId', 'provenance']);
        const confirmation = value.recipientConfirmation;
        timestamp(confirmation.at); string(confirmation.replyMailId);
        if (confirmation.replyMailId.length > 256 || confirmation.provenance !== 'local-resident-reply-v1' ||
            Date.parse(confirmation.at as string) < Date.parse(value.createdAt as string)) invalid('Invalid recipient confirmation.');
      }
      if (value.simulation !== undefined) {
        fields(value.simulation, ['runId', 'simulatedAt', 'fictional']);
        timestamp(value.simulation.simulatedAt);
        if (value.simulation.runId !== value.id || value.simulation.fictional !== true ||
            !(value.origin as string).startsWith('local-ai:webllm:')) invalid('Invalid mail simulation.');
      }
      break;
    case 'readStates':
      fields(value, ['memberId', 'forumId', 'lastReadNumber']);
      string(value.memberId); string(value.forumId); integer(value.lastReadNumber, 0);
      break;
    case 'settings':
      fields(value, ['id', 'value']); string(value.id); json(value.value);
      if (value.id === NETNEWS_SETTING) validateNetNews(value.value);
      if (value.id === CALENDAR_SETTING) {
        fields(value.value, ['version', 'sourceAnchor']);
        timestamp(value.value.sourceAnchor);
        if (value.value.version !== 1 || isHistorical(value.value.sourceAnchor as string)) invalid('Invalid historical calendar.');
      }
      if (value.id === OLT_SETTING) validateOlt(value.value);
      if (value.id === CONFERENCE_SETTING) validateConference(value.value);
      if (value.id === 'ai-activity') validateActivity(value.value);
      if (value.id === RESIDENTS_SETTING) validateResidents(value.value);
      if (value.id === TERMINAL_SETTING) validateTerminalPreferences(value.value);
      if (value.id === WORLD_SETTING) {
        fields(value.value, ['version', 'createdAt', 'status'], ['fixture', 'expansion']);
        const world = value.value;
        timestamp(world.createdAt);
        if ((world.expansion !== undefined && (world.expansion !== 1 || world.status !== 'seeded')) ||
            world.version !== 1 || !['seeded', 'legacy', 'imported'].includes(world.status as string) ||
            (world.status === 'seeded' ? world.fixture !== 'fictional-community-v1' : Object.hasOwn(world, 'fixture'))) {
          invalid('Invalid fictional community provenance.');
        }
      }
      break;
  }
}

export const stores = ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const;

// Validation is pure: no database is opened or modified here.
export function validateBackup(value: unknown): asserts value is Backup {
  fields(value, ['format', 'version', ...stores.filter((s) => s !== 'mail'), 'session'], ['mail']);
  if (value.format !== 'pcvan-local' || value.version !== 1) invalid('Unsupported backup format or version.');
  for (const store of stores) {
    const rows: unknown = store === 'mail' && !Object.hasOwn(value, store) ? [] : value[store];
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
  const olt = backup.settings.find((s) => s.id === OLT_SETTING)?.value;
  if (olt) { validateOlt(olt); validateOltMembers(olt, backup.members); }
  const conference = backup.settings.find((s) => s.id === CONFERENCE_SETTING)?.value;
  if (conference !== undefined) { validateConference(conference); validateConferenceMembers(conference, backup.members); }
  const netnews = backup.settings.find((s) => s.id === NETNEWS_SETTING)?.value;
  if (netnews !== undefined) { validateNetNews(netnews); validateNetNewsMembers(netnews, backup.members); }
  validateMailRelations(backup.mail ?? [], backup.members);
  for (const read of backup.readStates) {
    if (!members.has(read.memberId) || !forums.has(read.forumId)) invalid('Read state references a missing member or forum.');
  }
}

/** Validate projections and parents against the same world, for imports and sends. */
export function validateMailRelations(mail: readonly Mail[], members: readonly Member[]): void {
  const numbers = new Set<number>();
  for (const row of mail) {
    const sender = members.find((m) => m.id === row.senderId);
    if (numbers.has(row.number)) invalid('Duplicate mail number.');
    numbers.add(row.number);
    if (row.internetAddress !== undefined) {
      validateRecord('mail', row);
      if (sender?.actor !== 'human') invalid('Internet letters require an existing human sender.');
      continue;
    }
    const recipient = members.find((m) => m.id === row.recipientId);
    const resident = sender?.actor === 'ai' ? sender : recipient;
    if (!sender || !recipient || sender.actor === recipient.actor ||
        !personas.some((p) => `fictional-ai:${p.id}` === resident?.id) ||
        (row.readAt !== undefined && recipient.actor !== 'human') ||
        (sender.actor === 'human' ? row.origin !== 'local-human' || row.simulation !== undefined
          : !row.origin.startsWith('local-ai:webllm:') || !row.simulation)) invalid('Invalid mail correspondents or provenance.');
    if (row.recipientConfirmation !== undefined) {
      const confirmation = row.recipientConfirmation;
      const reply = mail.find((m) => m.id === confirmation.replyMailId);
      if (sender.actor !== 'human' || !reply?.simulation || !reply.origin.startsWith('local-ai:webllm:') ||
          reply.replyToMailId !== row.id || reply.senderId !== row.recipientId || reply.recipientId !== row.senderId ||
          reply.number <= row.number || Date.parse(confirmation.at) < Date.parse(reply.createdAt)) {
        invalid('Recipient confirmation requires a resident reply to this letter.');
      }
    }
    if (row.replyToMailId !== undefined) {
      const parent = mail.find((m) => m.id === row.replyToMailId);
      if (!parent || parent.number >= row.number || parent.senderId !== row.recipientId ||
          parent.recipientId !== row.senderId) invalid('Mail replies require an earlier letter from the correspondent.');
    }
  }
}

/** Reconstructed ASCII subset, shared by composition, storage and backup validation. */
export function validateInternetAddress(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length > 254) invalid('Invalid Internet address. Use INET#observer@letters.example.invalid.');
  const parts = value.split('@');
  const local = parts[0]!, domain = parts[1] ?? '';
  const labels = domain.split('.');
  if (parts.length !== 2 || local.length > 64 || !/^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*$/.test(local) ||
      domain.length > 253 || labels.length < 2 || !/^[A-Za-z]{2,63}$/.test(labels.at(-1)!) ||
      labels.some((label) => label.length > 63 || !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label))) {
    invalid('Invalid Internet address. Use INET#observer@letters.example.invalid.');
  }
}

/** An explicit Internet prefix is never resolved through the member directory. */
export function resolveMailDestination(members: readonly Member[], address: string): MailDestination {
  if (/^INET#/i.test(address.trimStart())) {
    const internetAddress = address.slice(5);
    validateInternetAddress(internetAddress);
    return { internetAddress };
  }
  return { recipientId: resolveMailResident(members, address.trim()).id };
}

/** Stable local addresses take precedence over potentially ambiguous handles. */
export function resolveMailResident(members: readonly Member[], address: string): Member {
  const residents = members.filter((m) => m.actor === 'ai' && personas.some((p) => personaMemberId(p.id) === m.id));
  const byId = residents.filter((m) => m.id === address || m.id === personaMemberId(address));
  const matches = byId.length ? byId : residents.filter((m) => m.handle === address);
  if (matches.length !== 1) invalid('宛先の住人が見つからないか、ハンドルが重複しています。MEMBERS の宛先を使ってください。');
  return matches[0]!;
}

/** Validate the whole conference before a direct write or atomic backup restore. */
export function validateConference(value: unknown): asserts value is ConferenceState {
  fields(value, ['version', 'conferenceId', 'nextNumber', 'contributions']);
  if (value.version !== 1 || value.conferenceId !== CONFERENCE_ID || !Array.isArray(value.contributions)) invalid('Invalid conference.');
  integer(value.nextNumber, 1);
  const ids = new Set<string>();
  let previous = 0;
  for (const row of value.contributions) {
    fields(row, ['id', 'number', 'authorId', 'title', 'body', 'createdAt', 'origin'], ['replyToPostId']);
    string(row.id); string(row.authorId); integer(row.number, 1); timestamp(row.createdAt);
    if (row.id.length > 256 || row.authorId.length > 128 || ids.has(row.id) ||
        (row.number as number) <= previous || (row.number as number) >= (value.nextNumber as number) ||
        !['local-human', 'local-seed:conference-v1'].includes(row.origin as string)) invalid('Invalid conference identity, order or provenance.');
    for (const [key, max] of [['title', 200], ['body', 20000]] as const) {
      string(row[key]);
      if (row[key].length > max || /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(row[key]) ||
          (key === 'title' && row[key].includes('\n'))) invalid('Invalid conference text.');
    }
    if (row.replyToPostId !== undefined) {
      string(row.replyToPostId);
      if (!ids.has(row.replyToPostId)) invalid('Conference replies require an earlier contribution in the same conference.');
    }
    ids.add(row.id); previous = row.number as number;
  }
}

export function validateConferenceMembers(state: ConferenceState, members: readonly Member[]): void {
  for (const row of state.contributions) {
    const author = members.find((m) => m.id === row.authorId);
    if (!author || (row.origin === 'local-human' ? author.actor !== 'human' :
        author.actor !== 'ai' || !personas.some((p) => personaMemberId(p.id) === author.id))) invalid('Invalid conference author/provenance.');
  }
}

/** Validate identities and complete reference chains before any state replacement. */
export function validateNetNews(value: unknown): asserts value is NetNewsState {
  fields(value, ['version', 'nextNumbers', 'contributions']);
  if (value.version !== 1 || !Array.isArray(value.contributions)) invalid('Invalid NetNews state.');
  fields(value.nextNumbers, netNewsGroups.map((g) => g.name));
  const expected = Object.fromEntries(netNewsGroups.map((g) => [g.name, 4]));
  const parents = new Map(netNewsGroups.flatMap((g) => g.articles.map((a) => [a.messageId, {
    group: g.name, number: a.number, references: a.references?.split(' ') ?? [], createdAt: a.date,
  }] as const)));
  const ids = new Set<string>();
  for (const row of value.contributions) {
    fields(row, ['id', 'group', 'number', 'authorId', 'title', 'body', 'createdAt', 'origin', 'messageId', 'references'], ['parentMessageId']);
    string(row.id); string(row.group); string(row.authorId); integer(row.number, 4); timestamp(row.createdAt);
    if (!Object.hasOwn(expected, row.group) || row.number !== expected[row.group] ||
        row.origin !== 'local-human' || ids.has(row.id) || row.id.length > 256 || row.authorId.length > 128 ||
        /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(row.id + row.authorId) ||
        row.messageId !== localNetNewsMessageId(row.group, row.number as number)) invalid('Invalid NetNews identity, number or provenance.');
    for (const [key, max] of [['title', 200], ['body', 20000]] as const) {
      string(row[key]);
      if (row[key].length > max || /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(row[key]) ||
          (key === 'title' && row[key].includes('\n'))) invalid('Invalid NetNews text.');
    }
    if (!Array.isArray(row.references)) invalid('Invalid NetNews References.');
    let references: string[] = [];
    if (row.parentMessageId !== undefined) {
      string(row.parentMessageId);
      const parent = parents.get(row.parentMessageId);
      if (!parent || parent.group !== row.group || parent.number >= (row.number as number) ||
          Date.parse(parent.createdAt) > Date.parse(row.createdAt as string)) invalid('NetNews followups require an earlier same-group parent.');
      references = [...parent.references, row.parentMessageId];
    }
    if (row.references.length !== references.length || row.references.some((id, i) => id !== references[i])) invalid('Invalid NetNews reference chain.');
    ids.add(row.id); expected[row.group]!++;
    parents.set(row.messageId as string, { group: row.group, number: row.number as number, references, createdAt: row.createdAt as string });
  }
  for (const group of netNewsGroups) {
    integer(value.nextNumbers[group.name], 4);
    if (value.nextNumbers[group.name] !== expected[group.name]) invalid('Invalid NetNews counter.');
  }
}

export function validateNetNewsMembers(state: NetNewsState, members: readonly Member[]): void {
  for (const row of state.contributions) {
    if (!members.some((m) => m.id === row.authorId && m.actor === 'human')) invalid('Invalid NetNews human author.');
  }
}
