import { expect, test } from '@playwright/test';
import { command, start, enterForum, post, backup, restore, noOtherUi, settings, snapshot } from './terminal-helpers';
import { mockWorker } from './ai-helpers';

test('production keyboard journey preserves all MAIN mappings, Japanese posts, read states and backup recovery', async ({ page, context }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) requests.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page, '旅の利用者');
  for (const selector of [...Array.from({ length: 21 }, (_, i) => String(i + 1)), 'X']) {
    await command(page, selector, `${selector} `); await command(page, 'MAIN', 'MAIN');
  }
  await enterForum(page); await command(page, 'READ 1', '★内容');
  await post(page, '旅の記録', '一行目\n\n  日本語　ｶﾅ  ');
  await post(page, '返信', 'キーボードだけで書いた返信。', 'REPLY 17');
  await command(page, 'READ 18', '返信先：#17');
  const saved = await backup(page); expect(saved.posts).toHaveLength(32);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await enterForum(page); await command(page, 'READ 18', 'キーボードだけ');
  await command(page, 'MAIN', 'MAIN'); await command(page, 'Q', '接続を終了');
  await command(page, 'RECONNECT', 'PC-VAN 接続中'); await command(page, 'HELP', '番号またはコマンド=');
  await restore(page, saved); expect((await snapshot(page)).posts).toEqual(saved.posts);
  await noOtherUi(page); expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('production AI recovers a partially committed autonomous batch after tab loss without duplicates', async ({ page, context }) => {
  const startTime = new Date('2026-10-21T00:00:00Z'), returnTime = new Date('2026-10-24T00:00:00Z');
  await page.clock.setFixedTime(startTime); await mockWorker(page, 'interrupt'); await start(page, '旅行者');
  await enterForum(page); await post(page, '元の話題', '星を眺めました。');
  await settings(page, 3); await command(page, 'AUTO 2', '有効');
  await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('モデル準備完了');
  await command(page, 'MAIN', 'MAIN'); await command(page, 'Q', '接続を終了');
  expect((await backup(page)).session!.lastLogoutAt).toBe(startTime.toISOString());
  await page.clock.setFixedTime(returnTime); await command(page, 'RECONNECT', '接続中');
  await expect.poll(() => page.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)).toBe(2);
  const interrupted = await backup(page), generated = interrupted.posts.filter((p) => p.simulation);
  expect(generated).toHaveLength(1); expect(interrupted.posts).toHaveLength(32);
  await page.close(); const resumed = await context.newPage(); await resumed.clock.setFixedTime(returnTime); await mockWorker(resumed, 'ok');
  await resumed.goto('/');
  await expect.poll(async () => (await snapshot(resumed)).posts.length).toBe(33);
  const recovered = await backup(resumed);
  expect(recovered.posts.filter((p) => p.simulation)).toHaveLength(2);
  expect(recovered.posts.find((p) => p.id === generated[0]!.id)).toEqual(generated[0]);
  await settings(resumed, 3); await command(resumed, 'HELP', 'committed');
  await command(resumed, 'MAIN', 'MAIN'); await command(resumed, 'Q', '接続を終了');
  await command(resumed, 'RECONNECT', '接続中'); await command(resumed, 'HELP', '番号またはコマンド=');
  expect((await backup(resumed)).posts).toEqual(recovered.posts); await noOtherUi(resumed);
});
