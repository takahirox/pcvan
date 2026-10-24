import { expect, test } from '@playwright/test';
import { command, start, settings, enterForum, post, backup } from './terminal-helpers';

test('offline shell is opt-in, caches static assets only, and supports offline reload/read/write/backup', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await start(page, 'オフラインの人');
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r))).toBe(false);
  await settings(page, 5); await command(page, 'CACHE', '端末を保存しています');
  await expect(page.locator('.output')).toContainText('端末をオフライン用に保存済み');
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await context.setOffline(true); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await enterForum(page); await command(page, 'READ 1', '★内容'); await post(page, 'オフライン投稿', '通信なしでも保存');
  expect((await backup(page)).posts).toHaveLength(70);
  await settings(page, 5); await command(page, 'STATUS', 'オフライン');
  expect(external).toEqual([]);
});

test('storage estimate and browser persistence requests return transcript statuses, including denial and errors', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'estimate', { value: async () => ({ usage: 1024 ** 2, quota: 10 * 1024 ** 2 }) });
    Object.defineProperty(navigator.storage, 'persisted', { value: async () => false });
    let calls = 0;
    Object.defineProperty(navigator.storage, 'persist', { value: async () => { calls++; if (calls === 3) throw new Error('denied'); return calls === 2; } });
  });
  await start(page); await settings(page, 5); await command(page, 'STATUS', '使用量 約 1.0 MiB / 上限 約 10.0 MiB');
  await command(page, 'PERSIST', '永続保存は許可されません');
  await command(page, 'PERSIST', '永続保存：許可されました');
  await command(page, 'PERSIST', '永続保存をリクエストできません');
});

test('unsupported offline storage explains availability without interfering with navigation', async ({ page }) => {
  await start(page, undefined, 'http://127.0.0.1:14374'); await settings(page, 5);
  await command(page, 'CACHE', '本番ビルドが必要');
  await command(page, 'MAIN', 'MAIN'); await enterForum(page); await command(page, 'READ 1', '★内容');
});
