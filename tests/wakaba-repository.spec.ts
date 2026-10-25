import { expect, test } from '@playwright/test';
import { wakaba } from '../src/wakaba';
import original from '../data/pcvan/fictional-community.json' with { type: 'json' };
import expansion from '../data/pcvan/expanded-community.json' with { type: 'json' };

const anchor = '2026-10-24T00:00:00.000Z';

test('Wakaba pristine initialization is atomic/concurrent; reopen, consent, deletion, restore and reset respect world boundaries', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository('wakaba-pristine'), other = await openRepository('wakaba-pristine');
    const empty = await repo.exportBackup(), native = IDBObjectStore.prototype.add;
    let failed = false;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.transaction.db.name === 'wakaba-pristine' && this.name === 'posts' && value.origin === 'local-seed:wakaba-v1' && value.number === 2)
        throw new DOMException('Wakaba seed quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.openActivity(anchor); } catch { failed = true; }
    finally { IDBObjectStore.prototype.add = native; }
    const rollback = await repo.exportBackup();
    await Promise.all([repo.openActivity(anchor), other.openActivity(anchor)]);
    const pristine = await repo.exportBackup(); validateBackup(pristine);
    await other.openActivity(anchor); const repeat = await repo.exportBackup();
    const board = pristine.forums.find((f) => f.sigId === 'resident-sig:LOCAL-WAKABA')!;
    for (const post of pristine.posts.filter((p) => p.forumId === board.id).sort((a, b) => b.number - a.number)) await repo.delete('posts', post.id);
    await repo.delete('forums', board.id); await repo.delete('sigs', board.sigId);
    const deleted = await repo.exportBackup();
    await repo.openActivity(anchor); await repo.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    const afterConsent = await repo.exportBackup();
    const populated = await repo.populateEmptyCommunity({ confirmPopulate: true }, anchor);
    await repo.replaceFromJson(JSON.stringify(deleted), { confirmReplace: true });
    other.close(); const reopened = await openRepository('wakaba-pristine'); await reopened.openActivity(anchor);
    const restored = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(empty), { confirmReplace: true }); await repo.openActivity(anchor);
    const restoredEmpty = await repo.exportBackup();
    // Reset is the only explicit way back to a pristine starter world.
    await repo.resetWorld({ confirmReset: true }, anchor);
    const reset = await repo.exportBackup(); validateBackup(reset);
    repo.close(); reopened.close();
    return { failed, empty, rollback, pristine, repeat, deleted, afterConsent, populated, restored, restoredEmpty, reset };
  }, anchor);
  expect(result.failed).toBe(true); expect(result.rollback).toEqual(result.empty);
  expect(result.pristine.posts).toHaveLength(82); expect(result.pristine.forums).toHaveLength(15);
  expect(result.repeat).toEqual(result.pristine);
  const starters = result.pristine.posts.filter((p) => p.origin === wakaba.origin).sort((a, b) => a.number - b.number);
  expect(starters.map((p) => p.number)).toEqual([1, 2, 3]); expect(starters[1]!.replyToPostId).toBe(starters[0]!.id);
  expect(new Set(starters.map((p) => p.authorId)).size).toBe(2);
  for (const p of starters) {
    expect(result.pristine.members.find((m) => m.id === p.authorId)?.actor).toBe('ai');
    expect(Date.parse(p.createdAt)).toBeLessThan(Date.parse(anchor)); expect(p.simulation).toBeUndefined();
  }
  for (const p of original.posts) expect(result.pristine.posts.find((s) => s.id === `seed:v1:${p.id}`)).toMatchObject({ title: p.title, body: p.body });
  for (const p of expansion.posts) expect(result.pristine.posts.find((s) => s.id === `seed:sigs-v1:${p.id}`)).toMatchObject({ title: p.title, body: p.body });
  for (const data of [result.deleted, result.afterConsent, result.restored]) {
    expect(data.posts).toEqual(result.deleted.posts); expect(data.forums).toEqual(result.deleted.forums); expect(data.sigs).toEqual(result.deleted.sigs);
  }
  expect(result.populated).toBe(false); expect(result.restoredEmpty.posts).toEqual([]); expect(result.restoredEmpty.forums).toEqual([]);
  expect(result.reset.posts.filter((p) => p.origin === wakaba.origin)).toHaveLength(3); expect(result.reset.posts).toHaveLength(82);
});

