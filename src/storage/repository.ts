import { bulletin } from '../bulletin';
import { netNewsState, netNewsGroups, localNetNewsMessageId } from '../netnews';
import { NETNEWS_SETTING, validateNetNews, validateNetNewsMembers } from './schema';
import type { LocalNetNewsArticle } from './schema';
import { CALENDAR_SETTING, initialCalendar } from '../calendar';
import { conferenceState, starterConference } from '../conference';
import { CONFERENCE_SETTING, validateConference, validateConferenceMembers } from './schema';
import type { Contribution } from './schema';
import { OLT_SETTING, oltState, observeOlt, appendOlt, attendance, VISITOR_LEASE, iso, validOltText,
  validateOlt, validateOltMembers, oltAuthorization, oltEnabled } from '../olt-state';
import type { OltRoom, OltState, OltTurn, RoomId } from '../olt-state';
import { planOltTurn, commitOltText } from '../ai/olt';
import {
  invalid, RepositoryError, stores, validateActivity, validateBackup, validateRecord, validateSession, validateResidents, validateMailRelations, resolveMailDestination,
} from './schema';
import type { AiActivity, AiRunStatus, Backup, Forum, JsonValue, Key, Mail, MailIdentity, Member, NewPost, Post, Records, Session, Store } from './schema';
import { COMMAND_HISTORY_LIMIT } from '../history';
import { ACTIVITY_SETTING, emptyActivity, initialDue, migrateActivity, scheduleActivity, setupContext } from '../ai/activity';
import { aiOrigin, models, personas, personaMemberId, residentProfiles, RESIDENTS_SETTING } from '../ai/personas';
import type { ResidentProfile, ResidentSettings } from '../ai/personas';
import { wakaba } from '../wakaba';
import { expandedBoards, additionalSigs } from '../communities';
import evidence from '../../data/pcvan/sig-evidence.json' with { type: 'json' };
import { WORLD_SETTING, INTERNET_SAMPLE_ORIGIN } from './schema';
import { canPopulateCommunity, communityBoards, communityPosts, wakabaPosts, bulletinPosts, expandedPosts, canExpandCommunity, SEED_FIXTURE } from './community';
import { validateMailGeneration } from '../ai/mail';
import { postInput, validateGeneration } from '../ai/generation';

export * from './schema';
export const DATABASE_NAME = 'pcvan-local';
export const DATABASE_VERSION = 2;
export const ACTIVE_MEMBER_SETTING = 'active-human-member';
export interface ForumDestination { keyword: string; boardNo: number; name: string }
// Command activity watermarks and session history advance without editing the world.
export const worldContext = (data: Backup): string => JSON.stringify([data.members, data.sigs, data.forums, data.posts, data.mail ?? [], data.readStates,
  data.settings.map((row) => row.id === 'ai-activity' ? { ...row, value: { ...(row.value as object), lastActivityAt: null } } : row)]);
/** Fence open profile editors across world replacement and concurrent edits. */
export function residentContext(content: Pick<Backup, 'settings'>): string {
  return JSON.stringify([content.settings.find((row) => row.id === WORLD_SETTING)?.value, residentProfiles(content)]);
}

const allStores = [...stores, 'session'];
const emptySession = (): Session => ({ lastLoginAt: null, lastLogoutAt: null, commandHistory: [] });

/** An individual pause withdraws unsaved actions while preserving committed history. */
function removePausedRuns(state: AiActivity, profiles: readonly ResidentProfile[]): void {
  if (state.batch) state.batch.runs = state.batch.runs.filter((run) => run.status === 'committed' ||
    profiles.some((profile) => profile.id === run.personaId && profile.frequency > 0));
}

export function createRecordId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function storageError(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error;
  const quota = error instanceof DOMException && error.name === 'QuotaExceededError';
  return new RepositoryError(quota ? 'quota' : 'storage', quota
    ? 'Browser storage is full. Export a backup and free space before trying again.'
    : 'Local storage operation failed. Export a backup if possible; check browser storage permissions.',
  { cause: error });
}

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
}

export function openRepository(name = DATABASE_NAME): Promise<LocalRepository> {
  return new Promise((resolve, reject) => {
    let opening: IDBOpenDBRequest;
    let blocked = false;
    try {
      if (!globalThis.indexedDB) throw new RepositoryError('unavailable', 'IndexedDB is unavailable in this browser.');
      opening = indexedDB.open(name, DATABASE_VERSION);
    } catch (error) { reject(storageError(error)); return; }
    opening.onupgradeneeded = (event) => {
      const db = opening.result;
      if (event.oldVersion < 1) {
        db.createObjectStore('members', { keyPath: 'id' });
        db.createObjectStore('sigs', { keyPath: 'id' });
        db.createObjectStore('forums', { keyPath: 'id' }).createIndex('sigId', 'sigId');
        const posts = db.createObjectStore('posts', { keyPath: 'id' });
        posts.createIndex('forumNumber', ['forumId', 'number'], { unique: true });
        posts.createIndex('authorId', 'authorId');
        posts.createIndex('replyToPostId', 'replyToPostId');
        const reads = db.createObjectStore('readStates', { keyPath: ['memberId', 'forumId'] });
        reads.createIndex('memberId', 'memberId');
        reads.createIndex('forumId', 'forumId');
        db.createObjectStore('settings', { keyPath: 'id' });
        db.createObjectStore('session');
      }
      if (event.oldVersion < 2) {
        const mail = db.createObjectStore('mail', { keyPath: 'id' });
        mail.createIndex('number', 'number', { unique: true });
        mail.createIndex('senderId', 'senderId');
        mail.createIndex('recipientId', 'recipientId');
        mail.createIndex('replyToMailId', 'replyToMailId');
      }
    };
    opening.onblocked = () => {
      blocked = true;
      reject(new RepositoryError('blocked', 'Close other PC-VAN tabs and retry the storage upgrade.'));
    };
    opening.onerror = () => reject(storageError(opening.error));
    opening.onsuccess = () => {
      const db = opening.result;
      // A blocked open cannot be cancelled; close it if it eventually succeeds.
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      const epoch = db.transaction('session', 'readonly').objectStore('session').get('world-generation');
      epoch.onerror = () => { db.close(); reject(storageError(epoch.error)); };
      epoch.onsuccess = () => resolve(new LocalRepository(db, epoch.result ?? null));
    };
  });
}

export class LocalRepository {
  readonly notificationSource = createRecordId();
  constructor(private readonly db: IDBDatabase, private generation: string | null = null) {}

