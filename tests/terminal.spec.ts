import { start } from './terminal-helpers';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await start(page);
});

test('starts without services and submits Japanese text as plain text with exact spacing', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const output = page.locator('.output');
  await expect(input).toBeFocused();
  await expect(output).toContainText('MAIN');
  // No network, storage, GPU, or model service is needed after the static files load.
  await page.context().setOffline(true);
  const line = 'echo   日本語：ＡＢＣ　。、 ｶﾀｶﾅ <b>文字</b>  ';
  await input.fill(line);
  await input.press('Enter');
  await expect.poll(() => output.textContent()).toContain(`> ${line}\n`);
  await expect(output.locator('b')).toHaveCount(0);
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.fill('13');
  await input.press('Enter');
  await expect(output).toContainText('コミュニケーション');
  await input.fill('help');
  await input.press('Enter');
  await expect(output).toContainText('MAIN に戻る');
  await expect(input).toBeFocused();
  await input.fill('unknown');
  await input.press('Enter');
  await expect(output).toContainText('この画面では使えないコマンドです。');
});

test('recalls commands, restores the draft, and does not submit during IME composition', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill('help');
  await input.press('Enter');
  await expect.poll(() => page.locator('.output').textContent()).toContain('> help\nMAIN\n');
  await input.fill('echo ｶﾅ');
  await input.press('Enter');
  // History is accepted by the serialized command queue, before its response.
  await expect(page.locator('.output')).toContainText('> echo ｶﾅ\nこの画面では使えないコマンドです。');
  await input.fill('書きかけ');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('書きかけ');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('echo ｶﾅ');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('書きかけ');

  // Wait for the serialized response before checking that IME adds no output.
  await expect(page.locator('.output')).toContainText('> echo ｶﾅ\nこの画面では使えないコマンドです。');
  const before = await page.locator('.output').textContent();
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('書きかけ');
  expect(await page.locator('.output').textContent()).toBe(before);
  await input.dispatchEvent('compositionend');
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  expect(await page.locator('.output').textContent()).toBe(before);
  await input.press('Enter');
  await expect(page.locator('.output')).toContainText('> 書きかけ');
});

test('keyboard scrollback keeps the input draft and allows returning through Tab', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const log = page.getByRole('log');
  for (let i = 0; i < 12; i += 1) {
    await input.fill(`demo ${i}`);
    await input.press('Enter');
  }
  // Input echo is immediate; wait for the serialized response before scrolling.
  await expect(page.locator('.output')).toContainText('> demo 11\nこの画面では使えないコマンドです。');
  const bottom = await log.evaluate((element) => element.scrollTop);
  expect(bottom).toBeGreaterThan(0);
  await input.fill('unfinished');
  await input.press('PageUp');
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeLessThan(bottom);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('unfinished');
  await input.press('Shift+Tab');
  await expect(log).toBeFocused();
  await log.press(process.platform === 'darwin' ? 'Home' : 'Control+Home');
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(0);
  await log.press('Tab');
  await expect(input).toBeFocused();
  await input.press('PageDown');
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('a narrow viewport scrolls long output and keeps the command field usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const log = page.getByRole('log');
  const line = `echo ${'長いｺﾏﾝﾄﾞ　。'.repeat(30)}末尾`;
  await input.fill(line);
  await input.press('End');
  expect(await input.evaluate((element: HTMLInputElement) => element.scrollLeft)).toBeGreaterThan(0);
  await input.press('Enter');
  await expect(page.locator('.output')).toContainText('末尾');
  expect(await log.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await input.press('Shift+Tab');
  await expect(log).toBeFocused();
  await log.press('ArrowRight');
  await expect.poll(() => log.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await log.press('Tab');
  await expect(input).toBeFocused();
});
