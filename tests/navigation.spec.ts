import { expect, test } from '@playwright/test';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { command, start } from './terminal-helpers';

const { miti } = sigEvidence;

const mainBanner = '　＝＝＝ＰＣ－ＶＡＮ＝＝＝ (MAIN)';
const expectedPairs = [
  ['　１．電子メール', '　２．索引'],
  ['　３．ニュース', '　４．データベース'],
  ['　５．公共情報と政治', '　６．ビジネス'],
  ['　７．インターネット', '　８．コンピュータ'],
  ['　９．ショッピングモール', '１０．電子出版'],
  ['１１．趣味', '１２．生活'],
  ['１３．コミュニケーション', '１４．ＰＣ－ＶＡＮ利用情報（無料）'],
  ['１５．☆★☆ おすすめ ☆★☆', '１６．☆★☆ わかばマーク ☆★☆'],
  ['１７．ＢＩＧＬＯＢＥガイド', '１８．インターサイト'],
  ['１９．ＢＩＧＬＯＢＥイベント（無料）', '２０．ＢＩＧＬＯＢＥ情報誌ご案内'],
  ['２１．オリンピック特設コーナー', '　Ｘ．旧電子メール'],
];

function expectMain(lines: readonly string[]) {
  expect(lines[0]).toBe(mainBanner);
  const rows = lines.slice(1, 13);
  expect(rows).toHaveLength(12);
  const rightOffsets = expectedPairs.map((pair, index) => {
    const row = rows[index]!;
    expect(row.split(/ {2,}/)).toEqual(pair);
    const prefix = row.slice(0, row.indexOf(pair[1]!));
    // Japanese display cells, rather than UTF-16 length, determine alignment.
    return [...prefix].reduce((cells, character) => cells + (/^[ -~]$/.test(character) ? 1 : 2), 0);
  });
  expect(new Set(rightOffsets).size).toBe(1);
  expect(rows[11]).toBe('　Ｑ．終了');
  const entries = rows.flatMap((row) => row.split(/ {2,}/));
  expect(entries).toHaveLength(mainMenu.entries.length);
  for (const entry of mainMenu.entries) {
    expect(entries.filter((text) => text.endsWith(`．${entry.label}`))).toHaveLength(1);
  }
  expect(lines.slice(13)).toEqual([
    'J MITI: 未知の世界へ',
    'J ECOM: 電子郵便（紙の郵便を模擬体験）',
    'HELP: メニューを表示 / SETTINGS: 設定 / HANDLE: 利用者 / ABOUT: 来歴 / LOG: ログ保存',
    mainMenu.prompt.text,
  ]);
}

test('MAIN reproduces consecutive pairs, banner and display selectors with aligned columns', () => {
  const controller = new PcvanController();
  expect(mainMenu.entries.map((entry) => entry.selector)).toEqual([
    ...Array.from({ length: 21 }, (_, index) => String(index + 1)), 'X', 'Q',
  ]);
  expectMain(controller.welcome);
  for (const input of ['HELP', 'MAIN', 'BACK']) expect(controller.submit(input)).toEqual(controller.welcome);
  expect(controller.welcome.join('\n')).not.toContain('ＳＩＧ'); // No labels from the older MAIN variant.
});

