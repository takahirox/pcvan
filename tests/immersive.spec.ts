import { expect, test } from '@playwright/test';
import { command, start, enterForum, noOtherUi, settings } from './terminal-helpers';

test('all operation screens use one terminal with provenance available only on demand', async ({ page }) => {
  await start(page); await noOtherUi(page);
  await enterForum(page); await command(page, 'READ 2', '返信先：#1');
  await expect(page.locator('.output')).not.toContainText('fictional-ai:');
  for (const menu of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await settings(page, menu); await noOtherUi(page);
    await command(page, 'HELP', menu <= 5 || menu >= 8 ? 'コマンド=' : '設定 / SETTINGS');
    await command(page, 'BACK', menu <= 5 || menu >= 8 ? '設定 / SETTINGS' : '元の画面');
    await command(page, 'MAIN', 'MAIN');
  }
  await command(page, 'ABOUT', 'ローカルシミュレーション');
  await expect(page.locator('.output')).toContainText('現代の再構成');
});

test('nested details return through Help and Settings to the original forum screen', async ({ page }) => {
  await start(page); await enterForum(page);
  await settings(page, 8);
  await command(page, 'ABOUT', 'ローカルシミュレーション');
  // Reopening the active detail must not add a duplicate return frame.
  await command(page, 'ABOUT', 'ローカルシミュレーション');
  await command(page, 'BACK', 'Enter: 送信');
  await command(page, 'BACK', '設定 / SETTINGS');
  await command(page, 'BACK', '元の画面に戻りました');
  await command(page, 'READ 2', '返信先：#1');
  // Leaving nested details through MAIN must also discard their return path.
  await settings(page, 8);
  await command(page, 'ABOUT', 'ローカルシミュレーション');
  await command(page, 'MAIN', 'MAIN');
  await command(page, 'ABOUT', 'ローカルシミュレーション');
  await command(page, 'BACK', '番号またはコマンド=');
  await command(page, 'J MITI', 'MITI / 未知の世界');
});

for (const width of [320, 1280]) {
  test(`full-screen command input and scrollback remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 }); await start(page);
    for (let i = 0; i < 4; i++) await command(page, 'HELP', '番号またはコマンド=');
    const input = page.locator('#command'); await input.fill('書きかけ　ｶﾅ');
    await input.press('PageUp'); await expect(input).toHaveValue('書きかけ　ｶﾅ');
    await input.press('Shift+Tab'); await expect(page.getByRole('log')).toBeFocused();
    await page.getByRole('log').press('Tab'); await expect(input).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const box = await input.boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(640);
    await noOtherUi(page);
  });
}
