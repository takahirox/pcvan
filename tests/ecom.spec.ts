import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { EcomVisit, ecomLimits } from '../src/ecom';
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { emptyOlt, appendOlt, OLT_SETTING } from '../src/olt-state';
import { emptyNetNews, localNetNewsMessageId } from '../src/netnews';
import { about } from '../src/settings';
import type { AiActivity, Backup } from '../src/storage/schema';
import { backupFixture, quietOltFixture } from './backup-fixture';
import { backup, command, noOtherUi, restore, snapshot, start } from './terminal-helpers';

const recipient = '  空想 花子Ａｶﾅ <name> & Fiction  ';
const address = '  〒123 空想県こもれび町1-2 架空荘  ';
const letter = ['  日本語　ＡＢＣ abc ｶﾀｶﾅ <b>手紙</b> & 原文  ', '', 'MAIN', '.END', '.CANCEL', '最後の行  '];
const protectedRecords = (data: Backup) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
  posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings });
const invalid = ['WRITE', 'COMPOSE', 'REPLY 1', 'READ 1', 'INBOX', 'SENT', 'MEMBERS', 'JOIN 1', '/WHO',
  'CONFERENCE', 'OLT', 'MAIL', 'OPEN example.invalid', 'DOWNLOAD 1', 'J MITI', '3', 'yes', 'Y extra'];
function review(visit: EcomVisit, name = recipient) {
  for (const line of ['2', name, address, ...letter.map((s) => /^MAIN$|^\./.test(s) ? `.TEXT ${s}` : s)]) visit.submit(line);
  return visit.submit('.END');
}
function isolated(nav: PcvanController | ConnectionController) {
  expect(nav.forum).toBeNull(); expect(nav.mailContext).toBeNull(); expect(nav.netNewsContext).toBeNull();
  expect(nav.isOlt).toBe(false); expect(nav.isConference).toBe(false); expect(nav.isTelnet).toBe(false);
  expect(nav.needsContent).toBe(false); expect(nav.selectDownload(1)).toBeNull();
}
for (const viaIndex of [false, true]) test(`ECOM discoverability, isolation and actual ${viaIndex ? 'index' : 'MAIN'} parent`, () => {
  const nav = new PcvanController(), data = backupFixture(), original = structuredClone(data);
  nav.setContent(data); expect(nav.welcome.join('\n')).toContain('J ECOM');
  const parent = viaIndex ? nav.submit('2').slice(1) : nav.welcome;
  expect(parent.join('\n')).toContain('J ECOM');
  for (let visit = 0; visit < 2; visit++) {
    expect(nav.submit('J ECOM').join('\n')).toContain('1: サービス案内');
    for (const line of invalid) { expect(nav.submit(line).join('\n')).toContain('この画面では使えない'); isolated(nav); }
    expect(nav.submit('1').join('\n')).toContain('コンピューター');
    expect(nav.submit('RECEIPT').join('\n')).toContain('ありません');
    expect(nav.submit('BACK').join('\n')).toContain('2: 申込み');
    for (const line of ['2', recipient, address, '手紙', '.END', 'Y']) nav.submit(line);
    expect(nav.submit('RECEIPT')).toContain(recipient.replace(/^/, '宛名：'));
    expect(nav.submit('1').join('\n')).toContain('サービス案内');
    expect(nav.submit('RECEIPT').join('\n')).toContain('手紙');
    expect(nav.submit('E')).toEqual(parent); isolated(nav);
  }
  nav.submit('J ECOM'); expect(nav.submit('RECEIPT').join('\n')).toContain('ありません');
  nav.submit('1'); expect(nav.submit('MAIN')).toEqual(nav.welcome);
  nav.submit('J ECOM'); expect(nav.submit('Q').join('\n')).toContain('接続を終了');
  nav.submit('RECONNECT'); nav.submit('J ECOM'); expect(nav.submit('RECEIPT').join('\n')).toContain('ありません');
  expect(data).toEqual(original);
});

