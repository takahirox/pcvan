import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { bizArticles } from '../src/biz';
import { about } from '../src/settings';
import { backupFixture } from './backup-fixture';
import type { AiActivity } from '../src/storage/schema';
import { command, start, snapshot, restore, backup, noOtherUi } from './terminal-helpers';

const unrelated = ['WRITE', 'REPLY 1', 'COMPOSE someone', 'WRITE someone', 'SEND text', 'INBOX', 'SENT',
  'MAIL', 'LIBRARY', 'OSL', 'CONFERENCE', 'JOIN 1', '/JOIN 1', '/WHO', '/LIST', 'READ 1', 'LIST', 'Q', 'J MITI'];
const invalidFind = ['FIND', 'FIND パソコン 通信', 'FIND パソコン AND 商店', 'FIND AND', 'FIND or', 'FIND NOT',
  'FIND /1', 'FIND /1AND/2', 'FIND DATE=9611', 'FIND MEDIA=NKE', 'FIND (通信)', 'FIND 通信*', 'FIND "通信"', 'FIND 通信|商店'];
const invalidShow = ['SHOW', 'SHOW P1', 'SHOW P3 /1', 'SHOW P1 /1 1', 'SHOW P1 /1 extra', 'SHOW P3 /1 1 extra',
  'SHOW P2 /1', 'SHOW P1 1', 'SHOW P1 /99', 'SHOW P3 /99 1', 'SHOW P3 /1 99',
  ...['0', '-1', '01', '1.5', 'NaN', 'Infinity', '9007199254740992', '9'.repeat(350)].flatMap((n) =>
    [`SHOW P1 /${n}`, `SHOW P3 /${n} 1`, `SHOW P3 /1 ${n}`])];

function isolated(controller: PcvanController) {
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull();
  expect(controller.isConference).toBe(false); expect(controller.isOlt).toBe(false);
  expect(controller.needsContent).toBe(false);
}

for (const viaIndex of [false, true]) {
  test(`BiZ controller searches and reads with stable sets and ${viaIndex ? 'index' : 'direct'} returns`, () => {
    const controller = new PcvanController(), content = backupFixture();
    const original = structuredClone(content); controller.setContent(content); controller.setMemberId('human');
    const parent = viaIndex ? controller.submit('2').slice(1) : controller.welcome;
    const directory = controller.submit('4').slice(1);
    expect(directory.join('\n')).toContain('データベース一覧：1件\n1 日経テレコン BiZ');
    expect(controller.submit('LIST')).toEqual(directory);
    for (const invalid of ['0', '2', '01', '1.0', 'FIND 通信', 'SHOW P1 /1', 'SHOW P3 /1 1']) {
      expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
      expect(controller.submit('HELP')).toEqual(directory); isolated(controller);
    }
    const empty = controller.submit('1');
    expect(empty.join('\n')).toContain('FIND パソコン / SHOW P1 /1 / SHOW P3 /1 1');
    expect(controller.submit('FIND 雪だるま').join('\n')).toContain('雪だるま / 0件');
    expect(controller.submit('SHOW P1 /1').join('\n')).toContain('その検索集合はありません');
    const results = controller.submit(' find   パソコン  ');
    expect(results.join('\n')).toContain('/1 検索語：パソコン / 3件');
    const titles = controller.submit(' sHoW   p1   /1 ');
    expect(titles.join('\n')).toContain(`1 ${bizArticles[0]!.title}\n2 ${bizArticles[1]!.title}\n3 ${bizArticles[3]!.title}`);
    for (const [item, index] of [0, 1, 3].entries()) {
      const article = controller.submit(`show p3 /1 ${item + 1}`);
      expect(article.join('\n')).toContain(bizArticles[index]!.body);
      expect(controller.submit('HELP')).toEqual(article); isolated(controller);
    }
    // Direct SHOW P3 selects positions in that set, and BACK uses that set's titles.
    expect(controller.submit('BACK')).toEqual(titles);
    expect(controller.submit('BACK')).toEqual(results);
    const latin = controller.submit('FiNd cd-rom');
    expect(latin.join('\n')).toContain('/2 検索語：cd-rom / 1件');
    expect(controller.submit('SHOW P3 /2 1').join('\n')).toContain(bizArticles[1]!.body);
    controller.submit('FIND 省エネルギー');
    expect(controller.submit('SHOW P3 /3 1').join('\n')).toContain(bizArticles[2]!.body);
    expect(controller.submit('SHOW P1 /1')).toEqual(titles);
    expect(controller.submit('SHOW P3 /1 3').join('\n')).toContain(bizArticles[3]!.body);
    const latest = controller.submit('FIND パソコン');
    expect(latest.join('\n')).toContain('/4 検索語：パソコン / 3件');
    expect(controller.submit('SHOW P1 /1')).toEqual(titles);
    controller.submit('SHOW P3 /4 1'); controller.submit('SHOW P3 /1 2');
    expect(controller.submit('BACK')).toEqual(titles);
    expect(controller.submit('BACK')).toEqual(latest);
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.submit('1')).toEqual(empty);
    expect(controller.submit('SHOW P1 /1').join('\n')).toContain('その検索集合はありません');
    expect(controller.submit('FIND 商店').join('\n')).toContain('/1 検索語：商店 / 2件');
    controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(controller.submit('BACK')).toEqual(controller.welcome);
    expect(content).toEqual(original);
  });
}