for (const width of [320, 1280]) {
  test(`MAIN presentation survives HELP, service returns and reconnect at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await start(page);
    const output = page.locator('.output');
    const input = page.getByRole('textbox', { name: 'コマンド' });
    const log = page.getByRole('log');
    const text = (await output.textContent())!;
    const initial = text.slice(text.indexOf(mainBanner), text.indexOf(mainMenu.prompt.text) + mainMenu.prompt.text.length);
    expectMain(initial.split('\n'));
    await expect(output).toHaveCSS('white-space', 'pre');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 320) {
      expect(await log.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await input.press('Shift+Tab');
      await log.press('ArrowRight');
      await expect.poll(() => log.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await log.press('Tab');
    }
    await expect(input).toBeFocused();
    for (const line of ['HELP', 'MAIN', 'BACK']) {
      expect(await command(page, line, mainMenu.prompt.text)).toBe(`\n> ${line}\n${initial}`);
    }
    for (const line of ['BACK', 'MAIN']) {
      const service = await command(page, '3', 'コマンド=');
      expect(service).toContain(' 3 ニュース'); // Other screens retain ASCII formatting.
      expect(service).not.toContain('３．');
      expect(await command(page, line, mainMenu.prompt.text)).toBe(`\n> ${line}\n${initial}`);
    }
    await command(page, 'Q', 'RECONNECT');
    const reconnected = await command(page, 'RECONNECT', mainMenu.prompt.text);
    expect(reconnected).toMatch(/^\n> RECONNECT\nPC-VAN 接続中…\nPC-VAN \/ パーソナル通信サービス\n/);
    expect(reconnected.endsWith(`\n${initial}`)).toBe(true);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
  });
}

for (const entry of mainMenu.entries) {
  test(`MAIN ${entry.selector} preserves the fixture mapping and has a safe result`, () => {
    const controller = new PcvanController();
    const result = controller.submit(entry.selector).join('\n');
    expect(result).toContain(`${entry.selector} ${entry.label}`);
    if (entry.selector === '13') {
      expect(controller.screen).toBe('communication');
    } else if (entry.selector === '7') {
      expect(controller.screen).toBe('internet-directory');
      expect(result).toContain('1 NetNews');
    } else if (entry.selector === '5') {
      expect(controller.screen).toBe('environmental-gateway');
      expect(result).toContain('1 EICネット（別ネットワーク）');
    } else if (entry.selector === '3') {
      expect(controller.screen).toBe('news-directory');
      expect(result).toContain('1 時事通信ニュース');
    } else if (entry.selector === '4') {
      expect(controller.screen).toBe('database-directory');
      expect(result).toContain('1 日経テレコン BiZ');
    } else if (entry.selector === 'Q') {
      expect(controller.screen).toBe('disconnected');
      expect(result).toContain('RECONNECT');
    } else {
      expect(controller.screen).toBe(entry.selector === '2' ? 'index' : 'section');
      expect(result).not.toContain('未実装');
      if (entry.selector !== '2') expect(result).toContain('0件');
    }
  });
}

test('the documented MITI sequence uses each screen’s own numeric mapping', () => {
  const controller = new PcvanController();
  expect(controller.submit('3').join('\n')).toContain('ニュース');
  expect(controller.screen).toBe('news-directory');
  controller.submit('BACK');
  for (const [index, step] of miti.steps.entries()) {
    const output = controller.submit(step.input).join('\n');
    expect(controller.screen).toBe(['miti', 'miti-forums', 'miti-materials'][index]);
    expect(output).toContain(`MITI / ${step.destination}`);
  }
  expect(controller.submit('9').join('\n')).toContain('この画面では使えない');
  expect(controller.screen).toBe('miti-materials');
});

test('Communication bridge and MAIN return helper preserve routing', () => {
  const controller = new PcvanController();
  expect(controller.submit('1').join('\n')).toContain('電子メール');
  expect(controller.screen).toBe('section');
  controller.submit('MAIN');
  controller.submit('13');
  expect(controller.submit('HELP').join('\n')).toContain('1 未知の世界');
  controller.submit('1');
  expect(controller.screen).toBe('miti');
  expect(controller.submit('MAIN')).toEqual(controller.welcome);
  expect(controller.screen).toBe('main');
});

test('invalid commands and unknown jumps preserve every active screen', () => {
  const controller = new PcvanController();
  const paths = [[], ['13'], ['MAIN', 'J MITI'], ['3'], ['9']];
  for (const path of paths) {
    for (const command of path) controller.submit(command);
    const before = controller.screen;
    const help = controller.submit('HELP');
    for (const command of ['unknown', '0', '22', '13extra', 'J DAISIZEN', 'J UNKNOWN', 'J MITI extra', 'https://example.com', 'H', 'E', 'RB1']) {
      const response = controller.submit(command).join('\n');
      expect(response).toMatch(/この画面|移動先が見つかりません/);
      expect(controller.screen).toBe(before);
      expect(controller.submit('HELP')).toEqual(help);
    }
    if (before !== 'main') {
      for (const command of ['Q', 'X', 'J MITI', '13', 'RECONNECT']) {
        expect(controller.submit(command).join('\n')).toContain('この画面では使えない');
        expect(controller.screen).toBe(before);
      }
    }
  }
});

test('Q disconnects only at MAIN; reconnect restores MAIN and state is per session', () => {
  const controller = new PcvanController();
  const other = new PcvanController();
  controller.submit('q');
  expect(controller.screen).toBe('disconnected');
  expect(other.screen).toBe('main');
  for (const command of ['1', '13', 'J MITI', 'Q', 'MAIN', 'HELP']) {
    expect(controller.submit(command).join('\n')).toContain('RECONNECT');
    expect(controller.screen).toBe('disconnected');
  }
  expect(controller.submit(' reconnect ')).toEqual(controller.welcome);
  expect(controller.screen).toBe('main');
  controller.submit('  j   miti  ');
  expect(controller.screen).toBe('miti');
});
