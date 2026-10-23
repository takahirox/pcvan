import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { newsBriefs } from '../src/news';
import { about } from '../src/settings';
import { backupFixture } from './backup-fixture';
import type { AiActivity } from '../src/storage/schema';
import { command, start, snapshot, restore, backup, noOtherUi } from './terminal-helpers';

const malformed = ['READ', 'READ 0', 'READ -1', 'READ 01', 'READ 1.5', 'READ 1 extra', 'READ NaN',
  'READ Infinity', 'READ +1', 'READ 1e0', 'READ /1'];
const absent = ['READ 4', 'READ 999', 'READ 9007199254740992', `READ ${'9'.repeat(350)}`];
const unrelated = ['WRITE', 'REPLY 1', 'COMPOSE someone', 'WRITE someone', 'SEND text', 'INBOX', 'SENT',
  'MEMBERS', 'MAIL', 'LIBRARY', 'OSL', 'CONFERENCE', 'OLT', 'JOIN 1', '/JOIN 1', '/WHO', '/LIST',
  '/LEAVE', '/MAIN', 'UPLOAD file', 'DOWNLOAD 1', 'FIND 通信', 'SHOW P1 /1', 'Q', 'J MITI'];
const providerErrors = ['0', '2', '99', '01', '1.0', '1 extra', 'READ 1', ...malformed, ...unrelated];
const readingErrors = ['1', '0', '99', ...malformed, ...absent, ...unrelated];
const sourceUrls = [
  'https://www.jstage.jst.go.jp/article/jjsei/5/1/5_KJ00002152638/_pdf/-char/ja',
  'https://www.jstage.jst.go.jp/browse/jjsei/5/1/_contents/-char/ja',
  'https://search.vector.co.jp/vsearch/vsearch.php?kanji=euc&key=PR&start=1170',
  'https://www.paradisearmy.com/doujin/pasok3pc-van.htm',
  'https://iwparchives.jp/wp-content/themes/twentytwelve/bn/pdf/im199504-104-bbs.pdf',
];

function isolated(controller: PcvanController) {
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull();
  expect(controller.isConference).toBe(false); expect(controller.isOlt).toBe(false);
  expect(controller.needsContent).toBe(false);
}

for (const viaIndex of [false, true]) {
  test(`news controller reads all briefs, rejects contextual errors and follows ${viaIndex ? 'index' : 'direct'} parents`, () => {
    const controller = new PcvanController(), content = backupFixture();
    const original = structuredClone(content); controller.setContent(content); controller.setMemberId('human');
    const parent = viaIndex ? controller.submit('2').slice(1) : controller.welcome;
    const directory = controller.submit('3').slice(1);
    expect(directory.join('\n')).toContain('ニュース / 提供元一覧\n1 時事通信ニュース');
    expect(directory.join('\n')).not.toMatch(/創作|再構成|https?:/);
    expect(controller.submit('LIST')).toEqual(directory);
    for (const invalid of providerErrors) {
      expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
      expect(controller.submit('HELP')).toEqual(directory); isolated(controller);
    }
    const headlines = controller.submit('1');
    expect(headlines.join('\n')).toContain('時事通信ニュース / 見出し\n見出し一覧：3件');
    expect(controller.submit('LIST')).toEqual(headlines);
    for (const [index, item] of newsBriefs.entries()) {
      expect(headlines.join('\n')).toContain(`#${index + 1} ${item.title}`);
      const brief = controller.submit(`  read   ${index + 1}  `);
      expect(brief.join('\n')).toContain(item.body);
      expect(controller.submit('HELP')).toEqual(brief);
      expect(controller.submit(`READ ${index + 1}`)).toEqual(brief);
      for (const view of [brief, headlines]) {
        for (const invalid of readingErrors) {
          expect(controller.submit(invalid).join('\n')).toMatch(/この画面では使えない|その番号のニュースはありません/);
          expect(controller.submit('HELP')).toEqual(view); isolated(controller);
        }
        if (view === brief) expect(controller.submit('BACK')).toEqual(headlines);
      }
      controller.submit(`READ ${index + 1}`);
      expect(controller.submit('LIST')).toEqual(headlines);
    }
    // Replacing and repeating details must leave exactly one headline parent.
    for (const number of [1, 3, 2, 2, 1]) controller.submit(`READ ${number}`);
    expect(controller.submit('BACK')).toEqual(headlines);
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.submit('1')).toEqual(headlines);
    controller.submit('READ 3'); controller.submit('BACK'); controller.submit('BACK');
    expect(controller.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(controller.submit('BACK')).toEqual(controller.welcome);
    expect(content).toEqual(original);
  });
}

