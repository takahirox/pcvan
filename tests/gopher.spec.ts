import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import documents from '../data/pcvan/gopher-documents.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { about } from '../src/settings';
import type { AiActivity, Backup } from '../src/storage/schema';
import { emptyOlt, appendOlt, OLT_SETTING } from '../src/olt-state';
import { emptyNetNews, localNetNewsMessageId } from '../src/netnews';
import { backupFixture, quietOltFixture } from './backup-fixture';
import { backup, command, importFile, noOtherUi, restore, snapshot, start } from './terminal-helpers';

const invalid = ['0', '-1', '01', '+1', '1.5', '1e0', 'NaN', 'Infinity', '4', '99',
  '9007199254740992', '9'.repeat(350), '1 extra', 'READ 1', 'J GOPHER', 'J MITI', 'J ECOM',
  'WRITE', 'WRITE somebody', 'COMPOSE', 'REPLY 1', 'MAIL', 'INBOX', 'SENT', 'MEMBERS',
  'OLT', 'JOIN 1', '/JOIN 1', '/WHO', '/MAIN', 'CONFERENCE', 'OPEN mail.demo.example.invalid',
  'LOGOUT', 'DOWNLOAD 1', 'UPLOAD file', 'FIND 川辺', 'SHOW P1 /1', '.END', '.CANCEL', 'Y'];
const protectedRecords = (data: Backup) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
  posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings });
