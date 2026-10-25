import { oslState } from '../src/storage/schema';
import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import type { AiActivity, Backup } from '../src/storage/schema';
import { backupFixture, quietOltFixture } from './backup-fixture';
import { command, start, snapshot, restore, backup, noOtherUi } from './terminal-helpers';

const fixtures = JSON.parse(await readFile(new URL('../data/pcvan/daisizen-collections.json', import.meta.url), 'utf8')).OSL;
const invalid = ['DOWNLOAD', 'DOWNLOAD 0', 'DOWNLOAD 01', 'DOWNLOAD -1', 'DOWNLOAD 1.5', 'DOWNLOAD NaN',
  'DOWNLOAD Infinity', 'DOWNLOAD 9007199254740992', `DOWNLOAD ${'9'.repeat(350)}`, 'DOWNLOAD 2', 'DOWNLOAD 99', 'DOWNLOAD 1 extra'];

async function enter(page: Page, category = 1) {
  await command(page, '13', 'コミュニケーション'); await command(page, '2', 'DAISIZEN');
  await command(page, 'OSL', '1 ＳＩＧの道具箱'); await command(page, String(category), 'ファイル一覧');
}
const protectedRecords = (data: Backup) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
  posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings });

async function verifyDownload(download: Download, category: number) {
  const item = fixtures[String(category)][0];
  expect(download.suggestedFilename()).toBe(item.filename);
  expect(await readFile((await download.path())!)).toEqual(Buffer.from(item.body, 'utf8'));
}

test('OSL selection is scoped, validates safe numbers, pins payload and restores the exact parent stack', () => {
  const nav = new PcvanController();
  for (const path of [[], ['13'], ['2'], ['OSL'], ['1'], ['READ 1']]) {
    for (const line of path) nav.submit(line);
    const allowed = ['service-category', 'service-item'].includes(nav.screen);
    const view = nav.submit('HELP');
    expect(view.join('\n').includes('DOWNLOAD 番号')).toBe(allowed);
    expect(!!nav.selectDownload(1)).toBe(allowed);
    for (const number of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 2, 99]) {
      expect(nav.selectDownload(number)).toBeNull(); expect(nav.submit('HELP')).toEqual(view);
    }
  }
  const view = nav.submit('HELP'), file = nav.selectDownload(1)!;
  nav.submit('MAIN'); nav.submit('13'); nav.submit('2'); nav.submit('OSL'); nav.submit('2');
  expect(file.filename).toBe('NOTEINFO.TXT'); expect(file.body).toBe(fixtures['1'][0].body);
  expect(file.returnTo()).toEqual(view);
  expect(nav.submit('BACK').join('\n')).toContain('ファイル一覧：1件');
  expect(nav.submit('BACK').join('\n')).toContain('1 ＳＩＧの道具箱');
  for (const category of [3, 4, 5, 6]) {
    const empty = nav.submit(String(category)); expect(nav.selectDownload(1)).toBeNull();
    expect(nav.submit('HELP')).toEqual(empty); nav.submit('BACK');
  }
  nav.submit('BACK'); nav.submit('LIBRARY'); nav.submit('2'); nav.submit('READ 1');
  expect(nav.selectDownload(1)).toBeNull(); expect(nav.submit('HELP').join('\n')).not.toContain('DOWNLOAD');
});

