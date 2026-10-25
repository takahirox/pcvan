import { expect, test } from '@playwright/test';
import { command, start, snapshot, restore, noOtherUi } from './terminal-helpers';
import original from '../data/pcvan/fictional-community.json' with { type: 'json' };
import expansion from '../data/pcvan/expanded-community.json' with { type: 'json' };
import wakaba from '../data/pcvan/wakaba.json' with { type: 'json' };
import bulletin from '../data/pcvan/bulletin.json' with { type: 'json' };
import starters from '../data/pcvan/forum-starters.json' with { type: 'json' };

// Explicit route/count oracle: a missing route or dropped fixture cannot redefine expectations.
const routes: [string[], string, string, number][] = [
  [['J MITI', '3', '9'], 'MITI:9', '古いキーボード、Ａだけ無口', 16],
  [['13', '2', 'FORUMS', '1'], 'DAISIZEN:1', '鉢を半歩動かしました', 14],
  [['13', '2', 'FORUMS', '2'], 'DAISIZEN:2', '長い観察記録の分け方', 3],
  [['13', '2', 'FORUMS', '3'], 'DAISIZEN:3', '図書館のしおり：書名と観察を分けて', 4],
  [['13', '2', 'FORUMS', '4'], 'DAISIZEN:4', '葉の裏を描き忘れました', 3],
  [['13', '2', 'FORUMS', '5'], 'DAISIZEN:5', '朝の声のメモ帳', 4],
  [['13', '2', 'FORUMS', '6'], 'DAISIZEN:6', '近郊の尾根道、昼までの往復', 4],
  [['13', '2', 'FORUMS', '7'], 'DAISIZEN:7', '日曜の一時間観察会の相談', 4],
  [['13', '3', '1'], 'LOCAL-DOSV:1', '相談室の約束とシリアルの話', 6],
  [['13', '3', '2'], 'LOCAL-DOSV:2', '週末の工作机：ログの行数を数える', 4],
  [['13', '4', '1'], 'LOCAL-GAMES:1', '攻略室より：先の話はひと声を', 4],
  [['13', '4', '2'], 'LOCAL-GAMES:2', '週末スコア帳：自己記録でどうぞ', 4],
  [['13', '5', '1'], 'LOCAL-GV:1', '今月の寄り合い：帰宅の一杯', 6],
  [['16', '1'], 'LOCAL-WAKABA:1', '返信の前にひとつ質問', 3],
  [['13', '6'], 'LOCAL-BULLETIN:1', '散歩スケッチの仲間募集', 3],
];

