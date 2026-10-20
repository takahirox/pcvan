import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';

async function send(page: Page, line: string, expected: string) {
  const start = (await page.locator('.output').textContent())!.length;
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill(line);
  await input.press('Enter');
  await expect.poll(async () => {
    const text = (await page.locator('.output').textContent())!;
    return text.slice(start);
  }).toContain(expected);
}

async function command(page: Page, line: string) {
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill(line);
  await input.press('Enter');
}

async function enterForum(page: Page) {
  await send(page, 'J MITI', 'MITI / 未知の世界');
  await send(page, '3', 'MITI / フォーラム');
  await send(page, '9', '投稿一覧');
}

async function createMember(page: Page, handle: string) {
  await page.getByLabel('新しいハンドル').fill(handle);
  await page.getByRole('button', { name: '人間の利用者を作成' }).click();
  await expect(page.getByLabel('ローカル利用者', { exact: true })).toContainText(handle);
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('pcvan-local');
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    const stores = ['members', 'sigs', 'forums', 'posts', 'readStates', 'settings'] as const;
    const tx = db.transaction(stores, 'readonly');
    const entries = await Promise.all(stores.map(async (store) => [store, await new Promise((resolve, reject) => {
      const reading = tx.objectStore(store).getAll();
      reading.onsuccess = () => resolve(reading.result);
      reading.onerror = () => reject(reading.error);
    })]));
    db.close();
    return Object.fromEntries(entries) as Pick<Backup, typeof stores[number]>;
  });
}

async function restore(page: Page, fixture: Backup) {
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status')).toContainText('バックアップを復元しました。');
}

async function fillDraft(page: Page, title: string, body: string) {
  await page.getByLabel('投稿タイトル', { exact: true }).fill(title);
  await page.getByLabel('投稿本文', { exact: true }).fill(body);
}

test('create, review, edit and cancel preserve Japanese text without accidental sends; reload preserves posts and reads', async ({ page }) => {
  await page.goto('/');
  await enterForum(page);
  await command(page, 'WRITE');
  await expect(page.locator('.member-message')).toContainText('ローカル利用者を作成');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await createMember(page, '日本語の人');
  const before = await snapshot(page);
  await command(page, 'WRITE');
  await expect(page.getByRole('dialog')).toContainText('[D / reconstructed]');
  await expect(page.getByRole('dialog')).toContainText('未確認');
  const title = '  日本語　ｶﾅ <b>題</b>  ';
  const body = '  一行目\n\n日本語の複数行　。\n<b>文字</b>\n末尾  \n';
  await fillDraft(page, title, body);
  const titleInput = page.getByLabel('投稿タイトル', { exact: true });
  await titleInput.dispatchEvent('compositionstart');
  await titleInput.press('Enter');
  await titleInput.dispatchEvent('compositionend');
  await titleInput.press('Enter');
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: '内容を確認' }).click();
  expect(await page.locator('.post-preview').textContent()).toBe(`${title}\n\n${body}`);
  await page.getByRole('button', { name: '編集に戻る' }).click();
  await expect(titleInput).toHaveValue(title);
  await expect(page.getByLabel('投稿本文', { exact: true })).toHaveValue(body);
  await page.getByRole('button', { name: '投稿をキャンセル' }).click();
  expect(await snapshot(page)).toEqual(before);
  await command(page, 'WRITE');
  await fillDraft(page, title, body);
  await page.getByRole('button', { name: '内容を確認' }).click();
  await page.getByRole('button', { name: '編集に戻る' }).press('Escape');
  expect(await snapshot(page)).toEqual(before);
  await command(page, 'WRITE');
  await fillDraft(page, title, body);
  await page.getByRole('button', { name: '内容を確認' }).click();
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: 'この内容で投稿する' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const saved = await snapshot(page);
  expect(saved.posts).toHaveLength(1);
  expect(saved.posts[0]).toMatchObject({ number: 1, authorId: saved.members[0]!.id, title, body, origin: 'local-human' });
  expect(new Date(saved.posts[0]!.createdAt).toISOString()).toBe(saved.posts[0]!.createdAt);
  expect(saved.forums[0]!.nextPostNumber).toBe(2);
  await send(page, 'LIST', '[未読]');
  await send(page, 'READ 1', '★内容');
  expect((await page.locator('.output').textContent())!).toContain(body);
  await expect(page.locator('.output b')).toHaveCount(0);
  await page.reload();
  await enterForum(page);
  await send(page, 'LIST', '[既読]');
  expect((await snapshot(page)).posts).toEqual(saved.posts);
  expect((await snapshot(page)).readStates).toEqual([{ memberId: saved.members[0]!.id, forumId: saved.forums[0]!.id, lastReadNumber: 1 }]);
});

