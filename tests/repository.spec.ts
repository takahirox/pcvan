import { expect, test } from '@playwright/test';
import type { Backup } from '../src/storage/schema';
import type { LocalRepository } from '../src/storage/repository';
import { backupFixture } from './backup-fixture';

declare global {
  interface Window {
    repositoryModule: typeof import('../src/storage/repository');
    repo: LocalRepository;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    window.repositoryModule = await import(path);
    window.repo = await window.repositoryModule.openRepository('test-world');
  });
});

test('a clean world is empty; all entities round-trip exactly and posts survive reload', async ({ page }) => {
  expect(await page.evaluate(() => window.repo.exportBackup())).toEqual({
    format: 'pcvan-local', version: 1, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [], session: null,
  });
  const fixture = backupFixture();
  const exported = await page.evaluate(async (data) => {
    await window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true });
    return window.repo.exportJson();
  }, fixture);
  expect(JSON.parse(exported)).toEqual(fixture);
  const created = await page.evaluate(async () => {
    await window.repo.put('settings', { id: 'new-setting', value: false });
    const post = await window.repo.createPost({ forumId: 'forum', authorId: 'human', title: 'Before reload', body: '投稿したデータ', origin: 'local-human' });
    window.repo.close();
    return post;
  });
  await page.reload();
  const result = await page.evaluate(async (json) => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path);
    const repo = await openRepository('test-world');
    const persisted = await repo.listPosts('forum');
    await repo.replaceFromJson(json, { confirmReplace: true });
    const roundTrip = await repo.exportBackup();
    const next = await repo.createPost({ forumId: 'forum', authorId: 'human', title: 'new', body: '投稿', origin: 'local-human' });
    repo.close();
    return { persisted, roundTrip, next };
  }, exported);
  expect(result.persisted).toEqual([...fixture.posts.filter((post) => post.forumId === 'forum'), created]);
  expect(result.roundTrip).toEqual(fixture);
  expect(result.next.number).toBe(8);
  expect(result.next.id).toMatch(/^[a-f0-9]{32}$/);
  expect(new Date(result.next.createdAt).toISOString()).toBe(result.next.createdAt);
});

test('invalid documents and unconfirmed replacements leave the database unchanged', async ({ page }) => {
  const fixture = backupFixture();
  await page.evaluate((data) => window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }), fixture);
  const bad: unknown[] = ['{', 'null', '{}', { ...fixture, version: 2 }, { ...fixture, format: 'other' },
    { ...fixture, session: { commandHistory: [] } }, { ...fixture, members: [...fixture.members, fixture.members[0]] },
    { ...fixture, sigs: [{ id: 'sig', keyword: 'LOCAL' }] },
    { ...fixture, forums: [{ ...fixture.forums[0], sigId: 'missing' }] },
    { ...fixture, posts: [{ ...fixture.posts[0], authorId: 'missing' }] },
    { ...fixture, posts: [{ ...fixture.posts[0], forumId: 'missing' }] },
    { ...fixture, posts: [{ ...fixture.posts[0], createdAt: 'not-a-date' }] },
    { ...fixture, posts: [fixture.posts[0], { ...fixture.posts[1], number: 1 }] },
    { ...fixture, posts: [fixture.posts[0], { ...fixture.posts[1], replyToPostId: 'third' }, fixture.posts[2]] },
    { ...fixture, posts: [{ ...fixture.posts[0], replyToPostId: 'missing' }] },
    { ...fixture, forums: [{ ...fixture.forums[0], nextPostNumber: 4 }, fixture.forums[1]] },
    { ...fixture, readStates: [{ memberId: 'missing', forumId: 'forum', lastReadNumber: 1 }] },
    { ...fixture, readStates: [...fixture.readStates, fixture.readStates[0]] },
    { ...fixture, settings: [...fixture.settings, fixture.settings[0]] },
    { ...fixture, surprise: [] },
  ];
  for (const value of bad) {
    const json = typeof value === 'string' ? value : JSON.stringify(value);
    const result = await page.evaluate(async (text) => {
      try { await window.repo.replaceFromJson(text, { confirmReplace: true }); return 'unexpected success'; }
      catch (error) { return (error as { code: string }).code; }
    }, json);
    expect(result, json).toBe('validation');
    expect(await page.evaluate(() => window.repo.exportBackup())).toEqual(fixture);
  }
  expect(await page.evaluate(async () => {
    try { await window.repo.replaceFromJson('{}', { confirmReplace: false }); }
    catch (error) { return (error as { code: string }).code; }
  })).toBe('confirmation-required');
  expect(await page.evaluate(() => window.repo.exportBackup())).toEqual(fixture);
});