  close(): void { this.db.close(); }

  private notifySetupChanged(replaced: boolean | 'reset' = false): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const channel = new BroadcastChannel(`pcvan-ai-setup:${this.db.name}`);
      channel.postMessage({ kind: replaced === 'reset' ? 'reset' : replaced ? 'replace' : 'settings', source: this.notificationSource });
      channel.close();
    } catch { /* Optional notifications must not turn a committed write into a failure. */ }
  }

  private async transaction<T>(scope: string[], mode: IDBTransactionMode,
    action: (tx: IDBTransaction) => Promise<T>, signal?: AbortSignal): Promise<T> {
    try {
      signal?.throwIfAborted();
      // The private epoch is outside JSON backups. Every operation checks it in
      // its own transaction, so even suspended tabs or missed notifications
      // cannot write pre-reset drafts/settings back into the new world.
      const expected = this.generation;
      const tx = this.db.transaction([...new Set([...scope, 'session'])], mode);
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      signal?.addEventListener('abort', abort, { once: true });
      const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted.', 'AbortError'));
      });
      // Requests can fail before action() returns; always observe transaction failure.
      void done.catch(() => {});
      try {
        const current = (await request(tx.objectStore('session').get('world-generation'))) ?? null;
        if (current !== expected) throw new RepositoryError('stale', '世界が置き換えられたため、このタブを再読み込みしてください。');
        const result = await action(tx);
        await done;
        return result;
      } catch (error) {
        try { tx.abort(); } catch { /* Already completed or aborted. */ }
        await done.catch(() => {});
        throw error;
      } finally { signal?.removeEventListener('abort', abort); }
    } catch (error) { throw storageError(error); }
  }

  get<S extends Store>(store: S, key: Key<S>): Promise<Records[S] | undefined> {
    return this.transaction([store], 'readonly', (tx) => request(tx.objectStore(store).get(key)));
  }

  list<S extends Store>(store: S): Promise<Records[S][]> {
    return this.transaction([store], 'readonly', (tx) => request(tx.objectStore(store).getAll()));
  }

  listForums(sigId: string): Promise<Forum[]> {
    return this.transaction(['forums'], 'readonly', async (tx) => {
      const forums: Forum[] = await request(tx.objectStore('forums').index('sigId').getAll(sigId));
      return forums.sort((a, b) => a.boardNo - b.boardNo || a.id.localeCompare(b.id));
    });
  }

  listPosts(forumId: string, { afterNumber = 0, limit }: { afterNumber?: number; limit?: number } = {}): Promise<Post[]> {
    return this.transaction(['posts'], 'readonly', async (tx) => {
      if (!Number.isSafeInteger(afterNumber) || afterNumber < 0 ||
          (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 0xffff_ffff))) invalid('Invalid post query range.');
      if (afterNumber === Number.MAX_SAFE_INTEGER) return [];
      const range = IDBKeyRange.bound([forumId, afterNumber], [forumId, Number.MAX_SAFE_INTEGER], true, false);
      return request(tx.objectStore('posts').index('forumNumber').getAll(range, limit));
    });
  }

  // Relationship-sensitive mutations share a scope so deletes/imports cannot race
  // with child creation in another tab. No external asynchronous work occurs in tx.
  put<S extends Exclude<Store, 'posts' | 'mail'>>(store: S, value: Records[S]): Promise<Records[S]> {
    const row = structuredClone(value);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (!['members', 'sigs', 'forums', 'readStates', 'settings'].includes(store)) invalid('This store does not support put.');
      validateRecord(store, row);
      if (store === 'settings' && (row as Records['settings']).id === CALENDAR_SETTING) {
        const existing = await request(tx.objectStore('settings').get(CALENDAR_SETTING));
        if (existing && existing.value.sourceAnchor !== ((row as Records['settings']).value as { sourceAnchor: string }).sourceAnchor)
          invalid('The world calendar can only be replaced by import or reset.');
      }
      if (store === 'members') {
        const member = row as Member;
        const content = await this.snapshot(tx);
        validateMailRelations(content.mail ?? [], [...content.members.filter((m) => m.id !== member.id), member]);
        validateNetNewsMembers(netNewsState(content), [...content.members.filter((m) => m.id !== member.id), member]);
        validateConferenceMembers(conferenceState(content), [...content.members.filter((m) => m.id !== member.id), member]);
        validateOltMembers(oltState(content), [...content.members.filter((m) => m.id !== member.id), member]);
      }
      if (store === 'forums') {
        const forum = row as Forum;
        if (!await request(tx.objectStore('sigs').get(forum.sigId))) invalid('Missing SIG.');
        const previous: Forum | undefined = await request(tx.objectStore('forums').get(forum.id));
        if (previous && forum.nextPostNumber < previous.nextPostNumber) invalid('Cannot decrease nextPostNumber.');
      }
      if (store === 'readStates') {
        const read = row as Records['readStates'];
        if (!await request(tx.objectStore('members').get(read.memberId)) ||
            !await request(tx.objectStore('forums').get(read.forumId))) invalid('Missing member or forum.');
      }
      if (store === 'settings' && (row as Records['settings']).id === OLT_SETTING) {
        const state = (row as Records['settings']).value; validateOlt(state);
        validateOltMembers(state, (await this.snapshot(tx)).members);
      }
      if (store === 'settings' && (row as Records['settings']).id === NETNEWS_SETTING) {
        const state = (row as Records['settings']).value; validateNetNews(state);
        validateNetNewsMembers(state, (await this.snapshot(tx)).members);
      }
      if (store === 'settings' && (row as Records['settings']).id === CONFERENCE_SETTING) {
        const state = (row as Records['settings']).value; validateConference(state);
        validateConferenceMembers(state, (await this.snapshot(tx)).members);
      }
      await request(tx.objectStore(store).put(row));
      return row;
    }).then((saved) => { if (store === 'settings') this.notifySetupChanged(); return saved; });
  }

  /** One settings transaction allocates numbers, checks parents and deduplicates retries. */
  createConferenceContribution(input: Pick<Contribution, 'id' | 'authorId' | 'title' | 'body' | 'replyToPostId'>,
    now = new Date().toISOString()): Promise<Contribution> {
    const draft = structuredClone(input);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const content = await this.snapshot(tx), state = conferenceState(content);
      const existing = state.contributions.find((row) => row.id === draft.id);
      if (existing) {
        if (existing.authorId !== draft.authorId || existing.title !== draft.title || existing.body !== draft.body ||
            existing.replyToPostId !== draft.replyToPostId) invalid('Contribution ID is already in use.');
        return existing;
      }
      const row: Contribution = { ...draft, number: state.nextNumber++, createdAt: now, origin: 'local-human' };
      state.contributions.push(row);
      validateConference(state); validateConferenceMembers(state, content.members);
      await request(tx.objectStore('settings').put({ id: CONFERENCE_SETTING, value: state }));
      return row;
    });
  }

  /** Allocate only after resolving the pinned parent; retries keep their original identity. */
  createNetNewsArticle(input: Pick<LocalNetNewsArticle, 'id' | 'group' | 'authorId' | 'title' | 'body' | 'parentMessageId'>,
    now = new Date().toISOString()): Promise<LocalNetNewsArticle> {
    const draft = structuredClone(input);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const content = await this.snapshot(tx), state = netNewsState(content);
      const existing = state.contributions.find((a) => a.id === draft.id);
      if (existing) {
        if (existing.group !== draft.group || existing.authorId !== draft.authorId || existing.title !== draft.title ||
            existing.body !== draft.body || existing.parentMessageId !== draft.parentMessageId) invalid('NetNews draft ID is already in use.');
        return existing;
      }
      const group = netNewsGroups.find((g) => g.name === draft.group);
      if (!group) invalid('Unknown NetNews group.');
      const parent = draft.parentMessageId === undefined ? undefined :
        state.contributions.find((a) => a.group === draft.group && a.messageId === draft.parentMessageId) ??
        group.articles.find((a) => a.messageId === draft.parentMessageId);
      if (draft.parentMessageId !== undefined && !parent) invalid('Missing same-group NetNews parent.');
      const prior = parent ? (Array.isArray(parent.references) ? parent.references : parent.references?.split(' ') ?? []) : [];
      const number = state.nextNumbers[draft.group]!++;
      const row: LocalNetNewsArticle = { ...draft, number, createdAt: now, origin: 'local-human',
        messageId: localNetNewsMessageId(draft.group, number), references: parent ? [...prior, parent.messageId] : [] };
      state.contributions.push(row);
      validateNetNews(state); validateNetNewsMembers(state, content.members);
      await request(tx.objectStore('settings').put({ id: NETNEWS_SETTING, value: state }));
      return row;
    });
  }

  createPost(value: NewPost): Promise<Post> {
    const input = structuredClone(value);
    return this.transaction(allStores, 'readwrite', (tx) => this.insertPost(tx, input));
  }

  /** Register a fictional AI and post atomically; never overwrite an existing identity. */
  createAiPost(member: Member, value: NewPost): Promise<Post> {
    const author = structuredClone(member);
    const input = structuredClone(value);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      await this.registerAi(tx, author, input);
      return this.insertPost(tx, input);
    });
  }

  private async registerAi(tx: IDBTransaction, author: Member, input: NewPost): Promise<void> {
    validateRecord('members', author);
    if (author.actor !== 'ai' || input.authorId !== author.id || !input.origin.startsWith('local-ai:webllm:')) {
      invalid('Expected an identified local AI post.');
    }
    const members = tx.objectStore('members');
    const existing: Member | undefined = await request(members.get(author.id));
    if (existing && (existing.actor !== 'ai' || existing.handle !== author.handle)) invalid('AI member ID is already in use.');
    if (!existing) await request(members.add(author));
  }

  private async insertPost(tx: IDBTransaction, input: NewPost, id = createRecordId()): Promise<Post> {
    const forums = tx.objectStore('forums');
    const forum: Forum | undefined = await request(forums.get(input.forumId));
    if (!forum) invalid('Missing forum.');
    if (!await request(tx.objectStore('members').get(input.authorId))) invalid('Missing author.');
    const post: Post = { ...input, id, number: forum.nextPostNumber, createdAt: new Date().toISOString() };
    validateRecord('posts', post);
    if (post.replyToPostId !== undefined) {
      const parent: Post | undefined = await request(tx.objectStore('posts').get(post.replyToPostId));
      if (!parent || parent.forumId !== post.forumId) invalid('Missing reply parent in this forum.');
    }
    if (forum.nextPostNumber === Number.MAX_SAFE_INTEGER) invalid('Post number limit reached.');
    await request(tx.objectStore('posts').add(post));
    await request(forums.put({ ...forum, nextPostNumber: forum.nextPostNumber + 1 }));
    return post;
  }

  createHumanMember(handle: string): Promise<Member> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const member: Member = { id: createRecordId(), handle, actor: 'human' };
      validateRecord('members', member);
      await request(tx.objectStore('members').add(member));
      await request(tx.objectStore('settings').put({ id: ACTIVE_MEMBER_SETTING, value: member.id }));
      return member;
    });
  }

  /** Create an empty local board only as part of a successful, explicit send. */
  createForumPost(destination: ForumDestination, draft: Omit<NewPost, 'forumId'>): Promise<Post> {
    const input = structuredClone(draft);
    const target = structuredClone(destination);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (!input.title.trim() || !input.body.trim()) invalid('Title and body must not be blank.');
      const member: Member | undefined = await request(tx.objectStore('members').get(input.authorId));
      if (member?.actor !== 'human') invalid('Select a local human member.');
      const sigStore = tx.objectStore('sigs');
      const sigs: Records['sigs'][] = await request(sigStore.getAll());
      const matching = sigs.filter((sig) => sig.keyword.toUpperCase() === target.keyword);
      if (matching.length > 1) invalid('Ambiguous local SIG.');
      const sig = matching[0] ?? { id: createRecordId(), keyword: target.keyword, title: target.keyword };
      if (!matching.length) await request(sigStore.add(sig));
      const forumStore = tx.objectStore('forums');
      const forums: Forum[] = await request(forumStore.index('sigId').getAll(sig.id));
      const boards = forums.filter((forum) => forum.boardNo === target.boardNo);
      if (boards.length > 1) invalid('Ambiguous local forum.');
      const forum = boards[0] ?? {
        id: createRecordId(), sigId: sig.id, boardNo: target.boardNo, name: target.name, nextPostNumber: 1,
      };
      validateRecord('forums', forum);
      if (!boards.length) await request(forumStore.add(forum));
      return this.insertPost(tx, { ...input, forumId: forum.id });
    });
  }

  /** Resolve a resident or explicit Internet address and allocate the number atomically. */
  createHumanMail(draft: { id: string; senderId: string; recipient: string; subject: string; body: string; replyToMailId?: string }): Promise<Mail> {
    const input = structuredClone(draft);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (!input || typeof input !== 'object' || Array.isArray(input) ||
          ['id', 'senderId', 'recipient', 'subject', 'body'].some((key) => typeof input[key as keyof typeof input] !== 'string') ||
          Object.keys(input).some((key) => !['id', 'senderId', 'recipient', 'subject', 'body', 'replyToMailId'].includes(key))) invalid('Invalid mail draft.');
      const content = await this.snapshot(tx);
      const sender = content.members.find((m) => m.id === input.senderId);
      if (sender?.actor !== 'human') invalid('Select a local human member.');
      if (input.replyToMailId !== undefined && (typeof input.replyToMailId !== 'string' || !input.replyToMailId.trim())) invalid('Invalid mail reply parent.');
      const destination = resolveMailDestination(content.members, input.recipient);
      const previous = (content.mail ?? []).find((m) => m.id === input.id);
      if (previous) {
        if (previous.senderId !== sender.id || previous.recipientId !== destination.recipientId || previous.internetAddress !== destination.internetAddress || previous.subject !== input.subject ||
            previous.body !== input.body || previous.replyToMailId !== input.replyToMailId) invalid('Mail ID collision.');
        return previous;
      }
      return this.insertMail(tx, { id: input.id, senderId: sender.id, ...destination,
        subject: input.subject, body: input.body, origin: 'local-human',
        ...(input.replyToMailId !== undefined ? { replyToMailId: input.replyToMailId } : {}) });
    }).then((mail) => { this.notifySetupChanged(); return mail; });
  }

  /** Explicit Settings demonstration; concurrent retries find the same stored sample. */
  loadInternetSample(recipientId: string, expected?: string): Promise<Mail> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const content = await this.snapshot(tx);
      if (expected !== undefined && worldContext(content) !== expected) throw new RepositoryError('stale', '世界や設定が変わりました。確認し直してください。');
      if (!content.members.some((m) => m.id === recipientId && m.actor === 'human')) invalid('Select an existing human recipient.');
      const previous = (content.mail ?? []).find((m) => m.recipientId === recipientId && m.origin === INTERNET_SAMPLE_ORIGIN);
      if (previous) return previous;
      const id = `internet-sample-v1:${recipientId}`;
      if ((content.mail ?? []).some((m) => m.id === id)) invalid('Mail ID collision.');
      return this.insertMail(tx, { id, recipientId,
        senderInternetAddress: 'observer@letters.example.invalid', origin: INTERNET_SAMPLE_ORIGIN,
        subject: '秋の夜の散歩', body: 'こんにちは。\n近所の古本屋で星座の本を見つけました。昨夜は散歩の途中で、冬の星を少し探してみました。\n\n週末はラジオを聴きながら、今年の写真を整理するつもりです。そちらではどんな秋を過ごしていますか。' });
    }).then((mail) => { this.notifySetupChanged(); return mail; });
  }

  private async insertMail(tx: IDBTransaction, input: Omit<Mail, 'number' | 'createdAt' | keyof MailIdentity> & MailIdentity): Promise<Mail> {
    const content = await this.snapshot(tx);
    const maximum = (content.mail ?? []).reduce((n, m) => Math.max(n, m.number), 0);
    const number = Math.max(maximum + 1, (await request(tx.objectStore('session').get('mail-next-number'))) ?? 1);
    const row: Mail = { ...input, number, createdAt: new Date().toISOString() };
    validateRecord('mail', row);
    validateMailRelations([...(content.mail ?? []), row], content.members);
    await request(tx.objectStore('mail').add(row));
    await request(tx.objectStore('session').put(number + 1, 'mail-next-number'));
    return row;
  }

  /** Only the human recipient can mark this individual letter read. */
  markMailRead(memberId: string, mailId: string): Promise<void> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const member: Member | undefined = await request(tx.objectStore('members').get(memberId));
      const row: Mail | undefined = await request(tx.objectStore('mail').get(mailId));
      if (member?.actor !== 'human' || !row || row.recipientId !== memberId) invalid('Missing received letter.');
      if (!row.readAt) await request(tx.objectStore('mail').put({ ...row, readAt: new Date(Math.max(Date.now(), Date.parse(row.createdAt))).toISOString() }));
    }).then(() => this.notifySetupChanged());
  }

  /** A monotonic per-member/forum high-water mark, including across tabs. */
  markRead(memberId: string, postId: string): Promise<void> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const member: Member | undefined = await request(tx.objectStore('members').get(memberId));
      const post: Post | undefined = await request(tx.objectStore('posts').get(postId));
      if (member?.actor !== 'human' || !post) invalid('Missing human member or post.');
      const reads = tx.objectStore('readStates');
      const old: Records['readStates'] | undefined = await request(reads.get([memberId, post.forumId]));
      await request(reads.put({ memberId, forumId: post.forumId, lastReadNumber: Math.max(old?.lastReadNumber ?? 0, post.number) }));
    });
  }

  updatePost(id: string, changes: Pick<Post, 'title' | 'body'>): Promise<Post> {
    const input = structuredClone(changes);
    return this.transaction(['posts'], 'readwrite', async (tx) => {
      const posts = tx.objectStore('posts');
      const old: Post | undefined = await request(posts.get(id));
      if (!old) invalid('Missing post.');
      // Only text is editable; identity, allocation, provenance and relationships stay stable.
      const updated = { ...old, title: input.title, body: input.body };
      validateRecord('posts', updated);
      await request(posts.put(updated));
      return updated;
    });
  }

  delete<S extends Store>(store: S, key: Key<S>): Promise<void> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (store === 'settings' && key === CALENDAR_SETTING) invalid('The world calendar can only be removed by import or reset.');
      const referenced = async (table: Store, index: string, match: IDBValidKey) =>
        (await request(tx.objectStore(table).index(index).count(match))) > 0;
      let hasChildren = false;
      if (store === 'members') hasChildren = await referenced('posts', 'authorId', key) || await referenced('readStates', 'memberId', key) ||
        await referenced('mail', 'senderId', key) || await referenced('mail', 'recipientId', key);
      if (store === 'sigs') hasChildren = await referenced('forums', 'sigId', key);
      if (store === 'forums') {
        hasChildren = (await request(tx.objectStore('posts').index('forumNumber')
          .count(IDBKeyRange.bound([key, 0], [key, Number.MAX_SAFE_INTEGER])))) > 0 || await referenced('readStates', 'forumId', key);
      }
      if (store === 'mail') {
        hasChildren = await referenced('mail', 'replyToMailId', key) ||
          (await request<Mail[]>(tx.objectStore('mail').getAll())).some((m) => m.recipientConfirmation?.replyMailId === key);
      }
      if (store === 'posts') hasChildren = await referenced('posts', 'replyToPostId', key);
      if (store === 'members') {
        const content = await this.snapshot(tx);
        hasChildren ||= netNewsState(content).contributions.some((row) => row.authorId === key);
        hasChildren ||= conferenceState(content).contributions.some((row) => row.authorId === key);
        const state = oltState(content);
        hasChildren ||= state.rooms.some((r) => r.lines.some((l) => l.authorId === key) ||
          r.residents.some((p) => p.memberId === key) || r.visitors.some((p) => p.memberId === key));
      }
      if (hasChildren) invalid('Record is still referenced. Delete children first.');
      await request(tx.objectStore(store).delete(key));
    });
  }

  getSession(): Promise<Session | null> {
    return this.transaction(['session'], 'readonly', async (tx) => (await request(tx.objectStore('session').get('current'))) ?? null);
  }

  setSession(value: Session | null): Promise<void> {
    const session = structuredClone(value);
    return this.transaction(['session'], 'readwrite', async (tx) => {
      const store = tx.objectStore('session');
      if (session === null) await request(store.delete('current'));
      else { validateSession(session); await request(store.put(session, 'current')); }
    });
  }

  private changeSession(change: (session: Session) => void): Promise<Session> {
    return this.transaction(['session'], 'readwrite', async (tx) => {
      const store = tx.objectStore('session');
      const session: Session = (await request(store.get('current'))) ?? emptySession();
      change(session);
      validateSession(session);
      await request(store.put(session, 'current'));
      return session;
    });
  }

  startSession(): Promise<Session> {
    return this.changeSession((session) => {
      session.lastLoginAt = new Date().toISOString();
      session.commandHistory = session.commandHistory.filter((line) => line.trim()).slice(-COMMAND_HISTORY_LIMIT);
    });
  }

  endSession(): Promise<Session> {
    return this.changeSession((session) => { session.lastLogoutAt = new Date().toISOString(); });
  }

  recordCommand(line: string): Promise<Session> {
    return this.changeSession((session) => {
      if (line.trim()) session.commandHistory.push(line);
      session.commandHistory = session.commandHistory.filter((entry) => entry.trim()).slice(-COMMAND_HISTORY_LIMIT);
    });
  }

  private async initializeCalendar(tx: IDBTransaction, content: Backup, now: string): Promise<void> {
    if (content.settings.some((s) => s.id === CALENDAR_SETTING)) return;
    const row = { id: CALENDAR_SETTING, value: initialCalendar(content, now) as unknown as JsonValue };
    validateRecord('settings', row);
    await request(tx.objectStore('settings').add(row));
  }

  private async readActivity(tx: IDBTransaction, now: string): Promise<AiActivity> {
    const settings = tx.objectStore('settings');
    const row: Records['settings'] | undefined = await request(settings.get(ACTIVITY_SETTING));
    const state = row?.value ?? emptyActivity(now, createRecordId());
    validateActivity(state);
    const migrated = migrateActivity(state);
    const content = await this.snapshot(tx);
    await this.initializeCalendar(tx, content, now);
    if (!content.settings.some((r) => r.id === WORLD_SETTING)) {
      const imported = await request(tx.objectStore('session').get('imported'));
      const pristine = !imported && content.session === null && stores.every((store) => !(content[store] ?? []).length);
      await request(settings.add({ id: WORLD_SETTING, value: {
        version: 1, createdAt: now, status: imported ? 'imported' : 'legacy',
      } }));
      // The initial fixture, members, boards, provenance and activity state all
      // commit in this same transaction. Competing tabs serialize on allStores.
      if (pristine) migrated.bootstrap = true;
      else migrated.bootstrap = false;
    } else migrated.bootstrap = false;
    if (!content.settings.some((r) => r.id === RESIDENTS_SETTING)) {
      const profiles = structuredClone(personas).map((profile) => ({ ...profile,
        handle: content.members.find((m) => m.id === personaMemberId(profile.id) && m.actor === 'ai')?.handle ?? profile.handle }));
      validateResidents({ version: 1, profiles });
      await request(settings.put({ id: RESIDENTS_SETTING, value: { version: 1, profiles } }));
    }
    const profiles = residentProfiles(await this.snapshot(tx));
    // Restored membership is authoritative, including deliberately absent residents.
    // Timer/reconnect initialization must not refill an imported community.
    if (!await request(tx.objectStore('session').get('imported'))) {
      for (const profile of profiles) {
        const id = personaMemberId(profile.id);
        if (!await request(tx.objectStore('members').get(id))) {
          await request(tx.objectStore('members').add({ id, handle: profile.handle, actor: 'ai' }));
        }
      }
    }
    if (migrated.bootstrap) {
      await this.populateCommunity(tx, now);
      for (const { board, title, posts } of [
        { board: wakaba, title: 'わかばマーク', posts: wakabaPosts },
        { board: bulletin, title: '一般掲示板', posts: bulletinPosts },
      ]) {
        const sig = { id: `resident-sig:${board.keyword}`, keyword: board.keyword, title };
        const forum: Forum = { id: `resident-forum:${board.keyword}:${board.boardNo}`, sigId: sig.id,
          boardNo: board.boardNo, name: board.name, nextPostNumber: board.posts.length + 1 };
        await request(tx.objectStore('sigs').add(sig));
        await request(tx.objectStore('forums').add(forum));
        for (const post of posts(now, forum.id)) await request(tx.objectStore('posts').add(post));
      }
      validateBackup(await this.snapshot(tx));
      const state = starterConference(now);
      validateConference(state); validateConferenceMembers(state, (await this.snapshot(tx)).members);
      await request(settings.add({ id: CONFERENCE_SETTING, value: state }));
    }
    await this.expandCommunity(tx, now);
    migrated.bootstrap = false;
    removePausedRuns(migrated, profiles);
    return migrated;
  }

  private async writeActivity(tx: IDBTransaction, state: AiActivity): Promise<AiActivity> {
    validateActivity(state);
    await request(tx.objectStore('settings').put({ id: ACTIVITY_SETTING, value: state as unknown as JsonValue }));
    return state;
  }

  private async populateCommunity(tx: IDBTransaction, now: string): Promise<void> {
    if (!canPopulateCommunity(await this.snapshot(tx))) invalid('This world cannot safely receive starter posts.');
    const targets: Record<string, Forum> = {};
    for (const { keyword, boardNo } of communityBoards) {
      const content = await this.snapshot(tx);
      const sig = content.sigs.find((s) => s.keyword.toUpperCase() === keyword) ??
        { id: `resident-sig:${keyword}`, keyword, title: keyword };
      if (!content.sigs.some((s) => s.id === sig.id)) await request(tx.objectStore('sigs').add(sig));
      const forum = content.forums.find((f) => f.sigId === sig.id && f.boardNo === boardNo) ?? {
        id: `resident-forum:${keyword}:${boardNo}`, sigId: sig.id, boardNo,
        name: keyword === 'MITI' ? evidence.miti.steps[2]!.destination : evidence.daisizen.forums[0]!.label,
        nextPostNumber: 1,
      };
      if (!content.forums.some((f) => f.id === forum.id)) await request(tx.objectStore('forums').add(forum));
      targets[`${keyword}:${boardNo}`] = forum;
    }
    const posts = communityPosts(now, targets);
    for (const post of posts) {
      validateRecord('posts', post);
      await request(tx.objectStore('posts').add(post));
      const forum = Object.values(targets).find((f) => f.id === post.forumId)!;
      forum.nextPostNumber = post.number + 1;
    }
    for (const forum of Object.values(targets)) await request(tx.objectStore('forums').put(forum));
    await request(tx.objectStore('settings').put({ id: WORLD_SETTING, value: {
      version: 1, createdAt: now, status: 'seeded', fixture: SEED_FIXTURE,
    } }));
    // Check every foreign key and ordered reply before any writes can commit.
    validateBackup(await this.snapshot(tx));
  }

  /** Add only absent places to an eligible v1 world. One transaction includes the
   * version marker; imports, customized boards and deleted seeds are never refilled. */
  private async expandCommunity(tx: IDBTransaction, now: string): Promise<void> {
    const content = await this.snapshot(tx);
    if (await request(tx.objectStore('session').get('imported')) || !canExpandCommunity(content)) return;
    for (const board of expandedBoards) {
      const sigs = content.sigs.filter((s) => s.keyword.toUpperCase() === board.keyword);
      if (sigs.length > 1) continue;
      const sig = sigs[0] ?? { id: `resident-sig:${board.keyword}`, keyword: board.keyword,
        title: additionalSigs.find((s) => s.keyword === board.keyword)?.name ?? board.keyword };
      if ((!sigs.length && content.sigs.some((s) => s.id === sig.id)) ||
          content.forums.some((f) => (f.sigId === sig.id && f.boardNo === board.boardNo) ||
            f.id === `resident-forum:${board.keyword}:${board.boardNo}`)) continue;
      if (!sigs.length) {
        await request(tx.objectStore('sigs').add(sig)); content.sigs.push(sig);
      }
      const forum: Forum = { id: `resident-forum:${board.keyword}:${board.boardNo}`, sigId: sig.id,
        boardNo: board.boardNo, name: board.name, nextPostNumber: 1 };
      const posts = expandedPosts(now, `${board.keyword}:${board.boardNo}`, forum.id);
      // A reserved seed ID collision skips this place without touching existing records.
      if (posts.some((p) => content.posts.some((old) => old.id === p.id))) continue;
      for (const post of posts) await request(tx.objectStore('posts').add(post));
      forum.nextPostNumber = posts.length + 1;
      await request(tx.objectStore('forums').add(forum));
    }
    const world = content.settings.find((s) => s.id === WORLD_SETTING)!;
    await request(tx.objectStore('settings').put({ ...world, value: { ...(world.value as object), expansion: 1 } }));
    validateBackup(await this.snapshot(tx));
  }

  /** Settings confirmation is required. Re-check eligibility inside the write transaction. */
  populateEmptyCommunity(options: { confirmPopulate: boolean }, now = new Date().toISOString()): Promise<boolean> {
    if (options?.confirmPopulate !== true) return Promise.reject(new RepositoryError('confirmation-required',
      'Adding fictional starter posts requires explicit confirmation.'));
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, now);
      const content = await this.snapshot(tx);
      if (!canPopulateCommunity(content)) return false;
      if (await request(tx.objectStore('session').get('imported'))) return false;
      await this.populateCommunity(tx, now);
      await this.expandCommunity(tx, now);
      await this.writeActivity(tx, state);
      return true;
    });
  }

  /** Pause preserves pending work. Future visits restart now, without accruing a paused backlog. */
  configureActivity(maxPosts: number, modelId: string, now = new Date().toISOString()): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (!models.some((model) => model.id === modelId)) invalid('Unknown model.');
      const state = await this.readActivity(tx, now);
      return this.writeActivity(tx, { ...state, maxPosts, modelId, lastActivityAt: now,
        consent: state.consent && state.modelId === modelId,
        nextDue: initialDue(now, state.seed!) });
    }).then((state) => { this.notifySetupChanged(); return state; });
  }

  deferAiSetup(expected: string): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (setupContext(await this.snapshot(tx)) !== expected) invalid('世界や AI 設定が変わりました。現在の設定を確認してください。');
      const state = await this.readActivity(tx, new Date().toISOString());
      return this.writeActivity(tx, { ...state, setupDeferred: true });
    }).then((state) => { this.notifySetupChanged(); return state; });
  }

  /** The explicit application model-download confirmation is the consent boundary, separate from activity ON. */
  authorizeModel(modelId: string, now = new Date().toISOString(), expected?: string): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (!models.some((model) => model.id === modelId)) invalid('Unknown model.');
      const state = await this.readActivity(tx, now);
      if (expected !== undefined && setupContext(await this.snapshot(tx)) !== expected) invalid('世界や AI 設定が変わりました。現在の設定を確認して再試行してください。');
      state.consent = true; state.modelId = modelId;
      // Keep queued actions, but run them only with the explicitly authorized model.
      if (state.batch) state.batch.modelId = modelId;
      return this.writeActivity(tx, state);
    }).then((state) => { this.notifySetupChanged(); return state; });
  }

  configureResident(profile: ResidentProfile, now = new Date().toISOString(), expected?: string): Promise<AiActivity> {
    const input = structuredClone(profile);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, now);
      const content = await this.snapshot(tx);
      if (expected !== undefined && residentContext(content) !== expected) invalid('世界や住人設定が変わりました。変更を破棄してから編集し直してください。');
      const settings: ResidentSettings = { version: 1,
        profiles: residentProfiles(content).map((p) => p.id === input.id ? input : p) };
      if (!settings.profiles.some((p) => p.id === input.id)) invalid('Unknown resident.');
      validateResidents(settings);
      const member: Member | undefined = await request(tx.objectStore('members').get(personaMemberId(input.id)));
      if (member?.actor === 'human') invalid('Resident identity collides with a human.');
      await request(tx.objectStore('members').put({ id: personaMemberId(input.id), handle: input.handle, actor: 'ai' }));
      await request(tx.objectStore('settings').put({ id: RESIDENTS_SETTING, value: settings }));
      state.nextDue![input.id] = initialDue(now, state.seed!)[input.id]!;
      removePausedRuns(state, settings.profiles);
      return this.writeActivity(tx, state);
    }).then((state) => { this.notifySetupChanged(); return state; });
  }

  /** Plan and resident due times share a transaction, including across tabs. */
  openActivity(now = new Date().toISOString()): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, now);
      return this.writeActivity(tx, scheduleActivity(await this.snapshot(tx), state, now));
    });
  }

  touchActivity(now = new Date().toISOString()): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const row: Records['settings'] | undefined = await request(tx.objectStore('settings').get(ACTIVITY_SETTING));
      if (!row) return emptyActivity(now);
      const state: unknown = row.value;
      validateActivity(state);
      if (!state.maxPosts || (state.version === 2 && !state.consent)) return state;
      return this.writeActivity(tx, { ...state,
        lastActivityAt: new Date(Math.max(Date.parse(now), Date.parse(state.lastActivityAt))).toISOString() });
    });
  }

  setAiRunStatus(id: string, status: Exclude<AiRunStatus, 'committed'>): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, new Date().toISOString());
      const run = state.batch?.runs.find((row) => row.id === id);
      // A settings change in another tab may have withdrawn this queued action.
      if (!run && status === 'running') return this.writeActivity(tx, state);
      if (!run || !state.maxPosts) invalid('AI activity is disabled or the run is missing.');
      if (run.status !== 'committed') run.status = status;
      return this.writeActivity(tx, state);
    });
  }

  /** Run status, identity, number and result share a commit. No model work runs inside IDB. */
  commitAiRun(id: string, raw: string, signal?: AbortSignal): Promise<Post | Mail | undefined> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, new Date().toISOString());
      const run = state.batch?.runs.find((row) => row.id === id);
      const existing: Post | Mail | undefined = await request(tx.objectStore('posts').get(id)) ?? await request(tx.objectStore('mail').get(id));
      // Stable post keys also cover an uncertain commit acknowledgement / old batch retry.
      if (existing) {
        if (existing.simulation?.runId !== id) invalid('AI run ID collision.');
        if (run) { run.status = 'committed'; await this.writeActivity(tx, state); }
        return existing;
      }
      // Pausing a resident can withdraw a run while its model output is in flight.
      if (!run) { await this.writeActivity(tx, state); return undefined; }
      if (!state.maxPosts) invalid('AI activity is disabled or the run is missing.');
      if (run.status === 'committed') return undefined; // A later explicit deletion stays deleted.
      if (run.status !== 'running') invalid('AI run is not running.');
      if (!state.consent || state.batch!.modelId !== state.modelId || !residentProfiles(await this.snapshot(tx)).some((p) => p.id === run.personaId && p.frequency > 0)) invalid('Mail/model activity is no longer authorized.');
      if (run.mail) {
        const content = await this.snapshot(tx);
        const generated = validateMailGeneration(raw, content, run.personaId, run.mail);
        const senderId = personaMemberId(run.personaId);
        const previous = (content.mail ?? []).find((m) => m.senderId === senderId && m.recipientId === run.mail!.humanId &&
          (run.mail!.replyToMailId ? m.replyToMailId === run.mail!.replyToMailId : true));
        if (previous) { run.status = 'committed'; await this.writeActivity(tx, state); return undefined; }
        const mail = await this.insertMail(tx, { id, senderId, recipientId: run.mail.humanId,
          ...generated, origin: aiOrigin(state.modelId),
          ...(run.mail.replyToMailId ? { replyToMailId: run.mail.replyToMailId } : {}),
          simulation: { runId: id, simulatedAt: run.simulatedAt, fictional: true } });
        if (run.mail.replyToMailId) {
          const parent = content.mail!.find((m) => m.id === run.mail!.replyToMailId)!;
          if (!parent.recipientConfirmation) {
            // Operational save time, never catch-up time. Clamp a backwards clock
            // to the parent's creation instant, as with human read markers.
            const confirmed: Mail = { ...parent, recipientConfirmation: {
              at: new Date(Math.max(Date.now(), Date.parse(mail.createdAt), Date.parse(parent.createdAt))).toISOString(),
              replyMailId: mail.id, provenance: 'local-resident-reply-v1',
            } };
            validateRecord('mail', confirmed);
            validateMailRelations([...content.mail!.filter((m) => m.id !== parent.id), confirmed, mail], content.members);
            await request(tx.objectStore('mail').put(confirmed));
          }
        }
        run.status = 'committed'; await this.writeActivity(tx, state); return mail;
      }
      const target = { personaId: run.personaId, forumId: run.forumId!,
        ...(run.replyToPostId === undefined ? {} : { replyToPostId: run.replyToPostId }) };
      const generated = validateGeneration(raw, await this.snapshot(tx), target);
      const input = postInput(generated, state.batch!.modelId, await this.snapshot(tx));
      input.post.simulation = { runId: id, simulatedAt: run.simulatedAt, fictional: true };
      await this.registerAi(tx, input.member, input.post);
      const post = await this.insertPost(tx, input.post, id);
      run.status = 'committed';
      await this.writeActivity(tx, state);
      return post;
    }, signal).then((result) => { if (result && 'senderId' in result) this.notifySetupChanged(); return result; });
  }

  /** A bounded reserved setting avoids a store-version collision with SIG/mail migrations. */
  private changeOlt<T>(change: (state: OltState, content: Backup) => T, now: string, signal?: AbortSignal): Promise<T> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const content = await this.snapshot(tx), state = oltState(content, now);
      const result = change(state, content);
      validateOlt(state); validateOltMembers(state, content.members);
      await request(tx.objectStore('settings').put({ id: OLT_SETTING, value: state }));
      return result;
    }, signal);
  }

  observeRoom(clientId: string, roomId?: RoomId, memberId?: string, now = new Date().toISOString()): Promise<OltState> {
    return this.changeOlt((state, content) => {
      const at = Date.parse(now);
      if (memberId && !content.members.some((m) => m.id === memberId && m.actor === 'human')) invalid('Missing human OLT member.');
      if (!clientId || clientId.length > 128) invalid('Invalid OLT client.');
      observeOlt(state, content, at);
      for (const room of state.rooms) {
        const old = room.visitors.find((v) => v.clientId === clientId);
        if (old && (room.id !== roomId || old.memberId !== memberId)) {
          room.visitors = room.visitors.filter((v) => v.clientId !== clientId);
          if (!room.visitors.some((v) => v.memberId === old.memberId)) appendOlt(room, old.memberId, 'leave', '', 'local-presence', at);
        }
        if (room.id !== roomId || !memberId) continue;
        const present = attendance(room, at).includes(memberId);
        const visitor = room.visitors.find((v) => v.clientId === clientId);
        if (visitor) visitor.until = iso(at + VISITOR_LEASE);
        else {
          if (room.visitors.length >= 16) invalid('OLT visitor limit reached.');
          room.visitors.push({ clientId, memberId, until: iso(at + VISITOR_LEASE) });
        }
        if (!present) appendOlt(room, memberId, 'enter', '', 'local-presence', at);
      }
      return state;
    }, now);
  }

  speakRoom(roomId: RoomId, clientId: string, text: string, now = new Date().toISOString()): Promise<OltRoom> {
    return this.changeOlt((state, content) => {
      if (!validOltText(text)) invalid('発言は制御文字を含まない1〜400文字で入力してください。');
      observeOlt(state, content, Date.parse(now));
      const room = state.rooms.find((r) => r.id === roomId)!;
      const visitor = room.visitors.find((v) => v.clientId === clientId);
      if (!visitor) invalid('JOIN で入室し直してください。');
      appendOlt(room, visitor.memberId, 'say', text, 'local-human', Date.parse(now));
      return room;
    }, now);
  }

  claimRoomTurn(roomId: RoomId, now = new Date().toISOString()): Promise<OltTurn | undefined> {
    return this.changeOlt((state, content) => {
      observeOlt(state, content, Date.parse(now));
      return planOltTurn(state, state.rooms.find((r) => r.id === roomId)!, content, Date.parse(now), createRecordId());
    }, now);
  }

  finishRoomTurn(roomId: RoomId, token: string, raw?: string, signal?: AbortSignal, now = new Date().toISOString()): Promise<void> {
    return this.changeOlt((state, content) => {
      const room = state.rooms.find((r) => r.id === roomId)!, turn = room.pending;
      if (!turn || turn.id !== token) return;
      room.pending = null;
      const at = Date.parse(now);
      if (raw === undefined || !oltEnabled(content) || turn.context !== oltAuthorization(content) || Date.parse(turn.until) <= at ||
        !room.residents.some((p) => p.memberId === turn.authorId && Date.parse(p.until) > at) ||
        !room.visitors.some((v) => Date.parse(v.until) > at)) return;
      commitOltText(room, turn, raw, at);
    }, now, signal);
  }

  private async snapshot(tx: IDBTransaction): Promise<Backup> {
    const backup: Backup = { format: 'pcvan-local', version: 1, members: [], sigs: [], forums: [], posts: [], mail: [], readStates: [], settings: [], session: null };
    await Promise.all(stores.map(async (store) => {
      Object.assign(backup, { [store]: await request(tx.objectStore(store).getAll()) });
    }));
    backup.session = (await request(tx.objectStore('session').get('current'))) ?? null;
    return backup;
  }

  exportBackup(): Promise<Backup> {
    // One readonly transaction gives a consistent snapshot even during other-tab writes.
    return this.transaction(allStores, 'readonly', (tx) => this.snapshot(tx));
  }

  async exportJson(): Promise<string> { return JSON.stringify(await this.exportBackup(), null, 2); }

  /** Clear and bootstrap together: any failure restores the entire previous world. */
  async resetWorld(options: { confirmReset: boolean; expectedContext?: string }, now = new Date().toISOString()): Promise<void> {
    if (options?.confirmReset !== true) throw new RepositoryError('confirmation-required',
      'Returning to the initial state requires explicit confirmation.');
    const generation = createRecordId();
    await this.transaction(allStores, 'readwrite', async (tx) => {
      if (options.expectedContext !== undefined && worldContext(await this.snapshot(tx)) !== options.expectedContext)
        invalid('世界や設定が変わりました。現在の設定から確認し直してください。');
      for (const store of allStores) await request(tx.objectStore(store).clear());
      const state = await this.readActivity(tx, now);
      await this.writeActivity(tx, scheduleActivity(await this.snapshot(tx), state, now));
      validateBackup(await this.snapshot(tx));
      await request(tx.objectStore('session').put(generation, 'world-generation'));
    });
    this.generation = generation;
    this.notifySetupChanged('reset');
  }

  async replaceFromJson(text: string, options: { confirmReplace: boolean; expectedContext?: string }): Promise<void> {
    if (options?.confirmReplace !== true) throw new RepositoryError('confirmation-required', 'Replacing all local data requires explicit confirmation.');
    let backup: unknown;
    try { backup = JSON.parse(text); } catch { invalid('Backup is not valid JSON.'); }
    validateBackup(backup);
    const generation = createRecordId();
    // No writes until the entire document passes validation. Clear + insert is one
    // transaction, so any constraint, quota, or write error restores the old world.
    await this.transaction(allStores, 'readwrite', async (tx) => {
      if (options.expectedContext !== undefined && worldContext(await this.snapshot(tx)) !== options.expectedContext)
        invalid('世界や設定が変わりました。現在の設定から確認し直してください。');
      for (const store of allStores) await request(tx.objectStore(store).clear());
      for (const store of stores) {
        for (const row of backup[store] ?? []) {
          // A restored legacy marker must not advertise the pre-feature opt-in.
          const restored = store === 'settings' && 'id' in row && row.id === WORLD_SETTING &&
            'value' in row && (row.value as { status?: string })?.status === 'legacy'
            ? { ...row, value: { ...(row.value as object), status: 'imported' } } : row;
          await request(tx.objectStore(store).add(restored));
        }
      }
      await this.initializeCalendar(tx, backup, new Date().toISOString());
      if (backup.session !== null) await request(tx.objectStore('session').put(backup.session, 'current'));
      await request(tx.objectStore('session').put(true, 'imported'));
      await request(tx.objectStore('session').put(generation, 'world-generation'));
    });
    this.generation = generation;
    this.notifySetupChanged(true);
  }
}
