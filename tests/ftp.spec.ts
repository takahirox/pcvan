import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { emptyOlt, appendOlt, OLT_SETTING } from '../src/olt-state';
import { emptyNetNews, localNetNewsMessageId } from '../src/netnews';
import { about } from '../src/settings';
import type { AiActivity, Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { backup, command, noOtherUi, restore, snapshot, start } from './terminal-helpers';

// Read the bundled source independently of the renderer/byte-count implementation.
const files = JSON.parse(await readFile(new URL('../data/pcvan/ftp-examples.json', import.meta.url), 'utf8')) as
  { filename: string; title: string; purpose: string; date: string; body: string }[];
const badNumbers = ['0', '-1', '01', '+1', '1.5', '1e0', 'NaN', 'Infinity', '3', '99',
  '9007199254740992', '9'.repeat(350), '1 extra'];
const invalid = ['READ', 'DOWNLOAD', ...badNumbers.flatMap((n) => [`READ ${n}`, `DOWNLOAD ${n}`]),
  'OPEN info.mac', 'WRITE', 'COMPOSE', 'REPLY 1', 'MAIL', 'INBOX', 'SENT', 'OLT', 'JOIN 1', '/JOIN 1',
  '/WHO', 'CONFERENCE', '1', '2', 'UPLOAD file'];
const protectedRecords = (data: Backup) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
  posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings });
