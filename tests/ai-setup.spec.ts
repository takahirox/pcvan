import { expect, test } from '@playwright/test';
import { command, start, settings, snapshot, noOtherUi } from './terminal-helpers';
import { mockWorker } from './ai-helpers';

test('unsupported WebGPU, deferral and on-demand provenance require no downloads or secondary UI', async ({ page }) => {
  const assets: string[] = [];
  page.on('request', (r) => { if (/webllm|huggingface/.test(r.url())) assets.push(r.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  await start(page); await settings(page, 3); await command(page, 'LATER', '延期');
  await command(page, 'LOAD', '数百 MB'); await command(page, 'Y', 'WebGPU が利用できません');
  expect(assets).toEqual([]); await noOtherUi(page);
  const data = await snapshot(page);
  expect(data.settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false, setupDeferred: true, maxPosts: 4 });
  await command(page, 'ABOUT', 'local-seed:fictional');
});

test('another tab changing consent context invalidates a pending typed approval', async ({ page, context }) => {
  await mockWorker(page, 'ok'); await start(page); await settings(page, 3);
  await command(page, 'LOAD', '同意してモデル');
  const other = await context.newPage(); await mockWorker(other, 'ok'); await other.goto('/');
  await expect(other.locator('.output')).toContainText('MAIN');
  await settings(other, 3); await command(other, 'AUTO 0', '休止');
  await command(page, 'Y', '世界や設定が変わりました');
  expect((await snapshot(page)).settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false });
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});

test('one tab holds the model lease; another cannot download until STOP releases it', async ({ page, context }) => {
  await mockWorker(page, 'ok'); await start(page); await settings(page, 3);
  await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('モデル準備完了');
  const other = await context.newPage(); await mockWorker(other, 'ok'); await other.goto('/');
  await expect(other.locator('.output')).toContainText('MAIN'); await settings(other, 3);
  await command(other, 'LOAD', '同意してモデル'); await command(other, 'Y');
  await expect(other.locator('.output')).toContainText('別のタブでモデルを使用中');
  await command(page, 'STOP', 'キャンセル');
  await command(other, 'LOAD', '同意してモデル'); await command(other, 'Y');
  await expect(other.locator('.output')).toContainText('モデル準備完了');
});

test('model cache inspection is a typed action without consent or loading; status never promises offline inference', async ({ page }) => {
  await mockWorker(page, 'ok'); await start(page); await settings(page, 3);
  await command(page, 'CACHE');
  await expect.poll(async () => page.locator('.output').textContent()).toMatch(/重みは|保存状態を確認できません/);
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
  expect((await snapshot(page)).settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false });
});