test('existing/legacy population and v1 expansion never insert Wakaba examples', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const legacy = await openRepository('wakaba-legacy'); await legacy.createHumanMember('既存の人');
    await legacy.openActivity(anchor); const existing = await legacy.exportBackup();
    await legacy.populateEmptyCommunity({ confirmPopulate: true }, anchor); const populated = await legacy.exportBackup();
    // Model an eligible pre-expansion world without restoring it (imports must not expand).
    for (const p of populated.posts.filter((p) => p.origin === 'local-seed:authored-sigs-v1').sort((a, b) => b.number - a.number)) await legacy.delete('posts', p.id);
    for (const f of populated.forums.filter((f) => !['resident-forum:MITI:9', 'resident-forum:DAISIZEN:1'].includes(f.id))) await legacy.delete('forums', f.id);
    for (const s of populated.sigs.filter((s) => s.keyword.startsWith('LOCAL-'))) await legacy.delete('sigs', s.id);
    const world = populated.settings.find((s) => s.id === 'community-world')!;
    const { expansion: _expansion, ...v1 } = world.value as Record<string, import('../src/storage/schema').JsonValue>;
    await legacy.put('settings', { ...world, value: v1 }); await legacy.openActivity(anchor);
    const expanded = await legacy.exportBackup(); legacy.close(); return { existing, populated, expanded };
  }, anchor);
  expect(result.existing.posts).toEqual([]);
  for (const data of [result.existing, result.populated, result.expanded]) {
    expect(data.sigs.some((s) => s.keyword === wakaba.keyword)).toBe(false);
    expect(data.posts.some((p) => p.origin === wakaba.origin)).toBe(false);
  }
  expect(result.populated.posts).toHaveLength(66); expect(result.expanded.posts).toEqual(result.populated.posts);
});

test('lazy first sends serialize numbering and enforce same-board parents, ambiguity, invalid input and atomic rollback', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (target) => {
    const path = '/src/storage/repository.ts'; const { openRepository, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository('wakaba-lazy'), other = await openRepository('wakaba-lazy');
    const human = await repo.createHumanMember('書く人'), before = await repo.exportBackup();
    const draft = { authorId: human.id, title: '質問', body: '本文', origin: 'local-human' };
    const rejected: boolean[] = [];
    for (const change of [{ title: '' }, { body: ' ' }, { authorId: 'missing' }, { replyToPostId: 'missing' }]) {
      try { await repo.createForumPost(target, { ...draft, ...change }); rejected.push(false); }
      catch { rejected.push(JSON.stringify(await repo.exportBackup()) === JSON.stringify(before)); }
    }
    const native = IDBObjectStore.prototype.put; let failed = false;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.transaction.db.name === 'wakaba-lazy' && this.name === 'forums') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.createForumPost(target, draft); } catch { failed = true; }
    finally { IDBObjectStore.prototype.put = native; }
    const rollback = await repo.exportBackup();
    const sent = await Promise.all([repo.createForumPost(target, draft), other.createForumPost(target, draft)]);
    const after = await repo.exportBackup(); validateBackup(after);
    const elsewhere = await repo.createForumPost({ ...target, boardNo: 2 }, draft);
    let wrongParent = false;
    try { await repo.createForumPost(target, { ...draft, replyToPostId: elsewhere.id }); } catch { wrongParent = true; }
    const reply = await repo.createForumPost(target, { ...draft, replyToPostId: sent[0]!.id });
    const forum = after.forums[0]!;
    await repo.put('forums', { ...forum, id: 'duplicate-forum' });
    const ambiguous = await repo.exportBackup(); let duplicateForum = false;
    try { await repo.createForumPost(target, draft); } catch { duplicateForum = true; }
    const ambiguousAfter = await repo.exportBackup();
    await repo.delete('forums', 'duplicate-forum');
    await repo.put('sigs', { ...after.sigs[0]!, id: 'duplicate-sig' }); let duplicateSig = false;
    try { await repo.createForumPost(target, draft); } catch { duplicateSig = true; }
    repo.close(); other.close();
    return { before, rejected, failed, rollback, sent, after, wrongParent, reply, duplicateForum, ambiguous, ambiguousAfter, duplicateSig };
  }, { keyword: wakaba.keyword, boardNo: 1, name: wakaba.name });
  expect(result.rejected).toEqual([true, true, true, true]); expect(result.failed).toBe(true); expect(result.rollback).toEqual(result.before);
  expect(result.sent.map((p) => p.number).sort()).toEqual([1, 2]); expect(result.after.sigs).toHaveLength(1); expect(result.after.forums).toHaveLength(1);
  expect(result.after.forums[0]!.nextPostNumber).toBe(3);
  expect(result.after.members).toEqual(result.before.members); expect(result.after.settings).toEqual(result.before.settings); expect(result.after.readStates).toEqual([]);
  expect(result.wrongParent).toBe(true); expect(result.reply.number).toBe(3);
  expect(result.duplicateForum).toBe(true); expect(result.ambiguousAfter).toEqual(result.ambiguous); expect(result.duplicateSig).toBe(true);
});
