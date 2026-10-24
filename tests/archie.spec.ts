import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import index from '../data/pcvan/archie-index.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { about } from '../src/settings';
import type { AiActivity, Backup } from '../src/storage/schema';
import { emptyOlt, appendOlt, OLT_SETTING } from '../src/olt-state';
import { emptyNetNews, localNetNewsMessageId } from '../src/netnews';
import { backupFixture } from './backup-fixture';
import { backup, command, importFile, noOtherUi, restore, snapshot, start } from './terminal-helpers';

const invalid = ['0', '1', '2', '3', '4', '5', '6', '-1', '01', '+1', '1.5', '1e0', 'NaN', 'Infinity',
  '99', '9007199254740992', '9'.repeat(350), '1 extra', 'READ 1', 'J ARCHIE', 'J MITI', 'J ECOM',
  'WRITE', 'WRITE somebody', 'COMPOSE', 'REPLY 1', 'MAIL', 'INBOX', 'SENT', 'MEMBERS',
  'OLT', 'JOIN 1', '/JOIN 1', '/WHO', '/MAIN', 'CONFERENCE', 'OPEN cedar.archive.invalid',
  'TELNET', 'FTP', 'GOPHER', 'SEARCH river', 'LOGOUT', 'DOWNLOAD 1', 'GET river-notes.txt',
  'UPLOAD file', 'FIND river', 'SHOW P1 /1', 'SET SEARCH exact', 'SITE cedar.archive.invalid',
  '.END', '.CANCEL', 'Y', 'Q', 'J GOPHER', '/LIST', 'LIST cedar', 'PROGfoo'];
const protectedRecords = (data: Backup) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
  posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings });
