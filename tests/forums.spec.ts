import { openSettings, closeSettings } from './settings-helpers';
import { readFile } from 'node:fs/promises';
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
    expect(output).toContain(`${section.label}`);
    expect(section.selector).toBeNull();
  }
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
    expect(output).toContain(`${forum.number} ${forum.label}`);
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
  expect(listing).not.toMatch(/創作|再構成|https?:/);
  const read = controller.submit(' read   1 ').join('\n');
  expect(read).toContain('#1/9001　資料室');
  expect(read).toContain('★タイトル (DEMO0001)  96/07/06  12:34');
  expect(read).toContain('★内容\n  架空の星');
  expect(read).toContain('架空の星を見つけたら、どんな名前を付けますか。');
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

test('author headers use current handles for human, seed, generated and legacy posts without changing records', () => {
  const fixture = backupFixture();
  const human = fixture.posts[0]!;
  const seeded = { ...human, authorId: 'fictional-ai:resident', origin: 'local-seed:fictional' };
  const generated = { ...seeded, id: 'run', origin: 'local-ai:webllm:test-model',
    simulation: { runId: 'run', simulatedAt: '1996-07-06T12:34:00.000Z', fictional: true as const } };
  const members = [...fixture.members, { id: seeded.authorId, handle: '常連', actor: 'ai' as const }];
  const before = structuredClone([human, seeded, generated]);
  expect(renderPost(human, '広場', undefined, members)[1]).toContain('(人間)');
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(常連)');
  const rendered = renderPost(generated, '広場', undefined, members).join('\n');
  expect(rendered).toContain('(常連)  96/07/06  12:34');
  expect(rendered).not.toMatch(/fictional-ai:|架空の投稿時刻|local-ai:|runId|AI住人|シミュレーション/);
  members[2]!.handle = '星の番人';
  expect(renderPost(generated, '広場', undefined, members)[1]).toContain('(星の番人)');
  for (const authorId of ['missing', 'fictional-ai:missing', 'local-human:old', '<b>record key</b>']) {
    expect(renderPost({ ...human, authorId }, '広場')[1]).toContain('(名無し)');
  }
  expect(renderPost({ ...human, authorId: 'ai' }, '広場', undefined, fixture.members)[1]).toContain('(AI)');
  members[2]!.handle = '';
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(名無し)');
  members[2]!.handle = seeded.authorId;
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(名無し)');
  expect([human, seeded, generated]).toEqual(before);
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
  await closeSettings(page);
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
  await send(page, 'READ 1', '★タイトル (半田ごて)');

  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status', { name: 'ローカル保存の状態' })).toContainText('バックアップを復元しました。');
  await send(page, 'LIST', '#4 返事');
  await send(page, 'READ 1', '★タイトル (人間)');
  const output = (await page.locator('.output').textContent())!;
  expect(output.slice(output.lastIndexOf('> READ 1\n'))).toContain('★内容\n  ｶﾅ\n<b>文字</b>　。');
  await expect(page.locator('.output b')).toHaveCount(0);
  await send(page, 'READ 2', 'その番号の投稿はありません');
  await send(page, 'READ 4', '#4/12　資料室');
  await send(page, 'MAIN', 'MAIN');
  await send(page, '13', 'コミュニケーション');
  await send(page, '2', '大自然＆動植物');
  await send(page, 'FORUMS', '7 伝言板／企画室');
  await send(page, '1', '投稿一覧');
  await send(page, 'READ 1', 'その番号の投稿はありません');
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
    await closeSettings(page);
    await input.fill(line);
    await input.press('Enter');
  }
  await expect(page.locator('.output')).toContainText('★タイトル (星守)');
});

