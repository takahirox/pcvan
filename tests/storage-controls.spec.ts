import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { backupFixture } from './backup-fixture';

async function downloadBackup(page: Page) {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON バックアップを保存' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^pcvan-backup-.*\.json$/);
  return JSON.parse(await readFile((await download.path())!, 'utf8'));
}

test('visible backup downloads all local data, and command history survives reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('容量制限やブラウザーの操作で消えることがあります。', { exact: false })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill('echo  保存する ｶﾅ');
  await input.press('Enter');
  const backup = await downloadBackup(page);
  expect(backup).toMatchObject({ format: 'pcvan-local', version: 1, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [] });
  expect(backup.session.commandHistory).toEqual(['echo  保存する ｶﾅ']);
  expect(backup.session.lastLoginAt).toBeTruthy();
  expect(backup.session.lastLogoutAt).toBeNull();
  await page.reload();
  // Export is queued after startup, so the restored in-memory history is ready.
  expect((await downloadBackup(page)).session.commandHistory).toEqual(backup.session.commandHistory);
  await input.focus();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('echo  保存する ｶﾅ');
});

test('restore requires confirmation; confirmed replace preserves every field and refreshes history', async ({ page }) => {
  await page.goto('/');
  const before = await downloadBackup(page);
  const fixture = backupFixture();
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  expect(await downloadBackup(page)).toEqual(before);
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('全データ');
    return dialog.accept();
  });
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status')).toContainText('バックアップを復元しました。');
  expect(await downloadBackup(page)).toEqual(fixture);
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.focus();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('echo  日本語');
  await page.reload();
  const reloaded = await downloadBackup(page);
  expect(reloaded.posts).toEqual(fixture.posts);
  expect(reloaded.settings).toEqual(fixture.settings);
});

test('invalid restore displays an error and does not change existing data', async ({ page }) => {
  await page.goto('/');
  const before = await downloadBackup(page);
  let dialogs = 0;
  page.on('dialog', async (dialog) => { dialogs++; await dialog.dismiss(); });
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"pcvan-local","version":999}') });
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status')).toContainText('ローカル保存エラー');
  expect(dialogs).toBe(0);
  expect(await downloadBackup(page)).toEqual(before);
});

test('simulated quota errors are visible while backup and the terminal remain usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'session') throw new DOMException('Simulated quota', 'QuotaExceededError');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('保存容量が足りません。');
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill('echo still usable');
  await input.press('Enter');
  await expect(page.locator('.output')).toContainText('still usable');
  await expect(page.getByRole('status')).toContainText('保存容量が足りません。');
  expect((await downloadBackup(page)).session).toBeNull();
  expect(errors).toEqual([]);
});

test('unavailable IndexedDB is reported without claiming to save data or breaking the shell', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('IndexedDB is unavailable');
  await expect(page.getByRole('button', { name: 'JSON バックアップを保存' })).toBeDisabled();
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill('echo usable');
  await input.press('Enter');
  await expect(page.locator('.output')).toContainText('usable');
  expect(errors).toEqual([]);
});
