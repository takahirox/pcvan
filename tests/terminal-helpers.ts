import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { Backup } from '../src/storage/schema';

export async function command(page: Page, line: string, response?: string) {
  const output = page.locator('.output');
  // Slice in the browser so repeated About/review output does not transfer the entire transcript.
  const start = await output.evaluate((element) => element.textContent?.length ?? 0);
  const addedOutput = () => output.evaluate((element, offset) => (element.textContent ?? '').slice(offset), start);
  const input = page.locator('#command');
  await input.fill(line); await input.press('Enter');
  await expect.poll(addedOutput).toContain(`> ${line}`);
  if (response) await expect.poll(addedOutput).toContain(response);
  // Echo precedes async writes. A following queued command is still ordered.
  return addedOutput();
}
export async function start(page: Page, handle?: string, url = '/') {
  await page.goto(url);
  await page.locator('#command').press('Escape');
  await page.locator('#command').press('Escape');
  await expect.poll(async () => { await page.locator('#command').press('Escape'); return page.locator('.output').textContent(); }).toContain('ハンドル名を登録しますか');
  if (handle) { await command(page, 'Y', 'ハンドル名='); await command(page, handle, '登録しました'); }
  else await command(page, 'SKIP', '登録を中止');
}
export async function enterForum(page: Page) {
  await command(page, 'J MITI', 'MITI / 未知の世界');
  await command(page, '3', 'MITI / フォーラム');
  await command(page, '9', '投稿一覧');
}
export async function settings(page: Page, number?: number) {
  await command(page, 'SETTINGS', '設定 / SETTINGS');
  if (number) await command(page, String(number), 'コマンド=');
}
export async function post(page: Page, title: string, body: string, intent = 'WRITE') {
  await command(page, intent, 'タイトル=');
  await command(page, title, '本文');
  for (const line of body.split('\n')) await command(page, line, '本文=');
  await command(page, '.END', '投稿しますか');
  await command(page, 'Y', 'を登録しました');
}
export async function backup(page: Page): Promise<Backup> {
  const downloading = page.waitForEvent('download');
  await command(page, 'BACKUP');
  return JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
}
export async function importFile(page: Page, data: unknown) {
  const choosing = page.waitForEvent('filechooser');
  await command(page, 'IMPORT');
  await (await choosing).setFiles({ name: 'world.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.locator('.output')).toContainText('置き換えて復元しますか');
}
export async function restore(page: Page, data: unknown) {
  await importFile(page, data);
  await command(page, 'Y', 'バックアップを復元しました');
}
export async function noOtherUi(page: Page) {
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('.terminal-screen button, .terminal-screen select, .terminal-screen textarea, .terminal-screen a, .terminal-screen summary, .terminal-screen aside')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '設定 / Options', exact: true })).toBeVisible();
  await expect(page.locator('input:visible')).toHaveCount(1);
  await expect(page.locator('#command')).toBeFocused();
}
export async function snapshot(page: Page): Promise<Backup> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pcvan-local'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      const stores = ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings', 'session'];
      const tx = db.transaction(stores, 'readonly');
      const result: Record<string, unknown> = { format: 'pcvan-local', version: 1 };
      await Promise.all(stores.map((store) => new Promise<void>((resolve) => {
        const request = store === 'session' ? tx.objectStore(store).get('current') : tx.objectStore(store).getAll();
        request.onsuccess = () => { result[store] = request.result ?? null; resolve(); };
      })));
      return result as unknown as Backup;
    } finally { db.close(); }
  });
}

/** Keep recipient selection separate from the literal subject/body composer. */
export async function selectMailRecipients(page: Page, addresses = ['hoshimori', 'kusabue']) {
  await command(page, 'WRITE-MULTI', 'ローカル住人を1行に1人');
  for (const address of addresses) await command(page, address, '選択済み：');
  return command(page, '.END', '件名=');
}
