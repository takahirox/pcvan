import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { publicationInstallments, publicationTitle } from '../src/publications';
import { about } from '../src/settings';
import { backupFixture, quietOltFixture } from './backup-fixture';
import type { AiActivity } from '../src/storage/schema';
import { command, start, snapshot, restore, backup, noOtherUi } from './terminal-helpers';

const malformed = ['READ', 'READ 0', 'READ -1', 'READ 01', 'READ 1.5', 'READ 1 extra', 'READ NaN',
  'READ Infinity', 'READ +1', 'READ 1e0', 'READ /1'];
const absent = ['READ 3', 'READ 999', 'READ 9007199254740992', `READ ${'9'.repeat(350)}`];
const unrelated = ['WRITE', 'REPLY 1', 'COMPOSE someone', 'WRITE someone', 'SEND text', 'INBOX', 'SENT',
  'MEMBERS', 'MAIL', 'LIBRARY', 'OSL', 'CONFERENCE', 'OLT', 'JOIN 1', '/JOIN 1', '/WHO', '/LIST',
  '/LEAVE', '/MAIN', 'UPLOAD file', 'DOWNLOAD 1', 'FIND 通信', 'SHOW P1 /1', 'Q', 'J MITI', 'BUY 1', 'PURCHASE 1', 'CONNECT', 'OPEN example.invalid'];
const directoryErrors = ['', '9'.repeat(350), '0', '2', '99', '01', '1.0', '1 extra', 'READ 1', ...malformed, ...unrelated];
const readingErrors = ['', '1', '0', '99', ...malformed, ...absent, ...unrelated];
const sourceUrls = [
  'https://www.jstage.jst.go.jp/article/jkg/43/3/43_KJ00002959297/_pdf/-char/ja',
  'https://paradisearmy.com/doujin/pasok3pc-van.htm',
  'https://www.vector.co.jp/soft/win95/net/se024554.html',
  'https://www.jipdec.or.jp/archives/publications/J0005030.pdf',
  'https://ascii.jp/elem/000/000/310/310653/',
];

function isolated(controller: PcvanController) {
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull();
  expect(controller.isConference).toBe(false); expect(controller.isOlt).toBe(false);
  expect(controller.needsContent).toBe(false);
  expect(controller.isTelnet).toBe(false);
  expect(controller.selectDownload(1)).toBeNull();
  expect(controller.selectDownload(2)).toBeNull();
}

for (const viaIndex of [false, true]) {
  test(`publishing controller reads all installments, rejects contextual errors and follows ${viaIndex ? 'index' : 'direct'} parents`, () => {
    const controller = new PcvanController(), content = backupFixture();
    const original = structuredClone(content); controller.setContent(content); controller.setMemberId('human');
    const parent = viaIndex ? controller.submit('2').slice(1) : controller.welcome;
    const directory = controller.submit('10').slice(1);
    expect(directory.join('\n')).toContain(`電子出版 / 刊行物一覧\n1 ${publicationTitle}`);
    expect(directory.join('\n')).not.toMatch(/再構成|https?:/);
    expect(controller.submit('LIST')).toEqual(directory);
    for (const invalid of directoryErrors) {
      expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
      expect(controller.submit('HELP')).toEqual(directory); isolated(controller);
    }
    const contents = controller.submit('1');
    expect(contents.join('\n')).toContain(`${publicationTitle} / 目次\n連載一覧：2件`);
    expect(controller.submit('LIST')).toEqual(contents);
    for (const [index, item] of publicationInstallments.entries()) {
      expect(contents.join('\n')).toContain(`#${index + 1} ${item.title}`);
      const installment = controller.submit(`  read   ${index + 1}  `);
      expect(installment.join('\n')).toContain(item.body);
      expect(controller.submit('HELP')).toEqual(installment);
      expect(controller.submit(`READ ${index + 1}`)).toEqual(installment);
      for (const view of [installment, contents]) {
        for (const invalid of readingErrors) {
          expect(controller.submit(invalid).join('\n')).toMatch(/この画面では使えない|その番号の連載はありません/);
          expect(controller.submit('HELP')).toEqual(view); isolated(controller);
        }
        if (view === installment) expect(controller.submit('BACK')).toEqual(contents);
      }
      controller.submit(`READ ${index + 1}`);
      expect(controller.submit('LIST')).toEqual(contents);
    }
    // Replacing and repeating details must leave exactly one contents parent.
    for (const number of [1, 2, 2, 1]) controller.submit(`READ ${number}`);
    expect(controller.submit('BACK')).toEqual(contents);
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.submit('1')).toEqual(contents);
    controller.submit('READ 2'); controller.submit('BACK'); controller.submit('BACK');
    expect(controller.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(controller.submit('BACK')).toEqual(controller.welcome);
    expect(content).toEqual(original);
  });
}