test('every production forum route has authored threads anonymously on fresh startup and confirmed reset', async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  for (const reset of [false, true]) {
    if (reset) { await command(page, 'RESET', '82件'); await Promise.all([page.waitForEvent('load'), command(page, 'Y')]); await expect(page.locator('.output')).toContainText('MAIN'); }
    const data = await snapshot(page);
    expect(data.posts).toHaveLength(82); expect(data.forums).toHaveLength(15);
    expect(data.members).toHaveLength(10); expect(data.members.every((m) => m.actor === 'ai')).toBe(true);
    expect(data.posts.filter((p) => !p.replyToPostId)).toHaveLength(26);
    for (const [route, board, title, count] of routes) {
      await command(page, 'MAIN', 'MAIN');
      for (const selector of route) await command(page, selector);
      const listing = await command(page, 'LIST', title);
      expect(listing).not.toMatch(/投稿はありません|local-seed|創作|https?:/);
      const reading = await command(page, 'READ 1', '★内容');
      expect(reading).toContain(title); expect(reading).toMatch(/96\/11\//);
      const posts = data.posts.filter((p) => p.forumId === `resident-forum:${board}`).sort((a, b) => a.number - b.number);
      expect(posts).toHaveLength(count); expect(posts.map((p) => p.number)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      expect(posts.some((p) => p.replyToPostId)).toBe(true);
      for (const p of posts) {
        expect(data.members.some((m) => m.id === p.authorId && m.actor === 'ai')).toBe(true);
        if (p.replyToPostId) {
          const parent = posts.find((r) => r.id === p.replyToPostId)!;
          expect(parent.number).toBeLessThan(p.number); expect(parent.createdAt < p.createdAt).toBe(true);
        }
      }
    }
    // Preserve every established post verbatim and use a distinct origin for the ten additions.
    for (const [fixture, prefix] of [[original, 'v1'], [expansion, 'sigs-v1'], [wakaba, 'wakaba-v1'], [bulletin, 'bulletin-v1'], [starters, 'forums-v1']] as const)
      for (const p of fixture.posts) expect(data.posts.find((r) => r.id === `seed:${prefix}:${p.id}`)).toMatchObject({ title: p.title, body: p.body });
    const newPosts = data.posts.filter((p) => p.origin === starters.origin);
    expect(newPosts).toHaveLength(10); expect(new Set(newPosts.map((p) => p.body)).size).toBe(10);
    await noOtherUi(page);
  }
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('empty-default recovery is atomic, fenced, idempotent across tabs and preserves all other records', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository, worldContext, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const communityPath = '/src/storage/community.ts';
    const { starterAdditions, localConversation } = await import(communityPath) as typeof import('../src/storage/community');
    const anchor = '2026-10-21T00:00:00.000Z';
    const repo = await openRepository('recovery'), other = await openRepository('recovery');
    await repo.openActivity(anchor);
    const alice = await repo.createHumanMember('一人目'), bob = await repo.createHumanMember('二人目');
    await repo.markRead(alice.id, 'seed:v1:repair-1'); await repo.markRead(bob.id, 'seed:v1:repair-2');
    const baseline = await repo.exportBackup();
    // Older partially populated world: absent Wakaba/quiet boards, cleared bulletin
    // with advanced numbering, custom-named board and an unrelated empty custom board.
    for (const p of baseline.posts.filter((p) => ['local-seed:forum-starters-v1', 'local-seed:wakaba-v1', 'local-seed:bulletin-v1'].includes(p.origin)).sort((a, b) => b.number - a.number)) await repo.delete('posts', p.id);
    for (const key of ['DAISIZEN:2', 'DAISIZEN:4', 'DAISIZEN:6', 'LOCAL-WAKABA:1']) await repo.delete('forums', `resident-forum:${key}`);
    const bulletinBoard = baseline.forums.find((f) => f.id === 'resident-forum:LOCAL-BULLETIN:1')!;
    await repo.put('forums', { ...bulletinBoard, nextPostNumber: 50 });
    await repo.put('forums', { id: 'custom-empty', sigId: 'resident-sig:MITI', boardNo: 99, name: '私の空き部屋', nextPostNumber: 8 });
    await repo.put('sigs', { id: 'resident-sig:DAISIZEN', keyword: 'DAISIZEN', title: '自分の自然ＳＩＧ' });
    await repo.put('forums', { id: 'resident-forum:DAISIZEN:4', sigId: 'resident-sig:DAISIZEN', boardNo: 4, name: '改名した部屋', nextPostNumber: 1 });
    await repo.put('settings', { id: 'private-setting', value: { keep: '設定と日時' } });
    await repo.createPost({ forumId: 'resident-forum:MITI:9', authorId: alice.id, title: '人の投稿', body: '残す', origin: 'local-human' });
    const ai = baseline.members.find((m) => m.actor === 'ai')!;
    await repo.createAiPost(ai, { forumId: 'resident-forum:MITI:9', authorId: ai.id, title: '生成の投稿', body: '残す', origin: 'local-ai:webllm:test' });
    const before = await repo.exportBackup();
    await repo.openActivity(anchor); const reopened = await repo.exportBackup();
    const expectedContext = worldContext(reopened);
    const plan = starterAdditions(reopened, anchor);
    let refused = false;
    try { await repo.recoverStarterConversations({ confirmAdd: false, expectedContext }); } catch { refused = true; }
    const native = IDBObjectStore.prototype.add; let writes = 0, failed = false;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.transaction.db.name === 'recovery' && this.name === 'posts' && ++writes === 5) throw new DOMException('recovery quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.recoverStarterConversations({ confirmAdd: true, expectedContext }); } catch { failed = true; }
    finally { IDBObjectStore.prototype.add = native; }
    const rollback = await repo.exportBackup();
    const racing = await Promise.allSettled([repo, other].map((r) => r.recoverStarterConversations({ confirmAdd: true, expectedContext })));
    const after = await repo.exportBackup(); validateBackup(after);
    const repeat = await other.recoverStarterConversations({ confirmAdd: true, expectedContext: worldContext(after) });
    const afterRepeat = await repo.exportBackup();
    await repo.markRead(alice.id, 'seed:wakaba-v1:question');
    const readAfter = (await repo.exportBackup()).readStates;
    // JSON roundtrip keeps the imported guard and original world provenance.
    const imported = await openRepository('recovery-import'); await imported.replaceFromJson(JSON.stringify(before), { confirmReplace: true });
    await imported.openActivity(anchor); const importedBefore = await imported.exportBackup();
    const addedImported = await imported.recoverStarterConversations({ confirmAdd: true, expectedContext: worldContext(importedBefore) });
    const importedAfter = await imported.exportBackup(); validateBackup(importedAfter);
    const conversation = after.posts.filter((p) => p.origin === 'local-seed:forum-starters-v1').every(localConversation);
    repo.close(); other.close(); imported.close();
    return { before, reopened, plan, refused, failed, rollback, racing: racing.map((r) => r.status), after, repeat, afterRepeat, readAfter, importedBefore, importedAfter, addedImported, conversation };
  });
  expect(result.refused).toBe(true); expect(result.failed).toBe(true); expect(result.rollback).toEqual(result.reopened);
  expect(result.reopened.posts).toEqual(result.before.posts); expect(result.reopened.forums).toEqual(result.before.forums);
  expect(result.plan.map((p) => p.forum.id).sort()).toEqual(['resident-forum:DAISIZEN:2', 'resident-forum:DAISIZEN:6', 'resident-forum:LOCAL-BULLETIN:1', 'resident-forum:LOCAL-WAKABA:1']);
  expect(result.racing.sort()).toEqual(['fulfilled', 'rejected']);
  expect(result.after.posts).toHaveLength(81); // 68 retained + 13 recovered; custom drawing board stays empty
  for (const p of result.before.posts) expect(result.after.posts.find((row) => row.id === p.id)).toEqual(p);
  for (const key of ['members', 'sigs', 'readStates', 'mail', 'settings', 'session'] as const) expect(result.after[key]).toEqual(result.reopened[key]);
  for (const f of result.before.forums.filter((f) => f.id !== 'resident-forum:LOCAL-BULLETIN:1')) expect(result.after.forums.find((row) => row.id === f.id)).toEqual(f);
  expect(result.after.posts.filter((p) => p.origin === bulletin.origin).map((p) => p.number).sort()).toEqual([50, 51, 52]);
  expect(result.readAfter.filter((r) => r.forumId === 'resident-forum:LOCAL-WAKABA:1')).toEqual([expect.objectContaining({ lastReadNumber: 1, memberId: result.before.members.find((m) => m.handle === '一人目')!.id })]);
  expect(result.repeat).toBe(0); expect(result.afterRepeat).toEqual(result.after); expect(result.conversation).toBe(true);
  expect(result.importedBefore.posts).toEqual(result.before.posts); expect(result.addedImported).toBe(13);
  expect(result.importedAfter.settings).toEqual(result.importedBefore.settings);
  expect(result.importedAfter.posts).toEqual(result.after.posts);
});

