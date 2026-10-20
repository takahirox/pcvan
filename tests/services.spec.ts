import { openSettings, closeSettings } from './settings-helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { backupFixture } from './backup-fixture';

const entries = [
  ['MAIL', '電子メール'],
  ['LIBRARY', 'ライブラリィ'],
  ['CONFERENCE', '電子会議室'],
  ['OLT', 'ＯＬＴ（＊）'],
  ['OSL', 'ＯＳＬ'],
] as const;

function daisizen() {
  const controller = new PcvanController();
  controller.submit('13');
  controller.submit('2');
  return controller;
}

test('service helpers preserve provisional metadata and show concise operational labels', () => {
  const controller = daisizen();
  const output = controller.submit('HELP').join('\n');
  for (const [input, label] of entries) {
    const section = evidence.daisizen.sections.find((item) => item.label === label)!;
    expect(section.selector).toBeNull();
    expect(section.status).toBe('provisional');
    expect(section.demo_entry).toEqual({ input, evidence_category: 'D', status: 'reconstructed' });
    expect(output).toContain(`${label}`);
    expect(output).toContain(`${input}: ${label}（利用不可）`);
  }
});

for (const [input, label] of entries) {
  test(`${input} opens its own unavailable notice with stable HELP, BACK and MAIN`, () => {
    const controller = daisizen();
    const directory = controller.submit('HELP');
    const output = controller.submit(`  ${input.toLowerCase()}  `);
    expect(controller.screen).toBe('daisizen-service');
    expect(controller.needsContent).toBe(false);
    expect(output.join('\n')).toContain(`大自然＆動植物（DAISIZEN） / ${label}`);
    expect(output.join('\n')).toContain('サービスの操作・送受信・ファイル転送は利用できません');
    for (const command of ['1', '2', 'Q', 'E', 'H', 'RB1', 'TL1', 'DL1', 'KW', 'LIST', 'READ 1', 'SEND hello', 'UPLOAD file', 'hello', '<b>発言</b>', 'FORUMS', ...entries.map(([helper]) => helper)]) {
      expect(controller.submit(command).join('\n')).toContain('この画面では使えない');
      expect(controller.screen).toBe('daisizen-service');
      expect(controller.submit('HELP')).toEqual(output);
    }
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.screen).toBe('daisizen');
    controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    expect(controller.screen).toBe('main');
  });
}

test('service helpers stay scoped to the SIG; forum reading and MITI navigation still work', () => {
  const controller = new PcvanController();
  const paths = [[], ['13'], ['2', 'FORUMS'], ['1'], ['MAIN', 'J MITI'], ['3'], ['9']];
  for (const path of paths) {
    for (const command of path) controller.submit(command);
    const before = controller.screen;
    for (const [input] of entries) {
      expect(controller.submit(input).join('\n')).toContain('この画面では使えない');
      expect(controller.screen).toBe(before);
    }
    if (before === 'forum' || before === 'miti-materials') {
      expect(controller.submit('READ 1').join('\n')).toContain('★内容');
    }
  }
});

test('keyboard placeholders work offline without service requests or changing local content', async ({ page }) => {
  await page.goto('/');
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'DAISIZEN';
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({
    name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)),
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status', { name: 'ローカル保存の状態' })).toContainText('バックアップを復元しました。');
  const initialUrl = page.url();
  const requests: string[] = [];
  const navigations: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('framenavigated', (frame) => navigations.push(frame.url()));
  await page.context().setOffline(true);
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const send = async (line: string, expected: string) => {
    await closeSettings(page);
    await input.fill(line);
    await input.press('Enter');
    await expect.poll(async () => {
      const output = (await page.locator('.output').textContent())!;
      return output.slice(output.lastIndexOf(`> ${line}\n`));
    }).toContain(expected);
    await expect(input).toBeFocused();
  };
  await send('13', 'コミュニケーション');
  await send('2', 'MAIL: 電子メール');
  for (const [helper, label] of entries) {
    await send(helper, `大自然＆動植物（DAISIZEN） / ${label}`);
    await send('HELP', 'サービスの操作・送受信・ファイル転送は利用できません');
    await send('SEND <b>発言</b>', 'この画面では使えない');
    await send('BACK', 'FORUMS: フォーラム一覧');
  }
  await expect(page.locator('.output b')).toHaveCount(0);
  await send('FORUMS', '7 伝言板／企画室');
  await send('1', '#4 返事');
  await send('READ 1', '★タイトル (human)');
  await send('MAIN', 'MAIN');
  await send('J MITI', 'MITI / 未知の世界');
  await send('3', 'MITI / フォーラム');
  await send('9', 'MITI / 資料室');
  await send('READ 1', '★タイトル (DEMO0001)');
  expect(page.url()).toBe(initialUrl);
  expect(requests).toEqual([]);
  expect(navigations).toEqual([]);

  const downloadPromise = page.waitForEvent('download');
  await openSettings(page, 'storage');
  await page.getByRole('button', { name: 'JSON バックアップを保存' }).click();
  const download = await downloadPromise;
  const saved = JSON.parse(await readFile((await download.path())!, 'utf8'));
  // Commands update history only; placeholders never modify any content store.
  for (const key of ['members', 'sigs', 'forums', 'posts', 'readStates', 'settings'] as const) {
    expect(saved[key]).toEqual(fixture[key]);
  }
});