const cases = [
  ['rIvEr', 2], ['river-notes.txt', 2], ['sTaR  mAp', 1], ['star map', 0], ['[1]', 1],
  ['.*', 0], ['AND', 1], ['river OR star', 0], ['^river$', 0], ['cedar', 0],
  ['/pub/paper-rivers', 0], ['2048', 0], ['1996-09-12', 0], ['bytes', 0],
  ['星図 <b>観察</b> & "紙"', 0], ['not-a-match', 0],
] as const;
function isolated(nav: PcvanController | ConnectionController) {
  expect(nav.isArchie).toBe(true); expect(nav.forum).toBeNull(); expect(nav.mailContext).toBeNull();
  expect(nav.netNewsContext).toBeNull(); expect(nav.isOlt).toBe(false); expect(nav.isConference).toBe(false);
  expect(nav.isTelnet).toBe(false); expect(nav.isGopher).toBe(false); expect(nav.isEcom).toBe(false);
  expect(nav.needsContent).toBe(false);
  for (const n of [1, 2, 0, NaN, Infinity]) expect(nav.selectDownload(n)).toBeNull();
}
function retains(nav: PcvanController | ConnectionController, view: readonly string[]) {
  for (const line of invalid) {
    expect(nav.submit(line).join('\n')).toContain('このArchie画面では使えない');
    expect(nav.submit('HELP')).toEqual(view); isolated(nav);
  }
  for (const line of ['', '   ', 'PROG', 'PROG   ', 'PROG\nriver', 'PROG river\nnotes', 'PROG river\rnotes']) {
    expect(nav.submit(line).join('\n')).toContain('ファイル名の検索語を指定してください');
    expect(nav.submit('LIST')).toEqual(view);
  }
}
for (const viaIndex of [false, true]) {
  test(`Archie controller location metadata and returns to actual ${viaIndex ? 'index' : 'MAIN'} parent`, () => {
    const nav = new PcvanController(), world = backupFixture(), original = structuredClone(world);
    nav.setContent(world); nav.setMemberId('human');
    const parent = viaIndex ? nav.submit('2').slice(1) : nav.welcome;
    const internet = nav.submit('7').slice(1);
    for (const text of ['1 NetNews', '2 TELNET', '3 FTP', '4 Gopher', '5 Archie']) expect(internet).toContain(text);
    expect(nav.submit('6').join('\n')).toContain('この画面では使えない');
    for (let visit = 0; visit < 2; visit++) {
      const query = nav.submit('5'); expect(query).toContain('Archie / ファイル名検索'); retains(nav, query);
      const results = nav.submit('  pRoG   rIvEr   ');
      expect(results).toContain('検索語: rIvEr'); expect(results).toContain('一致する場所：2件');
      expect(results.filter((line) => line.startsWith('ファイル名:'))).toEqual(['ファイル名: river-notes.txt', 'ファイル名: river-notes.txt']);
      for (const value of ['cedar.archive.invalid', 'harbor.archive.invalid', '/pub/paper-rivers',
        '/mirrors/field-pages', '2048 bytes', '1996-09-12']) expect(results.join('\n')).toContain(value);
      retains(nav, results); expect(nav.submit('LIST')).toEqual(results);
      expect(nav.submit('BACK')).toEqual(query); expect(nav.submit('BACK')).toEqual(internet);
    }
    expect(nav.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(nav.submit('BACK')).toEqual(nav.welcome);
    expect(world).toEqual(original);
  });
}

test('Archie filename-only literal matching and replacement queries keep exactly one return step', () => {
  const nav = new PcvanController(); nav.submit('7'); const query = nav.submit('5');
  for (const [fragment, count] of cases) {
    const results = nav.submit(`PROG  ${fragment}  `);
    expect(results).toContain(`検索語: ${fragment}`); expect(results).toContain(`一致する場所：${count}件`);
    expect(results.filter((line) => line.startsWith('ファイル名:'))).toHaveLength(count);
    if (!count) expect(results).toContain('一致するファイルの場所はありません。');
    retains(nav, results);
  }
  expect(nav.submit('BACK')).toEqual(query); expect(nav.submit('BACK')).toContain('5 Archie');
  // The index is metadata authored for this application, outside the local world.
  expect(index.length).toBeGreaterThanOrEqual(3);
  expect(new Set(index.map((row) => row.filename)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(index.map((row) => `${row.host}${row.directory}/${row.filename}`)).size).toBe(index.length);
  for (const row of index) {
    expect(row.host).toMatch(/\.invalid$/); expect(row.directory).toMatch(/^\//);
    expect(row.size).toBeGreaterThan(0); expect(row.modified).toMatch(/^1996-(?:0[1-9]|10)-\d{2}$/);
  }
});

test('Archie connection forwarding, MAIN at both depths, clean re-entry and disconnect/reconnect', () => {
  const nav = new ConnectionController(); nav.completeConnection();
  for (const path of [[], ['PROG river'], ['PROG missing']]) {
    for (const line of ['2', '7', '5', ...path]) nav.submit(line);
    isolated(nav); expect(nav.submit('MAIN').join('\n')).toContain('(MAIN)'); expect(nav.isArchie).toBe(false);
    nav.submit('7'); const query = nav.submit('5'); expect(query).toContain('Archie / ファイル名検索');
    expect(query.join('\n')).not.toContain('検索語:');
    expect(nav.submit('BACK')).toContain('5 Archie'); expect(nav.submit('BACK').join('\n')).toContain('(MAIN)');
  }
  nav.submit('Q'); nav.submit('RECONNECT'); nav.completeConnection(); nav.submit('7'); nav.submit('5'); isolated(nav);
});

test('Archie About qualifies sources, original index, default-mode difference and unknown host access', () => {
  const text = about(backupFixture()).join('\n');
  for (const value of ['Issue #105', '2026-10-24', '1996年1月', '1996年11月', '中程度の推定', '未解明',
    'Navigator', 'Mosaic', 'カテゴリーD', 'オリジナル', 'RFC 1580', '既定', '完全一致', '部分一致',
    'PROG <filename fragment>', 'iwp1996-ch04-01-p110.pdf', 'im199601-216-news.pdf', 'rfc1580.html']) expect(text).toContain(value);
});

async function enter(page: Page, viaIndex = false) {
  if (viaIndex) await command(page, '2', '索引');
  await command(page, '7', '5 Archie'); await command(page, '5', 'Archie / ファイル名検索');
}
for (const handle of [undefined, '索引を読む人']) {
  test(`production Archie 320px keyboard, IME, literal lookup, export and protected ${handle ? 'registered' : 'anonymous empty'} world`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [], models: string[] = [], workers: string[] = [], popups: string[] = [], downloads: Download[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url());
      if (/webllm|model-lib|params_shard/i.test(r.url())) models.push(r.url());
    });
    page.on('worker', (w) => workers.push(w.url())); page.on('popup', (p) => popups.push(p.url()));
    await start(page, handle); const fixture = await snapshot(page);
    const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    if (!handle) {
      fixture.members = []; fixture.sigs = []; fixture.forums = []; fixture.posts = []; fixture.mail = []; fixture.readStates = [];
      fixture.settings = fixture.settings.filter((s) => !['daisizen-conference', 'active-human-member'].includes(s.id));
    } else {
      const human = fixture.members.find((m) => m.actor === 'human')!.id;
      fixture.mail = [{ id: 'archie-protected-mail', number: 1, senderId: human, recipientId: 'fictional-ai:hoshimori',
        subject: '保持する便り', body: '  <記録> & 日本語\n', createdAt: '2026-10-23T01:00:00.000Z', origin: 'local-human' }];
      fixture.readStates = [{ memberId: human, forumId: fixture.posts[0]!.forumId, lastReadNumber: 1 }];
      const at = '2026-10-23T01:00:00.000Z', olt = emptyOlt(at), news = emptyNetNews();
      appendOlt(olt.rooms[0]!, human, 'say', '保持する会話', 'local-human', Date.parse(at));
      news.contributions.push({ id: 'archie-protected-news', group: 'fj.questions.fj', number: 4, authorId: human,
        title: '保持する記事', body: '  <本文> & 記録\n', createdAt: at, origin: 'local-human',
        messageId: localNetNewsMessageId('fj.questions.fj', 4), references: [] });
      news.nextNumbers['fj.questions.fj'] = 5;
      fixture.settings.push({ id: OLT_SETTING, value: olt as never }, { id: 'netnews-local', value: news as never });
    }
    await restore(page, fixture); const before = await snapshot(page);
    page.on('download', (d) => downloads.push(d));
    const input = page.locator('#command'), output = page.locator('.output');
    await enter(page, !handle);
    await command(page, '', 'ファイル名の検索語を指定してください');
    await command(page, '   ', 'ファイル名の検索語を指定してください');
    for (const line of invalid.filter((s) => s.length < 100)) await command(page, line, 'このArchie画面では使えない');
    await command(page, 'PROG', 'ファイル名の検索語を指定してください');
    await command(page, 'LIST', 'Archie / ファイル名検索');
    await input.fill('PROG  rIvEr  '); const transcript = await output.textContent();
    await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue('PROG  rIvEr  '); expect(await output.textContent()).toBe(transcript);
    await input.dispatchEvent('compositionend'); await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
    expect(await output.textContent()).toBe(transcript);
    const results = await command(page, 'PROG  rIvEr  ', '一致する場所：2件');
    for (const value of ['検索語: rIvEr', 'cedar.archive.invalid', 'harbor.archive.invalid', '/pub/paper-rivers',
      '/mirrors/field-pages', '2048 bytes', '1996-09-12']) expect(results).toContain(value);
    for (const line of invalid.filter((s) => s.length < 100)) await command(page, line, 'このArchie画面では使えない');
    await command(page, 'PROG   ', 'ファイル名の検索語を指定してください');
    await command(page, '', 'ファイル名の検索語を指定してください');
    const redisplay = await command(page, 'LIST', '一致する場所：2件');
    expect(redisplay.slice(redisplay.indexOf('Archie / 検索結果'))).toBe(results.slice(results.indexOf('Archie / 検索結果')));
    await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'ABOUT', 'Archie調査URL');
    await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '検索語: rIvEr');
    await input.fill('未送信  日本語'); const beforeModal = await output.textContent();
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    const modal = page.getByRole('dialog'); await modal.locator('.about-panel > summary').click();
    await expect(modal.locator('.settings-about')).toContainText('Archie調査URL');
    await page.keyboard.press('Escape'); await expect(input).toHaveValue('未送信  日本語');
    expect(await output.textContent()).toBe(beforeModal);
    for (const [query, count] of cases) {
      const response = await command(page, `PROG ${query}`, `一致する場所：${count}件`);
      expect(response).toContain(`検索語: ${query}`);
      await command(page, 'PROG', 'ファイル名の検索語を指定してください');
      await command(page, 'HELP', `検索語: ${query}`);
      if (!count) await command(page, 'LIST', '一致するファイルの場所はありません。');
    }
    await expect(output.locator('b, script, img')).toHaveCount(0);
    await command(page, 'ABOUT', 'Archie調査URL'); await command(page, 'BACK', '検索語: not-a-match');
    await command(page, 'BACK', 'Archie / ファイル名検索'); await command(page, 'BACK', '5 Archie');
    await command(page, 'BACK', handle ? '(MAIN)' : '索引'); if (!handle) await command(page, 'BACK', '(MAIN)');
    for (const fragment of [undefined, 'river', 'missing']) {
      await enter(page); if (fragment) await command(page, `PROG ${fragment}`, 'Archie / 検索結果');
      await command(page, 'MAIN', '(MAIN)'); await enter(page);
      expect(await command(page, 'HELP', 'Archie / ファイル名検索')).not.toContain('検索語:');
      await command(page, 'BACK', '5 Archie'); await command(page, 'BACK', '(MAIN)');
    }
    await command(page, 'Q', '接続を終了'); await command(page, 'RECONNECT', 'PC-VAN 接続中');
    await command(page, 'MAIN', '(MAIN)'); await enter(page);
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before)); expect(downloads).toHaveLength(0);
    const saved = await backup(page); expect(protectedRecords(saved)).toEqual(protectedRecords(before));
    expect(Object.keys(saved).sort()).toEqual(Object.keys(before).sort());
    // Filename fragments in ordinary command history are allowed; index metadata is never exported.
    for (const row of index) expect(JSON.stringify(saved)).not.toContain(JSON.stringify(row));
    expect(JSON.stringify(protectedRecords(saved))).not.toContain('archive.invalid');
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const value of ['検索語: rIvEr', 'star  map[1].txt', '星図 <b>観察</b> & "紙"', '2048 bytes', 'harbor.archive.invalid']) expect(log).toContain(value);
    expect(downloads).toHaveLength(2);
    const region = page.locator('.transcript'), bottom = await region.evaluate((e) => e.scrollTop);
    await input.press('PageUp'); await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeLessThan(bottom);
    await input.press('PageDown'); await command(page, 'HELP', 'Archie / ファイル名検索');
    const bounds = await input.boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
    await expect(input).toBeInViewport(); await noOtherUi(page);
    expect(remote).toEqual([]); expect(models).toEqual([]); expect(workers).toEqual([]); expect(popups).toEqual([]);
  });
}