test('ECOM limits, literal input, every edit, cancellation and single-use reviewed approval', () => {
  const visit = new EcomVisit(); visit.submit('2');
  for (const field of ['name', 'address'] as const) {
    for (const value of ['', '  ', 'x'.repeat(ecomLimits[field] + 1), 'bad\nfield'])
      expect(visit.submit(value).join('\n')).toContain('入力は変更していません');
    expect(visit.submit('x'.repeat(ecomLimits[field])).join('\n')).toContain('下書きは保持');
  }
  visit.submit(''); const emptyBody = visit.submit('.END');
  expect(emptyBody).toContain('本文を続けて入力してください。本文=');
  expect(emptyBody.join('\n')).toContain('空白だけ');
  expect(visit.submit('x'.repeat(20001)).join('\n')).toContain('追加していません');
  visit.submit('x'.repeat(19999)); // initial blank line plus newline makes exactly 20000
  expect(visit.submit('.END').join('\n')).toContain('模擬受付しますか');
  visit.submit('EDIT'); expect(visit.submit('LINE 2 ' + 'x'.repeat(20000)).join('\n')).toContain('変更していません');
  for (const line of ['NAME ', 'NAME ' + 'x'.repeat(201), 'ADDRESS ', 'ADDRESS ' + 'x'.repeat(1001)])
    expect(visit.submit(line).join('\n')).toContain('変更していません');
  for (const line of ['LINE 99', 'DELETE 9007199254740992']) expect(visit.submit(line).join('\n')).toContain('その行はありません');
  visit.submit('DELETE 2'); expect(visit.submit('REVIEW').join('\n')).toContain('本文は空白だけ');
  visit.submit('NAME ' + recipient); visit.submit('ADDRESS ' + address); visit.submit('APPEND');
  for (const line of letter) visit.submit('.TEXT ' + line);
  const preview = visit.submit('.END');
  expect(preview).toContain('宛名：' + recipient); expect(preview).toContain('住所：' + address);
  expect(preview).toContain('\n' + letter.join('\n'));
  for (const line of ['', 'Y extra', 'yes', 'WRITE', 'BACK', 'MAIN', 'E', 'Q', 'SETTINGS', 'ABOUT', 'RESET', 'IMPORT', 'RECEIPT']) {
    expect(visit.submit(line).join('\n')).toContain('保持'); expect(visit.drafting).toBe(true);
  }
  visit.submit('EDIT'); visit.submit('LINE 2  edited 日本語  '); visit.submit('LINE 3'); visit.submit('DELETE 1');
  expect(visit.submit('Y').join('\n')).toContain('REVIEW'); // edits always require renewed review
  const changed = visit.submit('REVIEW'); expect(changed).toContain(' edited 日本語  \n\nMAIN\n.END\n.CANCEL\n最後の行  ');
  expect(visit.submit('Y').join('\n')).toContain('模擬受付が完了');
  for (let n = 0; n < 3; n++) expect(visit.submit('Y').join('\n')).toContain('この画面では使えない');
  const receipt = visit.submit('RECEIPT'); expect(receipt).toContain('宛名：' + recipient); expect(receipt).toContain('住所：' + address);
  visit.submit('1'); expect(visit.submit('RECEIPT')).toEqual(receipt);
  for (const stage of ['name', 'address', 'body', 'review', 'edit']) {
    visit.submit('2');
    if (stage !== 'name') visit.submit('中止する宛名');
    if (!['name', 'address'].includes(stage)) visit.submit('中止する住所');
    if (['review', 'edit'].includes(stage)) { visit.submit('本文'); visit.submit('.END'); }
    if (stage === 'edit') visit.submit('EDIT');
    expect(visit.submit('.CANCEL').join('\n')).toContain('中止しました'); expect(visit.submit('RECEIPT')).toEqual(receipt);
  }
  review(visit, '置換する架空宛名'); visit.submit('N'); expect(visit.submit('RECEIPT')).toEqual(receipt);
  review(visit, '置換する架空宛名'); visit.submit('Y');
  expect(visit.submit('RECEIPT').join('\n')).toContain('置換する架空宛名');
  expect(visit.submit('RECEIPT').join('\n')).not.toContain(recipient);
  visit.invalidate(); expect(visit.submit('RECEIPT').join('\n')).toContain('ありません');
  visit.submit('2'); visit.submit('.TEXT HELP'); visit.submit('.TEXT MAIN'); visit.submit('.TEXT .END');
  expect(visit.submit('.END')).toEqual(expect.arrayContaining(['宛名：HELP', '住所：MAIN', '.END']));
  visit.invalidate(); expect(visit.drafting).toBe(false); expect(visit.submit('Y').join('\n')).toContain('この画面では使えない');
});

