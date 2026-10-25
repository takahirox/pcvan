import { expect, test } from '@playwright/test';
import { backupFixture } from './backup-fixture';

const anchor = '2026-10-21T00:00:00.000Z';
test('atomic seed failure rolls back every record; concurrent connections seed once, preserve backups and never refill deletions', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.output')).toContainText('PC-VAN');
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository('seed-atomic'); const other = await openRepository('seed-atomic');
    const before = await repo.exportJson();
    const native = IDBObjectStore.prototype.add;
    let writes = 0; let failed = false;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts' && this.transaction.db.name === 'seed-atomic' && ++writes === 78) throw new DOMException('Simulated quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.openActivity(anchor); } catch { failed = true; }
    finally { IDBObjectStore.prototype.add = native; }
    const rolledBack = before === await repo.exportJson();
    await Promise.all([repo.openActivity(anchor), other.openActivity('2026-10-22T00:00:00.000Z')]);
    const first = await repo.exportBackup(); validateBackup(first);
    await repo.replaceFromJson(JSON.stringify(first), { confirmReplace: true });
    other.close();
    const reopened = await openRepository('seed-atomic');
    await reopened.openActivity('2026-10-23T00:00:00.000Z');
    const roundtrip = await repo.exportBackup();
    const invalidMarkers: boolean[] = [];
    for (const change of [{ status: 'unknown' }, { fixture: 'other' }, { createdAt: '1996' }, { expansion: 2 }, { status: 'legacy', expansion: 1 }]) {
      const broken = structuredClone(first);
      Object.assign(broken.settings.find((s) => s.id === 'community-world')!.value as object, change);
      const before = await repo.exportJson();
      try { await repo.replaceFromJson(JSON.stringify(broken), { confirmReplace: true }); invalidMarkers.push(false); }
      catch { invalidMarkers.push(before === await repo.exportJson()); }
    }
    // Remove children first, through the public repository API. The seed marker remains.
    for (const p of [...first.posts].sort((a, b) => b.number - a.number)) await repo.delete('posts', p.id);
    await reopened.openActivity('2026-10-24T00:00:00.000Z');
    const cleared = await repo.exportBackup();
    const repeat = await repo.populateEmptyCommunity({ confirmPopulate: true });
    repo.close(); reopened.close();
    return { failed, writes, rolledBack, first, roundtrip, cleared, repeat, invalidMarkers };
  }, anchor);
  expect(result.failed).toBe(true); expect(result.rolledBack).toBe(true); expect(result.writes).toBe(78);
  expect(result.invalidMarkers).toEqual([true, true, true, true, true]);
  expect(result.first.posts).toHaveLength(82); expect(new Set(result.first.posts.map((p) => p.id)).size).toBe(82);
  expect(result.roundtrip.posts).toEqual(result.first.posts);
  expect(result.roundtrip.settings.find((s) => s.id === 'community-world')).toEqual(result.first.settings.find((s) => s.id === 'community-world'));
  expect(result.cleared.posts).toEqual([]); expect(result.cleared.forums).toEqual(result.first.forums); expect(result.repeat).toBe(false);
});