async function enter(page: Page, viaIndex = false) {
  if (viaIndex) await command(page, '2', '索引');
  await command(page, '7', '3 FTP'); await command(page, '3', 'FTP / info.mac');
}
function isolated(nav: PcvanController | ConnectionController) {
  expect(nav.forum).toBeNull(); expect(nav.mailContext).toBeNull(); expect(nav.netNewsContext).toBeNull();
  expect(nav.isOlt).toBe(false); expect(nav.isConference).toBe(false);
  expect(nav.isTelnet).toBe(false); expect(nav.needsContent).toBe(false);
}
for (const viaIndex of [false, true]) {
  test(`FTP controller list/preview, pinned payload and exact ${viaIndex ? 'index' : 'MAIN'} returns`, () => {
    const nav = new PcvanController(), data = backupFixture(), original = structuredClone(data);
    nav.setContent(data); nav.setMemberId('human');
    expect(nav.selectDownload(1)).toBeNull();
    const parent = viaIndex ? nav.submit('2').slice(1) : nav.welcome;
    const internet = nav.submit('7').slice(1);
    expect(internet).toContain('1 NetNews'); expect(internet).toContain('2 TELNET'); expect(internet).toContain('3 FTP');
    expect(nav.selectDownload(1)).toBeNull();
    for (let visit = 0; visit < 3; visit++) {
      const list = nav.submit('3'); expect(list.join('\n')).toContain('同梱の創作');
      expect(list.filter((line) => line.startsWith('#'))).toHaveLength(2);
      for (const [index, file] of files.entries()) {
        for (const field of [file.filename, file.title, file.purpose, file.date, `${Buffer.byteLength(file.body)} bytes（UTF-8）`])
          expect(list.join('\n')).toContain(field);
        const preview = nav.submit(`READ ${index + 1}`);
        expect(preview.join('\n')).toContain(file.body);
        for (const field of [file.filename, file.title, file.purpose, file.date, `${Buffer.byteLength(file.body)} bytes（UTF-8）`])
          expect(preview.join('\n')).toContain(field);
        for (const view of [preview, list]) {
          if (view === list) expect(nav.submit('LIST')).toEqual(list);
          for (const input of invalid) {
            nav.submit(input); expect(nav.submit('HELP')).toEqual(view); isolated(nav);
          }
          for (const number of [0, -1, 1.5, NaN, Infinity, 3, 99, Number.MAX_SAFE_INTEGER + 1])
            expect(nav.selectDownload(number)).toBeNull();
          const selected = nav.selectDownload(index + 1)!;
          expect(selected.filename).toBe(file.filename); expect(selected.body).toBe(file.body);
          nav.submit(`READ ${2 - index}`); nav.submit('MAIN'); nav.submit('13'); nav.submit('2'); nav.submit('OSL'); nav.submit('1');
          expect(selected.returnTo()).toEqual(view); isolated(nav);
        }
        nav.submit(`READ ${index + 1}`); nav.submit(`READ ${2 - index}`);
        expect(nav.submit('BACK')).toEqual(list);
      }
      expect(nav.submit('BACK')).toEqual(internet);
    }
    expect(nav.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(nav.submit('BACK')).toEqual(nav.welcome);
    expect(data).toEqual(original);
  });
}
test('FTP MAIN at every depth clears the path and connection forwarding selects only eligible files', () => {
  const nav = new ConnectionController(); nav.completeConnection();
  for (const path of [[], ['READ 1'], ['READ 2']]) {
    for (const line of ['2', '7', '3', ...path]) nav.submit(line);
    expect(nav.selectDownload(2)?.body).toBe(files[1].body); isolated(nav);
    nav.submit('MAIN'); expect(nav.selectDownload(1)).toBeNull();
    nav.submit('7'); nav.submit('3'); expect(nav.submit('BACK')).toContain('3 FTP');
    expect(nav.submit('BACK').join('\n')).toContain('(MAIN)');
    nav.submit('7'); expect(nav.submit('1').join('\n')).toContain('NetNews / グループ一覧');
    nav.submit('BACK'); expect(nav.submit('2').join('\n')).toContain('TELNET');
    expect(nav.selectDownload(1)).toBeNull(); nav.submit('MAIN');
  }
});
test('FTP examples and About qualify authorship, scope and historical uncertainty', () => {
  expect(files).toHaveLength(2); expect(new Set(files.map((f) => f.filename)).size).toBe(2);
  for (const file of files) {
    expect(file.filename).toMatch(/^[A-Z]+\.TXT$/); expect(file.date <= '1996-11-30').toBe(true);
    expect(file.body).toContain(file.date); expect(file.body.endsWith('\n')).toBe(true);
    expect(file.body).toContain('\n\n'); expect(file.body).toContain('\n  '); expect(file.body).toContain(' & ');
  }
  const provenance = about(backupFixture()).join('\n');
  for (const text of ['FTP', 'info.mac', '1996年1月', '1996年11月', '推定', 'ASAHI', '再構成', '2026-10-24',
    'MACDOC.TXT', 'MACCOMM.TXT', 'im199504-104-bbs.pdf', 'iwp1996-ch04-01-p110.pdf', 'im199601-216-news.pdf',
    'https://info-mac.org/viewtopic.php?p=16139']) expect(provenance).toContain(text);
});

for (const handle of [undefined, '文書を読む人']) {
  test(`production FTP exact files, confirmation, protected world and 320px keyboard journey (${handle ?? 'anonymous empty'})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [], modelRequests: string[] = [], workers: string[] = [], downloads: Download[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url());
      if (/webllm|model-lib|params_shard/i.test(r.url())) modelRequests.push(r.url());
    });
    page.on('worker', (worker) => workers.push(worker.url()));
    await start(page, handle); const fixture = await snapshot(page);
    const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    if (!handle) {
      fixture.members = []; fixture.sigs = []; fixture.forums = []; fixture.posts = []; fixture.mail = []; fixture.readStates = [];
      fixture.settings = fixture.settings.filter((s) => !['daisizen-conference', 'active-human-member'].includes(s.id));
    } else {
      const human = fixture.members.find((m) => m.actor === 'human')!.id;
      fixture.mail = [{ id: 'ftp-protected-mail', number: 1, senderId: 'fictional-ai:hoshimori', recipientId: human,
        subject: '保持する便り', body: '  日本語\n\n<保持> & 記録\n', createdAt: '2026-10-23T01:00:00.000Z',
        origin: 'local-ai:webllm:test', readAt: '2026-10-23T02:00:00.000Z',
        simulation: { runId: 'ftp-protected-mail', simulatedAt: '2026-10-23T01:00:00.000Z', fictional: true } }];
      fixture.readStates = [{ memberId: human, forumId: fixture.posts[0]!.forumId, lastReadNumber: 1 }];
      const at = '2026-10-23T01:00:00.000Z', olt = emptyOlt(at), news = emptyNetNews();
      appendOlt(olt.rooms[0]!, human, 'say', '保持する会話', 'local-human', Date.parse(at));
      news.contributions.push({ id: 'ftp-protected-news', group: 'fj.questions.fj', number: 4, authorId: human,
        title: '保持する記事', body: '  <本文> & 記録\n', createdAt: at, origin: 'local-human',
        messageId: localNetNewsMessageId('fj.questions.fj', 4), references: [] });
      news.nextNumbers['fj.questions.fj'] = 5;
      fixture.settings.push({ id: OLT_SETTING, value: olt as never }, { id: 'netnews-local', value: news as never });
    }
    await restore(page, fixture); const before = await snapshot(page);
    const input = page.locator('#command'), output = page.locator('.output');
    page.on('download', (d) => downloads.push(d));
    await enter(page, !handle);
    for (const [index, file] of files.entries()) {
      // Both files are acquired once: first from preview, second from the list.
      await command(page, 'LIST', 'ファイル一覧：2件');
      for (const line of invalid.filter((s) => s.length < 100)) await command(page, line);
      await command(page, `READ ${index + 1}`, file.body);
      await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', file.body);
      await command(page, 'ABOUT', 'MACDOC.TXT'); await command(page, 'BACK', file.body);
      expect(await command(page, 'HELP', file.body)).toContain(`${Buffer.byteLength(file.body)} bytes（UTF-8）`);
      await expect(output.locator('note')).toHaveCount(0);
      for (const cancel of ['N', 'BACK', 'CANCEL', '.CANCEL']) {
        await command(page, `DOWNLOAD ${index + 1}`, 'Y: 取得');
        for (const line of ['', 'yes', 'Y extra', 'DOWNLOAD 1', 'READ 2', 'LIST', 'WRITE', 'IMPORT', 'RESET'])
          await command(page, line, 'Y / N');
        await command(page, cancel, 'ファイル取得を中止'); await command(page, 'HELP', file.body);
      }
      const returnText = index === 0 ? file.body : 'ファイル一覧：2件';
      if (index === 1) await command(page, 'LIST', returnText);
      await input.fill(`DOWNLOAD ${index + 1}`); await input.dispatchEvent('compositionstart'); await input.press('Enter');
      await expect(input).toHaveValue(`DOWNLOAD ${index + 1}`); expect(downloads).toHaveLength(index);
      await input.dispatchEvent('compositionend'); await command(page, `DOWNLOAD ${index + 1}`, 'Y: 取得');
      await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', 'Y: 取得');
      await command(page, 'ABOUT', 'MACCOMM.TXT'); await command(page, 'BACK', 'Y: 取得');
      await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
      await expect(input).toHaveValue('Y'); expect(downloads).toHaveLength(index); await input.dispatchEvent('compositionend');
      const transcript = await output.textContent();
      await page.getByRole('button', { name: '設定 / Options', exact: true }).click(); await page.keyboard.press('Escape');
      await expect(input).toHaveValue('Y'); expect(await output.textContent()).toBe(transcript);
      const downloading = page.waitForEvent('download');
      await input.evaluate((element) => {
        for (let n = 0; n < 3; n++) { (element as HTMLInputElement).value = 'Y'; (element as HTMLInputElement).form!.requestSubmit(); }
      });
      const download = await downloading;
      expect(download.suggestedFilename()).toBe(file.filename);
      expect(await readFile((await download.path())!)).toEqual(Buffer.from(file.body, 'utf8'));
      await command(page, 'HELP', returnText); expect(downloads).toHaveLength(index + 1);
      await expect(output).toContainText(`${file.filename} のダウンロードをブラウザーに依頼しました。`);
      await command(page, 'Y', 'この画面では使えない');
    }
    await command(page, 'BACK', '3 FTP'); await command(page, 'BACK', handle ? '(MAIN)' : '索引');
    if (!handle) await command(page, 'BACK', '(MAIN)');
    for (let visit = 0; visit < 2; visit++) {
      await enter(page); await command(page, 'READ 2', files[1].body);
      await command(page, 'BACK', 'ファイル一覧：2件'); await command(page, 'BACK', '3 FTP'); await command(page, 'BACK', '(MAIN)');
    }
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    await enter(page); await command(page, 'DOWNLOAD 2', 'Y: 取得'); await command(page, 'SETTINGS', '設定 / SETTINGS');
    const saved = await backup(page); expect(protectedRecords(saved)).toEqual(protectedRecords(before));
    for (const file of files) expect(JSON.stringify(saved)).not.toContain(JSON.stringify(file.body).slice(1, -1));
    expect(saved.session?.commandHistory).not.toContain('Y extra');
    await command(page, 'BACK', 'Y: 取得'); await command(page, 'MAIN', '(MAIN)');
    await enter(page); await command(page, 'Y', 'この画面では使えない'); expect(downloads).toHaveLength(3); // includes JSON backup
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const file of files) expect(log).toContain(file.body);
    const transcriptRegion = page.locator('.transcript');
    const bottom = await transcriptRegion.evaluate((element) => element.scrollTop);
    await input.press('PageUp');
    await expect.poll(() => transcriptRegion.evaluate((element) => element.scrollTop)).toBeLessThan(bottom);
    await input.press('PageDown'); await command(page, 'HELP', 'ファイル一覧：2件');
    const bounds = await input.boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
    await expect(input).toBeInViewport(); await expect(output.locator('b')).toHaveCount(0);
    await noOtherUi(page); expect(remote).toEqual([]); expect(modelRequests).toEqual([]); expect(workers).toEqual([]);
  });
}

test('production FTP handoff failure, reload, same-tab identical restore, cross-tab replacement and reset discard approval', async ({ page, context }) => {
  test.setTimeout(120_000);
  await start(page, '再確認する人'); const saved = await snapshot(page); await enter(page);
  const downloads: Download[] = []; page.on('download', (d) => downloads.push(d));
  await command(page, 'READ 2', files[1].body); await command(page, 'DOWNLOAD 1', 'Y: 取得');
  await page.evaluate(() => {
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = () => { throw new Error('test handoff failure'); };
    Object.assign(window, { restoreClick: () => { HTMLAnchorElement.prototype.click = click; } });
  });
  await command(page, 'Y', '開始できませんでした'); await command(page, 'HELP', files[1].body);
  await command(page, 'Y', 'この画面では使えない'); await expect(page.locator('a[download]')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { restoreClick(): void }).restoreClick());
  await command(page, 'DOWNLOAD 2', 'Y: 取得'); await page.reload();
  await command(page, 'Y', 'この画面では使えない');
  await enter(page); await command(page, 'DOWNLOAD 2', 'Y: 取得');
  // Export current content, then replace it with that exact JSON through modern Settings.
  const identical = await snapshot(page);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const storage = page.locator('.storage-panel');
  if (await storage.getAttribute('open') === null) await storage.locator('summary').click();
  const chooser = page.waitForEvent('filechooser'); await page.locator('.import-json').click();
  await (await chooser).setFiles({ name: 'same.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(identical)) });
  await page.locator('.confirm-action').click(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await command(page, 'Y', 'この画面では使えない'); await command(page, 'HELP', 'ファイル一覧：2件');
  await command(page, 'MAIN', '(MAIN)');
  const other = await context.newPage(); await other.goto('/'); await command(other, 'HELP', '(MAIN)');
  await enter(page); await command(page, 'DOWNLOAD 1', 'Y: 取得');
  const sameWorld = await snapshot(page); await restore(other, sameWorld);
  await expect.poll(() => page.locator('.output').textContent()).not.toContain('Y: 取得');
  await command(page, 'Y', 'この画面では使えない'); await command(page, 'HELP', '(MAIN)');
  await enter(page); await command(page, 'DOWNLOAD 2', 'Y: 取得');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  if (await storage.getAttribute('open') === null) await storage.locator('summary').click();
  await page.locator('.reset-world').click(); await page.locator('.confirm-action').click();
  await expect(page.locator('.output')).toContainText('初期状態');
  await command(page, 'SKIP', '登録を中止'); await command(page, 'Y', 'この画面では使えない');
  expect(downloads).toHaveLength(0);
  expect(saved.members.some((m) => m.actor === 'human')).toBe(true);
});
