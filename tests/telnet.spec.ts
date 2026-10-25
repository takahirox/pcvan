import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { remoteLetters, telnetAccount, telnetHost } from '../src/telnet';
import { about } from '../src/settings';
import type { AiActivity } from '../src/storage/schema';
import { backupFixture, quietOltFixture } from './backup-fixture';
import { backup, command, importFile, noOtherUi, restore, snapshot, start } from './terminal-helpers';

const open = `OPEN ${telnetHost}`;
const malformed = ['OPEN', 'OPEN ', 'OPEN other.example.invalid', `OPEN ${telnetHost}:23`,
  `OPEN ${telnetHost} extra`, 'OPEN 127.0.0.1', 'OPEN https://example.invalid', 'OPEN user@' + telnetHost];
const badReads = ['READ', 'READ 0', 'READ -1', 'READ 01', 'READ 1.5', 'READ +1', 'READ 1e0',
  'READ NaN', 'READ Infinity', 'READ 3', 'READ 999', 'READ 9007199254740992', `READ ${'9'.repeat(350)}`, 'READ 1 extra'];
const unrelated = ['WRITE', 'WRITE someone', 'COMPOSE', 'REPLY 1', 'INBOX', 'SENT', 'MEMBERS',
  'DOWNLOAD 1', 'OLT', 'JOIN 1', '/JOIN 1', '/WHO', '/LIST', '/LEAVE', '/MAIN', '/SETTINGS', '/HANDLE',
  'CONFERENCE', 'LIBRARY', 'OSL', 'Q', 'RECONNECT', 'J MITI', '1', '2', 'ls', 'exit'];