test('Settings previews empty imported defaults, cancel preserves them and confirmation makes Wakaba readable', async ({ page }) => {
  await start(page, '継続する人');
  const baseline = await snapshot(page), empty = structuredClone(baseline);
  empty.posts = []; empty.readStates = [];
  await restore(page, empty); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  expect((await snapshot(page)).posts).toEqual([]);
  await command(page, '16'); await command(page, '1', '投稿はありません');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.locator('.storage-panel > summary').click();
  await modal.locator('.recover-starters').click();
  await expect(modal.locator('.confirmation-copy')).toContainText('はじめての広場：3件（#4〜）');
  await expect(modal.locator('.confirmation-copy')).toContainText('自分で空にした');
  await modal.locator('.cancel-action').click(); expect((await snapshot(page)).posts).toEqual([]);
  await modal.locator('.recover-starters').click(); await modal.locator('.confirm-action').click();
  await expect(modal.locator('.settings-message')).toContainText('82件');
  await modal.getByRole('button', { name: '閉じる', exact: true }).click();
  await command(page, 'LIST', '返信の前にひとつ質問'); await command(page, 'READ 4', '★内容');
  const recovered = await snapshot(page);
  expect(recovered.posts).toHaveLength(82); expect(recovered.members).toEqual(empty.members);
  expect(recovered.settings.find((s) => s.id === 'community-world')).toEqual(empty.settings.find((s) => s.id === 'community-world'));
  await noOtherUi(page);
});

