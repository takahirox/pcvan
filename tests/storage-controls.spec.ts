import { expect, test } from '@playwright/test';
import { command, start, enterForum, post, backup, importFile, restore, snapshot, noOtherUi } from './terminal-helpers';
import { backupFixture } from './backup-fixture';

test('typed backup/import preserves real Japanese multiline posts, identities, read markers and preferences', async ({ page }) => {
  await start(page, '保存する人'); await enterForum(page); await post(page, '保存', '  一行目  \n\n二行目');
  await command(page, 'READ 17', '★内容');
  const original = await backup(page);
  expect(original.posts).toHaveLength(67); expect(original.readStates[0]!.lastReadNumber).toBe(17);
  await importFile(page, backupFixture());
  await command(page, '', 'Y / N'); await command(page, 'BACK', '操作を中止');
  expect((await snapshot(page)).posts).toEqual(original.posts);
  await restore(page, backupFixture()); expect((await snapshot(page)).posts).toEqual(backupFixture().posts);
  await restore(page, original);
  const recovered = await backup(page);
  for (const key of ['members', 'posts', 'readStates', 'settings'] as const) expect(recovered[key]).toEqual(original[key]);
  await noOtherUi(page);
});

test('malformed JSON, cancelled native picker, and replacement quota failure leave the old world intact', async ({ page }) => {
  await start(page, '保管者'); const before = await backup(page);
  const choosing = page.waitForEvent('filechooser'); await command(page, 'IMPORT');
  await (await choosing).setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('.output')).toContainText('復元できません');
  expect((await snapshot(page)).posts).toEqual(before.posts);
  const chooseCancel = page.waitForEvent('filechooser'); await command(page, 'IMPORT');
  await (await chooseCancel).setFiles([]);
  await expect(page.locator('.output')).toContainText('ファイル選択を中止');
  await importFile(page, backupFixture());
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
  });
  await command(page, 'Y', '保存容量が足りません');
  expect((await snapshot(page)).posts).toEqual(before.posts);
});

test('a world changed while a native file picker is pending cannot consume old approval', async ({ page, context }) => {
  await start(page, '先の人'); const data = await backup(page);
  const picker = page.waitForEvent('filechooser'); await command(page, 'IMPORT');
  await command(page, 'Y', 'ファイル選択が完了していません');
  await command(page, 'N', '操作を中止');
  await (await picker).setFiles({ name: 'late.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await command(page, 'Y', 'この画面では使えない');
  expect((await snapshot(page)).posts).toHaveLength(66);
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await importFile(page, data);
  await enterForum(other); await post(other, '別タブの投稿', '保持する');
  await command(page, 'Y', '世界や設定が変わりました');
  expect((await snapshot(page)).posts).toHaveLength(67);
});

for (const operation of ['RESET', 'IMPORT']) {
  test(`${operation} rejects approval when another connection posts after the confirmation snapshot`, async ({ page }) => {
    await start(page, '保管者');
    if (operation === 'IMPORT') await importFile(page, backupFixture());
    else await command(page, 'RESET', '初期状態に戻しますか');
    const before = await snapshot(page);
    const forum = before.forums[0]!;
    const post = { id: 'racing-human-post', forumId: forum.id, number: forum.nextPostNumber,
      authorId: before.members.find((row) => row.actor === 'human')!.id, title: '確認後の投稿', body: '削除しない',
      createdAt: new Date().toISOString(), origin: 'local-human' };
    await page.evaluate(async ({ forum, post }) => {
      const other = await new Promise<IDBDatabase>((resolve, reject) => {
        const opening = indexedDB.open('pcvan-local');
        opening.onsuccess = () => resolve(opening.result); opening.onerror = () => reject(opening.error);
      });
      const native = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (scope, mode, options) {
        const names = typeof scope === 'string' ? [scope] : Array.from(scope);
        if (this.name === 'pcvan-local' && mode === 'readwrite' && names.includes('posts') && names.includes('settings')) {
          IDBDatabase.prototype.transaction = native;
          // Queue a valid committed post on a second connection immediately before
          // the destructive transaction, after the command's readonly precheck.
          const write = other.transaction(['posts', 'forums', 'session'], 'readwrite');
          write.objectStore('posts').add(post);
          write.objectStore('forums').put({ ...forum, nextPostNumber: post.number + 1 });
          write.oncomplete = () => other.close();
        }
        return native.call(this, scope, mode, options);
      };
    }, { forum, post });
    await command(page, 'Y', '世界や設定が変わりました');
    const after = await snapshot(page);
    expect(after.posts).toEqual([...before.posts, post].sort((a, b) => a.id.localeCompare(b.id)));
    expect(after.forums).toEqual(before.forums.map((row) => row.id === forum.id ? { ...row, nextPostNumber: post.number + 1 } : row));
    for (const key of ['members', 'sigs', 'readStates', 'settings'] as const) expect(after[key]).toEqual(before[key]);
    await command(page, 'Y', 'この画面では使えない');
    await noOtherUi(page);
  });
}

test('legacy empty world offers real populate confirmation and only adds the fixture after Y', async ({ page }) => {
  await start(page); const fixture = backupFixture(); fixture.posts = []; fixture.readStates = [];
  fixture.forums.forEach((f) => { f.nextPostNumber = 1; });
  await restore(page, fixture);
  // Simulate an actual pre-community empty world, rather than an imported one.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const req = indexedDB.open('pcvan-local'); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['settings', 'session'], 'readwrite');
      tx.objectStore('session').delete('imported');
      tx.objectStore('settings').put({ id: 'community-world', value: { version: 1, createdAt: new Date().toISOString(), status: 'legacy' } });
      tx.oncomplete = () => resolve();
    }); db.close();
  });
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, '4', 'POPULATE');
  await command(page, 'POPULATE', '66件'); await command(page, 'N', '操作を中止');
  expect((await snapshot(page)).posts).toHaveLength(0);
  await command(page, 'POPULATE', '66件'); await command(page, 'Y', '初期会話を準備');
  expect((await snapshot(page)).posts).toHaveLength(66);
});
