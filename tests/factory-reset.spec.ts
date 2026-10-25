import { epoch, hour, lifestyles } from './autonomy-helpers';
import { mockWorker, mockPendingWorker } from './ai-helpers';
import { command, start, enterForum, post, backup, restore, snapshot, noOtherUi, settings } from './terminal-helpers';
import { expect, test } from '@playwright/test';

const anchor = '2026-10-21T00:00:00.000Z';
const source = 'http://127.0.0.1:14374';

test('repository reset reuses the exact first-visit fixture, clears all local state, repeats and restores backups', async ({ page }) => {
  await page.goto(source);
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path);
    const repo = await openRepository('reset-test');
    const baseline = await openRepository('reset-baseline');
    await baseline.openActivity(anchor);
    const expected = await baseline.exportBackup();
    await repo.openActivity(anchor);
    const human = await repo.createHumanMember('消える利用者');
    const content = await repo.exportBackup();
    const forum = content.forums[0]!;
    await repo.createPost({ forumId: forum.id, authorId: human.id, title: '手動', body: '消える投稿', origin: 'local-human' });
    const ai = content.members.find((m) => m.actor === 'ai')!;
    await repo.createAiPost(ai, { forumId: forum.id, authorId: ai.id,
      title: '生成', body: '消える生成結果', origin: 'local-ai:webllm:test' });
    await repo.markRead(human.id, content.posts[0]!.id);
    const profilePath = '/src/ai/personas.ts';
    const { residentProfiles } = await import(profilePath);
    const profile = residentProfiles(content)[0]!;
    await repo.configureResident({ ...profile, handle: '変更した住人', frequency: 0 }, anchor);
    await repo.configureActivity(0, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    await repo.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    const activity = await repo.get('settings', 'ai-activity');
    await repo.put('settings', { id: 'ai-activity', value: { ...(activity!.value as object), setupDeferred: true } });
    await repo.put('settings', { id: 'terminal-display', value: { version: 1, theme: 'amber', speed: '300', effects: true } });
    await repo.put('settings', { id: 'custom', value: '消える設定' });
    await repo.recordCommand('消える履歴');
    await repo.endSession();
    const saved = await repo.exportJson();
    const before = await repo.exportBackup();
    let refused = false;
    try { await repo.resetWorld({ confirmReset: false }, anchor); } catch { refused = true; }
    const cancelled = await repo.exportBackup();
    await repo.resetWorld({ confirmReset: true }, anchor);
    const fresh = await repo.exportBackup();
    validateBackup(fresh);
    await repo.resetWorld({ confirmReset: true }, anchor);
    const repeated = await repo.exportBackup();
    repo.close();
    const reopened = await openRepository('reset-test');
    await reopened.openActivity(anchor);
    const reloaded = await reopened.exportBackup();
    await reopened.replaceFromJson(saved, { confirmReplace: true });
    const restored = await reopened.exportBackup();
    // An imported empty world remains empty until the explicit reset action.
    await reopened.replaceFromJson(JSON.stringify({ format: 'pcvan-local', version: 1,
      members: [], sigs: [], forums: [], posts: [], settings: [], readStates: [], session: null }), { confirmReplace: true });
    await reopened.openActivity(anchor);
    const imported = await reopened.exportBackup();
    await reopened.resetWorld({ confirmReset: true }, anchor);
    const afterImported = await reopened.exportBackup();
    reopened.close(); baseline.close();
    return { expected, before, refused, cancelled, fresh, repeated, reloaded, restored, imported, afterImported };
  }, anchor);
  expect(result.refused).toBe(true);
  expect(result.cancelled).toEqual(result.before);
  expect(result.restored).toEqual(result.before);
  expect(result.imported.posts).toEqual([]);
  for (const fresh of [result.fresh, result.repeated, result.reloaded, result.afterImported]) {
    for (const key of ['members', 'forums', 'sigs', 'posts', 'readStates', 'session'] as const) {
      expect(fresh[key]).toEqual(result.expected[key]);
    }
    expect(fresh.posts).toHaveLength(82);
    expect(fresh.posts.filter((p) => !p.replyToPostId)).toHaveLength(26);
    expect(fresh.members).toHaveLength(10);
    expect(fresh.forums).toHaveLength(15);
    expect(fresh.settings.map((s) => s.id)).toEqual(result.expected.settings.map((s) => s.id));
    for (const id of ['ai-residents', 'community-world']) {
      expect(fresh.settings.find((s) => s.id === id)).toEqual(result.expected.settings.find((s) => s.id === id));
    }
    expect(fresh.settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({
      version: 2, maxPosts: 4, consent: false, batch: null, bootstrap: false, truncated: false, lastActivityAt: anchor,
    });
    expect(fresh.settings.find((s) => s.id === 'ai-activity')!.value).not.toHaveProperty('setupDeferred');
  }
});