for (const service of ['OSL', 'FTP']) {
test(`${service} command owner pins requests, consumes approval once, restores after failure and fences invalidation across awaits`, async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const downloads = await page.evaluate(async ({ fixture, invalid, service }) => {
    const cp = '/src/commands.ts', np = '/src/navigation.ts';
    const { TerminalCommands } = await import(cp);
    const { PcvanController } = await import(np) as typeof import('../src/navigation');
    const nav = new PcvanController(), prints: string[] = [], downloads: { body: string; filename: string }[] = [];
    let fail = false, readGate: Promise<void> | undefined;
    const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
    const forbidden = () => { throw new Error('another command owner was reached'); };
    const commands = new TerminalCommands({
      read: async () => { await readGate; return fixture; }, print: (...lines: string[]) => prints.push(...lines),
      repository: forbidden, destination: forbidden, reset: forbidden, restore: forbidden,
      ai: { stop: forbidden }, navigate: (line: string) => prints.push(...nav.submit(line)),
      selectDownload: (number: number) => nav.selectDownload(number),
      downloadFile: (body: string, filename: string) => {
        check(commands.recordsHistory, 'approval must be consumed before handoff');
        if (fail) throw new Error('test browser initiation failure');
        downloads.push({ body, filename });
      },
    });
    const submit = async (line: string) => {
      prints.length = 0;
      if (!await commands.submit(line)) prints.push(...nav.submit(line));
      return prints.join('\n');
    };
    const enter = (category = 1, preview = false) => {
      const path = service === 'OSL' ? ['13', '2', 'OSL', String(category)] : ['7', '3'];
      for (const line of ['MAIN', ...path, ...(preview ? [`READ ${service === 'FTP' ? category : 1}`] : [])]) nav.submit(line);
      return nav.submit('HELP').join('\n');
    };
    for (const preview of [false, true]) {
      const original = enter(1, preview);
      for (const line of invalid) {
        await submit(line); check(commands.recordsHistory, `invalid request installed approval: ${line}`);
        check(nav.submit('HELP').join('\n') === original, 'invalid request changed context');
      }
      await submit('  download   1  '); check(!commands.recordsHistory, 'pending approval entered history');
      const explanation = await submit('HELP');
      check(explanation.includes(service === 'OSL' ? 'NOTEINFO.TXT' : 'MACDOC.TXT') && explanation.includes('Y: 取得'), 'missing pinned explanation');
      for (const line of ['', 'yes', 'Y extra', 'DOWNLOAD 1', 'READ 1', '2', 'LIST', 'WRITE', 'IMPORT', 'RESET', 'STOP', 'HANDLE']) {
        await submit(line); check(!commands.recordsHistory, `escaped request: ${line}`);
        check(await submit('HELP') === explanation, 'selection or explanation changed');
      }
      check(downloads.length === (preview ? 1 : 0), 'non-acquisition initiated download');
      // An independent navigation change must not redirect payload or return path.
      enter(2, !preview);
      await Promise.all([submit('Y'), submit('Y'), submit('Y')]);
      check(nav.submit('HELP').join('\n') === original, 'handoff lost pinned return');
    }
    for (const cancel of ['N', 'BACK', 'CANCEL', '.CANCEL', 'MAIN']) {
      const original = enter(2, true); await submit('DOWNLOAD 1'); await submit(cancel);
      check(commands.recordsHistory, 'cancel retained approval');
      check(cancel === 'MAIN' ? nav.screen === 'main' : nav.submit('HELP').join('\n') === original, 'cancel lost return');
      await submit('Y'); check(downloads.length === 2, 'cancel reused approval');
    }
    enter(2); await submit(service === 'OSL' ? 'DOWNLOAD 1' : 'DOWNLOAD 2'); await submit('SETTINGS'); await submit('BACK');
    check((await submit('HELP')).includes(service === 'OSL' ? 'HARU96.CSV' : 'MACCOMM.TXT'), 'Settings lost pending selection');
    await submit('ABOUT'); await submit('BACK');
    check((await submit('HELP')).includes(service === 'OSL' ? 'HARU96.CSV' : 'MACCOMM.TXT'), 'About lost pending selection');
    await submit('Y'); check(downloads.length === 3, 'Settings/About caused or blocked handoff');
    const original = enter(1, true); await submit('DOWNLOAD 1'); fail = true;
    check((await submit('Y')).includes('開始できませんでした'), 'failure was not reported'); fail = false;
    check(nav.submit('HELP').join('\n') === original, 'failure lost return');
    await submit('Y'); check(downloads.length === 3, 'failed action reused approval');
    await submit('DOWNLOAD 1'); commands.invalidate(); await submit('Y');
    check(downloads.length === 3, 'invalidation reused approval');
    await submit('DOWNLOAD 1');
    let release!: () => void; readGate = new Promise<void>((resolve) => { release = resolve; });
    const approving = submit('Y'); commands.invalidate(); release(); await approving; readGate = undefined;
    check(downloads.length === 3, 'invalidation during read reused approval');
    await submit('DOWNLOAD 1'); await submit('SETTINGS'); await submit('MAIN'); await submit('Y');
    check(downloads.length === 3 && nav.screen === 'main', 'menu MAIN retained approval');
    return downloads;
  }, { fixture: backupFixture(), invalid: service === 'OSL' ? invalid : invalid.filter((line) => line !== 'DOWNLOAD 2'), service });
  const ftp = JSON.parse(await readFile(new URL('../data/pcvan/ftp-examples.json', import.meta.url), 'utf8'));
  expect(downloads.map((d) => d.filename)).toEqual(service === 'OSL' ? ['NOTEINFO.TXT', 'NOTEINFO.TXT', 'HARU96.CSV'] : ['MACDOC.TXT', 'MACDOC.TXT', 'MACCOMM.TXT']);
  for (const file of downloads) expect(file.body).toBe(service === 'OSL' ? fixtures[file.filename === 'NOTEINFO.TXT' ? '1' : '2'][0].body : ftp.find((item: { filename: string }) => item.filename === file.filename).body);
});
}

