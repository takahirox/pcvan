import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import demos from '../data/pcvan/demo-posts.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { renderPost } from '../src/forums';
import { validateRecord } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';

function miti() {
  const controller = new PcvanController();
  for (const step of evidence.miti.steps) controller.submit(step.input);
  return controller;
}

function daisizen() {
  const controller = new PcvanController();
  controller.submit('13');
  controller.submit('2');
  return controller;
}

test('DAISIZEN sections preserve evidence labels without invented section numbers or jump', () => {
  const controller = daisizen();
  const output = controller.submit('HELP').join('\n');
  for (const section of evidence.daisizen.sections) {
    expect(output).toContain(`${section.label} [B / provisional]`);
    expect(section.selector).toBeNull();
  }
  expect(output).toContain(evidence.daisizen.source_url);
  expect(output).toContain('1992年');
  expect(output).toContain('1996–1997年');
  expect(output).toContain('[D / reconstructed]');
  expect(evidence.daisizen.jump.input).toBeNull();
  controller.submit('MAIN');
  expect(controller.submit('J DAISIZEN').join('\n')).toContain('移動先が見つかりません');
  expect(controller.screen).toBe('main');
});

test('all seven DAISIZEN boards are independently selectable with scoped numbers and back', () => {
  const controller = daisizen();
  const output = controller.submit('FORUMS').join('\n');
  expect(evidence.daisizen.forums.map((forum) => forum.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  for (const forum of evidence.daisizen.forums) {
    expect(output).toContain(`${forum.number} ${forum.label} [B / provisional]`);
    expect(controller.submit(String(forum.number)).join('\n')).toContain(`DAISIZEN / ${forum.label} / 投稿一覧`);
    expect(controller.screen).toBe('forum');
    expect(controller.submit('1').join('\n')).toContain('この画面では使えない');
    expect(controller.screen).toBe('forum');
    expect(controller.submit('BACK').join('\n')).toBe(output);
  }
  controller.submit('BACK');
  expect(controller.screen).toBe('daisizen');
  controller.submit('BACK');
  expect(controller.screen).toBe('communication');
});

test('MITI route reaches numbered original demos; gaps and invalid reads preserve the screen', () => {
  const controller = miti();
  const listing = controller.submit('LIST').join('\n');
  expect(listing.indexOf('#1 ')).toBeLessThan(listing.indexOf('#3 '));
  expect(listing).toContain('創作デモ投稿 [D / reconstructed]');
  const read = controller.submit(' read   1 ').join('\n');
  expect(read).toContain('#1/9001　資料室');
  expect(read).toContain('★タイトル (DEMO0001)  96/07/06  12:34');
  expect(read).toContain('★内容\n  架空の星');
  expect(read).toContain(demos.posts[0]!.body);
  for (const invalid of ['READ 2', 'READ 999', 'READ 0', 'READ -1', 'READ 1.5', 'READ 9007199254740992', 'READ 1 extra', 'Q', 'J MITI']) {
    expect(controller.submit(invalid).join('\n')).toMatch(/ありません|この画面では使えない/);
    expect(controller.screen).toBe('miti-materials');
    expect(controller.submit('HELP').join('\n')).toContain(listing);
  }
  expect(controller.submit('READ 3').join('\n')).toContain('#3　資料室');
  expect(controller.submit('READ 3').join('\n')).not.toContain('#3/');
  controller.submit('BACK');
  expect(controller.screen).toBe('miti-forums');
  controller.submit('9');
  expect(controller.screen).toBe('miti-materials');
});

test('headers preserve title/body spacing and optional fields without interpreting secondary numbers', () => {
  const post = { ...demos.posts[0]!, displaySecondNumber: 0, title: '  創作　ｶﾅ  ', body: '\n  <b>文字</b>　。\n\n末尾  \n' };
  expect(renderPost(post, '表示試験', 7)).toEqual([
    '#1/0　表示試験', '★タイトル (DEMO0001)  96/07/06  12:34  ( 7)',
    post.title, '★内容', post.body,
  ]);
  const { displaySecondNumber: _second, ...withoutSecond } = post;
  expect(renderPost(withoutSecond, '表示試験')[0]).toBe('#1　表示試験');
  expect(renderPost(withoutSecond, '表示試験')[1]).not.toContain('( 7)');
});

test('all seeded demo posts have original provenance and synthetic IDs', () => {
  expect(demos.evidence_category).toBe('D');
  expect(demos.status).toBe('reconstructed');
  for (const post of demos.posts) {
    validateRecord('posts', post);
    expect(post.origin).toBe('synthetic-demo');
    expect(post.authorId).toMatch(/^DEMO\d{4}$/);
    expect(post.title).toContain('創作デモ');
  }
});

test('repository identities map by SIG keyword and board number; empty/missing/ambiguous boards stay empty', () => {
  const controller = miti();
  const content = backupFixture();
  content.sigs[0]!.keyword = 'miti';
  content.forums[0]!.boardNo = 9;
  // Reverse storage order, and give the lower number a later date: numbering
  // determines the stable order, independently of IDs/timestamps.
  content.posts[0]!.createdAt = '2026-10-21T01:02:03.000Z';
  content.posts.reverse();
  controller.setContent(content);
  const listing = controller.submit('LIST').join('\n');
  expect(listing.indexOf('#1 ')).toBeLessThan(listing.indexOf('#4 '));
  expect(listing).not.toContain('創作デモ投稿');
  expect(controller.submit('READ 4').join('\n')).toContain('#4/12　資料室');
  expect(controller.submit('READ 2').join('\n')).toContain('投稿はありません');
  content.posts = [];
  expect(controller.submit('LIST').join('\n')).toContain('投稿はありません');
  content.forums[0]!.boardNo = 8;
  expect(controller.submit('LIST').join('\n')).toContain('見つからないか、重複');
  content.forums[0]!.boardNo = 9;
  content.forums.push({ ...content.forums[0]!, id: 'duplicate' });
  expect(controller.submit('LIST').join('\n')).toContain('見つからないか、重複');
  expect(controller.submit('READ 1').join('\n')).toContain('投稿はありません');
  expect(controller.screen).toBe('miti-materials');
  expect(controller.submit('MAIN')).toEqual(controller.welcome);
});

test('empty DAISIZEN board and invalid forum selectors preserve navigation', () => {
  const controller = daisizen();
  const sigScreen = controller.submit('HELP');
  expect(controller.submit('1').join('\n')).toContain('この画面では使えない');
  expect(controller.submit('HELP')).toEqual(sigScreen);
  controller.submit('FORUMS');
  const forums = controller.submit('HELP');
  for (const invalid of ['0', '8', '9', 'READ 1', 'J DAISIZEN', 'Q']) {
    expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
    expect(controller.submit('HELP')).toEqual(forums);
  }
  expect(controller.submit('7').join('\n')).toContain('投稿はありません');
  expect(controller.submit('READ 1').join('\n')).toContain('投稿はありません');
  controller.submit('BACK');
  controller.submit('1');
  expect(controller.submit('READ 1').join('\n')).toContain('小さな庭の便り');
});

async function send(page: Page, line: string, expected: string) {
  const input = page.getByRole('textbox', { name: 'コマンド' });
  await input.fill(line);
  await input.press('Enter');
  await expect.poll(async () => {
    const text = (await page.locator('.output').textContent())!;
    return text.slice(text.lastIndexOf(`> ${line}\n`));
  }).toContain(expected);
  await expect(input).toBeFocused();
}

test('keyboard reading works offline; restore replaces displayed posts without reload or HTML interpretation', async ({ page }) => {
  await page.goto('/');
  const url = page.url();
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => navigations.push(frame.url()));
  await page.context().setOffline(true);
  await send(page, 'J MITI', 'MITI / 未知の世界');
  await send(page, '3', 'MITI / フォーラム');
  await send(page, '9', 'MITI / 資料室');
  await send(page, 'READ 1', '★タイトル (DEMO0001)');

  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status')).toContainText('バックアップを復元しました。');
  await send(page, 'LIST', '#4 返事');
  await send(page, 'READ 1', '★タイトル (human)');
  const output = (await page.locator('.output').textContent())!;
  expect(output.slice(output.lastIndexOf('> READ 1\n'))).toContain('★内容\n  ｶﾅ\n<b>文字</b>　。');
  await expect(page.locator('.output b')).toHaveCount(0);
  await send(page, 'READ 2', 'その番号の投稿はありません');
  await send(page, 'READ 4', '#4/12　資料室');
  await send(page, 'MAIN', 'MAIN（1996年頃');
  await send(page, '13', '再構成の仮設ブリッジ');
  await send(page, '2', '大自然＆動植物');
  await send(page, 'FORUMS', '7 伝言板／企画室');
  await send(page, '1', '投稿一覧');
  await send(page, 'READ 1', '★タイトル (DEMO0003)');
  await send(page, 'BACK', '7 伝言板／企画室');
  await send(page, '7', '投稿はありません');
  expect(page.url()).toBe(url);
  expect(navigations).toEqual([]);
  await page.context().setOffline(false);
  await page.reload();
  await send(page, 'J MITI', 'MITI / 未知の世界');
  await send(page, '3', 'MITI / フォーラム');
  await send(page, '9', '#4 返事');
  await send(page, 'READ 4', '#4/12　資料室');
});

test('rapid submitted commands retain screen order while content loads', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'コマンド' });
  for (const line of ['J MITI', '3', '9', 'READ 3']) {
    await input.fill(line);
    await input.press('Enter');
  }
  await expect(page.locator('.output')).toContainText('★タイトル (DEMO0002)');
});

test('failed forum reads show an error without stale content and leave return commands usable', async ({ page }) => {
  await page.goto('/');
  await send(page, 'J MITI', 'MITI / 未知の世界');
  await send(page, '3', 'MITI / フォーラム');
  await send(page, '9', '投稿一覧');
  await send(page, 'READ 1', '★タイトル (DEMO0001)');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'posts') throw new DOMException('Simulated read error', 'UnknownError');
      return original.apply(this, args);
    };
  });
  await send(page, 'READ 3', '投稿の読み込みに失敗しました');
  const output = (await page.locator('.output').textContent())!;
  expect(output.slice(output.lastIndexOf('> READ 3\n'))).not.toContain('★内容');
  await expect(page.getByRole('status')).toContainText('ローカル保存エラー');
  await send(page, 'BACK', 'MITI / フォーラム');
  await send(page, 'MAIN', 'MAIN（1996年頃');
});