test('legacy opt-in preserves custom directories and allocation; populated, ambiguous, colliding and imported worlds stay untouched', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ anchor, fixture }) => {
    const path = '/src/storage/repository.ts'; const communityPath = '/src/storage/community.ts'; const forumsPath = '/src/forums.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const { canPopulateCommunity } = await import(communityPath) as typeof import('../src/storage/community');
    const { forumPosts } = await import(forumsPath) as typeof import('../src/forums');
    const repo = await openRepository('seed-legacy');
    await repo.put('members', { id: 'existing-human', handle: '昔からの利用者', actor: 'human' });
    await repo.put('sigs', { id: 'custom-miti', keyword: 'miti', title: '私の資料室' });
    await repo.put('forums', { id: 'custom-board', sigId: 'custom-miti', boardNo: 9, name: '保存した名前', nextPostNumber: 41 });
    await repo.openActivity(anchor);
    const legacy = await repo.exportBackup();
    let refused = false;
    try { await repo.populateEmptyCommunity({ confirmPopulate: false }); } catch { refused = true; }
    const another = await openRepository('seed-legacy');
    const optins = await Promise.all([repo.populateEmptyCommunity({ confirmPopulate: true }, anchor), another.populateEmptyCommunity({ confirmPopulate: true }, anchor)]);
    const populated = await repo.exportBackup();
    const human = await repo.createPost({ forumId: 'custom-board', authorId: 'existing-human', title: '参加します', body: '返信です', origin: 'local-human', replyToPostId: 'seed:v1:repair-1' });
    const notEmpty = await repo.populateEmptyCommunity({ confirmPopulate: true });
    const empty = { ...fixture, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [], session: null };
    await repo.replaceFromJson(JSON.stringify(empty), { confirmReplace: true });
    const immediate = forumPosts(await repo.exportBackup(), 'MITI', 9);
    await repo.openActivity(anchor); await repo.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    const imported = await repo.exportBackup(); const importedOptin = await repo.populateEmptyCommunity({ confirmPopulate: true });
    await repo.replaceFromJson(JSON.stringify(imported), { confirmReplace: true });
    await repo.openActivity(anchor); const importedAgain = await repo.exportBackup();
    // Even a legacy marker in a backup must not make a restored world eligible.
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    const importedLegacy = canPopulateCommunity(await repo.exportBackup());
    const ambiguous = structuredClone(legacy); ambiguous.sigs.push({ id: 'duplicate', keyword: 'MITI', title: 'duplicate' });
    const collision = structuredClone(legacy); collision.members.push({ id: 'fictional-ai:hoshimori', handle: '人間', actor: 'human' });
    // Existing posts with no marker are never retroactively populated.
    const old = await openRepository('seed-old-populated');
    for (const s of fixture.sigs) await old.put('sigs', s);
    for (const f of fixture.forums) await old.put('forums', f);
    for (const m of fixture.members) await old.put('members', m);
    await old.createPost({ forumId: 'forum', authorId: 'human', title: '既存', body: '残す', origin: 'local-human' });
    const oldPosts = await old.list('posts'); await old.openActivity(anchor);
    const oldAfter = await old.exportBackup();
    const race = await openRepository('seed-legacy-race');
    await race.createHumanMember('先着の人'); await race.openActivity(anchor);
    const previewEligible = canPopulateCommunity(await race.exportBackup());
    const member = (await race.list('members')).find((m) => m.actor === 'human')!;
    const arrived = await race.createForumPost({ keyword: 'MITI', boardNo: 9, name: '先着の掲示板' }, {
      authorId: member.id, title: '一足先に投稿', body: '上書きしない', origin: 'local-human',
    });
    const raceResult = await race.populateEmptyCommunity({ confirmPopulate: true });
    const racePosts = await race.list('posts');
    repo.close(); another.close(); old.close(); race.close();
    return { legacy, refused, optins, populated, human, notEmpty, immediate, imported, importedOptin, importedAgain, importedLegacy,
      unsafe: [canPopulateCommunity(ambiguous), canPopulateCommunity(collision)], oldPosts, oldAfter, previewEligible, arrived, raceResult, racePosts };
  }, { anchor, fixture: backupFixture() });
  expect(result.legacy.posts).toEqual([]); expect(result.refused).toBe(true);
  expect(result.optins.sort()).toEqual([false, true]); expect(result.populated.posts).toHaveLength(66);
  expect(result.populated.sigs).toContainEqual(result.legacy.sigs[0]!);
  expect(result.populated.forums.find((f) => f.id === 'custom-board')).toMatchObject({ name: '保存した名前', nextPostNumber: 57 });
  expect(result.populated.members).toContainEqual(result.legacy.members.find((m) => m.id === 'existing-human')!);
  expect(result.human).toMatchObject({ number: 57, replyToPostId: 'seed:v1:repair-1' }); expect(result.notEmpty).toBe(false);
  expect(result.immediate).toMatchObject({ source: 'local', posts: [] });
  for (const world of [result.imported, result.importedAgain]) {
    expect(world.members).toEqual([]); expect(world.posts).toEqual([]); expect(world.forums).toEqual([]);
  }
  expect(result.importedOptin).toBe(false); expect(result.importedLegacy).toBe(false); expect(result.unsafe).toEqual([false, false]);
  expect(result.oldAfter.posts).toEqual(result.oldPosts);
  expect(result.previewEligible).toBe(true); expect(result.raceResult).toBe(false); expect(result.racePosts).toEqual([result.arrived]);
});