for (const handle of [undefined, '取得する人']) {
  test(`production OSL exact downloads, cancellation, IME, Settings and protected records at 320px (${handle ?? 'anonymous'})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [], downloads: Download[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url()); });
    await start(page, handle); const fixture = await snapshot(page);
    const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    quietOltFixture(fixture);
    if (!handle) {
      fixture.members = []; fixture.sigs = []; fixture.forums = []; fixture.posts = []; fixture.mail = []; fixture.readStates = [];
      fixture.settings = fixture.settings.filter((s) => !['daisizen-conference', 'active-human-member'].includes(s.id));
    } else {
      const human = fixture.members.find((m) => m.actor === 'human')!.id;
      const resident = fixture.members.find((m) => m.id === 'fictional-ai:hoshimori')!.id;
      fixture.mail = [{ id: 'protected-parent', number: 1, senderId: human, recipientId: resident,
        subject: '  保持する便り  ', body: '日本語\n\n  本文  ', createdAt: '2026-10-23T01:00:00.000Z', origin: 'local-human',
        recipientConfirmation: { at: '2026-10-23T02:00:00.000Z', replyMailId: 'protected-reply', provenance: 'local-resident-reply-v1' } },
      { id: 'protected-reply', number: 2, senderId: resident, recipientId: human, subject: '返信', body: '既読も保持',
        createdAt: '2026-10-23T02:00:00.000Z', origin: 'local-ai:webllm:test', replyToMailId: 'protected-parent',
        simulation: { runId: 'protected-reply', simulatedAt: '2026-10-23T01:30:00.000Z', fictional: true }, readAt: '2026-10-23T03:00:00.000Z' }];
      fixture.readStates = [{ memberId: human, forumId: fixture.posts[0]!.forumId, lastReadNumber: 1 }];
    }
    await restore(page, fixture);
    const before = await snapshot(page);
    page.on('download', (d) => downloads.push(d));
    await enter(page);
    const input = page.locator('#command'), output = page.locator('.output');
    for (const category of [1, 2]) {
      const item = fixtures[String(category)][0];
      if (category === 2) { await command(page, 'BACK', '1 ＳＩＧの道具箱'); await command(page, '2', 'ファイル一覧：1件'); }
      for (const line of invalid) await command(page, line, 'コマンド=');
      await command(page, 'LIST', 'ファイル一覧：1件');
      await command(page, 'READ 1', item.body);
      expect(await command(page, 'HELP', item.body)).toContain(`${Buffer.byteLength(item.body, 'utf8')} bytes（UTF-8）`);
      for (const cancel of ['N', 'BACK', 'CANCEL']) {
        await command(page, 'DOWNLOAD 1', 'Y: 取得');
        const help = await command(page, 'HELP', item.filename);
        expect(help).toContain(`${Buffer.byteLength(item.body, 'utf8')} bytes（UTF-8）`);
        for (const line of ['', 'Y extra', 'DOWNLOAD 2', 'READ 1', 'WRITE', 'IMPORT', 'RESET']) await command(page, line, 'Y / N');
        await command(page, cancel, 'ファイル取得を中止'); await command(page, 'HELP', item.body);
      }
      expect(downloads).toHaveLength(category - 1);
      const returnText = category === 1 ? item.body : 'ファイル一覧：1件';
      if (category === 2) await command(page, 'LIST', returnText);
      // Simulated native conversion Enter cannot submit acquisition or approval.
      await input.fill('DOWNLOAD 1'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
      await expect(input).toHaveValue('DOWNLOAD 1'); expect(downloads).toHaveLength(category - 1);
      await input.dispatchEvent('compositionend'); await command(page, 'DOWNLOAD 1', 'Y: 取得');
      await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', 'Y: 取得');
      await command(page, 'ABOUT', 'UTF-8（BOMなし、改行LF）'); await command(page, 'BACK', 'Y: 取得');
      await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
      await expect(input).toHaveValue('Y'); await input.dispatchEvent('compositionend');
      const transcript = await output.textContent();
      await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
      await expect(input).toHaveValue('Y'); expect(await output.textContent()).toBe(transcript);
      expect(downloads).toHaveLength(category - 1);
      const downloading = page.waitForEvent('download', { timeout: 10_000 });
      // Queue confirmations in one event-loop turn.
      await input.evaluate((element) => {
        for (let i = 0; i < 3; i++) {
          (element as HTMLInputElement).value = 'Y';
          (element as HTMLInputElement).form!.requestSubmit();
        }
      });
      await verifyDownload(await downloading, category);
      await command(page, 'HELP', returnText); expect(downloads).toHaveLength(category);
      await expect(output).toContainText(`${item.filename} のダウンロードをブラウザーに依頼しました。`);
      await command(page, 'Y', 'この画面では使えない');
      if (category === 1) await command(page, 'BACK', 'ファイル一覧：1件');
    }
    await command(page, 'BACK', '1 ＳＩＧの道具箱');
    for (const category of [3, 4, 5, 6]) {
      await command(page, String(category), 'まだファイルがありません');
      await command(page, 'DOWNLOAD 1', 'この画面では使えない'); await command(page, 'BACK', '1 ＳＩＧの道具箱');
    }
    await command(page, '1', 'ファイル一覧'); await command(page, 'DOWNLOAD 1', 'Y: 取得');
    await command(page, 'MAIN', 'MAIN'); await command(page, 'Y', 'この画面では使えない');
    await enter(page); await command(page, 'Y', 'この画面では使えない');
    await command(page, 'MAIN', 'MAIN'); await command(page, '13', 'コミュニケーション'); await command(page, '2', 'DAISIZEN');
    await command(page, 'LIBRARY', '自然の森'); await command(page, '2', '記事一覧');
    await command(page, 'READ 1', '朝の雨がやんだので'); await command(page, 'DOWNLOAD 1', 'この画面では使えない');
    await command(page, 'MAIN', 'MAIN'); await command(page, '7', 'インターネット');
    await command(page, 'DOWNLOAD 1', 'この画面では使えない');
    expect(downloads).toHaveLength(2); expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    // Pending approval and catalog text do not enter a real JSON backup.
    await command(page, 'MAIN', 'MAIN'); await enter(page); await command(page, 'DOWNLOAD 1', 'Y: 取得');
    await command(page, 'SETTINGS', '設定 / SETTINGS');
    const saved = await backup(page);
    expect(protectedRecords(saved)).toEqual(protectedRecords(before));
    for (const category of ['1', '2']) expect(JSON.stringify(saved)).not.toContain(JSON.stringify(fixtures[category][0].body).slice(1, -1));
    await command(page, 'BACK', 'Y: 取得'); await command(page, 'CANCEL', 'ファイル取得を中止');
    await command(page, 'DOWNLOAD 1', 'Y: 取得'); await command(page, 'SETTINGS', '設定 / SETTINGS');
    await command(page, '2', 'ハンドル設定'); await command(page, 'NEW', 'ハンドル名=');
    await command(page, 'MAIN', 'MAIN'); await command(page, 'Y', 'この画面では使えない');
    expect(downloads.filter((d) => ['NOTEINFO.TXT', 'HARU96.CSV'].includes(d.suggestedFilename()))).toHaveLength(2);
    const bounds = await input.boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
    await expect(input).toBeInViewport(); await expect(page.locator('.output b')).toHaveCount(0);
    await noOtherUi(page); expect(remote).toEqual([]);
  });
}

test('production synchronous browser failure, reload, modal restore and reset discard pending acquisition', async ({ page }) => {
  await start(page, '再確認する人'); const saved = await snapshot(page); await enter(page);
  const downloads: Download[] = []; page.on('download', (d) => downloads.push(d));
  await command(page, 'READ 1', fixtures['1'][0].body); await command(page, 'DOWNLOAD 1', 'Y: 取得');
  await page.evaluate(() => {
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { throw new Error('test browser handoff failure'); };
    Object.assign(window, { restoreClick: () => { HTMLAnchorElement.prototype.click = click; } });
  });
  await command(page, 'Y', 'ダウンロードを開始できませんでした');
  expect(await command(page, 'HELP', fixtures['1'][0].body)).toContain('テキストプレビュー');
  await command(page, 'Y', 'この画面では使えない'); expect(downloads).toHaveLength(0);
  await expect(page.locator('a[download]')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { restoreClick(): void }).restoreClick());
  await command(page, 'DOWNLOAD 1', 'Y: 取得'); await page.reload();
  await expect(page.locator('.output')).toContainText('MAIN'); await command(page, 'Y', 'この画面では使えない');
  await enter(page); await command(page, 'DOWNLOAD 1', 'Y: 取得');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const maintenance = page.locator('details').filter({ has: page.getByText('ローカルデータ・保守', { exact: true }) });
  await maintenance.locator('summary').click();
  const chooser = page.waitForEvent('filechooser'); await page.locator('.import-json').click();
  await (await chooser).setFiles({ name: 'world.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await page.locator('.confirm-action').click(); await expect(page.getByRole('dialog')).not.toBeVisible(); await command(page, 'Y', 'この画面では使えない');
  await command(page, 'DOWNLOAD 1', 'Y: 取得');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  if (await maintenance.getAttribute('open') === null) await maintenance.locator('summary').click();
  await page.locator('.reset-world').click(); await page.locator('.confirm-action').click();
  await expect(page.locator('.output')).toContainText('初期状態'); await command(page, 'SKIP', '登録を中止');
  await command(page, 'Y', 'この画面では使えない'); expect(downloads).toHaveLength(0);
});


for (const category of [1, 2]) {
  test(`production OSL category ${category}: register original text, review/edit, reload/restore and exact acquisition at 320px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url()); });
    await start(page); const fixture = await snapshot(page);
    const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    quietOltFixture(fixture);
    await restore(page, fixture);
    const protect = (data: Backup) => ({ ...protectedRecords(data), settings: data.settings.filter((s) => s.id !== 'osl-local') });
    const before = await snapshot(page);
    await enter(page, category); await command(page, 'REGISTER', '登録しますか'); await command(page, 'N', '登録を中止');
    expect(protect(await snapshot(page))).toEqual(protect(before));
    expect((await snapshot(page)).settings.some((s) => s.id === 'osl-local')).toBe(false);
    await command(page, 'REGISTER', '登録しますか'); await command(page, 'Y', 'ハンドル名=');
    await command(page, '記録する人', 'ファイル名='); await command(page, 'CANCEL', 'OSL 登録を中止');
    const registered = await snapshot(page);
    await command(page, 'REGISTER', 'ファイル名=');
    const input = page.locator('#command'), output = page.locator('.output');
    await input.fill(fixtures[String(category)][0].filename); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue(fixtures[String(category)][0].filename); await input.dispatchEvent('compositionend');
    await command(page, fixtures[String(category)][0].filename, 'タイトル=');
    await command(page, '  新しい観察文書  ', '用途='); await command(page, '  手元の記録  ', '本文を1行ずつ');
    const literal = '  日本語　ｶﾅ <b>本文</b>  ';
    await command(page, literal, '本文='); await command(page, '', '本文='); await command(page, '.TEXT MAIN', '本文=');
    await command(page, '.TEXT .END', '本文='); await command(page, '', '本文=');
    await command(page, 'BACK', '下書きは保持');
    const review = await command(page, '.END', 'このブラウザー内に登録しますか');
    expect(review).toContain(`分類：${category}`); expect(review).toContain('著者：記録する人 (SYN-');
    expect(review).toContain(`サイズ：${Buffer.byteLength(`${literal}\n\nMAIN\n.END\n`, 'utf8')} bytes（UTF-8）`);
    await command(page, 'MAIN', '下書きは保持'); await command(page, 'EDIT', 'FILENAME 名前');
    await command(page, 'TITLE   編集した題  ', 'タイトルを変更'); await command(page, 'PURPOSE   編集した用途  ', '登録情報を変更');
    await command(page, 'LINE 4   結び  ', '本文を変更'); await command(page, 'APPEND', '本文を1行ずつ');
    await command(page, '.TEXT SETTINGS', '本文='); await command(page, '', '本文='); await command(page, '.END', 'このブラウザー内に登録しますか');
    const expectedBody = `${literal}\n\nMAIN\n  結び  \n\nSETTINGS\n`;
    // A bundled-name collision preserves the complete editable draft.
    await command(page, 'Y', '再試行'); expect(oslState(await snapshot(page)).entries).toHaveLength(0);
    await command(page, 'EDIT', 'FILENAME 名前'); await command(page, `FILENAME ORIGINAL${category}.TXT`, '登録情報を変更');
    const editedReview = await command(page, 'REVIEW', 'このブラウザー内に登録しますか');
    expect(editedReview).toContain(`${Buffer.byteLength(expectedBody, 'utf8')} bytes（UTF-8）`);
    await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'ABOUT', '詳細・出自');
    await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '下書きは保持');
    await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue('Y'); expect(oslState(await snapshot(page)).entries).toHaveLength(0);
    await input.dispatchEvent('compositionend');
    const transcript = await output.textContent();
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
    await expect(input).toHaveValue('Y'); expect(await output.textContent()).toBe(transcript);
    await command(page, 'Y', 'OSL #2 をこのブラウザー内に登録しました');
    await command(page, 'Y', 'この画面では使えない');
    await command(page, 'LIST', 'ファイル一覧：2件');
    const read = await command(page, 'READ 2', expectedBody);
    expect(read).toContain('著者：記録する人 (SYN-'); expect(read).toContain('96年11月23日 11:00:00');
    expect(read).toContain(`サイズ：${Buffer.byteLength(expectedBody, 'utf8')} bytes（UTF-8）`);
    expect(await output.locator('b').count()).toBe(0);
    const saved = await backup(page), entry = oslState(saved).entries[0]!;
    expect(entry).toMatchObject({ category, number: 2, filename: `ORIGINAL${category}.TXT`, title: '  編集した題  ', purpose: '  編集した用途  ', body: expectedBody });
    expect(protect(saved)).toEqual(protect(registered));
    for (const privateInput of ['  新しい観察文書  ', '  手元の記録  ', literal, `FILENAME ORIGINAL${category}.TXT`, 'TITLE   編集した題  ', 'PURPOSE   編集した用途  '])
      expect(saved.session!.commandHistory).not.toContain(privateInput);
    const checkDownload = async () => {
      await command(page, 'DOWNLOAD 2', `${Buffer.byteLength(expectedBody, 'utf8')} bytes（UTF-8）`);
      await command(page, 'HELP', `ORIGINAL${category}.TXT`);
      const waiting = page.waitForEvent('download'); await command(page, 'Y', 'ブラウザーに依頼しました'); const download = await waiting;
      expect(download.suggestedFilename()).toBe(`ORIGINAL${category}.TXT`);
      expect(await readFile((await download.path())!)).toEqual(Buffer.from(expectedBody, 'utf8'));
    };
    await checkDownload(); await page.reload(); await page.locator('#command').press('Escape');
    await enter(page, category); await command(page, 'READ 2', expectedBody); await checkDownload();
    await restore(page, saved); await command(page, 'LIST', 'ファイル一覧：2件'); await command(page, 'READ 2', expectedBody); await checkDownload();
    expect(oslState(await snapshot(page)).entries).toEqual([entry]);
    const bounds = await input.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    const scrolling = await page.getByRole('log').evaluate((el) => ({ height: el.scrollHeight, visible: el.clientHeight, top: el.scrollTop }));
    expect(scrolling.height).toBeGreaterThan(scrolling.visible); expect(scrolling.top).toBeGreaterThan(0);
    await input.press('PageUp'); await expect.poll(() => page.getByRole('log').evaluate((el) => el.scrollTop)).toBeLessThan(scrolling.top);
    await input.press('PageDown');
    await noOtherUi(page); expect(remote).toEqual([]);
  });
}


