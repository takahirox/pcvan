import { openSettings, closeSettings } from './settings-helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ConnectionController } from '../src/connection';
import { backupFixture } from './backup-fixture';

test.use({ reducedMotion: 'no-preference' });

async function backup(page: Page) {
  await openSettings(page, 'storage');
  const downloading = page.waitForEvent('download');
  await page.locator('.backup').click();
  return JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
}

async function restore(page: Page, data: unknown) {
  await openSettings(page, 'storage');
  await page.locator('.backup-file').setInputFiles({ name: 'display.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.restore').click();
  await expect(page.locator('.storage-status')).toContainText('バックアップを復元しました');
}

test('controlled frames preserve graphemes, exact spacing, asynchronous append order and bounded batches', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await openSettings(page, 'display');
  await page.locator('.terminal-speed').selectOption('instant');
  const result = await page.evaluate(async () => {
    const path = '/src/output-renderer.ts';
    const { OutputRenderer, MAX_PENDING_UNITS, displayCost } = await import(path);
    let now = 0;
    let id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const original = { raf: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, now: performance.now };
    window.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id; };
    window.cancelAnimationFrame = (key) => { frames.delete(key); };
    performance.now = () => now;
    const frame = (elapsed: number) => {
      now += elapsed;
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach((callback) => callback(now));
    };
    try {
      let visible = '';
      const paints: string[] = [];
      const announcements: string[] = [];
      const renderer = new OutputRenderer('300', (text: string) => { visible += text; paints.push(text); }, () => {}, (text: string) => announcements.push(text));
      const first = ' A日本語　ｶﾅ e\u0301 👩🏽‍💻 <b>文字</b>  \n\n末尾\n';
      renderer.append(first);
      const before = { visible, logical: renderer.text, announcements: [...announcements] };
      frame(100); // Three byte credits: space + A, but not half of 日.
      const partial = visible;
      await Promise.resolve();
      renderer.append('非同期 AI', 'reconnect');
      frame(1000);
      frame(500); // Enough credit for the entire joined emoji, never a partial cluster.
      const during = { visible, announcements: [...announcements], paints: paints.length };
      renderer.reveal();
      const complete = { visible, logical: renderer.text, announcements: [...announcements], frames: frames.size };
      renderer.append('later'); frame(1000);
      const later = visible;
      // Speed changes flush the old batch; Instant applies to later appends too.
      renderer.append('待機中'); renderer.setSpeed('instant'); renderer.append('即時');
      const instant = visible;
      renderer.setSpeed('300');
      renderer.append('backlog'); frame(100);
      renderer.append('x'.repeat(MAX_PENDING_UNITS));
      const bounded = { visible: visible === renderer.text, frames: frames.size };
      renderer.append('z'.repeat(MAX_PENDING_UNITS + 1));
      const oversized = { visible: visible === renderer.text, frames: frames.size };
      const modes: Record<string, number> = {};
      for (const speed of ['300', '1200', '2400', '9600']) {
        let painted = '';
        const item = new OutputRenderer(speed, (text: string) => { painted += text; }, () => {}, () => {});
        item.append('a'.repeat(2000)); frame(1000); modes[speed] = painted.length; item.reveal();
      }
      return { before, partial, during, complete, later, instant, bounded, oversized, modes,
        costs: ['a', '\n', '日', 'ｶ', '😀', 'e\u0301', '👩🏽‍💻'].map(displayCost), first };
    } finally {
      window.requestAnimationFrame = original.raf; window.cancelAnimationFrame = original.cancel; performance.now = original.now;
    }
  });
  expect(result.before).toEqual({ visible: '', logical: result.first, announcements: [] });
  expect(result.partial).toBe(' A');
  expect(result.during.announcements).toEqual([]);
  expect(result.during.visible).toContain('👩🏽‍💻');
  expect(result.during.paints).toBe(3); // One DOM-facing batch per controlled frame.
  const complete = `${result.first}\n非同期 AI\nreconnect`;
  expect(result.complete).toEqual({ visible: complete, logical: complete, announcements: [complete], frames: 0 });
  expect(result.later).toBe(`${complete}\nlater`);
  expect(result.instant).toBe(`${complete}\nlater\n待機中\n即時`);
  expect(result.bounded).toEqual({ visible: true, frames: 0 });
  expect(result.oversized).toEqual({ visible: true, frames: 0 });
  expect(result.modes).toEqual({ '300': 30, '1200': 120, '2400': 240, '9600': 960 });
  expect(result.costs).toEqual([1, 1, 3, 3, 4, 3, 15]);
});