async function enter(page: Page, viaIndex = false) {
  if (viaIndex) await command(page, '2', '索引');
  await command(page, 'J ECOM', 'ECOM / 電子郵便');
}
async function application(page: Page, name = recipient) {
  await command(page, '2', '宛名='); await command(page, name, '住所='); await command(page, address, '本文=');
  for (const line of letter) await command(page, '.TEXT ' + line, '本文=');
  await command(page, '.END', '模擬受付しますか');
}
async function modalRestore(page: Page, saved: Backup) {
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const storage = page.locator('.storage-panel');
  if (await storage.getAttribute('open') === null) await storage.locator('summary').click();
  const chooser = page.waitForEvent('filechooser'); await page.locator('.import-json').click();
  await (await chooser).setFiles({ name: 'same.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await page.locator('.confirm-action').click(); await expect(page.getByRole('dialog')).not.toBeVisible();
}

for (const handle of [undefined, '架空の手紙を書く人']) test(`production ECOM 320px keyboard journey and protected storage (${handle ?? 'anonymous restored-empty'})`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-10-24T02:00:00Z'));
  await page.setViewportSize({ width: 320, height: 640 });
  const remote: string[] = [], workers: string[] = [], popups: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url()); });
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
    fixture.mail = [{ id: 'ecom-protected-mail', number: 1, senderId: 'fictional-ai:hoshimori', recipientId: human,
      subject: '保持する便り', body: '  保持 <本文>\n\n', createdAt: '2026-10-23T01:00:00.000Z',
      origin: 'local-ai:webllm:test', readAt: '2026-10-23T02:00:00.000Z',
      simulation: { runId: 'ecom-protected-mail', simulatedAt: '2026-10-23T01:00:00.000Z', fictional: true } }];
    fixture.readStates = [{ memberId: human, forumId: fixture.posts[0]!.forumId, lastReadNumber: 1 }];
    const at = '2026-10-23T01:00:00.000Z', olt = emptyOlt(await page.evaluate(() => new Date().toISOString())), news = emptyNetNews();
    appendOlt(olt.rooms[0]!, human, 'say', '保持する会話', 'local-human', Date.parse(at));
    news.contributions.push({ id: 'ecom-protected-news', group: 'fj.questions.fj', number: 4, authorId: human,
      title: '保持する記事', body: '保持する本文', createdAt: at, origin: 'local-human',
      messageId: localNetNewsMessageId('fj.questions.fj', 4), references: [] }); news.nextNumbers['fj.questions.fj'] = 5;
    fixture.settings = fixture.settings.filter((s) => s.id !== OLT_SETTING);
    fixture.settings.push({ id: OLT_SETTING, value: olt as never }, { id: 'netnews-local', value: news as never });
  }
  await restore(page, fixture); const before = await snapshot(page);
  await enter(page, !handle); await command(page, '1', '印刷');
  for (const line of invalid) await command(page, line, 'この画面では使えない');
  await command(page, 'RECEIPT', 'ありません');
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', 'ECOM / サービス案内');
  await command(page, 'ABOUT', 'ECOM'); await command(page, 'BACK', 'ECOM / サービス案内');
  await command(page, '2', '宛名='); await command(page, '', '入力は変更していません');
  await command(page, 'x'.repeat(201), '入力は変更していません'); await command(page, recipient, '住所=');
  await command(page, 'x'.repeat(1001), '入力は変更していません'); await command(page, address, '本文=');
  await command(page, '.END', '空白だけ'); await command(page, 'x'.repeat(20001), '追加していません');
  const input = page.locator('#command'), output = page.locator('.output');
  for (const text of ['入力中の架空文章', 'Y']) {
    await input.fill(text); await input.press('ArrowUp'); await input.press('ArrowDown');
    await expect(input).toHaveValue(text); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue(text); await input.dispatchEvent('compositionend');
    const transcript = await output.textContent();
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    const panel = page.locator('.about-panel'); if (await panel.getAttribute('open') === null) await panel.locator('summary').click();
    await expect(page.locator('.settings-about')).toContainText('ECOM'); await page.keyboard.press('Escape');
    await expect(input).toHaveValue(text); expect(await output.textContent()).toBe(transcript);
  }
  for (const line of letter) await command(page, '.TEXT ' + line, '本文=');
  expect(await command(page, '.END', '模擬受付しますか')).toContain(letter.join('\n'));
  for (const line of ['', 'yes', 'Y extra', 'BACK', 'MAIN', 'HELP', 'J MITI', 'SETTINGS', 'ABOUT', 'IMPORT', 'RESET'])
    await command(page, line, '保持');
  await command(page, 'EDIT', 'NAME 文字'); await command(page, 'NAME 編集した架空宛名', '変更しました');
  await command(page, 'ADDRESS 編集した架空住所 123', '変更しました'); await command(page, 'LINE 1  編集した本文  ', '本文を変更');
  await command(page, 'Y', 'REVIEW'); const changed = await command(page, 'REVIEW', '模擬受付しますか');
  expect(changed).toContain('宛名：編集した架空宛名'); expect(changed).toContain('住所：編集した架空住所 123');
  // Exercise the same visible-page activity refresh as the minute timer, even in short runs.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await command(page, 'HELP', '保持');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('Y'); await input.dispatchEvent('compositionend');
  const transcript = await output.textContent();
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const storage = page.locator('.storage-panel');
  if (await storage.getAttribute('open') === null) await storage.locator('summary').click();
  const chooser = page.waitForEvent('filechooser'); await page.locator('.import-json').click();
  await (await chooser).setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('.settings-message')).toContainText('操作できません');
  await page.keyboard.press('Escape');
  await expect(input).toHaveValue('Y'); expect(await output.textContent()).toBe(transcript);
  await input.evaluate((el) => { for (let n = 0; n < 3; n++) { (el as HTMLInputElement).value = 'Y'; (el as HTMLInputElement).form!.requestSubmit(); } });
  await command(page, 'HELP', 'ECOM / 電子郵便');
  expect((await output.textContent())!.match(/ECOMの模擬受付が完了しました/g)).toHaveLength(1);
  const receipt = await command(page, 'RECEIPT', '最新模擬受付票');
  expect(receipt).toContain(' 編集した本文  \n\nMAIN\n.END\n.CANCEL\n最後の行  ');
  await command(page, '1', 'サービス案内'); expect(await command(page, 'RECEIPT', '最新模擬受付票')).toContain('編集した架空宛名');
  await application(page); await command(page, 'N', '申込みを中止');
  expect(await command(page, 'RECEIPT', '最新模擬受付票')).toContain('編集した架空宛名');
  await application(page, '置換後の架空宛名'); await command(page, 'Y', '模擬受付が完了');
  const latest = await command(page, 'RECEIPT', '最新模擬受付票'); expect(latest).toContain('置換後の架空宛名'); expect(latest).not.toContain('編集した架空宛名');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  const saved = await backup(page); expect(protectedRecords(saved)).toEqual(protectedRecords(before));
  for (const secret of [recipient, address, letter[0]!, '編集した架空宛名', '置換後の架空宛名', '入力中の架空文章'])
    expect(JSON.stringify(saved)).not.toContain(secret);
  expect(saved.session!.commandHistory).not.toContain('Y extra'); expect(saved.session!.commandHistory.filter((s) => s === 'Y')).toEqual(before.session!.commandHistory.filter((s) => s === 'Y'));
  const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
  const log = await readFile((await (await downloading).path())!, 'utf8'); expect(log).toContain(letter.join('\n'));
  await command(page, 'E', handle ? '(MAIN)' : '索引'); if (!handle) await command(page, 'BACK', '(MAIN)');
  await enter(page); await command(page, 'RECEIPT', 'ありません'); await command(page, 'Q', '接続を終了');
  await command(page, 'RECONNECT'); await command(page, 'J ECOM', 'ECOM / 電子郵便'); await command(page, 'RECEIPT', 'ありません');
  const bounds = await input.boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  await expect(input).toBeInViewport(); await expect(output.locator('b, name')).toHaveCount(0); await noOtherUi(page);
  expect(remote).toEqual([]); expect(workers).toEqual([]); expect(popups).toEqual([]);
});