test('production fresh cross-tab OSL selection and world replacement invalidate authored drafts and acquisition', async ({ page, context }) => {
  test.setTimeout(120_000);
  await start(page, '観察係'); const fixture = await snapshot(page);
  const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
  activity.maxPosts = 0; activity.consent = false;
  quietOltFixture(fixture);
  await restore(page, fixture);
  await enter(page, 3); await command(page, 'REGISTER', 'この画面では使えない');
  expect((await snapshot(page)).settings.some((s) => s.id === 'osl-local')).toBe(false);
  await command(page, 'BACK', '1 ＳＩＧの道具箱'); await command(page, '1', 'ファイル一覧：1件');
  const other = await context.newPage(); await other.goto('/'); await command(other, 'MAIN', 'ＰＣ－ＶＡＮ'); await enter(other);
  const register = async (filename: string, body: string, number: number) => {
    await command(other, 'REGISTER', 'ファイル名='); await command(other, filename, 'タイトル=');
    await command(other, '別タブの記録', '用途='); await command(other, '照合用', '本文を1行ずつ');
    await command(other, body, '本文='); await command(other, '.END', 'このブラウザー内に登録しますか');
    await command(other, 'Y', `OSL #${number} をこのブラウザー内に登録しました`);
  };
  await register('OTHER.TXT', '別タブ 日本語', 2);
  await command(page, 'READ 2', '別タブ 日本語'); await command(page, 'BACK', 'ファイル一覧：2件');
  await register('NEWER.TXT', 'まだ一覧にない本文', 3);
  // DOWNLOAD must read current storage even before another LIST/READ.
  await command(page, 'DOWNLOAD 3', 'NEWER.TXT'); const downloading = page.waitForEvent('download');
  await command(page, 'Y', 'ブラウザーに依頼しました'); const acquired = await downloading;
  expect(acquired.suggestedFilename()).toBe('NEWER.TXT');
  expect(await readFile((await acquired.path())!)).toEqual(Buffer.from('まだ一覧にない本文', 'utf8'));
  const saved = await snapshot(page);
  await command(page, 'LIST', 'ファイル一覧：3件'); await command(page, 'REGISTER', 'ファイル名=');
  await command(page, 'STALE.TXT', 'タイトル='); await command(page, '破棄する題', '用途=');
  await command(page, '破棄する用途', '本文を1行ずつ'); await command(page, '破棄する本文', '本文=');
  await command(page, '.END', 'このブラウザー内に登録しますか');
  // Same-tab Settings restore consumes a draft; later Y cannot publish it.
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await restore(page, saved);
  await command(page, 'Y', 'この画面では使えない'); expect(oslState(await snapshot(page)).entries).toHaveLength(2);
  await command(page, 'MAIN', 'ＰＣ－ＶＡＮ'); await enter(page); await command(page, 'REGISTER', 'ファイル名='); await command(page, 'SUSPEND.TXT', 'タイトル=');
  await restore(other, saved); // Broadcast replacement reloads the composing tab.
  await expect.poll(() => page.locator('.output').textContent()).not.toContain('SUSPEND.TXT');
  await command(page, 'MAIN', 'ＰＣ－ＶＡＮ'); await command(page, 'Y', 'この画面では使えない');
  expect(oslState(await snapshot(page)).entries).toHaveLength(2);
  await enter(page); await command(page, 'DOWNLOAD 2', 'OTHER.TXT');
  const downloads: string[] = []; page.on('download', (download) => downloads.push(download.suggestedFilename()));
  const empty = structuredClone(saved); empty.settings = empty.settings.filter((s) => s.id !== 'osl-local');
  await restore(other, empty);
  await expect.poll(() => page.locator('.output').textContent()).not.toContain('OTHER.TXT');
  await command(page, 'MAIN', 'ＰＣ－ＶＡＮ'); await command(page, 'Y', 'この画面では使えない');
  await enter(page); await command(page, 'LIST', 'ファイル一覧：1件'); await command(page, 'READ 2', 'その番号の項目はありません');
  expect(downloads).toEqual([]); expect((await snapshot(page)).settings.some((s) => s.id === 'osl-local')).toBe(false);
  await other.close();
});
