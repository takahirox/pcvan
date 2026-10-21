import { expect, test } from '@playwright/test';
import { openSettings, closeSettings } from './settings-helpers';

const meta = /創作|再構成|暫定|未確認|reconstructed|https?:\/\/|\[[ABCD] \/ /;

test('startup, every ordinary directory, articles, help, empty services and reconnect stay clean', async ({ page }) => {
  await page.goto('/');
  const output = page.locator('.output');
  await expect(output).toContainText('番号またはコマンド=');
  for (const command of ['HELP', '13', 'HELP', '2', 'HELP', 'MAIL', 'HELP', 'BACK', 'LIBRARY', 'BACK',
    'CONFERENCE', 'BACK', 'OLT', 'BACK', 'OSL', 'BACK', 'FORUMS', 'HELP', '1', 'LIST', 'READ 1',
    'READ 999', 'BACK', '2', 'BACK', '3', 'BACK', '4', 'BACK', '5', 'BACK', '6', 'BACK', '7',
    'MAIN', 'J MITI', '3', '9', 'LIST', 'READ 1', 'READ 3', 'HELP', 'invalid', 'MAIN', 'Q', 'HELP', 'RECONNECT', 'HELP']) {
    const input = page.locator('#command');
    await input.fill(command); await input.press('Enter');
    await expect.poll(async () => {
      const text = (await output.textContent())!;
      return text.slice(text.lastIndexOf(`> ${command}\n`) + command.length + 3).length;
    }).toBeGreaterThan(0);
    expect(await output.textContent()).not.toMatch(meta);
  }
  await expect(output).toContainText('参加者：0人');
  await expect(output).not.toContainText('未実装');
  await expect(output).toContainText('★タイトル (fictional-ai:hankote)');
  await expect(output).toContainText('接続を終了しました');
});

test('Settings hides all secondary UI, traps keyboard focus, exposes sources and restores focus without changing the draft', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'font') fonts.push(request.url()); });
  await page.goto('/');
  for (const selector of ['.display-controls', '.member-controls', '.ai-controls', '.storage-controls', '.offline-controls', '.help-controls', '.about-controls']) {
    await expect(page.locator(selector)).toBeHidden();
    expect(await page.locator(selector).evaluate((element) => !!element.closest('.settings-dialog'))).toBe(true);
  }
  await page.locator('#command').fill('書きかけ　ｶﾅ');
  const trigger = page.getByRole('button', { name: /設定 \/ Options/ });
  await trigger.focus(); await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: '設定 / Options', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: '閉じる', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.locator('.close-settings')).toBeFocused();
  await openSettings(page, 'about');
  for (const phrase of ['ブラウザー内だけ', '1996年頃', '1997年全期間', '1992年', 'J MITI → 3 → 9',
    'MAIN / BACK / HELP / RECONNECT', '読み取り専用', '史実の件数ではありません', 'INBOX / SENT', 'DEMO0001〜DEMO0003', '架空', 'fictional-ai:', 'UTC', '専用フォントではありません']) {
    await expect(page.locator('.about-controls')).toContainText(phrase);
  }
  await expect(page.getByRole('link', { name: '史料・年代・不確実性の調査記録' })).toHaveAttribute('href', /docs\/research\/pcvan-1996-1997.md$/);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
  await expect(page.locator('#command')).toHaveValue('書きかけ　ｶﾅ');
  expect(fonts).toEqual([]);
});

test('missing-member WRITE opens Settings, IME Escape is guarded, and editor stays a sibling modal', async ({ page }) => {
  await page.goto('/');
  for (const command of ['J MITI', '3', '9', 'WRITE']) {
    await page.locator('#command').fill(command); await page.locator('#command').press('Enter');
  }
  await expect(page.locator('.settings-dialog')).toBeVisible();
  await expect(page.locator('.handle')).toBeFocused();
  await page.locator('.handle').dispatchEvent('compositionstart');
  await page.locator('.handle').press('Escape');
  await expect(page.locator('.settings-dialog')).toBeVisible();
  await page.locator('.handle').dispatchEvent('compositionend');
  await page.locator('.handle').fill('星の人');
  await page.locator('.create-member').click();
  await expect(page.locator('.member-message')).toContainText('利用者を作成しました');
  await closeSettings(page);
  await expect(page.locator('#command')).toBeFocused();
  await openSettings(page, 'display');
  // Reproduce a queued WRITE finishing after the user has opened Settings.
  await page.evaluate(() => {
    document.querySelector<HTMLInputElement>('#command')!.value = 'WRITE';
    document.querySelector<HTMLFormElement>('.command-form')!.requestSubmit();
  });
  await expect(page.locator('.settings-dialog')).toBeHidden();
  await expect(page.getByRole('dialog', { name: '投稿エディター', exact: true })).toBeVisible();
  expect(await page.locator('.settings-dialog dialog').count()).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#command')).toBeFocused();
});

for (const width of [320, 1280]) {
  test(`Japanese terminal cells, MAIN columns, fallback fonts and zoom at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.locator('.output')).toContainText('番号またはコマンド=');
    for (const font of ['', '"Unavailable PC Font", "Osaka-Mono", monospace', 'monospace']) {
      const metrics = await page.locator('.output').evaluate((output, font) => {
        output.style.fontFamily = font;
        const style = getComputedStyle(output);
        const sample = document.createElement('span');
        sample.style.font = style.font; sample.style.whiteSpace = 'pre';
        document.body.append(sample);
        const size = (text: string) => { sample.textContent = text; return sample.getBoundingClientRect().width; };
        const cells = ['M', 'i', ' ', 'ｶ', 'ﾅ', '日', '本', 'カ', 'ナ', '、', '。', '　', 'Ａ'].map(size);
        sample.remove();
        const text = output.firstChild!;
        const lines = output.textContent!.split('\n');
        let offset = 0;
        const columns: number[] = [];
        for (const line of lines) {
          const right = / {2,}(1[2-9]|2[01]) /.exec(line);
          if (right) {
            const range = document.createRange();
            const start = offset + right.index + right[0].length - 3;
            range.setStart(text, start); range.setEnd(text, start + 1);
            columns.push(range.getBoundingClientRect().x);
          }
          offset += line.length + 1;
        }
        return { cells, columns, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
      }, font);
      for (const cell of metrics.cells.slice(0, 5)) expect(cell).toBeCloseTo(metrics.cells[0]!, 0);
      for (const cell of metrics.cells.slice(5)) expect(cell).toBeCloseTo(metrics.cells[0]! * 2, 0);
      expect(metrics.columns).toHaveLength(10);
      expect(Math.max(...metrics.columns) - Math.min(...metrics.columns)).toBeLessThan(1);
      expect(metrics.lineHeight / metrics.fontSize).toBeLessThanOrEqual(1.5);
    }
    await page.locator('.output').evaluate((element) => { element.style.fontSize = '200%'; });
    const layout = await page.locator('.transcript').evaluate((element) => ({ scroll: element.scrollWidth > element.clientWidth,
      fits: document.documentElement.scrollWidth <= innerWidth, selection: getComputedStyle(element).userSelect }));
    expect(layout.scroll).toBe(true); expect(layout.fits).toBe(true); expect(layout.selection).not.toBe('none');
    await openSettings(page, 'ai');
    await openSettings(page, 'storage');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape'); await expect(page.locator('.settings-dialog')).toBeHidden();
  });
}