test('production ECOM draft and receipt lifetime across identical restore, cross-tab replacement, reload, reset and queued departure', async ({ page, context }) => {
  test.setTimeout(120_000);
  await start(page, '復元を試す人');
  const fixture = await snapshot(page); const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
  activity.maxPosts = 0; activity.consent = false;
  quietOltFixture(fixture);
  await restore(page, fixture);
  await enter(page); await application(page); await command(page, 'Y', '模擬受付が完了');
  await application(page); await page.locator('#command').fill('Y');
  await modalRestore(page, await snapshot(page));
  await expect(page.locator('#command')).toHaveValue('');
  await command(page, 'Y', 'この画面では使えない'); await command(page, 'RECEIPT', 'ありません');
  await application(page); await command(page, 'Y', '模擬受付が完了'); await application(page);
  await page.reload(); await command(page, 'Y', 'この画面では使えない'); await enter(page); await command(page, 'RECEIPT', 'ありません');
  await application(page); await command(page, 'Y', '模擬受付が完了'); await application(page);
  const other = await context.newPage(); await other.goto('/'); await command(other, 'HELP', '(MAIN)');
  await restore(other, await snapshot(page));
  await expect.poll(() => page.locator('.output').textContent()).not.toContain('模擬受付しますか');
  await command(page, 'Y', 'この画面では使えない'); await enter(page); await command(page, 'RECEIPT', 'ありません');
  await application(page); await command(page, 'Y', '模擬受付が完了');
  const before = (await page.locator('.output').textContent())!.length;
  await page.locator('#command').evaluate((el) => {
    for (const line of ['E', 'J ECOM', '2', 'stale name', 'stale address', 'stale body', '.END', 'Y']) {
      (el as HTMLInputElement).value = line; (el as HTMLInputElement).form!.requestSubmit();
    }
  });
  await expect.poll(async () => (await page.locator('.output').textContent())!.slice(before)).toContain('(MAIN)');
  await command(page, 'HELP', '(MAIN)');
  expect((await page.locator('.output').textContent())!.slice(before)).not.toContain('> stale');
  await enter(page); await command(page, 'RECEIPT', 'ありません'); await application(page); await command(page, 'Y', '模擬受付が完了'); await application(page);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const storage = page.locator('.storage-panel'); if (await storage.getAttribute('open') === null) await storage.locator('summary').click();
  await page.locator('.reset-world').click(); await page.locator('.confirm-action').click();
  await expect(page.locator('.output')).toContainText('初期状態'); await command(page, 'SKIP', '登録を中止');
  await command(page, 'Y', 'この画面では使えない'); await enter(page); await command(page, 'RECEIPT', 'ありません');
});

test('ECOM About describes qualified evidence and reconstructed controls', () => {
  const text = about(backupFixture()).join('\n');
  for (const value of ['ECOM', '2026-10-24', '1996-01-31', '403', '101/106', '110/120', '1998-02-02', 'RECEIPT', '20000']) expect(text).toContain(value);
});
