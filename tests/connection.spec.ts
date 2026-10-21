import { command, start, backup } from './terminal-helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ConnectionController } from '../src/connection';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };

test('connection presentation can finish once, and commands cancel the wait without being lost', () => {
  const controller = new ConnectionController();
  expect(controller.screen).toBe('connecting');
  expect(controller.submit('J MITI').join('\n')).toContain('MITI / 未知の世界');
  expect(controller.screen).toBe('miti');
  expect(controller.completeConnection()).toEqual([]);
  controller.submit('MAIN');
  controller.submit('Q');
  expect(controller.screen).toBe('disconnected');
  expect(controller.submit('13').join('\n')).toContain('接続は終了しています');
  expect(controller.submit(' reconnect ')).toEqual(controller.welcome);
  expect(controller.screen).toBe('connecting');
  expect(controller.completeConnection().join('\n')).toContain('MAIN');
  expect(controller.screen).toBe('main');
  expect(controller.completeConnection()).toEqual([]);
});


test('Escape skips connection once; logout/reconnect preserve session times and history', async ({ page }) => {
  await page.goto('/'); await page.locator('#command').press('Escape');
  await expect(page.locator('.output')).toContainText('ハンドル名を登録しますか');
  await command(page, 'SKIP', '登録を中止');
  await command(page, 'Q', '接続を終了');
  const ended = await backup(page); expect(ended.session!.lastLogoutAt).not.toBeNull();
  await command(page, 'RECONNECT', '接続中'); await command(page, 'HELP', '番号またはコマンド=');
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, '6', '最終ログイン:');
  const data = await backup(page);
  expect(data.session!.commandHistory.filter((s) => s === 'Q')).toHaveLength(1);
  expect(data.session!.commandHistory.filter((s) => s === 'RECONNECT')).toHaveLength(1);
});

test('typed log export contains all accepted output, literal Unicode, and excludes unsent input', async ({ page }) => {
  await start(page); await command(page, '日本語　ｶﾅ <b>文字</b>', 'この画面では使えない');
  const before = await page.locator('.output').textContent();
  const downloading = page.waitForEvent('download'); await command(page, 'LOG');
  const text = await readFile((await (await downloading).path())!, 'utf8');
  expect(text).toBe(`${before}\n> LOG`);
  await page.locator('#command').fill('未送信');
  expect(text).not.toContain('未送信');
});