test('BiZ errors preserve every active view and existing results', () => {
  const controller = new PcvanController(); controller.submit('4'); controller.submit('1'); controller.submit('FIND パソコン');
  for (const input of ['HELP', 'SHOW P1 /1', 'SHOW P3 /1 1']) {
    const view = controller.submit(input);
    for (const invalid of [...invalidFind, ...invalidShow, ...unrelated]) {
      expect(controller.submit(invalid).join('\n')).toMatch(/この画面では使えない|FIND は空白なし|その検索集合はありません|その番号の記事はありません/);
      expect(controller.submit('HELP')).toEqual(view); isolated(controller);
    }
  }
  expect(controller.submit('SHOW P3 /1 3').join('\n')).toContain(bizArticles[3]!.body);
  expect(controller.submit('FIND <b>').join('\n')).toContain('検索語：<b> / 0件');
  expect(controller.submit('SHOW P1 /1').join('\n')).toContain('パソコン / 3件');
  expect(controller.submit('FIND <未確認>').join('\n')).toContain('/2 検索語：<未確認> / 1件');
  // Both title-only and body-only matching, without tokenization or regular expressions.
  expect(controller.submit('FIND 入門講座').join('\n')).toContain('/3 検索語：入門講座 / 1件');
  expect(controller.submit('FIND 空気圧縮機').join('\n')).toContain('/4 検索語：空気圧縮機 / 1件');
  expect(controller.submit('FIND .').join('\n')).toContain('検索語：. / 0件');
});

test('BiZ retains exactly twenty successful sets without eviction; limits and state are per visit and controller', () => {
  const controller = new PcvanController(), other = new PcvanController();
  for (const c of [controller, other]) { c.submit('4'); c.submit('1'); }
  for (let number = 1; number <= 20; number++) {
    if (number % 2 === 0) expect(controller.submit('FIND 雪だるま').join('\n')).toContain('0件');
    expect(controller.submit('FIND 通信').join('\n')).toContain(`/${number} 検索語：通信 / 2件`);
  }
  expect(other.submit('SHOW P1 /1').join('\n')).toContain('その検索集合はありません');
  for (const input of ['HELP', 'SHOW P1 /1', 'SHOW P3 /20 2']) {
    const view = controller.submit(input);
    expect(controller.submit('FIND 商店').join('\n')).toContain('検索集合は20件まで');
    expect(controller.submit('HELP')).toEqual(view);
  }
  expect(controller.submit('FIND 雪だるま').join('\n')).toContain('0件');
  expect(controller.submit('SHOW P1 /21').join('\n')).toContain('その検索集合はありません');
  const last = controller.submit('SHOW P1 /20');
  expect(last.join('\n')).toContain(`1 ${bizArticles[0]!.title}\n2 ${bizArticles[3]!.title}`);
  expect(controller.submit('SHOW P3 /1 2').join('\n')).toContain(bizArticles[3]!.body);
  expect(controller.submit('BACK').join('\n')).toContain('/1 検索語：通信 / 2件');
  controller.submit('BACK'); controller.submit('BACK'); controller.submit('1');
  expect(controller.submit('FIND 通信').join('\n')).toContain('/1 検索語：通信 / 2件');
  expect(controller.submit('SHOW P1 /20').join('\n')).toContain('その検索集合はありません');
});

