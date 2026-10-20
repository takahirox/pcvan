import {
  invalid, RepositoryError, stores, validateActivity, validateBackup, validateRecord, validateSession,
} from './schema';
import type { AiActivity, AiRunStatus, Backup, Forum, JsonValue, Key, Member, NewPost, Post, Records, Session, Store } from './schema';
import { COMMAND_HISTORY_LIMIT } from '../history';
import { ACTIVITY_SETTING, emptyActivity, planActivity } from '../ai/activity';
import { models } from '../ai/personas';
import { postInput, validateGeneration } from '../ai/generation';

export * from './schema';
export const DATABASE_NAME = 'pcvan-local';
export const DATABASE_VERSION = 1;
export const ACTIVE_MEMBER_SETTING = 'active-human-member';
export interface ForumDestination { keyword: 'MITI' | 'DAISIZEN'; boardNo: number; name: string }
const allStores = [...stores, 'session'];
const emptySession = (): Session => ({ lastLoginAt: null, lastLogoutAt: null, commandHistory: [] });

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
    opening.onupgradeneeded = () => {
      const db = opening.result;
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
      resolve(new LocalRepository(db));
    };
  });
}

export class LocalRepository {
  constructor(private readonly db: IDBDatabase) {}

  close(): void { this.db.close(); }