test('MAIN clears every publishing depth; visits and service contexts cannot retain stale paths', () => {
  const controller = new PcvanController(), other = new PcvanController();
  for (const path of [[], ['1'], ['1', 'READ 2']]) {
    controller.submit('2'); controller.submit('10');
    for (const input of path) controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('10'); isolated(controller);
    controller.submit('1'); expect(controller.screen).toBe('publication-contents');
    controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(controller.welcome);
  }
  for (const path of [['1', 'INBOX'], ['J MITI', '3', '9'], ['3', '1', 'READ 1'],
    ['5', '1', 'READ 1'], ['7', '3', 'READ 1'], ['7', '2'],
    ...['MAIL', 'CONFERENCE', 'OLT', 'LIBRARY', 'OSL'].map((service) => ['13', '2', service])]) {
    for (const input of path) controller.submit(input);
    controller.submit('MAIN');
    for (const input of ['10', '1', 'READ 2']) { controller.submit(input); isolated(controller); }
    controller.submit('MAIN');
  }
  controller.submit('10'); controller.submit('1'); controller.submit('READ 2');
  expect(other.screen).toBe('main');
  other.submit('10'); other.submit('1'); expect(other.screen).toBe('publication-contents');
});

test('About qualifies publishing evidence, fiction and uncertain Journal relationship', () => {
  const text = about(backupFixture()).join('\n');
  for (const detail of [...sourceUrls, '2026-10-24', publicationTitle, '1993年3月', '232頁',
    '中程度', 'カテゴリーD', 'PC-VAN Journal', '同一とは確認できません',
    'タイムアウト', '取得失敗', 'READ 1 / READ 2']) expect(text).toContain(detail);
});

