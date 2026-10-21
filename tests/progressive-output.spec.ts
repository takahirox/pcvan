import { command, start, settings, backup } from './terminal-helpers';
import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

test('controlled frames preserve graphemes, exact spacing, asynchronous append order and bounded batches', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
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


test('terminal speed/theme/effects persist and Escape drains byte-paced output without changing the draft', async ({ page }) => {
  await start(page); await settings(page, 1);
  await command(page, 'THEME amber', '表示設定を保存');
  await command(page, 'EFFECTS ON', '表示設定を保存');
  await command(page, 'SPEED 300'); await page.locator('#command').press('Escape');
  await command(page, 'MAIN'); await page.locator('#command').press('Escape');
  const input = page.locator('#command'); await input.fill('未送信　👩🏽‍💻');
  await input.press('Escape'); await expect(input).toHaveValue('未送信　👩🏽‍💻');
  await expect(page.locator('.output')).toContainText('番号またはコマンド=');
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'amber');
  await page.reload(); await page.locator('#command').press('Escape');
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'amber');
  const preferences = (await backup(page)).settings.find((s) => s.id === 'terminal-display')?.value;
  expect(preferences).toMatchObject({ theme: 'amber', speed: '300', effects: true });
  await settings(page, 1); await command(page, 'SPEED instant', '表示設定を保存');
});

test('reduced motion defaults to instant with effects off; invalid display commands do not mutate preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await start(page); await settings(page, 1);
  await command(page, 'HELP', '表示速度：instant');
  await expect(page.locator('.terminal')).not.toHaveClass(/effects/);
  await command(page, 'SPEED 999', 'SPEED 300');
  expect((await backup(page)).settings.some((s) => s.id === 'terminal-display')).toBe(false);
});