  private async transaction<T>(scope: string[], mode: IDBTransactionMode,
    action: (tx: IDBTransaction) => Promise<T>, signal?: AbortSignal): Promise<T> {
    try {
      signal?.throwIfAborted();
      const tx = this.db.transaction(scope, mode);
      const abort = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      signal?.addEventListener('abort', abort, { once: true });
      const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted.', 'AbortError'));
      });
      // Requests can fail before action() returns; always observe transaction failure.
      void done.catch(() => {});
      try {
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
  put<S extends Exclude<Store, 'posts'>>(store: S, value: Records[S]): Promise<Records[S]> {
    const row = structuredClone(value);
    return this.transaction(allStores, 'readwrite', async (tx) => {
      if (!['members', 'sigs', 'forums', 'readStates', 'settings'].includes(store)) invalid('This store does not support put.');
      validateRecord(store, row);
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
      await request(tx.objectStore(store).put(row));
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
      const referenced = async (table: Store, index: string, match: IDBValidKey) =>
        (await request(tx.objectStore(table).index(index).count(match))) > 0;
      let hasChildren = false;
      if (store === 'members') hasChildren = await referenced('posts', 'authorId', key) || await referenced('readStates', 'memberId', key);
      if (store === 'sigs') hasChildren = await referenced('forums', 'sigId', key);
      if (store === 'forums') {
        hasChildren = (await request(tx.objectStore('posts').index('forumNumber')
          .count(IDBKeyRange.bound([key, 0], [key, Number.MAX_SAFE_INTEGER])))) > 0 || await referenced('readStates', 'forumId', key);
      }
      if (store === 'posts') hasChildren = await referenced('posts', 'replyToPostId', key);
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

  private async readActivity(tx: IDBTransaction, now: string): Promise<AiActivity> {
    const row: Records['settings'] | undefined = await request(tx.objectStore('settings').get(ACTIVITY_SETTING));
    const state = row?.value ?? emptyActivity(now);
    validateActivity(state);
    return state;
  }

  private async writeActivity(tx: IDBTransaction, state: AiActivity): Promise<AiActivity> {
    validateActivity(state);
    await request(tx.objectStore('settings').put({ id: ACTIVITY_SETTING, value: state as unknown as JsonValue }));
    return state;
  }

  /** Opt-in applies from now, never accrues work while disabled. Zero also drops the pending batch. */
  configureActivity(maxPosts: number, modelId: string, now = new Date().toISOString()): Promise<AiActivity> {
    return this.transaction(['settings'], 'readwrite', async (tx) => {
      if (!models.some((model) => model.id === modelId)) invalid('Unknown model.');
      const state = await this.readActivity(tx, now);
      return this.writeActivity(tx, { ...state, maxPosts, modelId, lastActivityAt: now,
        batch: maxPosts === 0 ? null : state.batch });
    });
  }

  /** Advance the watermark and persist the entire bounded plan in one transaction. */
  openActivity(now = new Date().toISOString()): Promise<AiActivity> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      // Before opt-in the existing session timestamps suffice: no AI setting or work is created.
      if (!await request(tx.objectStore('settings').count(ACTIVITY_SETTING))) return emptyActivity(now);
      const state = await this.readActivity(tx, now);
      const timestamp = new Date(Math.max(Date.parse(now), Date.parse(state.lastActivityAt))).toISOString();
      const unfinished = state.batch?.runs.some((run) => run.status !== 'committed');
      const batch = !state.maxPosts ? null : unfinished ? state.batch
        : planActivity(await this.snapshot(tx), state, timestamp);
      return this.writeActivity(tx, { ...state, lastActivityAt: timestamp, batch });
    });
  }

  touchActivity(now = new Date().toISOString()): Promise<AiActivity> {
    return this.transaction(['settings'], 'readwrite', async (tx) => {
      if (!await request(tx.objectStore('settings').count(ACTIVITY_SETTING))) return emptyActivity(now);
      const state = await this.readActivity(tx, now);
      return this.writeActivity(tx, { ...state,
        lastActivityAt: new Date(Math.max(Date.parse(now), Date.parse(state.lastActivityAt))).toISOString() });
    });
  }

  setAiRunStatus(id: string, status: Exclude<AiRunStatus, 'committed'>): Promise<AiActivity> {
    return this.transaction(['settings'], 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, new Date().toISOString());
      const run = state.batch?.runs.find((row) => row.id === id);
      if (!run || !state.maxPosts) invalid('AI activity is disabled or the run is missing.');
      if (run.status !== 'committed') run.status = status;
      return this.writeActivity(tx, state);
    });
  }

  /** Run status, identity, number and result share a commit. No model work runs inside IDB. */
  commitAiRun(id: string, raw: string, signal?: AbortSignal): Promise<Post | undefined> {
    return this.transaction(allStores, 'readwrite', async (tx) => {
      const state = await this.readActivity(tx, new Date().toISOString());
      const run = state.batch?.runs.find((row) => row.id === id);
      const existing: Post | undefined = await request(tx.objectStore('posts').get(id));
      // Stable post keys also cover an uncertain commit acknowledgement / old batch retry.
      if (existing) {
        if (existing.simulation?.runId !== id) invalid('AI run ID collision.');
        if (run) { run.status = 'committed'; await this.writeActivity(tx, state); }
        return existing;
      }
      if (!run || !state.maxPosts) invalid('AI activity is disabled or the run is missing.');
      if (run.status === 'committed') return undefined; // A later explicit deletion stays deleted.
      if (run.status !== 'running') invalid('AI run is not running.');
      const target = { personaId: run.personaId, forumId: run.forumId,
        ...(run.replyToPostId === undefined ? {} : { replyToPostId: run.replyToPostId }) };
      const generated = validateGeneration(raw, await this.snapshot(tx), target);
      const input = postInput(generated, state.batch!.modelId);
      input.post.simulation = { runId: id, simulatedAt: run.simulatedAt, fictional: true };
      await this.registerAi(tx, input.member, input.post);
      const post = await this.insertPost(tx, input.post, id);
      run.status = 'committed';
      await this.writeActivity(tx, state);
      return post;
    }, signal);
  }

  private async snapshot(tx: IDBTransaction): Promise<Backup> {
    const backup: Backup = { format: 'pcvan-local', version: 1, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [], session: null };
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

  async replaceFromJson(text: string, options: { confirmReplace: boolean }): Promise<void> {
    if (options?.confirmReplace !== true) throw new RepositoryError('confirmation-required', 'Replacing all local data requires explicit confirmation.');
    let backup: unknown;
    try { backup = JSON.parse(text); } catch { invalid('Backup is not valid JSON.'); }
    validateBackup(backup);
    // No writes until the entire document passes validation. Clear + insert is one
    // transaction, so any constraint, quota, or write error restores the old world.
    await this.transaction(allStores, 'readwrite', async (tx) => {
      for (const store of allStores) await request(tx.objectStore(store).clear());
      for (const store of stores) {
        for (const row of backup[store]) await request(tx.objectStore(store).add(row));
      }
      if (backup.session !== null) await request(tx.objectStore('session').put(backup.session, 'current'));
    });
  }
}
