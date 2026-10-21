import { expect, test } from '@playwright/test';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';

const { miti } = sigEvidence;

test('MAIN renders the entire menu with two numbered columns and X/Q', () => {
  const controller = new PcvanController();
  const output = controller.welcome.join('\n');
  expect(mainMenu.entries.map((entry) => entry.selector)).toEqual([
    ...Array.from({ length: 21 }, (_, index) => String(index + 1)), 'X', 'Q',
  ]);
  for (const entry of mainMenu.entries) {
    expect(output).toContain(`${entry.selector.padStart(2)} ${entry.label}`);
  }
  // The first ten rows have two intact, ordered numbered entries; row 11
  // contains the unpaired item. X/Q are separate from the numbered columns.
  const rows = controller.welcome.filter((line) => /^\s*\d+ /.test(line));
  expect(rows).toHaveLength(11);
  for (let index = 0; index < 10; index += 1) {
    const left = mainMenu.entries[index]!;
    const right = mainMenu.entries[index + 11]!;
    expect(rows[index]).toMatch(new RegExp(`^${left.selector.padStart(2)} ${left.label} {2,}${right.selector.padStart(2)} ${right.label}$`));
  }
  expect(rows[10]).toBe('11 趣味');
  expect(controller.welcome.at(-1)).toBe(mainMenu.prompt.text);
  expect(output).not.toContain('ＳＩＧ'); // No labels from the older MAIN variant.
});

for (const entry of mainMenu.entries) {
  test(`MAIN ${entry.selector} preserves the fixture mapping and has a safe result`, () => {
    const controller = new PcvanController();
    const result = controller.submit(entry.selector).join('\n');
    expect(result).toContain(`${entry.selector} ${entry.label}`);
    if (entry.selector === '13') {
      expect(controller.screen).toBe('communication');
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
  expect(controller.screen).toBe('section');
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

test('browser navigation stays local through the route, errors, disconnect, and reconnect', async ({ page }) => {
  await page.goto('/');
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => navigations.push(frame.url()));
  const initialUrl = page.url();
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const output = page.locator('.output');
  const send = async (line: string, expected: string) => {
    await input.fill(line);
    await input.press('Enter');
    // Forum reads and their following commands wait for the local repository.
    await expect.poll(async () => {
      const text = (await output.textContent())!;
      return text.slice(text.lastIndexOf(`> ${line}`));
    }).toContain(expected);
    await expect(input).toBeFocused();
    expect(page.url()).toBe(initialUrl);
  };
  await page.context().setOffline(true);
  await send('13', '1 未知の世界');
  await send('1', 'MITI / 未知の世界');
  await send('Q', 'この画面では使えない');
  await send('3', 'MITI / フォーラム');
  await send('9', 'MITI / 資料室');
  await send('MAIN', mainMenu.prompt.text);
  await send('J UNKNOWN', '移動先が見つかりません');
  await send('https://example.com', 'この画面では使えない');
  await send('J MITI', 'MITI / 未知の世界');
  await send('MAIN', mainMenu.prompt.text);
  await send('Q', '接続を終了しました');
  await send('J MITI', '接続は終了しています');
  await send('RECONNECT', 'PC-VAN 接続中');
  await page.getByRole('button', { name: '接続演出をスキップ' }).click();
  expect((await output.textContent())!.split('> RECONNECT')[1]).toContain('MAIN');
  expect(navigations).toEqual([]);
});