function isolated(nav: PcvanController | ConnectionController) {
  expect(nav.isGopher).toBe(true); expect(nav.forum).toBeNull(); expect(nav.mailContext).toBeNull();
  expect(nav.netNewsContext).toBeNull(); expect(nav.isOlt).toBe(false); expect(nav.isConference).toBe(false);
  expect(nav.isTelnet).toBe(false); expect(nav.isEcom).toBe(false); expect(nav.needsContent).toBe(false);
  for (const n of [1, 2, 0, NaN, Infinity]) expect(nav.selectDownload(n)).toBeNull();
}
function retains(nav: PcvanController | ConnectionController, view: readonly string[], extra: string[] = []) {
  for (const line of [...invalid, ...extra]) {
    expect(nav.submit(line).join('\n')).toContain('このGopher画面では使えない');
    expect(nav.submit('HELP')).toEqual(view); isolated(nav);
  }
}
for (const viaIndex of [false, true]) {
  test(`Gopher controller directory/document/search path returns to actual ${viaIndex ? 'index' : 'MAIN'} parent`, () => {
    const nav = new PcvanController(), world = backupFixture(), original = structuredClone(world);
    nav.setContent(world); nav.setMemberId('human');
    const parent = viaIndex ? nav.submit('2').slice(1) : nav.welcome;
    const internet = nav.submit('7').slice(1);
    for (const text of ['1 NetNews', '2 TELNET', '3 FTP', '4 Gopher']) expect(internet).toContain(text);
    for (let visit = 0; visit < 2; visit++) {
      const root = nav.submit('4'); expect(root).toContain('1 [ディレクトリ] 紙野の読み物');
      retains(nav, root, ['SEARCH 川辺']);
      // The same document is accessible directly and via a nested directory.
      expect(nav.submit('2').join('\n')).toContain(documents[0].body);
      expect(nav.submit('LIST')).toEqual(root);
      const nested = nav.submit('1');
      retains(nav, nested, ['SEARCH 川辺']);
      for (const [i, doc] of documents.entries()) {
        for (const exit of ['BACK', 'LIST', 'BACK']) {
          const text = nav.submit(String(i + 1)); expect(text.join('\n')).toContain(doc.body);
          retains(nav, text, ['1', '2', '3', 'SEARCH 川辺']);
          expect(nav.submit(exit)).toEqual(nested);
        }
      }
      const search = nav.submit('3'); expect(search).toContain('Gopher / 検索');
      retains(nav, search, ['1', '2', '3', 'SEARCHfoo']);
      const results = nav.submit('  sEaRcH   川辺   ');
      expect(results).toContain('検索語: 川辺'); expect(results).toContain('検索結果：2件');
      retains(nav, results, ['3', 'SEARCHfoo']);
      for (const [i, doc] of documents.entries()) {
        for (const exit of ['LIST', 'BACK', 'LIST']) {
          expect(nav.submit(String(i + 1)).join('\n')).toContain(doc.body);
          expect(nav.submit(exit)).toEqual(results);
        }
      }
      expect(nav.submit('BACK')).toEqual(search);
      expect(nav.submit('BACK')).toEqual(nested);
      expect(nav.submit('BACK')).toEqual(root);
      expect(nav.submit('BACK')).toEqual(internet);
    }
    expect(nav.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(nav.submit('BACK')).toEqual(nav.welcome);
    expect(world).toEqual(original);
  });
}

test('Gopher search is literal, case insensitive, title/body only and replacement queries keep one return frame', () => {
  const nav = new PcvanController(); nav.submit('7'); nav.submit('4');
  const root = nav.submit('HELP'), search = nav.submit('3');
  // Explicit expected matches, independent of the search implementation.
  for (const [query, titles] of [
    ['川辺', [documents[0].title, documents[1].title]],
    ['川辺の小さな観察帳', [documents[0].title]], ['sTaR mAp', [documents[1].title]],
    ['水面  風', [documents[0].title]], ['水面 風', []], ['.*', [documents[1].title]],
    ['AND', [documents[1].title]], ['川辺 OR 星空', []], ['^川辺$', []],
    ['<b>観察</b>', [documents[0].title]], ['not-a-match', []], ['Gopher', []], ['river', []],
  ] as [string, string[]][]) {
    const results = nav.submit(`SEARCH  ${query}  `);
    expect(results).toContain(`検索語: ${query}`); expect(results).toContain(`検索結果：${titles.length}件`);
    expect(results.filter((line) => /^\d+ \[文書\]/.test(line)))
      .toEqual(titles.map((title, i) => `${i + 1} [文書] ${title}`));
    if (!titles.length) {
      expect(results).toContain('一致する文書はありません。'); retains(nav, results, ['1', '2', '3']);
    }
    for (const malformed of ['SEARCH', 'SEARCH   ', 'SEARCH\n川辺', 'SEARCH 川\n辺']) {
      expect(nav.submit(malformed).join('\n')).toContain('検索語を指定してください');
      expect(nav.submit('HELP')).toEqual(results);
    }
  }
  expect(nav.submit('BACK')).toEqual(search);
  for (const malformed of ['SEARCH', 'SEARCH   ', 'SEARCH 川\n辺']) {
    expect(nav.submit(malformed).join('\n')).toContain('検索語を指定してください');
    expect(nav.submit('HELP')).toEqual(search);
  }
  expect(nav.submit('BACK')).toEqual(root);
});

test('Gopher connection forwarding, MAIN at every depth, clean re-entry and disconnect/reconnect', () => {
  const nav = new ConnectionController(); nav.completeConnection();
  for (const path of [[], ['1'], ['2'], ['3'], ['3', 'SEARCH 川辺'], ['3', 'SEARCH 川辺', '1'],
    ['1', '1'], ['1', '3'], ['1', '3', 'SEARCH 川辺'], ['1', '3', 'SEARCH 川辺', '2']]) {
    for (const line of ['2', '7', '4', ...path]) nav.submit(line);
    isolated(nav); expect(nav.submit('MAIN').join('\n')).toContain('(MAIN)'); expect(nav.isGopher).toBe(false);
    nav.submit('7'); const root = nav.submit('4');
    expect(root).toContain('Gopher / ルート'); expect(root.join('\n')).not.toContain('検索語:');
    expect(nav.submit('BACK')).toContain('4 Gopher');
    expect(nav.submit('BACK').join('\n')).toContain('(MAIN)');
  }
  expect(nav.submit('Q').join('\n')).toContain('接続を終了'); nav.submit('RECONNECT'); nav.completeConnection();
  nav.submit('7'); expect(nav.submit('4')).toContain('Gopher / ルート'); isolated(nav);
});

test('Gopher About discloses historical capability, uncertain route, category D and original authorship', () => {
  const text = about(backupFixture()).join('\n');
  for (const value of ['Gopher', '2026-10-24', '1996年1月', '1996年11月', '中程度の推定', '未解明',
    'Navigator', 'Mosaic', 'WorldTALK', 'カテゴリーD', 'オリジナル', 'RFC 1436', 'Archie',
    'iwp1996-ch04-01-p110.pdf', 'im199601-216-news.pdf', 'rfc1436.html', 'iwp1996-ch01-01-p014.pdf',
    'iwp1997-ch01-06-p028.pdf', '途中の空白', 'プロトコル準拠']) expect(text).toContain(value);
});

async function enter(page: Page, viaIndex = false) {
  if (viaIndex) await command(page, '2', '索引');
  await command(page, '7', '4 Gopher'); await command(page, '4', 'Gopher / ルート');
}
for (const handle of [undefined, '星空を読む人']) {
  test(`production Gopher 320px keyboard, IME, exact returns, export and protected ${handle ? 'registered' : 'anonymous empty'} world`, async ({ page }) => {
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
    quietOltFixture(fixture);

    if (!handle) {
      fixture.members = []; fixture.sigs = []; fixture.forums = []; fixture.posts = []; fixture.mail = []; fixture.readStates = [];
      fixture.settings = fixture.settings.filter((s) => !['daisizen-conference', 'active-human-member'].includes(s.id));
    } else {
      const human = fixture.members.find((m) => m.actor === 'human')!.id;
      fixture.mail = [{ id: 'gopher-protected-mail', number: 1, senderId: human, recipientId: 'fictional-ai:hoshimori',
        subject: '保持する便り', body: '  <記録> & 日本語\n', createdAt: '2026-10-23T01:00:00.000Z', origin: 'local-human' }];
      fixture.readStates = [{ memberId: human, forumId: fixture.posts[0]!.forumId, lastReadNumber: 1 }];
      const at = '2026-10-23T01:00:00.000Z', olt = emptyOlt(await page.evaluate(() => new Date().toISOString())), news = emptyNetNews();
      appendOlt(olt.rooms[0]!, human, 'say', '保持する会話', 'local-human', Date.parse(at));
      news.contributions.push({ id: 'gopher-protected-news', group: 'fj.questions.fj', number: 4, authorId: human,
        title: '保持する記事', body: '  <本文> & 記録\n', createdAt: at, origin: 'local-human',
        messageId: localNetNewsMessageId('fj.questions.fj', 4), references: [] });
      news.nextNumbers['fj.questions.fj'] = 5;
      fixture.settings = fixture.settings.filter((s) => s.id !== OLT_SETTING);
      fixture.settings.push({ id: OLT_SETTING, value: olt as never }, { id: 'netnews-local', value: news as never });
    }
    await restore(page, fixture); const before = await snapshot(page);
    page.on('download', (d) => downloads.push(d));
    const input = page.locator('#command'), output = page.locator('.output');
    const browserInvalid = invalid.filter((s) => s.length < 100);
    await enter(page, !handle);
    await command(page, '1', 'Gopher / 紙野の読み物');
    for (const [i, doc] of documents.entries()) {
      await command(page, String(i + 1), doc.body);
      for (const line of browserInvalid) await command(page, line, 'このGopher画面では使えない');
      await command(page, 'HELP', doc.body);
      await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'ABOUT', 'Gopher調査URL');
      await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', doc.body);
      // Modern modal inspection preserves both service context and unsent input.
      await input.fill('未送信  日本語'); const transcript = await output.textContent();
      await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
      await page.keyboard.press('Escape'); await expect(input).toHaveValue('未送信  日本語');
      expect(await output.textContent()).toBe(transcript);
      await command(page, i === 0 ? 'LIST' : 'BACK', 'Gopher / 紙野の読み物');
    }
    await command(page, '3', 'Gopher / 検索');
    await command(page, 'SEARCH', '検索語を指定してください');
    await command(page, 'SEARCH   ', '検索語を指定してください');
    await command(page, '1', 'このGopher画面では使えない');
    await input.fill('SEARCH  川辺  '); const transcript = await output.textContent();
    await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue('SEARCH  川辺  '); expect(await output.textContent()).toBe(transcript);
    await input.dispatchEvent('compositionend'); await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
    expect(await output.textContent()).toBe(transcript);
    await command(page, 'SEARCH  川辺  ', '検索結果：2件');
    const results = await command(page, 'HELP', '検索語: 川辺');
    for (let repeat = 0; repeat < 3; repeat++) {
      await command(page, '2', documents[1].body);
      const returned = await command(page, repeat === 0 ? 'LIST' : 'BACK', '検索語: 川辺');
      expect(returned.slice(returned.indexOf('Gopher / 検索結果'))).toBe(results.slice(results.indexOf('Gopher / 検索結果')));
    }
    for (const [query, count] of [['sTaR mAp', 1], ['水面  風', 1], ['水面 風', 0], ['.*', 1], ['川辺 OR 星空', 0]] as const) {
      await command(page, `SEARCH ${query}`, `検索結果：${count}件`);
      await command(page, 'HELP', `検索語: ${query}`);
      await command(page, 'SEARCH', '検索語を指定してください');
      if (!count) { await command(page, '1', 'このGopher画面では使えない'); await command(page, 'HELP', '一致する文書はありません。'); }
    }
    await command(page, 'SEARCH 川辺', '検索結果：2件');
    for (const line of browserInvalid) await command(page, line, 'このGopher画面では使えない');
    await command(page, 'HELP', '検索語: 川辺');
    await command(page, 'ABOUT', 'Gopher調査URL'); await command(page, 'BACK', '検索語: 川辺');
    await command(page, 'BACK', 'Gopher / 検索'); await command(page, 'BACK', 'Gopher / 紙野の読み物');
    await command(page, 'BACK', 'Gopher / ルート'); await command(page, 'BACK', '4 Gopher');
    await command(page, 'BACK', handle ? '(MAIN)' : '索引'); if (!handle) await command(page, 'BACK', '(MAIN)');
    await enter(page); await command(page, '3', 'Gopher / 検索'); await command(page, 'SEARCH 川辺', '検索結果：2件');
    await command(page, '1', documents[0].body); await command(page, 'MAIN', '(MAIN)');
    await enter(page); const root = await command(page, 'HELP', 'Gopher / ルート'); expect(root).not.toContain('検索語:');
    await command(page, 'BACK', '4 Gopher'); await command(page, 'BACK', '(MAIN)');
    await command(page, 'Q', '接続を終了'); await command(page, 'RECONNECT', 'PC-VAN 接続中');
    await command(page, 'MAIN', '(MAIN)'); await enter(page);
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    expect(downloads).toHaveLength(0);
    const saved = await backup(page); expect(protectedRecords(saved)).toEqual(protectedRecords(before));
    for (const doc of documents) expect(JSON.stringify(saved)).not.toContain(JSON.stringify(doc.body).slice(1, -1));
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const doc of documents) expect(log).toContain(doc.body);
    expect(downloads).toHaveLength(2); // Only the explicitly requested backup and log.
    await expect(output.locator('note, b')).toHaveCount(0);
    const region = page.locator('.transcript'), bottom = await region.evaluate((e) => e.scrollTop);
    await input.press('PageUp'); await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeLessThan(bottom);
    await input.press('PageDown'); await command(page, 'HELP', 'Gopher / ルート');
    const bounds = await input.boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
    await expect(input).toBeInViewport(); await noOtherUi(page);
    expect(remote).toEqual([]); expect(models).toEqual([]); expect(workers).toEqual([]); expect(popups).toEqual([]);
  });
}