test('commands flush preceding text, skip preserves later output, and download includes unpainted Unicode without drafts', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto('/');
  await openSettings(page, 'display');
  await page.locator('.terminal-speed').selectOption('300');
  const input = page.getByRole('textbox', { name: 'コマンド', exact: true });
  await closeSettings(page);
  await input.fill('J MITI'); await input.press('Enter');
  await expect(page.locator('.reveal-output')).toBeEnabled();
  const controller = new ConnectionController();
  const expected = [...controller.welcome, ...controller.completeConnection(), '> J MITI', ...controller.submit('J MITI')].join('\n');
  expect(await page.locator('.output').textContent()).not.toBe(expected);
  await closeSettings(page);
  await input.fill('未送信 😀 ｶﾅ');
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await input.press('Escape');
  await expect(page.locator('.reveal-output')).toBeEnabled();
  await input.dispatchEvent('compositionend');
  const downloading = page.waitForEvent('download');
  await openSettings(page, 'display');
  await page.locator('.download-log').click();
  expect(await readFile((await (await downloading).path())!, 'utf8')).toBe(expected);
  await expect(input).toHaveValue('未送信 😀 ｶﾅ');
  // Esc reveals accepted text, leaving both session and draft intact.
  await closeSettings(page);
  await input.press('Escape');
  expect(await page.locator('.output').textContent()).toBe(expected);
  await expect(page.locator('.reveal-output')).toBeDisabled();
  await expect(page.getByRole('log')).toHaveAttribute('aria-live', 'off');
  await closeSettings(page);
  await input.fill('3'); await input.press('Enter');
  await expect(page.locator('.reveal-output')).toBeEnabled();
  // Submit again while the preceding response is still entirely unpainted.
  await closeSettings(page);
  await input.fill('9'); await input.press('Enter');
  await expect(page.locator('.output')).toContainText('MITI / フォーラム');
  const prior = `${expected}\n> 3\n${controller.submit('3').join('\n')}\n> 9`;
  expect(await page.locator('.output').textContent()).toBe(prior);
  await expect(page.locator('.reveal-output')).toBeEnabled();
  await page.locator('.reveal-output').click();
  const all = `${prior}\n${controller.submit('9').join('\n')}`;
  expect(await page.locator('.output').textContent()).toBe(all);
  await expect(input).toBeFocused();
  await closeSettings(page);
  await input.fill('READ 1'); await input.press('Enter');
  await expect(page.locator('.reveal-output')).toBeEnabled();
  await openSettings(page, 'display');
  await page.locator('.terminal-speed').selectOption('instant');
  await expect(page.locator('.output')).toContainText('★内容');
  await expect(page.locator('.reveal-output')).toBeDisabled();
});