test('a constraint failure or simulated quota failure during replacement rolls back clears and inserts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const original = backupFixture();
  const replacement: Backup = { ...backupFixture(), settings: [{ id: 'replacement', value: 'new data' }] };
  await page.evaluate((data) => window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }), original);
  for (const failure of ['constraint', 'quota']) {
    const code = await page.evaluate(async ({ data, failure }) => {
      const nativeAdd = IDBObjectStore.prototype.add;
      IDBObjectStore.prototype.add = function (value, key) {
        if (this.name === 'settings' && failure === 'quota') throw new DOMException('Simulated quota', 'QuotaExceededError');
        // A native unique-index request failure after earlier stores have been cleared/written.
        if (this.name === 'posts' && value.id === 'reply' && failure === 'constraint') value = { ...value, number: 1 };
        return key === undefined ? nativeAdd.call(this, value) : nativeAdd.call(this, value, key);
      };
      try { await window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }); return 'unexpected success'; }
      catch (error) { return (error as { code: string }).code; }
      finally { IDBObjectStore.prototype.add = nativeAdd; }
    }, { data: replacement, failure });
    expect(code).toBe(failure === 'quota' ? 'quota' : 'storage');
    expect(await page.evaluate(() => window.repo.exportBackup())).toEqual(original);
  }
  expect(errors).toEqual([]);
});

test('two tabs allocate unique per-forum numbers transactionally and deleted numbers are not reused', async ({ page, context }) => {
  await page.evaluate(async () => {
    await window.repo.put('members', { id: 'human', handle: '人', actor: 'human' });
    await window.repo.put('sigs', { id: 'sig', keyword: 'LOCAL', title: 'Local' });
    await window.repo.put('forums', { id: 'forum', sigId: 'sig', boardNo: 1, name: 'Forum', nextPostNumber: 1 });
    await window.repo.put('forums', { id: 'other', sigId: 'sig', boardNo: 2, name: 'Other', nextPostNumber: 1 });
  });
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:14374');
  const write = async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path);
    const repo: LocalRepository = await openRepository('test-world');
    try {
      return await Promise.all(Array.from({ length: 20 }, (_, i) => repo.createPost({
        forumId: 'forum', authorId: 'human', title: `Post ${i}`, body: '並行投稿', origin: 'local-human',
      })));
    } finally { repo.close(); }
  };
  const results = (await Promise.all([page.evaluate(write), other.evaluate(write)])).flat();
  expect(new Set(results.map((post) => post.id)).size).toBe(40);
  expect(results.map((post) => post.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  const state = await page.evaluate(async () => {
    const posts = await window.repo.listPosts('forum', { afterNumber: 38, limit: 2 });
    await window.repo.delete('posts', posts[1]!.id);
    const next = await window.repo.createPost({ forumId: 'forum', authorId: 'human', title: '', body: '', origin: 'local-human' });
    const separate = await window.repo.createPost({ forumId: 'other', authorId: 'human', title: '', body: '', origin: 'local-human' });
    return { posts, next, separate, forum: await window.repo.get('forums', 'forum') };
  });
  expect(state.posts.map((post) => post.number)).toEqual([39, 40]);
  expect(state.next.number).toBe(41);
  expect(state.separate.number).toBe(1);
  expect(state.forum?.nextPostNumber).toBe(42);
});