test('MAIN clears every BiZ depth and fresh entries expose no previous service context', () => {
  const controller = new PcvanController();
  for (const path of [[], ['1'], ['1', 'FIND 通信'], ['1', 'FIND 通信', 'SHOW P1 /1'], ['1', 'FIND 通信', 'SHOW P3 /1 2']]) {
    controller.submit('2'); controller.submit('4');
    for (const input of path) controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('4'); controller.submit('1');
    expect(controller.submit('SHOW P1 /1').join('\n')).toContain('その検索集合はありません');
    controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(controller.welcome);
  }
  for (const service of ['MAIL', 'CONFERENCE', 'OLT', 'LIBRARY', 'OSL']) {
    controller.submit('13'); controller.submit('2'); controller.submit(service); controller.submit('MAIN');
    controller.submit('4'); isolated(controller); controller.submit('1'); isolated(controller);
    controller.submit('FIND 通信'); isolated(controller); controller.submit('SHOW P1 /1'); isolated(controller);
    controller.submit('SHOW P3 /1 1'); isolated(controller); controller.submit('MAIN');
  }
  for (const path of [[], ['2'], ['3'], ['5', '1'], ['13', '2', 'LIBRARY']]) {
    for (const input of path) controller.submit(input);
    for (const input of ['FIND 通信', 'SHOW P1 /1', 'SHOW P3 /1 1']) expect(controller.submit(input).join('\n')).toContain('この画面では使えない');
    controller.submit('MAIN');
  }
});

test('About qualifies BiZ command evidence, continuity, reconstruction and fictional content', () => {
  const text = about(backupFixture()).join('\n');
  for (const detail of ['2026-10-23', '1993年3月', '1995年3月', '64〜67頁', '半角空白', 'ページ画像の取得も失敗',
    '1996年11月への継続は中程度', '1992年11月', '1997年1月', '1999年12月', '1996年10月',
    '20集合', '日付なし', '創作例文4件', 'FIND', 'SHOW P1', 'SHOW P3',
    'https://www.jipdec.or.jp/archives/publications/J0000844.pdf', 'https://www.infosta.or.jp/journal/rensai05.pdf',
    'https://www.jipdec.or.jp/archives/publications/J0000907.pdf',
    'https://www.jstage.jst.go.jp/article/jkg/47/4/47_KJ00002307006/_pdf/-char/ja']) expect(text).toContain(detail);
});