test('display settings reload and round-trip in v1 backups; invalid values leave the world unchanged', async ({ page }) => {
  await page.goto('/');
  await openSettings(page, 'display');
  await page.getByRole('combobox', { name: '表示色', exact: true }).selectOption('amber');
  await page.getByLabel('光彩・走査線').check();
  await openSettings(page, 'display');
  await page.locator('.terminal-speed').selectOption('1200');
  const saved = await backup(page);
  const setting = { id: 'terminal-display', value: { version: 1, theme: 'amber', speed: '1200', effects: true } };
  expect(saved.settings).toContainEqual(setting);
  await page.reload();
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'amber');
  await expect(page.locator('.terminal')).toHaveClass(/effects/);
  await expect(page.locator('.terminal-speed')).toHaveValue('1200');
  await openSettings(page, 'display');
  await page.locator('.terminal-speed').selectOption('instant');
  await restore(page, saved);
  await expect(page.locator('.terminal-speed')).toHaveValue('1200');
  const oldWorld = backupFixture();
  await restore(page, oldWorld); // Old v1 backups need no migration or new setting.
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'white');
  await expect(page.locator('.terminal-speed')).toHaveValue('2400');
  expect((await backup(page)).settings).toEqual(oldWorld.settings);
  for (const value of [
    { version: 2, theme: 'white', speed: '2400', effects: false },
    { version: 1, theme: 'blue', speed: '2400', effects: false },
    { version: 1, theme: 'white', speed: 2400, effects: false },
    { version: 1, theme: 'white', speed: '300', effects: 'yes' },
  ]) {
    await page.locator('.backup-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...oldWorld, settings: [{ id: setting.id, value }] })) });
    await page.locator('.restore').click();
    await expect(page.locator('.storage-status')).toContainText('Invalid terminal display preferences');
    expect((await backup(page)).settings).toEqual(oldWorld.settings);
  }
});

test('reduced motion defaults to Instant with effects off and permits an explicit animated preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.terminal-speed')).toHaveValue('instant');
  await expect(page.locator('.terminal')).not.toHaveClass(/effects/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.terminal-speed')).toHaveValue('2400');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.terminal-speed')).toHaveValue('instant');
  await openSettings(page, 'display');
  await page.locator('.terminal-speed').selectOption('300');
  await openSettings(page, 'display');
  await page.getByLabel('光彩・走査線').check();
  await backup(page); // Wait for serialized persistence before reloading.
  await page.reload();
  await expect(page.locator('.terminal-speed')).toHaveValue('300');
  await expect(page.locator('.terminal')).toHaveClass(/effects/);
});

for (const width of [320, 1280]) {
  test(`terminal dominates ${width}px layout, keeps native prompt and selectable horizontal scrollback`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 800 });
    await page.goto('/');
    await expect(page.locator('.terminal-speed')).toHaveValue('2400');
    for (const selector of ['.display-controls', '.member-controls details', '.storage-controls details', '.ai-controls', '.offline-controls details']) {
      await expect(page.locator(selector)).not.toHaveAttribute('open');
    }
    await openSettings(page, 'display');
    await page.locator('.terminal-speed').selectOption('instant');
    const input = page.getByRole('textbox', { name: 'コマンド', exact: true });
    await closeSettings(page);
    await input.fill(`日本語 😀 ｶﾅ ${'長い行'.repeat(80)}末尾`); await input.press('Enter');
    await expect(page.locator('.output')).toContainText('末尾');
    const layout = await page.evaluate(() => {
      const shell = document.querySelector('.terminal')!.getBoundingClientRect();
      const field = document.querySelector('#command')!.getBoundingClientRect();
      const log = document.querySelector('.transcript')!;
      return { height: shell.height, screenHeight: document.querySelector('.terminal-screen')!.getBoundingClientRect().height, viewport: innerHeight, fits: document.documentElement.scrollWidth <= innerWidth,
        promptFits: field.x >= 0 && field.right <= innerWidth && field.bottom <= innerHeight && field.width > 70,
        scrolls: log.scrollWidth > log.clientWidth, whiteSpace: getComputedStyle(document.querySelector('.output')!).whiteSpace };
    });
    expect(layout.height).toBeGreaterThan(layout.viewport * 0.6);
    expect(layout.screenHeight).toBeGreaterThan(layout.viewport * 0.45);
    expect(layout).toMatchObject({ fits: true, promptFits: true, scrolls: true, whiteSpace: 'pre' });
    // Selection remains literal with all three themes and effects enabled.
    await openSettings(page, 'display');
    await page.getByLabel('光彩・走査線').check();
    for (const theme of ['white', 'green', 'amber']) {
      await openSettings(page, 'display');
      await page.getByRole('combobox', { name: '表示色', exact: true }).selectOption(theme);
      await closeSettings(page);
      const selected = await page.locator('.output').evaluate((node) => {
        const range = document.createRange(); range.selectNodeContents(node);
        const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
        return selection.toString();
      });
      expect(selected).toBe(await page.locator('.output').textContent());
    }
  });
}