test('CRUD preserves references and post metadata; failed post creation leaves the counter intact', async ({ page }) => {
  const fixture = backupFixture();
  await page.evaluate((data) => window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }), fixture);
  const results = await page.evaluate(async () => {
    const errors: string[] = [];
    const attempts = [
      () => window.repo.delete('members', 'human'),
      () => window.repo.delete('sigs', 'sig'),
      () => window.repo.delete('forums', 'forum'),
      () => window.repo.delete('posts', 'first'),
      () => window.repo.put('forums', { id: 'forum', sigId: 'sig', boardNo: 1, name: 'Bad', nextPostNumber: 1 }),
      () => window.repo.put('readStates', { memberId: 'human', forumId: 'missing', lastReadNumber: 0 }),
      () => window.repo.createPost({ forumId: 'forum', authorId: 'missing', title: '', body: '', origin: 'local-human' }),
      () => window.repo.createPost({ forumId: 'forum', authorId: 'human', title: '', body: '', replyToPostId: 'third', origin: 'local-human' }),
    ];
    for (const attempt of attempts) {
      try { await attempt(); errors.push('unexpected success'); }
      catch (error) { errors.push((error as { code: string }).code); }
    }
    const updated = await window.repo.updatePost('first', { title: '編集', body: 'new\nbody' });
    await window.repo.put('members', { id: 'human', handle: '新しい名前', actor: 'human' });
    await window.repo.put('readStates', { memberId: 'human', forumId: 'forum', lastReadNumber: 8 });
    await window.repo.put('settings', { id: 'test', value: ['設定'] });
    const read = await window.repo.get('readStates', ['human', 'forum']);
    await window.repo.delete('settings', 'test');
    await window.repo.delete('posts', 'reply');
    await window.repo.delete('posts', 'first');
    await window.repo.delete('readStates', ['human', 'forum']);
    await window.repo.delete('forums', 'forum');
    return { errors, updated, read, forums: await window.repo.listForums('sig'), settings: await window.repo.list('settings') };
  });
  expect(results.errors).toEqual(Array(8).fill('validation'));
  expect(results.updated).toEqual({ ...fixture.posts[0], title: '編集', body: 'new\nbody' });
  expect(results.read?.lastReadNumber).toBe(8);
  expect(results.forums).toEqual([fixture.forums[1]]);
  expect(results.settings).toEqual(fixture.settings);
});

test('session operations persist timestamps and concurrent history appends', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const started = await window.repo.startSession();
    await Promise.all([window.repo.recordCommand('help'), window.repo.recordCommand('echo 日本語')]);
    await window.repo.endSession();
    const session = await window.repo.getSession();
    await window.repo.setSession(null);
    return { started, session, cleared: await window.repo.getSession() };
  });
  expect(result.started.lastLoginAt).toBeTruthy();
  expect(result.session?.lastLogoutAt).toBeTruthy();
  expect(result.session?.commandHistory).toEqual(['help', 'echo 日本語']);
  expect(result.cleared).toBeNull();
});

test('history retains the newest 100 commands on startup and on concurrent appends', async ({ page }) => {
  const result = await page.evaluate(async () => {
    await window.repo.setSession({ lastLoginAt: null, lastLogoutAt: null,
      commandHistory: Array.from({ length: 120 }, (_, i) => `command ${i}`) });
    const started = await window.repo.startSession();
    await Promise.all([window.repo.recordCommand('new one'), window.repo.recordCommand('new two')]);
    await window.repo.recordCommand('   ');
    return { started, saved: await window.repo.getSession() };
  });
  expect(result.started.commandHistory).toEqual(Array.from({ length: 100 }, (_, i) => `command ${i + 20}`));
  expect(result.saved?.commandHistory).toEqual([
    ...Array.from({ length: 98 }, (_, i) => `command ${i + 22}`), 'new one', 'new two',
  ]);
});

test('a failed counter write rolls back an already inserted post', async ({ page }) => {
  const fixture = backupFixture();
  await page.evaluate((data) => window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }), fixture);
  const result = await page.evaluate(async () => {
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'forums') throw new DOMException('Simulated quota', 'QuotaExceededError');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    };
    try {
      await window.repo.createPost({ forumId: 'forum', authorId: 'human', title: '', body: '', origin: 'local-human' });
      return 'unexpected success';
    } catch (error) { return (error as { code: string }).code; }
    finally { IDBObjectStore.prototype.put = nativePut; }
  });
  expect(result).toBe('quota');
  expect(await page.evaluate(() => window.repo.exportBackup())).toEqual(fixture);
});

test('version changes close old connections so an upgrade can finish', async ({ page }) => {
  const result = await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open('test-world', 2);
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => { opening.result.close(); resolve(); };
    });
    try { await window.repo.list('posts'); return 'unexpected success'; }
    catch (error) { return (error as { code: string }).code; }
  });
  expect(result).toBe('storage');
});