for (const handle of [undefined, '資料検索の人']) {
  test(`production BiZ journey preserves records and literal text at 320px (${handle ?? 'anonymous empty world'})`, async ({ page }) => {
    // Two full search journeys include hundreds of commands and repeated About
    // scrollback. Allow the production journey to finish under three-worker load.
    test.setTimeout(60_000);
    await page.clock.setFixedTime(new Date('2026-10-23T14:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [];
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:14373/')) remote.push(request.url()); });
    await start(page, handle);
    const fixture = await snapshot(page);
    const activity = fixture.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    if (!handle) {
      fixture.members = []; fixture.sigs = []; fixture.forums = []; fixture.posts = [];
      fixture.mail = []; fixture.readStates = [];
      fixture.settings.find((row) => row.id === 'daisizen-conference')!.value =
        { version: 1, conferenceId: 'DAISIZEN', nextNumber: 1, contributions: [] };
    }
    await restore(page, fixture);
    const before = await snapshot(page);
    const input = page.locator('#command'), output = page.locator('.output');
    for (const viaIndex of [false, true]) {
      if (viaIndex) await command(page, '2', '索引');
      await command(page, '4', 'データベース一覧：1件');
      await command(page, 'FIND 通信', 'この画面では使えない');
      await command(page, '1', '日経テレコン BiZ / 検索');
      await command(page, 'FIND 雪だるま', '雪だるま / 0件');
      await command(page, 'SHOW P1 /1', 'その検索集合はありません');
      // Composition-confirming Enter, including the post-composition guard, cannot submit FIND.
      await input.fill('FIND パソコン');
      const transcript = await output.textContent();
      await input.dispatchEvent('compositionstart'); await input.press('Enter');
      await expect(input).toHaveValue('FIND パソコン'); expect(await output.textContent()).toBe(transcript);
      await input.dispatchEvent('compositionend');
      await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
      expect(await output.textContent()).toBe(transcript);
      await command(page, 'FIND パソコン', '/1 検索語：パソコン / 3件');
      await command(page, 'SHOW P1 /1', `3 ${bizArticles[3]!.title}`);
      for (const [item, index] of [0, 1, 3].entries()) {
        await command(page, `SHOW P3 /1 ${item + 1}`, bizArticles[index]!.body);
        await command(page, 'HELP', bizArticles[index]!.body);
        await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', bizArticles[index]!.body);
        await command(page, 'ABOUT', '1996年11月への継続は中程度'); await command(page, 'BACK', bizArticles[index]!.body);
      }
      await command(page, 'FIND 省エネルギー', '/2 検索語：省エネルギー / 1件');
      await command(page, 'SHOW P3 /2 1', bizArticles[2]!.body);
      for (const invalid of [...invalidFind, ...invalidShow.slice(0, 15), ...unrelated]) {
        await command(page, invalid, /^(WRITE$|REPLY 1$)/.test(invalid) ? '投稿先の掲示板'
          : invalidFind.includes(invalid) ? 'FIND は空白なし' : 'コマンド=');
      }
      await command(page, 'HELP', bizArticles[2]!.body);
      await command(page, 'SHOW P3 /1 3', bizArticles[3]!.body);
      await command(page, 'BACK', '/1 検索語：パソコン / 3件');
      await command(page, 'BACK', '/2 検索語：省エネルギー / 1件');
      await command(page, 'FIND cd-rom', '/3 検索語：cd-rom / 1件');
      await command(page, 'FIND パソコン', '/4 検索語：パソコン / 3件');
      await command(page, 'SHOW P1 /1', `3 ${bizArticles[3]!.title}`);
      await command(page, 'FIND <b>', '検索語：<b> / 0件');
      await command(page, 'FIND <未確認>', '/5 検索語：<未確認> / 1件');
      await command(page, 'SHOW P3 /5 1', bizArticles[0]!.body);
      await expect(output.locator('未確認, b, script, a')).toHaveCount(0);
      await input.fill('未送信の日本語');
      const saved = await output.textContent();
      await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
      const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
      await modal.locator('.about-panel summary').click();
      await expect(modal.locator('.settings-about')).toContainText('20集合');
      await expect(modal.locator('.settings-about')).toContainText('https://www.jipdec.or.jp/archives/publications/J0000844.pdf');
      await page.keyboard.press('Escape'); await expect(input).toBeFocused();
      await expect(input).toHaveValue('未送信の日本語'); expect(await output.textContent()).toBe(saved);
      const log = page.getByRole('log');
      expect(await log.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await input.press('Shift+Tab'); await log.press('ArrowRight');
      await expect.poll(() => log.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await log.press('Tab'); await expect(input).toBeFocused();
      const bounds = await input.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      await command(page, 'BACK', '/5 検索語：<未確認> / 1件');
      await command(page, 'BACK', '/4 検索語：パソコン / 3件');
      await command(page, 'BACK', 'データベース一覧：1件');
      await command(page, '1', '日経テレコン BiZ / 検索');
      await command(page, 'SHOW P1 /1', 'その検索集合はありません');
      await command(page, 'BACK', 'データベース一覧：1件');
      await command(page, 'BACK', viaIndex ? '索引' : 'ＰＣ－ＶＡＮ');
      if (viaIndex) await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    for (const depth of [0, 1, 2, 3]) {
      await command(page, '4', 'データベース一覧：1件');
      if (depth >= 1) { await command(page, '1', '日経テレコン BiZ / 検索'); await command(page, 'FIND 通信', '/1 検索語：通信 / 2件'); }
      if (depth === 2) await command(page, 'SHOW P1 /1', '日経テレコン BiZ / 見出し');
      if (depth === 3) await command(page, 'SHOW P3 /1 1', bizArticles[0]!.body);
      await command(page, 'MAIN', 'ＰＣ－ＶＡＮ');
    }
    // Production set limit, no eviction, zero-hit at capacity and fresh visit.
    await command(page, '4', 'データベース一覧：1件'); await command(page, '1', '日経テレコン BiZ / 検索');
    for (let n = 1; n <= 20; n++) await command(page, 'FIND 通信', `/${n} 検索語：通信 / 2件`);
    await command(page, 'FIND 通信', '検索集合は20件まで');
    await command(page, 'FIND 雪だるま', '雪だるま / 0件');
    await command(page, 'SHOW P3 /1 2', bizArticles[3]!.body);
    await command(page, 'SHOW P1 /20', `2 ${bizArticles[3]!.title}`);
    await command(page, 'MAIN', 'ＰＣ－ＶＡＮ');
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const article of bizArticles) expect(log).toContain(article.body);
    expect(log).toContain('検索語：<b> / 0件'); expect(log).toContain('<未確認>');
    const after = await snapshot(page), exported = await backup(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) {
      expect(after[key]).toEqual(before[key]); expect(exported[key]).toEqual(before[key]);
    }
    expect(after.session!.commandHistory).toContain('SHOW P1 /20');
    expect(JSON.stringify(exported)).not.toContain(bizArticles[0]!.body);
    expect(remote).toEqual([]); await noOtherUi(page);
  });
}