for (const world of ['registered populated', 'registered empty', 'anonymous populated']) {
  test(`production publishing journey preserves ${world} records and literal text at 320px`, async ({ page }) => {
    // This exhaustive journey shares the long NetNews journey's budget under worker contention.
    test.setTimeout(90_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [], downloads: string[] = [];
    page.on('download', (download) => downloads.push(download.suggestedFilename()));
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:14373/')) remote.push(request.url()); });
    await start(page, world.startsWith('registered') ? '連載を読む人' : undefined);
    const fixture = await snapshot(page);
    const activity = fixture.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    quietOltFixture(fixture);
    if (world.endsWith('empty')) {
      fixture.members = fixture.members.filter((member) => member.actor === 'human');
      fixture.sigs = []; fixture.forums = []; fixture.posts = []; fixture.mail = []; fixture.readStates = [];
      fixture.settings.find((row) => row.id === 'daisizen-conference')!.value =
        { version: 1, conferenceId: 'DAISIZEN', nextNumber: 1, contributions: [] };
    }
    const human = fixture.members.find((member) => member.actor === 'human');
    if (world.endsWith('populated') && human) {
      fixture.mail.push({ id: 'protected-publishing-mail', number: 100, senderId: human.id,
        internetAddress: 'reader@example.invalid', subject: '保持する私信', body: '出版閲覧で変更しない',
        createdAt: '2026-10-24T01:00:00.000Z', origin: 'local-human' });
      fixture.readStates.push({ memberId: human.id, forumId: fixture.forums[0]!.id, lastReadNumber: 1 });
    }
    await restore(page, fixture);
    const before = await snapshot(page);
    const input = page.locator('#command'), output = page.locator('.output');
    async function invalids(lines: string[]) {
      for (const invalid of lines) {
        if (!invalid) { await command(page, invalid); continue; }
        await command(page, invalid, /^(WRITE$|REPLY 1$)/.test(invalid) ? '投稿先の掲示板'
          : absent.includes(invalid) ? 'その番号の連載はありません' : 'この画面では使えない');
      }
    }
    for (const viaIndex of [false, true]) {
      if (viaIndex) await command(page, '2', '索引');
      await command(page, '10', '電子出版 / 刊行物一覧');
      await command(page, 'HELP', '1 架空文芸誌「灯窓」');
      await command(page, 'LIST', '電子出版 / 刊行物一覧');
      await invalids(directoryErrors);
      await command(page, 'HELP', '電子出版 / 刊行物一覧');
      await command(page, '1', '架空文芸誌「灯窓」 / 目次');
      await command(page, 'LIST', '連載一覧：2件');
      await invalids(readingErrors.filter((line) => line.length < 100));
      await command(page, 'HELP', '架空文芸誌「灯窓」 / 目次');
      for (const [index, installment] of publicationInstallments.entries()) {
        // Enter during and immediately after composition cannot submit READ.
        await input.fill(`READ ${index + 1}`);
        const transcript = await output.textContent();
        await input.dispatchEvent('compositionstart'); await input.press('Enter');
        expect(await output.textContent()).toBe(transcript);
        await input.dispatchEvent('compositionend');
        await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
        expect(await output.textContent()).toBe(transcript);
        await expect(input).toHaveValue(`READ ${index + 1}`);
        await command(page, `read ${index + 1}`, installment.body);
        await command(page, 'HELP', installment.body);
        await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', installment.body);
        await command(page, 'ABOUT', '架空文芸誌「灯窓」'); await command(page, 'BACK', installment.body);
        await command(page, 'LIST', '架空文芸誌「灯窓」 / 目次');
      }
      // Another READ replaces the detail; errors cannot change it or start a composer/room.
      for (const number of [1, 2, 2]) await command(page, `READ ${number}`, publicationInstallments[number - 1]!.body);
      await invalids(readingErrors.filter((line) => line.length < 100));
      await command(page, 'HELP', publicationInstallments[1]!.body);
      await expect(output.locator('連絡待ち, b, script, a')).toHaveCount(0);
      await command(page, 'HANDLE', 'ハンドル'); await command(page, 'BACK', '設定 / SETTINGS');
      await command(page, 'BACK', publicationInstallments[1]!.body);
      await command(page, 'STOP', 'モデルを解放');
      await command(page, 'HELP', publicationInstallments[1]!.body);
      await input.fill('未送信の日本語');
      const saved = await output.textContent();
      await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
      const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
      await modal.locator('.about-panel summary').click();
      for (const detail of ['架空文芸誌「灯窓」', '2026-10-24', ...sourceUrls]) await expect(modal.locator('.settings-about')).toContainText(detail);
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
      await command(page, 'BACK', '架空文芸誌「灯窓」 / 目次');
      await command(page, 'BACK', '電子出版 / 刊行物一覧');
      await command(page, '1', '架空文芸誌「灯窓」 / 目次');
      await command(page, 'BACK', '電子出版 / 刊行物一覧');
      await command(page, 'BACK', viaIndex ? '索引' : 'ＰＣ－ＶＡＮ');
      if (viaIndex) await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    for (const depth of [0, 1, 2]) {
      await command(page, '2', '索引'); await command(page, '10', '電子出版 / 刊行物一覧');
      if (depth >= 1) await command(page, '1', '架空文芸誌「灯窓」 / 目次');
      if (depth === 2) await command(page, 'READ 1', publicationInstallments[0]!.body);
      await command(page, 'MAIN', 'ＰＣ－ＶＡＮ');
      // A different entry parent on the next visit must have no stale detail/path.
      await command(page, '10', '電子出版 / 刊行物一覧'); await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const installment of publicationInstallments) expect(log).toContain(installment.body);
    expect(log).toContain('<連絡待ち>');
    const after = await snapshot(page), exported = await backup(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) {
      expect(after[key]).toEqual(before[key]); expect(exported[key]).toEqual(before[key]);
    }
    expect(after.session!.commandHistory).toContain('READ 1');
    for (const installment of publicationInstallments) expect(JSON.stringify(exported)).not.toContain(installment.body.split('\n')[0]!);
    expect(JSON.stringify(exported)).not.toContain(publicationTitle);
    expect(downloads).toHaveLength(2);
    expect(remote).toEqual([]); await noOtherUi(page);
  });
}
