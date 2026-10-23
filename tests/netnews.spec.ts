import { identityToken } from '../src/member-presentation';
import { calendarSetting, initialCalendar, serviceDate } from '../src/calendar';
import { validateBackup } from '../src/storage/schema';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { emptyNetNews, netNewsGroup, localNetNewsMessageId, netNewsGroups } from '../src/netnews';
import { about } from '../src/settings';
import { backupFixture } from './backup-fixture';
import type { AiActivity } from '../src/storage/schema';
import { command, start, snapshot, restore, backup, noOtherUi } from './terminal-helpers';

const invalidReads = ['READ', 'READ 0', 'READ -1', 'READ 01', 'READ 1.5', 'READ 1 extra',
  'READ NaN', 'READ Infinity', 'READ +1', 'READ 1e0', 'READ /1', 'READ 4', 'READ 999',
  'READ 9007199254740992', `READ ${'9'.repeat(350)}`];
const invalidSearches = ['SEARCH', 'SEARCH SUBJECT', 'SEARCH FROM   ', 'SEARCH BODY 質問',
  'SEARCH DATE 1996', 'SEARCH UNKNOWN x'];
const unrelated = ['WRITE', 'REPLY 1', 'COMPOSE someone', 'WRITE someone', 'SEND text', 'INBOX', 'SENT',
  'MEMBERS', 'MAIL', 'LIBRARY', 'OSL', 'CONFERENCE', 'OLT', 'JOIN 1', '/JOIN 1', '/WHO', '/LIST',
  '/LEAVE', '/MAIN', 'UPLOAD file', 'DOWNLOAD 1', 'FIND 通信', 'SHOW P1 /1', 'Q', 'J MITI'];
const directoryErrors = ['0', '3', '99', '01', '1.0', '1 extra', 'READ 1', ...invalidReads, ...invalidSearches, ...unrelated];
const readingErrors = ['1', '2', '0', '99', ...invalidReads, ...invalidSearches, ...unrelated.filter((s) => !['WRITE', 'REPLY 1'].includes(s))];
const sourceUrls = [
  'https://iwparchives.jp/wp-content/themes/twentytwelve/bn/pdf/im199504-104-bbs.pdf',
  'https://iwparchives.jp/files/pdf/iwp1996/iwp1996-ch04-01-p110.pdf',
  'https://www2.biglobe.ne.jp/~nir/misc/fj-no-arukikata/',
  'https://www2.biglobe.ne.jp/~nir/misc/fj-no-arukikata/3.4.html',
  'https://ie.u-ryukyu.ac.jp/~kono/fj/fj.beginners/318.html',
  'https://www.paradisearmy.com/doujin/pasok3pc-van.htm',
];

function isolated(controller: PcvanController) {
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull();
  expect(controller.isConference).toBe(false); expect(controller.isOlt).toBe(false);
  expect(controller.needsContent).toBe(controller.netNewsContext !== null || controller.screen === 'netnews-directory');
}