test('production Archie cancelled restore/reset retains results; identical restore, cross-tab replacement and reset discard visits', async ({ page, context }) => {
  test.setTimeout(90_000);
  await start(page, '復元する人'); const fixture = await snapshot(page);
  async function search(target = page) { await enter(target); await command(target, 'PROG river', '一致する場所：2件'); }
  await search(); await importFile(page, fixture); await command(page, 'N', '操作を中止');
  await command(page, 'HELP', '検索語: river');
  await restore(page, await snapshot(page)); await command(page, 'HELP', '(MAIN)');
  await enter(page); expect(await command(page, 'HELP', 'Archie / ファイル名検索')).not.toContain('検索語:');
  await command(page, 'MAIN', '(MAIN)'); await search();
  const other = await context.newPage(); await other.goto('/'); await command(other, 'HELP', '(MAIN)');
  await restore(other, fixture); await expect.poll(() => page.locator('.output').textContent()).not.toContain('検索語: river');
  await command(page, 'HELP', '(MAIN)'); await search();
  await command(page, 'RESET', '初期状態に戻しますか'); await command(page, 'N', '操作を中止');
  await command(page, 'HELP', '検索語: river');
  await search(other); await command(page, 'RESET', '初期状態に戻しますか');
  await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await expect.poll(() => other.locator('.output').textContent()).not.toContain('検索語: river');
  await page.locator('#command').press('Escape'); await page.locator('#command').press('Escape');
  await command(page, 'SKIP', '登録を中止'); await command(page, 'HELP', '(MAIN)');
  await enter(page); expect(await command(page, 'HELP', 'Archie / ファイル名検索')).not.toContain('検索語:');
});