test('reset transaction failure rolls back clears, fixture writes and generation guard', async ({ page }) => {
  await page.goto(source);
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository('reset-rollback');
    await repo.openActivity(anchor); await repo.recordCommand('保持する履歴');
    const other = await openRepository('reset-rollback');
    const before = await repo.exportBackup();
    const add = IDBObjectStore.prototype.add;
    let inserted = 0;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts' && ++inserted === 8) throw new DOMException('Reset quota failure', 'QuotaExceededError');
      return key === undefined ? add.call(this, value) : add.call(this, value, key);
    };
    let code = '';
    try { await repo.resetWorld({ confirmReset: true }, anchor); } catch (error) { code = (error as { code: string }).code; }
    finally { IDBObjectStore.prototype.add = add; }
    const after = await repo.exportBackup();
    await other.put('settings', { id: 'still-current', value: true });
    const stillCurrent = await repo.get('settings', 'still-current');
    repo.close(); other.close();
    return { before, after, code, inserted, stillCurrent };
  }, anchor);
  expect(result.code).toBe('quota'); expect(result.inserted).toBe(8);
  expect(result.after).toEqual(result.before);
  expect(result.stillCurrent?.value).toBe(true);
});

test('old connections cannot resurrect posts, settings, profiles, consent or history even without notifications', async ({ page }) => {
  await page.goto(source);
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository('reset-stale'); await repo.openActivity(anchor);
    const stale = await openRepository('reset-stale');
    const old = await stale.exportBackup();
    // Queue an actual write before the reset; the atomic clear must also remove it.
    await Promise.all([stale.put('settings', { id: 'racing', value: true }), repo.resetWorld({ confirmReset: true }, anchor)]);
    const before = await repo.exportBackup();
    const codes = [];
    for (const action of [
      () => stale.put('settings', { id: 'resurrected', value: true }),
      () => stale.updatePost(old.posts[0]!.id, { title: '古い編集', body: '古い本文' }),
      () => stale.createAiPost(old.members[0]!, { forumId: old.forums[0]!.id, authorId: old.members[0]!.id,
        title: '遅れた生成', body: '古い結果', origin: 'local-ai:webllm:test' }),
      () => stale.recordCommand('古い履歴'),
      () => stale.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC'),
      () => stale.commitAiRun('old-scheduled-run', '{}'),
      () => stale.replaceFromJson(JSON.stringify(old), { confirmReplace: true }),
      () => stale.resetWorld({ confirmReset: true }, anchor),
      () => stale.exportBackup(),
    ]) {
      try { await action(); codes.push('unexpected success'); } catch (error) { codes.push((error as { code: string }).code); }
    }
    const after = await repo.exportBackup(); repo.close(); stale.close();
    return { before, after, codes };
  }, anchor);
  expect(result.codes).toEqual(Array(9).fill('stale'));
  expect(result.after).toEqual(result.before);
  expect(result.after.settings.some((s) => s.id === 'racing')).toBe(false);
});


