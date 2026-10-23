import { command, start, settings, backup } from './terminal-helpers';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ reducedMotion: 'no-preference' });

test('controlled frames preserve graphemes, exact spacing, asynchronous append order and bounded batches', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const path = '/src/output-renderer.ts';
    const { OutputRenderer, MAX_PENDING_UNITS } = await import(path);
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
      frame(100); // Three timing units: space + A, but not half of 日.
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
      const rates: Record<string, number> = {};
      for (const character of ['A', 'ｶ', '日']) {
        let painted = '';
        const item = new OutputRenderer('300', (text: string) => { painted += text; }, () => {}, () => {});
        item.append(character.repeat(100)); frame(1000); rates[character] = painted.length; item.reveal();
      }
      let mixed = '';
      const mixedRenderer = new OutputRenderer('300', (text: string) => { mixed += text; }, () => {}, () => {});
      mixedRenderer.append('A日B');
      frame(50); const mixedPartial = mixed; // 1.5 units: A, then wait for 日's full two units.
      frame(50); const mixedJapanese = mixed;
      frame(50); const mixedComplete = { visible: mixed, logical: mixedRenderer.text, frames: frames.size };
      const clusters = [];
      for (const [text, wait] of [['e\u0301', 50], ['😀', 50], ['👩🏽‍💻', 250]] as const) {
        let painted = '';
        const announced: string[] = [];
        const pending: boolean[] = [];
        const item = new OutputRenderer('300', (value: string) => { painted += value; },
          (value: boolean) => pending.push(value), (value: string) => announced.push(value));
        item.append(text); frame(wait); // Insufficient credit for the complete grapheme.
        const waiting = { visible: painted, logical: item.text, announced: [...announced] };
        frame(50);
        clusters.push({ text, waiting, visible: painted, logical: item.text, announced, pending, frames: frames.size });
      }
      // Two-unit Japanese timing must not trigger the independent UTF-16 backlog bound.
      let queued = '';
      const queueRenderer = new OutputRenderer('300', (text: string) => { queued += text; }, () => {}, () => {});
      queueRenderer.append('日'.repeat(MAX_PENDING_UNITS / 2));
      queueRenderer.append('日'.repeat(MAX_PENDING_UNITS / 2 - 1)); // Includes the separating LF.
      const atBound = { visible: queued, length: queueRenderer.text.length, frames: frames.size };
      queueRenderer.append(''); // One more LF crosses the string-length bound and drains everything.
      const overBound = { complete: queued === queueRenderer.text, frames: frames.size };
      return { before, partial, during, complete, later, instant, bounded, oversized, modes, rates,
        mixedPartial, mixedJapanese, mixedComplete, clusters, atBound, overBound, first };
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
  expect(result.rates).toEqual({ A: 30, 'ｶ': 30, '日': 15 });
  expect(result.mixedPartial).toBe('A');
  expect(result.mixedJapanese).toBe('A日');
  expect(result.mixedComplete).toEqual({ visible: 'A日B', logical: 'A日B', frames: 0 });
  for (const cluster of result.clusters) {
    expect(cluster.waiting).toEqual({ visible: '', logical: cluster.text, announced: [] });
    expect(cluster).toMatchObject({ visible: cluster.text, logical: cluster.text,
      announced: [cluster.text], pending: [true, false], frames: 0 });
  }
  expect(result.atBound).toEqual({ visible: '', length: 65_536, frames: 1 });
  expect(result.overBound).toEqual({ complete: true, frames: 0 });
});

test('display costs use the limited Shift-JIS approximation with a two-unit Unicode fallback', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const costs = await page.evaluate(async () => {
    const path = '/src/output-renderer.ts';
    const { displayCost } = await import(path);
    return Object.fromEntries(['', 'A', '\n', '\u007f', '\u0080', 'ｶ', '\uff60', '\uff61', '\uff9f', '\uffa0',
      '日', 'あ', 'カ', '。', '、', '　', '¥', '‾', '😀', 'e\u0301', '👩🏽‍💻', 'A日ｶ\n'].map((text) => [text, displayCost(text)]));
  });
  expect(costs).toEqual({ '': 0, A: 1, '\n': 1, '\u007f': 1, '\u0080': 2, 'ｶ': 1,
    '\uff60': 2, '\uff61': 1, '\uff9f': 1, '\uffa0': 2,
    '日': 2, 'あ': 2, 'カ': 2, '。': 2, '、': 2, '　': 2, '¥': 1, '‾': 1,
    '😀': 2, 'e\u0301': 3, '👩🏽‍💻': 8, 'A日ｶ\n': 5 });
});

test('UTF-8 log download includes accepted unpainted Unicode and excludes the unsent draft', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const downloading = page.waitForEvent('download');
  const result = await page.evaluate(async () => {
    const terminalPath = '/src/terminal.ts';
    const controlsPath = '/src/storage/controls.ts';
    const { mountTerminal } = await import(terminalPath);
    const { downloadText } = await import(controlsPath);
    const root = document.createElement('div');
    document.body.append(root);
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 1; // Accept text without allowing a paint frame.
    try {
      const terminal = mountTerminal(root, { submit() {}, previous: () => '', next: () => '' });
      terminal.setPreferences({ version: 1, theme: 'white', speed: '300', effects: false });
      const text = ' 日本語　ｶﾅ ¥‾ e\u0301 👩🏽‍💻 <b>文字</b>  \n\n末尾\n';
      terminal.append(text);
      root.querySelector('input')!.value = '未送信';
      downloadText(terminal.logText(), 'terminal');
      return { text, painted: root.querySelector('.output')!.textContent, logical: terminal.logText() };
    } finally { window.requestAnimationFrame = original; }
  });
  const text = await readFile((await (await downloading).path())!, 'utf8');
  expect(result.painted).toBe('');
  expect(result.logical).toBe(result.text);
  expect(text).toBe(result.text);
  expect(text).not.toContain('未送信');
});

test('terminal speed/theme/effects persist and Escape drains paced output without changing the draft', async ({ page }) => {
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