test('concurrent first sends initialize one local board and allocate distinct numbers', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const member = await window.repo.createHumanMember('日本語の人');
    const other = await window.repositoryModule.openRepository('test-world');
    const destination = { keyword: 'MITI' as const, boardNo: 9, name: '資料室' };
    const draft = { authorId: member.id, title: '投稿', body: '複数行\n本文', origin: 'local-human' };
    try {
      const posts = await Promise.all([window.repo.createForumPost(destination, draft), other.createForumPost(destination, draft)]);
      const separate = await other.createForumPost({ keyword: 'DAISIZEN', boardNo: 1, name: '自然の森' }, draft);
      return { member, posts, separate, backup: await window.repo.exportBackup() };
    } finally { other.close(); }
  });
  expect(result.posts.map((post) => post.number).sort()).toEqual([1, 2]);
  expect(new Set(result.posts.map((post) => post.id)).size).toBe(2);
  expect(result.posts[0]!.forumId).toBe(result.posts[1]!.forumId);
  expect(result.separate.number).toBe(1);
  expect(result.backup.sigs).toHaveLength(2);
  expect(result.backup.forums).toHaveLength(2);
  expect(result.backup.settings).toContainEqual({ id: 'active-human-member', value: result.member.id });
});

test('invalid compose targets, blank drafts and AI authors leave all content unchanged', async ({ page }) => {
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  await page.evaluate((data) => window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }), fixture);
  const errors = await page.evaluate(async () => {
    const target = { keyword: 'MITI' as const, boardNo: 9, name: '資料室' };
    const draft = { authorId: 'human', title: '返事', body: '本文', origin: 'local-human' };
    const attempts = [
      () => window.repo.createForumPost(target, { ...draft, replyToPostId: 'missing' }),
      () => window.repo.createForumPost(target, { ...draft, replyToPostId: 'third' }),
      () => window.repo.createForumPost(target, { ...draft, authorId: 'ai' }),
      () => window.repo.createForumPost(target, { ...draft, authorId: 'missing' }),
      () => window.repo.createForumPost(target, { ...draft, title: '　 ' }),
      () => window.repo.createForumPost(target, { ...draft, body: '\n ' }),
      // Creating a new SIG/board must also roll back if its reply target is invalid.
      () => window.repo.createForumPost({ keyword: 'DAISIZEN', boardNo: 1, name: '自然の森' }, { ...draft, replyToPostId: 'missing' }),
    ];
    const errors: string[] = [];
    for (const attempt of attempts) {
      try { await attempt(); errors.push('unexpected success'); }
      catch (error) { errors.push((error as { code: string }).code); }
    }
    return errors;
  });
  expect(errors).toEqual(Array(7).fill('validation'));
  expect(await page.evaluate(() => window.repo.exportBackup())).toEqual(fixture);
});

test('read high-water marks are monotonic across connections; failed writes and missing posts preserve state', async ({ page }) => {
  const fixture = backupFixture();
  fixture.readStates = [];
  await page.evaluate((data) => window.repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }), fixture);
  const result = await page.evaluate(async () => {
    const other = await window.repositoryModule.openRepository('test-world');
    try {
      await Promise.all([window.repo.markRead('human', 'reply'), other.markRead('human', 'first')]);
      const before = await window.repo.exportBackup();
      const errors: string[] = [];
      for (const [member, post] of [['human', 'missing'], ['ai', 'first'], ['missing', 'first']]) {
        try { await window.repo.markRead(member!, post!); errors.push('unexpected success'); }
        catch (error) { errors.push((error as { code: string }).code); }
      }
      const nativePut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === 'readStates') throw new DOMException('Simulated quota', 'QuotaExceededError');
        return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
      };
      try { await window.repo.markRead('human', 'third'); }
      catch (error) { errors.push((error as { code: string }).code); }
      finally { IDBObjectStore.prototype.put = nativePut; }
      return { before, after: await window.repo.exportBackup(), errors };
    } finally { other.close(); }
  });
  expect(result.before.readStates).toEqual([{ memberId: 'human', forumId: 'forum', lastReadNumber: 4 }]);
  expect(result.errors).toEqual(['validation', 'validation', 'validation', 'quota']);
  expect(result.after).toEqual(result.before);
});