test('production Gopher restore cancellation preserves query; identical restore, cross-tab restore and reset clear the visit', async ({ page, context }) => {
  test.setTimeout(90_000);
  await start(page, '復元する人'); const fixture = await snapshot(page);
  async function search() { await enter(page); await command(page, '3', 'Gopher / 検索'); await command(page, 'SEARCH 星空', '検索結果：1件'); }
  await search(); await importFile(page, fixture); await command(page, 'N', '操作を中止');
  await command(page, 'HELP', '検索語: 星空');
  await restore(page, await snapshot(page)); await command(page, 'HELP', '(MAIN)');
  await search();
  const other = await context.newPage(); await other.goto('/'); await command(other, 'HELP', '(MAIN)');
  await restore(other, fixture); await expect.poll(() => page.locator('.output').textContent()).not.toContain('検索語: 星空');
  await command(page, 'HELP', '(MAIN)');
  await search(); await command(page, 'RESET', '初期状態に戻しますか'); await command(page, 'N', '操作を中止');
  await command(page, 'HELP', '検索語: 星空');
  await command(page, 'RESET', '初期状態に戻しますか');
  // Reset reloads the page and clears the transcript, so don't slice at its old length.
  await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await page.locator('#command').press('Escape'); await page.locator('#command').press('Escape');
  await command(page, 'SKIP', '登録を中止'); await command(page, 'HELP', '(MAIN)');
  await enter(page); const root = await command(page, 'HELP', 'Gopher / ルート'); expect(root).not.toContain('検索語:');
});