for (const viaIndex of [false, true]) {
  test(`NetNews controller: all articles, searches, errors and ${viaIndex ? 'index' : 'direct'} returns`, () => {
    const controller = new PcvanController(), content = backupFixture();
    const original = structuredClone(content); controller.setContent(content); controller.setMemberId('human');
    const parent = viaIndex ? controller.submit('2').slice(1) : controller.welcome;
    const internet = controller.submit('7').slice(1);
    expect(internet.join('\n')).toContain('インターネット / サービス一覧\n1 NetNews');
    for (const isInternet of [true, false]) {
      const view = isInternet ? internet : controller.submit('1');
      const errors = isInternet ? ['2', ...directoryErrors] : directoryErrors;
      expect(controller.submit('LIST')).toEqual(view);
      expect(view.join('\n')).not.toMatch(/創作|再構成|https?:/);
      for (const invalid of errors) {
        expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
        expect(controller.submit('HELP')).toEqual(view); isolated(controller);
      }
    }
    const groups = controller.submit('HELP');
    for (const [groupIndex, group] of netNewsGroups.entries()) {
      expect(groups.join('\n')).toContain(`${groupIndex + 1} ${group.name}`);
      const list = controller.submit(String(groupIndex + 1));
      expect(list.join('\n')).toContain('記事一覧：3件');
      for (const article of group.articles) {
        expect(list.join('\n')).toContain(`#${article.number} Subject: ${article.subject}\n   From: ${article.from}`);
        const detail = controller.submit(`  read   ${article.number}  `);
        for (const header of [`Newsgroups: ${group.name}`, `Subject: ${article.subject}`, `From: ${article.from}`,
          `Date: ${article.date}`, `Message-ID: ${article.messageId}`, ...(article.references ? [`References: ${article.references}`] : [])]) {
          expect(detail).toContain(header);
        }
        expect(detail.join('\n')).toContain(article.body);
        expect(controller.submit('HELP')).toEqual(detail);
        expect(controller.submit(`READ ${article.number}`)).toEqual(detail);
        for (const invalid of readingErrors) {
          controller.submit(invalid); expect(controller.submit('HELP')).toEqual(detail); isolated(controller);
        }
        expect(controller.submit('BACK')).toEqual(list);
      }
      for (const invalid of readingErrors) {
        controller.submit(invalid); expect(controller.submit('HELP')).toEqual(list); isolated(controller);
      }
      const family = groupIndex === 0 ? '風枝' : '紙浦';
      const subject = groupIndex === 0 ? 'NetNews  はじめの質問' : '引用の範囲について質問';
      // Explicit expected numbers exercise full-corpus replacement and header-only matching.
      const searches: [string, string, string, number[]][] = [
        ['search subject 質問', 'Subject', '質問', [1, 2]],
        [`SEARCH FROM ${family}`, 'From', family, [1, 2]],
        ['SEARCH FROM NoTeS.ExAmPlE.InVaLiD', 'From', 'NoTeS.ExAmPlE.InVaLiD', [3]],
        ['SEARCH SUBJECT 記事', 'Subject', '記事', groupIndex === 0 ? [3] : []],
        ['SEARCH FROM 質問', 'From', '質問', []],
        [`SEARCH SUBJECT ${family}`, 'Subject', family, []],
        ['SEARCH SUBJECT 折り紙', 'Subject', '折り紙', []],
        ['SEARCH SUBJECT .*', 'Subject', '.*', []],
        ['SEARCH SUBJECT 質問 OR Subject', 'Subject', '質問 OR Subject', []],
        ['SEARCH SUBJECT <b>', 'Subject', '<b>', []],
        ['SEARCH SUBJECT 存在しない', 'Subject', '存在しない', []],
        ['SEARCH FROM letters.example.invalid', 'From', 'letters.example.invalid', [1, 2]],
        [`  SeArCh   SuBjEcT  ${subject}   `, 'Subject', subject, [1, 2]],
        ['SEARCH SUBJECT nEtNeWs', 'Subject', 'nEtNeWs', groupIndex === 0 ? [1, 2] : []],
        ['SEARCH SUBJECT NetNews はじめの質問', 'Subject', 'NetNews はじめの質問', []],
        ['SEARCH SUBJECT Subject', 'Subject', 'Subject', groupIndex === 1 ? [3] : []],
      ];
      for (const [input, field, query, numbers] of searches) {
        const filtered = controller.submit(input), text = filtered.join('\n');
        expect(text).toContain(`検索 ${field}: ${query}\n検索結果：${numbers.length}件`);
        expect(filtered.filter((line) => line.startsWith('#')).map((line) => Number(/^#(\d+)/.exec(line)![1]))).toEqual(numbers);
        expect(controller.submit('HELP')).toEqual(filtered);
        for (const invalid of readingErrors) {
          controller.submit(invalid); expect(controller.submit('HELP')).toEqual(filtered); isolated(controller);
        }
        for (const number of [1, 2, 3]) {
          const detail = controller.submit(`READ ${number}`);
          if (numbers.includes(number)) {
            expect(detail.join('\n')).toContain(group.articles[number - 1]!.body);
            expect(controller.submit('HELP')).toEqual(detail);
            expect(controller.submit('BACK')).toEqual(filtered);
          } else {
            expect(detail.join('\n')).toContain('現在の一覧にありません');
            expect(controller.submit('HELP')).toEqual(filtered);
          }
        }
      }
      const filtered = controller.submit(`SEARCH FROM ${family}`);
      for (const number of [2, 1, 2, 2]) controller.submit(`READ ${number}`);
      expect(controller.submit('BACK')).toEqual(filtered);
      controller.submit('READ 2'); expect(controller.submit('LIST')).toEqual(list);
      controller.submit('SEARCH SUBJECT 該当なし'); expect(controller.submit('LIST')).toEqual(list);
      controller.submit('READ 3');
      // Searching from a detail replaces its view; BACK goes to groups exactly once.
      controller.submit(`SEARCH FROM ${family}`);
      expect(controller.submit('BACK')).toEqual(groups);
    }
    expect(controller.submit('BACK')).toEqual(internet);
    expect(controller.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(controller.submit('BACK')).toEqual(controller.welcome);
    expect(content).toEqual(original);
  });
}

test('NetNews MAIN clears every depth and filter; visits cannot retain other service contexts', () => {
  const controller = new PcvanController(), other = new PcvanController();
  for (const path of [[], ['1'], ['1', '2'], ['1', '2', 'SEARCH FROM 紙浦'],
    ['1', '2', 'SEARCH FROM 紙浦', 'READ 2']]) {
    controller.submit('2'); controller.submit('7');
    for (const input of path) controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('7'); controller.submit('1');
    expect(controller.submit('1').join('\n')).toContain('記事一覧：3件');
    for (const screen of ['netnews-directory', 'internet-directory', 'main']) {
      controller.submit('BACK'); expect(controller.screen).toBe(screen); isolated(controller);
    }
  }
  for (const path of [['1', 'INBOX'], ['J MITI', '3', '9'],
    ...['MAIL', 'CONFERENCE', 'OLT', 'LIBRARY', 'OSL'].map((service) => ['13', '2', service])]) {
    for (const input of path) controller.submit(input);
    controller.submit('MAIN');
    for (const input of ['7', '1', '1', 'SEARCH SUBJECT 質問', 'READ 2']) { controller.submit(input); isolated(controller); }
    controller.submit('MAIN');
  }
  controller.submit('7'); controller.submit('1'); controller.submit('2'); controller.submit('SEARCH FROM 紙浦');
  expect(other.screen).toBe('main');
  other.submit('7'); other.submit('1'); expect(other.submit('1').join('\n')).toContain('記事一覧：3件');
});

test('NetNews corpus has fixed fictional headers and linked followups; About qualifies the evidence', () => {
  const articles = netNewsGroups.flatMap((group) => group.articles);
  expect(articles).toHaveLength(6);
  expect(new Set(articles.map((article) => article.from)).size).toBe(6);
  expect(new Set(articles.map((article) => article.messageId)).size).toBe(6);
  for (const group of netNewsGroups) {
    expect(group.articles.map((article) => article.number)).toEqual([1, 2, 3]);
    for (const article of group.articles) {
      expect(article.from).toMatch(/<[^<>]+@[^<>]+\.invalid>$/);
      expect(article.messageId).toMatch(/^<[^<>]+@[^<>]+\.invalid>$/);
      expect(article.date).toMatch(/0[4-7] Nov 1996 \d\d:\d\d:00 \+0900$/);
      if (article.references) expect(group.articles.some((parent) => parent.messageId === article.references)).toBe(true);
    }
  }
  const text = about(backupFixture()).join('\n');
  for (const detail of [...sourceUrls, '2026-10-24', 'NetNews', 'fj.questions.fj', 'fj.news.usage',
    '1996年1月', '読み書き', '2週間', 'Subject章', 'ページ画像', '個別グループ', '創作記事6件',
    '1996年11月4〜7日', '正規表現', '部分一致', '公開フォローアップ']) expect(text).toContain(detail);
});

for (const world of ['registered populated', 'registered empty', 'anonymous empty']) {
  test(`production NetNews preserves ${world} records and literal headers/body at 320px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [];
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:14373/')) remote.push(request.url()); });
    await start(page, world.startsWith('registered') ? 'ネットニュースを読む人' : undefined);
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
    const before = await snapshot(page), input = page.locator('#command'), output = page.locator('.output');
    async function invalids(lines: string[], reading = false) {
      for (const invalid of lines.filter((line) => line.length < 100)) {
        await command(page, invalid, !reading && /^(WRITE$|REPLY 1$)/.test(invalid) ? 'この画面では使えない'
          : reading && invalid === 'WRITE someone' ? 'WRITE / REPLY 番号'
          : reading && invalidSearches.includes(invalid) ? 'SEARCH SUBJECT'
            : reading && /^READ (?:4|999|9007199254740992)$/.test(invalid) ? '現在の一覧にありません'
              : 'この画面では使えない');
      }
      await noOtherUi(page);
    }
    for (const viaIndex of [false, true]) {
      if (viaIndex) await command(page, '2', '索引');
      await command(page, '7', 'インターネット / サービス一覧');
      await invalids(['2', ...directoryErrors]);
      await command(page, 'HELP', '1 NetNews');
      await command(page, 'LIST', 'サービス一覧');
      await command(page, '1', 'NetNews / グループ一覧');
      await invalids(directoryErrors);
      await command(page, 'HELP', '1 fj.questions.fj');
      for (const [index, group] of netNewsGroups.entries()) {
        await command(page, String(index + 1), `NetNews / ${group.name} / 記事一覧`);
        await invalids(readingErrors, true);
        await command(page, 'HELP', '記事一覧：3件');
        const family = index === 0 ? '風枝' : '紙浦';
        for (const [search, count, display] of [
          ['SEARCH SUBJECT 質問', 2, 'Subject: 質問'],
          [`SEARCH FROM ${family}`, 2, `From: ${family}`],
          ['SEARCH FROM NoTeS.ExAmPlE.InVaLiD', 1, 'From: NoTeS.ExAmPlE.InVaLiD'],
          ['SEARCH SUBJECT 折り紙', 0, 'Subject: 折り紙'],
          ['SEARCH SUBJECT <b>', 0, 'Subject: <b>'],
          ['  search   subject  nEtNeWs  はじめの質問   ', index === 0 ? 2 : 0, 'Subject: nEtNeWs  はじめの質問'],
        ] as const) {
          const result = await command(page, search, `検索結果：${count}件`);
          expect(result).toContain(`検索 ${display}`);
        }
        await command(page, `SEARCH FROM ${family}`, '検索結果：2件');
        await command(page, 'READ 3', '現在の一覧にありません');
        await command(page, 'READ 2', group.articles[1]!.body);
        await invalids(readingErrors, true);
        await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', group.articles[1]!.body);
        await command(page, 'ABOUT', '創作記事6件'); await command(page, 'BACK', group.articles[1]!.body);
        await command(page, 'BACK', `検索 From: ${family}`);
        await command(page, 'HELP', '検索結果：2件');
        await command(page, 'LIST', '記事一覧：3件');
        for (const article of group.articles) {
          // Enter during composition and the immediately following composing event cannot submit READ.
          await input.fill(`READ ${article.number}`);
          const transcript = await output.textContent();
          await input.dispatchEvent('compositionstart'); await input.press('Enter');
          expect(await output.textContent()).toBe(transcript);
          await input.dispatchEvent('compositionend');
          await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
          expect(await output.textContent()).toBe(transcript);
          await expect(input).toHaveValue(`READ ${article.number}`);
          const detail = await command(page, `read ${article.number}`, article.body);
          for (const header of [`Newsgroups: ${group.name}`, `Subject: ${article.subject}`, `From: ${article.from}`,
            `Date: ${article.date}`, `Message-ID: ${article.messageId}`, ...(article.references ? [`References: ${article.references}`] : [])]) expect(detail).toContain(header);
          await command(page, 'HELP', article.body);
          await command(page, 'LIST', '記事一覧：3件');
        }
        for (const number of [1, 3, 2, 2]) await command(page, `READ ${number}`, group.articles[number - 1]!.body);
        await command(page, 'BACK', '記事一覧：3件');
        await command(page, 'BACK', 'NetNews / グループ一覧');
      }
      await command(page, 'BACK', 'インターネット / サービス一覧');
      await command(page, 'BACK', viaIndex ? '索引' : 'ＰＣ－ＶＡＮ');
      if (viaIndex) await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    for (const depth of [0, 1, 2, 3]) {
      await command(page, '2', '索引'); await command(page, '7', 'サービス一覧');
      if (depth >= 1) await command(page, '1', 'グループ一覧');
      if (depth >= 2) { await command(page, '2', '記事一覧：3件'); await command(page, 'SEARCH SUBJECT 質問', '検索結果：2件'); }
      if (depth === 3) await command(page, 'READ 2', netNewsGroups[1]!.articles[1]!.body);
      await command(page, 'MAIN', 'ＰＣ－ＶＡＮ');
      await command(page, '7', 'サービス一覧'); await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    await command(page, '7', 'サービス一覧'); await command(page, '1', 'グループ一覧');
    await command(page, '1', '記事一覧：3件'); await command(page, 'READ 3', '<保存箱>');
    await expect(output.locator('保存箱, b, script, a')).toHaveCount(0);
    await command(page, 'HANDLE', 'ハンドル'); await command(page, 'BACK', '設定 / SETTINGS');
    await command(page, 'BACK', '<保存箱>');
    await command(page, 'STOP', 'モデルを解放'); await command(page, 'HELP', '<保存箱>');
    await input.fill('未送信の日本語'); const saved = await output.textContent();
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
    await modal.locator('.about-panel summary').click();
    for (const detail of ['創作記事6件', '2026-10-24', ...sourceUrls]) await expect(modal.locator('.settings-about')).toContainText(detail);
    await page.keyboard.press('Escape'); await expect(input).toBeFocused();
    await expect(input).toHaveValue('未送信の日本語'); expect(await output.textContent()).toBe(saved);
    const logRegion = page.getByRole('log');
    expect(await logRegion.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await input.press('Shift+Tab'); await logRegion.press('ArrowRight');
    await expect.poll(() => logRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await logRegion.press('Tab'); await expect(input).toBeFocused();
    const bounds = await input.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const group of netNewsGroups) for (const article of group.articles) {
      expect(log).toContain(article.body); expect(log).toContain(`Message-ID: ${article.messageId}`);
      expect(log).toContain(`From: ${article.from}`); expect(log).toContain(`Subject: ${article.subject}`);
      expect(log).toContain(`Date: ${article.date}`); expect(log).toContain(`Newsgroups: ${group.name}`);
      if (article.references) expect(log).toContain(`References: ${article.references}`);
    }
    expect(log).toContain('<保存箱>');
    const after = await snapshot(page), exported = await backup(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) {
      expect(after[key]).toEqual(before[key]); expect(exported[key]).toEqual(before[key]);
    }
    expect(after.session!.commandHistory).toContain('READ 3');
    for (const group of netNewsGroups) for (const article of group.articles) expect(JSON.stringify(exported)).not.toContain(article.body);
    expect(remote).toEqual([]); await noOtherUi(page);
  });
}

test('local NetNews attribution shares safe stable identities and calendar projection without altering bundled dates or stored records', () => {
  const data = backupFixture(); data.members.push({ id: '別の人🌌', handle: '人間', actor: 'human' });
  const now = '2026-10-24T02:00:00.000Z';
  data.settings.push({ id: 'historical-calendar', value: { version: 1, sourceAnchor: now } });
  const state = emptyNetNews();
  state.contributions = data.members.filter((m) => m.actor === 'human').map((m, i) => ({
    id: `draft-${i}`, group: netNewsGroups[i]!.name, number: 4, authorId: m.id, title: '同じ題', body: '  <b>本文</b>  ',
    createdAt: now, origin: 'local-human', messageId: localNetNewsMessageId(netNewsGroups[i]!.name, 4), references: [],
  }));
  state.nextNumbers = { 'fj.questions.fj': 5, 'fj.news.usage': 5 };
  data.settings.push({ id: 'netnews-local', value: state as never }); validateBackup(data);
  const before = structuredClone(data), groups = [netNewsGroup(data, 0), netNewsGroup(data, 1)];
  expect(groups[0]!.articles[3]!.from).not.toBe(groups[1]!.articles[3]!.from);
  for (const [i, group] of groups.entries()) {
    const row = state.contributions[i]!, member = data.members.find((m) => m.id === row.authorId)!;
    expect(group.articles.slice(0, 3)).toEqual(netNewsGroups[i]!.articles);
    expect(group.articles[3]!.from).toBe(`人間 <${identityToken(member).toLowerCase()}@members.example.invalid>`);
    expect(group.articles[3]!.date).toBe('Sat, 23 Nov 1996 11:00:00 +0900');
    const address = group.articles[3]!.from.slice(3);
    member.handle = '<i>新名</i>'; data.members.reverse();
    expect(netNewsGroup(data, i).articles[3]!.from).toBe(`<i>新名</i> ${address}`);
    member.handle = member.id;
    expect(netNewsGroup(data, i).articles[3]!.from).toBe(`名無し ${address}`);
    member.handle = '人間';
  }
  data.members = [...before.members]; expect(data).toEqual(before);
  // A legacy world containing only NetNews dates gets a deterministic anchor at
  // import/initialization; rendering does not advance it or rewrite UTC records.
  const onlyNews = { ...data, posts: [], mail: [], session: null, settings: data.settings.filter((s) => s.id === 'netnews-local') };
  expect(initialCalendar(onlyNews, '2030-01-01T00:00:00.000Z')).toEqual({ version: 1, sourceAnchor: now });
  expect(serviceDate('2026-10-24T02:00:01.000Z', calendarSetting(data), 'netnews')).toBe('Sat, 23 Nov 1996 11:00:01 +0900');
  expect(serviceDate('1997-01-01T00:00:00.000Z', calendarSetting(data), 'netnews')).toBe('Wed, 01 Jan 1997 09:00:00 +0900');
});