test('recovery skips ambiguous/custom mappings, seed collisions and missing authors without inventing identities', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository, worldContext } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository('recovery-safety'); await repo.openActivity('2026-10-21T00:00:00.000Z');
    const source = await repo.exportBackup();
    const outcomes = [];
    for (const kind of ['duplicate-sig', 'duplicate-board', 'custom-id', 'collision', 'missing-author', 'wrong-actor']) {
      const content = structuredClone(source); content.posts = []; content.readStates = [];
      const board = content.forums.find((f) => f.id === 'resident-forum:DAISIZEN:2')!;
      if (kind === 'duplicate-sig') content.sigs.push({ id: 'duplicate', keyword: 'daisizen', title: '別のＳＩＧ' });
      if (kind === 'duplicate-board') content.forums.push({ ...board, id: 'duplicate' });
      if (kind === 'custom-id') board.id = 'custom-board';
      if (kind === 'collision') {
        const p = source.posts.find((p) => p.id === 'seed:forums-v1:council-notes')!;
        content.posts.push({ ...p, forumId: 'resident-forum:MITI:9' });
      }
      if (kind === 'missing-author') content.members = content.members.filter((m) => m.id !== 'fictional-ai:soroban');
      if (kind === 'wrong-actor') content.members.find((m) => m.id === 'fictional-ai:soroban')!.actor = 'human';
      await repo.replaceFromJson(JSON.stringify(content), { confirmReplace: true });
      await repo.openActivity('2026-10-21T00:00:00.000Z');
      const before = await repo.exportBackup();
      await repo.recoverStarterConversations({ confirmAdd: true, expectedContext: worldContext(before) });
      const after = await repo.exportBackup();
      outcomes.push({ kind, posts: after.posts.filter((p) => p.forumId === board.id), board: after.forums.find((f) => f.id === board.id),
        beforeBoard: board, membersUnchanged: JSON.stringify(before.members) === JSON.stringify(after.members),
        settingsUnchanged: JSON.stringify(before.settings) === JSON.stringify(after.settings),
        preserved: before.posts.every((p) => JSON.stringify(after.posts.find((r) => r.id === p.id)) === JSON.stringify(p)) });
    }
    repo.close(); return outcomes;
  });
  expect(result).toHaveLength(6);
  for (const row of result) {
    expect(row.posts, row.kind).toEqual([]); expect(row.board, row.kind).toEqual(row.beforeBoard);
    expect(row.membersUnchanged).toBe(true); expect(row.settingsUnchanged).toBe(true); expect(row.preserved).toBe(true);
  }
});