function isolated(controller: PcvanController | ConnectionController) {
  expect(controller.isTelnet).toBe(true);
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull(); expect(controller.netNewsContext).toBeNull();
  expect(controller.isConference).toBe(false); expect(controller.isOlt).toBe(false); expect(controller.needsContent).toBe(false);
  expect(controller.selectDownload(1)).toBeNull();
}
for (const viaIndex of [false, true]) {
  test(`TELNET controller complete journey and stable ${viaIndex ? 'index' : 'MAIN'} parents`, () => {
    const controller = new PcvanController(), data = backupFixture(), original = structuredClone(data);
    controller.setContent(data); controller.setMemberId('human');
    const parent = viaIndex ? controller.submit('2').slice(1) : controller.welcome;
    const internet = controller.submit('7').slice(1);
    expect(internet).toContain('1 NetNews'); expect(internet).toContain('2 TELNET');
    const directory = controller.submit('2');
    expect(directory).toContain(open); expect(directory.join('\n')).toContain('ローカルデモ');
    for (let visit = 0; visit < 2; visit++) {
      const shell = controller.submit(`  open   ${telnetHost.toUpperCase()}  `);
      expect(shell.join('\n')).toContain(`${telnetAccount}（自動デモログイン`); expect(shell.at(-1)).toBe('remote-demo$');
      const mailbox = controller.submit('MAIL');
      expect(mailbox.filter((line) => line.startsWith('#'))).toHaveLength(2);
      for (const letter of remoteLetters) {
        const detail = controller.submit(`read ${letter.number}`);
        expect(detail.join('\n')).toContain(letter.body);
        for (const field of [`From: ${letter.from}`, `Subject: ${letter.subject}`, `To: ${telnetAccount}`, `Date: ${letter.date}`]) expect(detail).toContain(field);
        for (const input of [...badReads, ...unrelated, ...malformed, open, 'MAIL']) {
          expect(controller.submit(input).join('\n')).toContain('このTELNETデモ画面では使えない');
          expect(controller.submit('HELP')).toEqual(detail); isolated(controller);
        }
        expect(controller.submit(`READ ${letter.number}`)).toEqual(detail);
        expect(controller.submit('BACK')).toEqual(mailbox);
        controller.submit(`READ ${letter.number}`); expect(controller.submit('LIST')).toEqual(mailbox);
      }
      for (const [view, errors] of [[mailbox, ['MAIL', ...unrelated, ...badReads]],
        [shell, ['LIST', 'READ 1', ...unrelated, ...badReads]]] as const) {
        if (view === shell) expect(controller.submit('BACK')).toEqual(shell);
        for (const input of errors) {
          controller.submit(input); expect(controller.submit('HELP')).toEqual(view); isolated(controller);
        }
      }
      expect(controller.submit('BACK')).toEqual(directory);
      for (const input of [...malformed, ...unrelated, ...badReads, 'MAIL', 'LOGOUT']) {
        controller.submit(input); expect(controller.submit('HELP')).toEqual(directory); isolated(controller);
      }
      expect(controller.submit('LIST')).toEqual(directory);
    }
    for (const depth of [0, 1, 2]) {
      controller.submit(open);
      if (depth >= 1) controller.submit('MAIL');
      if (depth === 2) { controller.submit('READ 2'); controller.submit('READ 1'); controller.submit('READ 2'); }
      expect(controller.submit('LOGOUT').join('\n')).toContain('PC-VANの接続は継続');
      expect(controller.submit('HELP')).toEqual(directory);
    }
    expect(controller.submit('BACK')).toEqual(internet);
    expect(controller.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(controller.submit('BACK')).toEqual(controller.welcome);
    expect(data).toEqual(original);
  });
}

test('TELNET MAIN clears every depth; other services and connections never retain remote state', () => {
  const controller = new ConnectionController(), other = new PcvanController();
  controller.completeConnection();
  for (const path of [[], [open], [open, 'MAIL'], [open, 'MAIL', 'READ 2']]) {
    for (const line of ['2', '7', '2', ...path]) controller.submit(line);
    isolated(controller); expect(other.isTelnet).toBe(false);
    expect(controller.submit('MAIN').join('\n')).toContain('(MAIN)');
    controller.submit('7'); controller.submit('2'); controller.submit(open);
    expect(controller.submit('MAIL').join('\n')).toContain('一覧：2通');
    for (const screen of ['telnet-shell', 'telnet-directory', 'internet-directory', 'main']) {
      controller.submit('BACK'); expect(controller.screen).toBe(screen);
    }
    controller.submit('7'); expect(controller.submit('1').join('\n')).toContain('NetNews / グループ一覧');
    controller.submit('MAIN');
  }
  for (const path of [['1', 'INBOX'], ['J MITI', '3', '9'],
    ...['MAIL', 'CONFERENCE', 'OLT', 'OSL'].map((service) => ['13', '2', service])]) {
    for (const line of path) controller.submit(line);
    controller.submit('MAIN');
    controller.submit('7');
    for (const line of ['2', open, 'MAIL', 'READ 1']) { controller.submit(line); isolated(controller); }
    controller.submit('MAIN');
  }
});

test('TELNET fiction and About disclose evidence, chronology and authored controls', () => {
  expect(remoteLetters.map((letter) => letter.number)).toEqual([1, 2]);
  for (const letter of remoteLetters) {
    expect(letter.from).toMatch(/<[^<>]+@[^<>]+\.invalid>$/);
    expect(letter.body.split('\n').length).toBeGreaterThanOrEqual(4);
  }
  const text = about(backupFixture()).join('\n');
  for (const detail of ['2026-10-24', '232頁', '1995年4月', '外向き', 'カテゴリーD', telnetHost,
    'PC-VAN電子メールとは別', '特定のUNIX', 'im199611-220-mail2.pdf']) expect(text).toContain(detail);
});

for (const world of ['anonymous empty', 'registered empty', 'registered populated']) {
  test(`production TELNET keyboard journey preserves ${world}, literal Japanese and input at 320px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const external: string[] = [], workers: string[] = [], popups: string[] = [], sockets: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:14373/') || /webllm|model/i.test(request.url())) external.push(request.url());
    });
    page.on('worker', (worker) => workers.push(worker.url())); page.on('popup', (popup) => popups.push(popup.url()));
    page.on('websocket', (socket) => sockets.push(socket.url()));
    await start(page, world.startsWith('registered') ? '遠くの手紙を読む人' : undefined);
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
    await restore(page, fixture);
    const before = await snapshot(page), input = page.locator('#command'), output = page.locator('.output');
    async function errors(lines: string[]) {
      for (const line of lines.filter((s) => s.length < 100)) await command(page, line, 'このTELNETデモ画面では使えない');
      await noOtherUi(page);
    }
    async function menus(expected: string) {
      await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', expected);
      await command(page, 'ABOUT', 'カテゴリーD'); await command(page, 'BACK', expected);
    }
    for (const viaIndex of [false, true]) {
      if (viaIndex) await command(page, '2', '索引');
      await command(page, '7', '2 TELNET'); await command(page, '2', open);
      await menus('TELNET / 接続先一覧'); await errors([...malformed, 'MAIL', 'LOGOUT', 'READ 1', 'WRITE', 'DOWNLOAD 1']);
      await command(page, 'LIST', open);
      await command(page, open, '自動デモログイン'); await command(page, 'HELP', 'remote-demo$');
      await menus('remote-demo$'); await errors(['LIST', 'READ 1', ...unrelated]);
      await command(page, 'MAIL', '一覧：2通'); await menus('一覧：2通'); await errors(['MAIL', ...badReads, ...unrelated]);
      for (const letter of remoteLetters) {
        await input.fill(`READ ${letter.number}`); const transcript = await output.textContent();
        await input.dispatchEvent('compositionstart'); await input.press('Enter');
        expect(await output.textContent()).toBe(transcript);
        await input.dispatchEvent('compositionend'); await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
        expect(await output.textContent()).toBe(transcript); await expect(input).toHaveValue(`READ ${letter.number}`);
        const detail = await command(page, `READ ${letter.number}`, letter.body);
        for (const field of [`From: ${letter.from}`, `Subject: ${letter.subject}`, `To: ${telnetAccount}`, `Date: ${letter.date}`]) expect(detail).toContain(field);
        await menus(letter.body); await errors(['MAIL', 'READ 3', 'READ 01', 'WRITE', 'REPLY 1', 'INBOX', 'DOWNLOAD 1', '/JOIN 1', 'Q']);
        await command(page, 'HELP', letter.body); await command(page, `READ ${letter.number}`, letter.body);
        await command(page, 'BACK', '一覧：2通');
        await command(page, `READ ${letter.number}`, letter.body); await command(page, 'LIST', '一覧：2通');
      }
      await command(page, 'BACK', 'remote-demo$'); await command(page, 'BACK', 'TELNET / 接続先一覧');
      for (const depth of [0, 1, 2]) {
        await command(page, open, '自動デモログイン');
        if (depth >= 1) await command(page, 'MAIL', '一覧：2通');
        if (depth === 2) for (const number of [2, 1, 2]) await command(page, `READ ${number}`, remoteLetters[number - 1]!.body);
        await command(page, 'LOGOUT', 'PC-VANの接続は継続'); await command(page, 'HELP', 'TELNET / 接続先一覧');
      }
      await command(page, 'BACK', 'インターネット / サービス一覧');
      await command(page, 'BACK', viaIndex ? '索引' : '(MAIN)');
      if (viaIndex) await command(page, 'BACK', '(MAIN)');
    }
    for (const path of [[], [open], [open, 'MAIL'], [open, 'MAIL', 'READ 2']]) {
      for (const line of ['2', '7', '2', ...path]) await command(page, line);
      await command(page, 'MAIN', '(MAIN)');
    }
    await command(page, '7', '1 NetNews'); await command(page, '1', 'NetNews / グループ一覧');
    await command(page, '1', '記事一覧：3件'); await command(page, 'MAIN', '(MAIN)');
    for (const line of ['7', '2', open, 'MAIL', 'READ 1']) await command(page, line);
    await command(page, 'HELP', remoteLetters[0].body);
    await command(page, 'HANDLE', 'ハンドル'); await command(page, 'BACK', '設定 / SETTINGS');
    await command(page, 'BACK', remoteLetters[0].body); await command(page, 'STOP', 'モデルを解放');
    await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, '3', 'モデル・活動・住人');
    await command(page, 'LOAD', 'Y: 実行'); await command(page, 'MAIL', 'Y / N');
    await command(page, 'N', '操作を中止'); await command(page, 'BACK', '設定 / SETTINGS');
    await command(page, 'BACK', remoteLetters[0].body);
    await command(page, 'RESET', '初期状態に戻しますか'); await command(page, 'MAIL', 'Y / N');
    await command(page, 'N', '操作を中止'); await command(page, 'HELP', remoteLetters[0].body);
    await importFile(page, fixture); await command(page, 'READ 2', 'Y / N'); await command(page, 'BACK', '操作を中止');
    await command(page, 'HELP', remoteLetters[0].body);
    await input.fill('未送信の日本語'); const saved = await output.textContent();
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
    await modal.locator('.about-panel summary').click();
    for (const detail of [telnetHost, '2026-10-24', 'im199611-220-mail2.pdf', 'カテゴリーD']) await expect(modal.locator('.settings-about')).toContainText(detail);
    await page.keyboard.press('Escape'); await expect(input).toBeFocused(); await expect(input).toHaveValue('未送信の日本語');
    expect(await output.textContent()).toBe(saved); await expect(output.locator('伝言板, b, script, a')).toHaveCount(0);
    const logRegion = page.getByRole('log');
    await input.press('Shift+Tab'); await logRegion.press('ArrowRight');
    await expect.poll(() => logRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await logRegion.press('Tab'); await expect(input).toBeFocused();
    const bounds = await input.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const letter of remoteLetters) { expect(log).toContain(letter.body); expect(log).toContain(`From: ${letter.from}`); }
    const after = await snapshot(page), exported = await backup(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) {
      expect(after[key]).toEqual(before[key]); expect(exported[key]).toEqual(before[key]);
    }
    expect(after.session!.lastLogoutAt).toBe(before.session!.lastLogoutAt);
    expect(after.session!.commandHistory).toContain('READ 1');
    for (const letter of remoteLetters) expect(JSON.stringify(exported)).not.toContain(letter.body);
    expect(JSON.stringify(exported.settings)).not.toContain(telnetHost);
    await page.reload(); await input.press('Escape'); await input.press('Escape');
    await command(page, 'HELP', '(MAIN)'); expect(await output.textContent()).not.toContain('自動デモログイン');
    await command(page, '7', '2 TELNET'); await command(page, '2', open);
    await command(page, 'READ 1', 'このTELNETデモ画面では使えない'); await noOtherUi(page);
    expect(external).toEqual([]); expect(workers).toEqual([]); expect(sockets).toEqual([]); expect(popups).toEqual([]);
    await expect(page.locator('link[rel=dns-prefetch], link[rel=preconnect]')).toHaveCount(0);
  });
}

test('confirmed restore and reset invalidate TELNET sessions and selections through existing safeguards', async ({ page }) => {
  await start(page, '復元する人'); const fixture = await snapshot(page);
  for (const line of ['7', '2', open, 'MAIL', 'READ 2']) await command(page, line);
  await command(page, 'HELP', remoteLetters[1].body);
  await restore(page, fixture); await command(page, 'HELP', '(MAIN)');
  await command(page, 'READ 2', 'この画面では使えない');
  for (const line of ['7', '2', open, 'MAIL', 'READ 1']) await command(page, line);
  await command(page, 'HELP', remoteLetters[0].body);
  await command(page, 'RESET', '初期状態に戻しますか');
  await command(page, 'LOGOUT', 'Y / N');
  await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました。');
  await page.locator('#command').press('Escape'); await page.locator('#command').press('Escape');
  await command(page, 'SKIP', '登録を中止'); await command(page, 'HELP', '(MAIN)');
  expect(await page.locator('.output').textContent()).not.toContain('自動デモログイン');
  for (const line of ['7', '2', open, 'MAIL']) await command(page, line);
  await command(page, 'HELP', '一覧：2通');
});

test('native restore failure retains TELNET selection; successful and cross-tab restores discard it', async ({ page, context }) => {
  await start(page, '設定から復元する人'); const fixture = await snapshot(page);
  for (const line of ['7', '2', open, 'MAIL', 'READ 2']) await command(page, line);
  await command(page, 'HELP', remoteLetters[1].body); await page.locator('#command').fill('未送信の行');
  async function choose() {
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    const storage = page.locator('.storage-panel');
    if (await storage.getAttribute('open') === null) await storage.locator('summary').click();
    const choosing = page.waitForEvent('filechooser'); await page.locator('.import-json').click();
    await (await choosing).setFiles({ name: 'world.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await expect(page.locator('.confirmation-copy')).toContainText('取り消せません');
  }
  await choose();
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restoreAdd: () => { IDBObjectStore.prototype.add = native; } });
  });
  await page.locator('.confirm-action').click(); await expect(page.locator('.settings-message')).toContainText('操作できません');
  await page.keyboard.press('Escape'); await expect(page.locator('#command')).toHaveValue('未送信の行');
  await page.evaluate(() => (window as unknown as { restoreAdd(): void }).restoreAdd());
  await command(page, 'HELP', remoteLetters[1].body);
  const after = await snapshot(page);
  for (const key of ['members', 'posts', 'mail', 'readStates', 'settings'] as const) expect(after[key]).toEqual(fixture[key]);
  await page.locator('#command').fill('READ 1'); await choose(); await page.locator('.confirm-action').click();
  await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page.locator('#command')).toHaveValue('');
  await command(page, 'HELP', '(MAIN)'); await command(page, 'READ 2', 'この画面では使えない');
  for (const line of ['7', '2', open, 'MAIL', 'READ 2']) await command(page, line);
  await command(page, 'HELP', remoteLetters[1].body);
  const other = await context.newPage(); await other.goto('/'); await command(other, 'HELP', '(MAIN)');
  await restore(other, fixture);
  await expect.poll(async () => page.locator('.output').textContent()).not.toContain('自動デモログイン');
  await command(page, 'HELP', '(MAIN)'); await command(page, 'READ 2', 'この画面では使えない');
});