test('MAIN clears every news depth; visits and service contexts cannot retain stale paths', () => {
  const controller = new PcvanController(), other = new PcvanController();
  for (const path of [[], ['1'], ['1', 'READ 2']]) {
    controller.submit('2'); controller.submit('3');
    for (const input of path) controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('3'); isolated(controller);
    controller.submit('1'); expect(controller.screen).toBe('news-headlines');
    controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(controller.welcome);
  }
  for (const path of [['1', 'INBOX'], ['J MITI', '3', '9'],
    ...['MAIL', 'CONFERENCE', 'OLT', 'LIBRARY', 'OSL'].map((service) => ['13', '2', service])]) {
    for (const input of path) controller.submit(input);
    controller.submit('MAIN');
    for (const input of ['3', '1', 'READ 3']) { controller.submit(input); isolated(controller); }
    controller.submit('MAIN');
  }
  controller.submit('3'); controller.submit('1'); controller.submit('READ 3');
  expect(other.screen).toBe('main');
  other.submit('3'); other.submit('1'); expect(other.screen).toBe('news-headlines');
});

test('About qualifies news sources, continuity, reconstruction, access limits and fiction', () => {
  const text = about(backupFixture()).join('\n');
  for (const detail of [...sourceUrls, '2026-10-24', '1989年4月', '61〜62頁', '1989-04-01', '60〜64頁',
    '独立した裏付けではありません', 'ページ画像の取得は失敗', 'PCVAN_DL.PRO 1.08', '1996-08-15',
    '直接閲覧は失敗', '検索抜粋のみ', '継続は中程度', '真正性・正確な改訂日は暫定',
    '1995年4月Internet Magazine 105頁', '歴史的な全社一覧ではありません', '創作短報3件',
    '日付なし', '真正な時事通信の報道・回収記事ではありません', '更新頻度は不明', 'JIJIW・NIFTY-Serve']) expect(text).toContain(detail);
});