test('typed reset refusal/invalid/blank preserves data; confirmed reset reloads tabs, preserves caches and restores backup', async ({ page, context }) => {
  await start(page, '初期化する人'); await enterForum(page); await post(page, '残す話', 'バックアップ');
  const saved = await backup(page);
  await page.evaluate(async () => { const cache = await caches.open('unrelated-test'); await cache.put('/keep', new Response('kept')); });
  for (const refusal of ['N', 'BACK', 'MAIN', 'CANCEL']) {
    await command(page, 'RESET', '取り消せません');
    await command(page, '', 'Y / N'); await command(page, 'YES', 'Y / N');
    await command(page, refusal, '操作を中止');
    expect((await snapshot(page)).posts).toHaveLength(83);
  }
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await enterForum(other); await command(other, 'REPLY 1', 'タイトル='); await command(other, '古い下書き', '本文');
  await command(page, 'RESET', '初期状態に戻しますか');
  await Promise.all([page.waitForEvent('load'), other.waitForEvent('load'), command(page, 'Y')]);
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await expect(other.locator('.output')).toContainText('MAIN');
  const reset = await snapshot(page);
  expect(reset.posts).toHaveLength(82); expect(reset.members).toHaveLength(10); expect(reset.readStates).toEqual([]);
  expect(reset.settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false, maxPosts: 4 });
  expect(await page.evaluate(async () => !!await (await caches.open('unrelated-test')).match('/keep'))).toBe(true);
  await command(page, 'SKIP'); await restore(page, saved); expect((await snapshot(page)).posts).toEqual(saved.posts);
});

test('reset failure rolls back the world and reports within the transcript', async ({ page }) => {
  await start(page, '保持する人'); const before = await backup(page);
  await command(page, 'RESET', '初期状態に戻しますか');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
  });
  await command(page, 'Y', '保存容量が足りません');
  expect((await snapshot(page)).posts).toEqual(before.posts);
  await command(page, 'MAIN', 'MAIN'); await noOtherUi(page);
});

test('a suspended tab missing notifications cannot approve old consent after reset or restore', async ({ page, context }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'BroadcastChannel', { value: undefined }); });
  await mockWorker(page, 'ok'); await start(page, '古い世界');
  const saved = await backup(page);
  await settings(page, 3); await command(page, 'LOAD', '同意してモデル');
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await command(other, 'RESET', '初期状態に戻しますか');
  await Promise.all([other.waitForEvent('load'), command(other, 'Y')]);
  const reloading = page.waitForEvent('load');
  await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter'); await reloading;
  await expect(page.locator('.output')).toContainText('MAIN');
  // MAIN precedes asynchronous welcome processing. Either tab can claim the
  // shared invitation; finish connection and dismiss it in both before navigating.
  await command(page, 'SKIP'); await command(other, 'SKIP');
  expect((await snapshot(other)).posts).toHaveLength(82);
  expect((await snapshot(other)).settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false });
  await enterForum(page); await command(page, 'WRITE', '登録しますか');
  await command(page, 'Y', 'ハンドル名='); await command(page, '新しい人', 'タイトル=');
  await command(page, '古い下書き', '本文'); await command(page, '保存しない', '本文='); await command(page, '.END', '投稿しますか');
  await restore(other, saved);
  const reloadAfterRestore = page.waitForEvent('load'); await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter'); await reloadAfterRestore;
  expect((await snapshot(other)).posts).toHaveLength(82);
});

for (const work of ['load', 'generate'] as const) {
  test(`reset invalidates pending production ${work} and ignores late worker results`, async ({ page }) => {
    await page.clock.install({ time: epoch });
    await mockPendingWorker(page, work); await start(page, '操作する人'); await lifestyles(page); await settings(page, 3);
    await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
    if (work === 'generate') {
      await expect(page.locator('.output')).toContainText('モデル準備完了'); await page.clock.fastForward(hour);
    }
    await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork)).toContain(work === 'load' ? 'reload' : 'chatCompletionNonStreaming');
    await command(page, 'RESET', '初期状態に戻しますか');
    await Promise.all([page.waitForEvent('load'), command(page, 'Y')]);
    await expect(page.locator('.output')).toContainText('初期状態に戻しました');
    expect((await snapshot(page)).posts).toHaveLength(82);
    expect((await snapshot(page)).settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false });
  });
}