test('restored handles and display times stay ordinary while expanded provenance and JSON retain every origin', async ({ page }) => {
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  fixture.forums[0]!.nextPostNumber = 10;
  fixture.members.push({ id: 'fictional-ai:hoshimori', handle: '<b>星の番人</b>', actor: 'ai' });
  fixture.posts.push({ id: 'run', forumId: 'forum', number: 8, authorId: 'fictional-ai:hoshimori',
    title: '夜空の話', body: '今夜の星を見ました。', replyToPostId: 'first',
    createdAt: '2026-10-20T02:03:04.000Z', origin: 'local-ai:webllm:test-model',
    simulation: { runId: 'run', simulatedAt: '1996-07-06T12:34:00.000Z', fictional: true } },
  { id: 'seed', forumId: 'forum', number: 9, authorId: 'fictional-ai:hoshimori',
    title: '星の便り', body: 'お便りです。', createdAt: '1996-07-05T01:02:00.000Z', origin: 'local-seed:fictional' });
  await page.goto('/');
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'authors.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.restore').click();
  await expect(page.locator('.storage-status')).toContainText('バックアップを復元しました');

  for (let visit = 0; visit < 2; visit++) {
    if (visit) await page.reload();
    await send(page, 'J MITI', 'MITI / 未知の世界');
    await send(page, '3', 'MITI / フォーラム');
    await send(page, '9', '#9 星の便り');
    await send(page, 'READ 1', '★タイトル (人間)');
    await send(page, 'READ 4', '★タイトル (AI)');
    await send(page, 'READ 8', '★タイトル (<b>星の番人</b>)  96/07/06  12:34');
    await expect(page.locator('.output')).toContainText('返信先 RE#1 → READ 1');
    await send(page, 'READ 9', '★タイトル (<b>星の番人</b>)  96/07/05  01:02');
    expect(await page.locator('.output').innerText()).not.toMatch(/fictional-ai:|local-ai:|架空の投稿時刻|AI住人|シミュレーション/);
    await expect(page.locator('.output b')).toHaveCount(0);

    await openSettings(page, 'ai');
    await expect(page.locator('.ai-persona option')).toHaveCount(10);
    await expect(page.locator('.ai-provenance')).not.toHaveAttribute('open');
    await expect(page.locator('.ai-records')).toBeHidden();
    expect(await page.locator('.ai-controls').innerText()).not.toMatch(/fictional-ai:|架空の AI|10人|シミュレーション/);
    await page.getByText('詳細・出自', { exact: true }).click();
    for (const phrase of ['架空の AI 人格', '10人', 'シミュレーション', 'Hugging Face / MLC / GitHub', '外部推論・API キーは使いません']) {
      await expect(page.locator('.ai-provenance')).toContainText(phrase);
    }
    const records = page.locator('.ai-records');
    await expect(records).toBeVisible();
    for (const phrase of ['利用者の投稿 / 人間 / human / actor=human / origin=local-human',
      '取り込んだ投稿 / AI / ai / actor=ai / origin=imported',
      'ローカル AI 生成 / <b>星の番人</b> / fictional-ai:hoshimori / actor=ai / origin=local-ai:webllm:test-model',
      '事前に書いた創作 / <b>星の番人</b>', 'generatedAt=2026-10-20T02:03:04.000Z', 'simulatedAt=1996-07-06T12:34:00.000Z']) {
      await expect(records).toContainText(phrase);
    }
    await expect(records.locator('b')).toHaveCount(0);
    await openSettings(page, 'storage');
    const downloading = page.waitForEvent('download');
    await page.locator('.backup').click();
    const exported = JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
    expect(exported.posts).toHaveLength(fixture.posts.length);
    expect(exported.posts).toEqual(expect.arrayContaining(fixture.posts));
    expect(exported.members).toEqual(expect.arrayContaining(fixture.members));
  }
});

test('failed forum reads show an error without stale content and leave return commands usable', async ({ page }) => {
  await page.goto('/');
  await send(page, 'J MITI', 'MITI / 未知の世界');
  await send(page, '3', 'MITI / フォーラム');
  await send(page, '9', '投稿一覧');
  await send(page, 'READ 1', '★タイトル (半田ごて)');
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
  await expect(page.locator('.settings-notice')).toContainText('保存の状態');
  await openSettings(page, 'storage');
  await expect(page.getByRole('status', { name: 'ローカル保存の状態' })).toContainText('ローカル保存エラー');
  await send(page, 'BACK', 'MITI / フォーラム');
  await send(page, 'MAIN', 'MAIN');
});