for (const world of ['registered populated', 'registered empty', 'anonymous empty']) {
  test(`production news journey preserves ${world} records and literal text at 320px`, async ({ page }) => {
    // This exhaustive journey shares the long NetNews journey's budget under worker contention.
    test.setTimeout(90_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [];
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:14373/')) remote.push(request.url()); });
    await start(page, world.startsWith('registered') ? '新聞を読む人' : undefined);
    const fixture = await snapshot(page);
    const activity = fixture.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    if (world.endsWith('empty')) {
      fixture.members = fixture.members.filter((member) => member.actor === 'human');
      fixture.sigs = []; fixture.forums = []; fixture.posts = []; fixture.mail = []; fixture.readStates = [];
      fixture.settings.find((row) => row.id === 'daisizen-conference')!.value =
        { version: 1, conferenceId: 'DAISIZEN', nextNumber: 1, contributions: [] };
    }
    await restore(page, fixture);
    const before = await snapshot(page);
    const input = page.locator('#command'), output = page.locator('.output');
    async function invalids(lines: string[]) {
      for (const invalid of lines) {
        await command(page, invalid, /^(WRITE$|REPLY 1$)/.test(invalid) ? '投稿先の掲示板'
          : absent.includes(invalid) ? 'その番号のニュースはありません' : 'この画面では使えない');
      }
    }
    for (const viaIndex of [false, true]) {
      if (viaIndex) await command(page, '2', '索引');
      await command(page, '3', 'ニュース / 提供元一覧');
      await command(page, 'HELP', '1 時事通信ニュース');
      await command(page, 'LIST', 'ニュース / 提供元一覧');
      await invalids(providerErrors);
      await command(page, 'HELP', 'ニュース / 提供元一覧');
      await command(page, '1', '時事通信ニュース / 見出し');
      await command(page, 'LIST', '見出し一覧：3件');
      await invalids(readingErrors.filter((line) => line.length < 100));
      await command(page, 'HELP', '時事通信ニュース / 見出し');
      for (const [index, brief] of newsBriefs.entries()) {
        // Enter during and immediately after composition cannot submit READ.
        await input.fill(`READ ${index + 1}`);
        const transcript = await output.textContent();
        await input.dispatchEvent('compositionstart'); await input.press('Enter');
        expect(await output.textContent()).toBe(transcript);
        await input.dispatchEvent('compositionend');
        await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
        expect(await output.textContent()).toBe(transcript);
        await expect(input).toHaveValue(`READ ${index + 1}`);
        await command(page, `read ${index + 1}`, brief.body);
        await command(page, 'HELP', brief.body);
        await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', brief.body);
        await command(page, 'ABOUT', '創作短報3件'); await command(page, 'BACK', brief.body);
        await command(page, 'LIST', '時事通信ニュース / 見出し');
      }
      // Another READ replaces the detail; errors cannot change it or start a composer/room.
      for (const number of [1, 3, 3]) await command(page, `READ ${number}`, newsBriefs[number - 1]!.body);
      await invalids(readingErrors.filter((line) => line.length < 100));
      await command(page, 'HELP', newsBriefs[2]!.body);
      await expect(output.locator('照会中, b, script, a')).toHaveCount(0);
      await command(page, 'HANDLE', 'ハンドル'); await command(page, 'BACK', '設定 / SETTINGS');
      await command(page, 'BACK', newsBriefs[2]!.body);
      await command(page, 'STOP', 'モデルを解放');
      await command(page, 'HELP', newsBriefs[2]!.body);
      await input.fill('未送信の日本語');
      const saved = await output.textContent();
      await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
      const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
      await modal.locator('.about-panel summary').click();
      for (const detail of ['創作短報3件', '2026-10-24', ...sourceUrls]) await expect(modal.locator('.settings-about')).toContainText(detail);
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
      await command(page, 'BACK', '時事通信ニュース / 見出し');
      await command(page, 'BACK', 'ニュース / 提供元一覧');
      await command(page, '1', '時事通信ニュース / 見出し');
      await command(page, 'BACK', 'ニュース / 提供元一覧');
      await command(page, 'BACK', viaIndex ? '索引' : 'ＰＣ－ＶＡＮ');
      if (viaIndex) await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    for (const depth of [0, 1, 2]) {
      await command(page, '2', '索引'); await command(page, '3', 'ニュース / 提供元一覧');
      if (depth >= 1) await command(page, '1', '時事通信ニュース / 見出し');
      if (depth === 2) await command(page, 'READ 1', newsBriefs[0]!.body);
      await command(page, 'MAIN', 'ＰＣ－ＶＡＮ');
      // A different entry parent on the next visit must have no stale detail/path.
      await command(page, '3', 'ニュース / 提供元一覧'); await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const brief of newsBriefs) expect(log).toContain(brief.body);
    expect(log).toContain('<照会中>');
    const after = await snapshot(page), exported = await backup(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) {
      expect(after[key]).toEqual(before[key]); expect(exported[key]).toEqual(before[key]);
    }
    expect(after.session!.commandHistory).toContain('READ 1');
    for (const brief of newsBriefs) expect(JSON.stringify(exported)).not.toContain(brief.body);
    expect(remote).toEqual([]); await noOtherUi(page);
  });
}