test('empty fields never send; replies use allocated numbers and navigable references', async ({ page }) => {
  await page.goto('/');
  await enterForum(page);
  await send(page, 'REPLY 1', '創作デモには返信できません');
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  fixture.readStates = [];
  await restore(page, fixture);
  const before = await snapshot(page);
  await send(page, 'REPLY 999', '返信先のローカル投稿がありません');
  expect(await snapshot(page)).toEqual(before);
  await command(page, 'WRITE');
  for (const [title, body] of [['', 'body'], ['title', ''], ['　 ', '\n　 ']]) {
    await fillDraft(page, title!, body!);
    await page.getByRole('button', { name: '内容を確認' }).click();
    await expect(page.locator('.compose-error')).toContainText('タイトルと本文を入力');
    await expect(page.getByRole('button', { name: 'この内容で投稿する' })).not.toBeVisible();
  }
  await page.getByRole('button', { name: '投稿をキャンセル' }).click();
  expect(await snapshot(page)).toEqual(before);
  await command(page, 'REPLY 1');
  await expect(page.getByLabel('投稿タイトル', { exact: true })).toHaveValue('RE#1 こんにちは');
  await page.getByLabel('投稿本文', { exact: true }).fill('返信本文\n二行目');
  await page.getByRole('button', { name: '内容を確認' }).click();
  await page.getByRole('button', { name: 'この内容で投稿する' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const saved = await snapshot(page);
  expect(saved.posts.find((post) => post.number === 8)).toMatchObject({ replyToPostId: 'first', authorId: 'human', title: 'RE#1 こんにちは', body: '返信本文\n二行目' });
  expect(saved.forums.find((forum) => forum.id === 'forum')!.nextPostNumber).toBe(9);
  await send(page, 'READ 8', '返信先 RE#1');
  await page.getByRole('link', { name: '返信先 RE#1 を読む' }).click();
  await expect(page.locator('.output')).toContainText('> READ 1');
  await send(page, 'LIST', '#8 RE#1 こんにちは [既読]');
  expect((await snapshot(page)).readStates).toEqual([{ memberId: 'human', forumId: 'forum', lastReadNumber: 8 }]);
  await page.reload();
  await enterForum(page);
  await send(page, 'READ 8', '返信先 RE#1');
  await expect(page.getByRole('link', { name: '返信先 RE#1 を読む' })).toBeVisible();
});

test('read markers are separate by human member and forum, monotonic and persistent', async ({ page }) => {
  await page.goto('/');
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'DAISIZEN';
  fixture.readStates = [];
  await restore(page, fixture);
  await send(page, '13', '再構成の仮設ブリッジ');
  await send(page, '2', '大自然＆動植物');
  await send(page, 'FORUMS', '7 伝言板／企画室');
  await send(page, '1', '#4 返事 RE#1 [未読]');
  await send(page, 'READ 4', '★内容');
  await send(page, 'READ 1', '★内容');
  await createMember(page, '別の人');
  const second = (await snapshot(page)).members.find((member) => member.handle === '別の人')!;
  await send(page, 'LIST', '#4 返事 RE#1 [未読]');
  await send(page, 'READ 1', '★内容');
  await send(page, 'LIST', '#1 こんにちは [既読]');
  await send(page, 'BACK', '7 伝言板／企画室');
  await send(page, '2', '#1  [未読]');
  await send(page, 'READ 1', '★内容');
  expect((await snapshot(page)).readStates).toEqual(expect.arrayContaining([
    { memberId: 'human', forumId: 'forum', lastReadNumber: 4 },
    { memberId: second.id, forumId: 'forum', lastReadNumber: 1 },
    { memberId: second.id, forumId: 'other', lastReadNumber: 1 },
  ]));
  await page.getByLabel('ローカル利用者', { exact: true }).selectOption('human');
  await expect.poll(async () => (await snapshot(page)).settings.find((setting) => setting.id === 'active-human-member')?.value).toBe('human');
  await page.reload();
  await expect(page.getByLabel('ローカル利用者', { exact: true })).toHaveValue('human');
  await send(page, '13', '再構成の仮設ブリッジ');
  await send(page, '2', '大自然＆動植物');
  await send(page, 'FORUMS', '7 伝言板／企画室');
  await send(page, '2', '#1  [未読]');
  await send(page, 'BACK', '7 伝言板／企画室');
  await send(page, '1', '#4 返事 RE#1 [既読]');
});

test('failed sends roll back board creation and numbering, retain the draft and allow one explicit retry', async ({ page }) => {
  await page.goto('/');
  await createMember(page, '人');
  await enterForum(page);
  const before = await snapshot(page);
  await command(page, 'WRITE');
  await fillDraft(page, '保存失敗の試験', '日本語\n残る本文');
  await page.getByRole('button', { name: '内容を確認' }).click();
  await page.evaluate(() => {
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'forums') throw new DOMException('Simulated quota', 'QuotaExceededError');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.put = nativePut; } });
  });
  await page.getByRole('button', { name: 'この内容で投稿する' }).click();
  await expect(page.locator('.compose-error')).toContainText('入力は残っています');
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: '編集に戻る' }).click();
  await expect(page.getByLabel('投稿本文', { exact: true })).toHaveValue('日本語\n残る本文');
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  await page.getByRole('button', { name: '内容を確認' }).click();
  await page.getByRole('button', { name: 'この内容で投稿する' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await snapshot(page)).posts.map((post) => post.number)).toEqual([1]);
});

test('a reply target removed during composition cannot be sent; a failed read marker does not display the post', async ({ page }) => {
  await page.goto('/');
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  fixture.readStates = [];
  await restore(page, fixture);
  await enterForum(page);
  await command(page, 'REPLY 4');
  await page.getByLabel('投稿本文', { exact: true }).fill('削除された投稿への返信');
  await page.getByRole('button', { name: '内容を確認' }).click();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const opening = indexedDB.open('pcvan-local');
      opening.onsuccess = () => resolve(opening.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('posts', 'readwrite');
      tx.objectStore('posts').delete('reply');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  const before = await snapshot(page);
  await page.getByRole('button', { name: 'この内容で投稿する' }).click();
  await expect(page.locator('.compose-error')).toContainText('入力は残っています');
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: '投稿をキャンセル' }).click();
  await page.evaluate(() => {
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'readStates') throw new DOMException('Simulated quota', 'QuotaExceededError');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    };
  });
  await send(page, 'READ 1', '既読の保存に失敗しました');
  expect((await snapshot(page)).readStates).toEqual([]);
  const text = (await page.locator('.output').textContent())!;
  expect(text.slice(text.lastIndexOf('> READ 1'))).not.toContain('★内容');
  await send(page, 'BACK', 'MITI / フォーラム');
});
