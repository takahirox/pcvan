import { expect, test } from '@playwright/test';
import { command, start, snapshot, noOtherUi, backup, restore, settings } from './terminal-helpers';

async function compose(page: import('@playwright/test').Page, subject: string, body: string, to = 'hoshimori') {
  await command(page, `WRITE ${to}`, '件名='); await command(page, subject, '本文を1行ずつ');
  for (const line of body.split('\n')) await command(page, line, '本文=');
  await command(page, '.END', '送信しますか');
}

test('fresh visitor registers in mail, edits multiline Japanese with IME, retries quota and sees the same sent letter from all three routes', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await start(page); await command(page, '1', '電子メール'); await command(page, 'MEMBERS', 'hoshimori / 星守');
  await command(page, 'WRITE', 'メールにはハンドルが必要'); await command(page, 'Y', 'ハンドル名=');
  await command(page, '手紙を書く人', '宛先='); await command(page, 'unknown@host', '宛先が見つからない');
  await command(page, '星守', '件名=');
  const input = page.locator('#command');
  await input.fill('星の便り'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('星の便り'); expect((await snapshot(page)).mail).toEqual([]);
  await input.dispatchEvent('compositionend'); await input.press('Enter');
  await command(page, '  一行目　ｶﾅ <b>文字</b>  ', '本文='); await command(page, '', '本文=');
  await command(page, '.TEXT MAIN', '本文='); await command(page, '.END', '本文：3行');
  await command(page, 'BACK', '下書きは保持'); await command(page, 'EDIT', 'LINE 番号');
  await command(page, 'TITLE 夜の便り', '件名を変更'); await command(page, 'LINE 3 二行目を変更', '本文を変更');
  await command(page, 'REVIEW', '宛先：星守');
  await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  expect((await snapshot(page)).mail).toEqual([]); await input.dispatchEvent('compositionend');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'mail') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    }; Object.assign(window, { restoreMail: () => { IDBObjectStore.prototype.add = native; } });
  });
  await input.press('Enter'); await expect(page.locator('.output')).toContainText('メールを保存できませんでした。入力は残っています');
  expect((await snapshot(page)).mail).toEqual([]);
  await page.evaluate(() => (window as unknown as { restoreMail(): void }).restoreMail());
  await command(page, 'Y', 'メール #1 を送信しました'); await command(page, 'Y', 'この画面では使えない');
  await command(page, 'SENT', '#1 夜の便り / 星守'); await command(page, 'READ 1', '件名：夜の便り');
  const data = await snapshot(page);
  expect(data.mail).toHaveLength(1); expect(data.posts).toHaveLength(30); expect(data.members.filter((m) => m.actor === 'human')).toHaveLength(1);
  expect(data.mail![0]).toMatchObject({ subject: '夜の便り', body: '  一行目　ｶﾅ <b>文字</b>  \n\n二行目を変更', recipientId: 'fictional-ai:hoshimori', origin: 'local-human' });
  expect(data.session?.commandHistory).not.toContain('星の便り'); expect(data.session?.commandHistory).not.toContain('二行目を変更');
  await expect(page.locator('.output b')).toHaveCount(0); await noOtherUi(page);
  for (const route of [['X'], ['13', '2', 'MAIL']]) {
    await command(page, 'MAIN', 'MAIN'); for (const step of route) await command(page, step, 'コマンド=');
    await command(page, 'SENT', '#1 夜の便り'); await command(page, 'READ 1', '★内容');
  }
  expect(external).toEqual([]);
});

test('cancel at every mail stage, invalid commands and independent human projections never deliver accidentally', async ({ page }) => {
  await start(page, '一人目'); await command(page, '1', '電子メール');
  await command(page, 'WRITE', '宛先='); await command(page, '.CANCEL', 'メールを中止');
  await command(page, 'WRITE hoshimori', '件名='); await command(page, '.CANCEL', 'メールを中止');
  await command(page, 'WRITE hoshimori', '件名='); await command(page, '中止', '本文'); await command(page, '.CANCEL', 'メールを中止');
  await compose(page, '中止', '本文'); await command(page, 'N', 'メールを中止');
  await compose(page, '中止', '本文'); await command(page, 'EDIT', 'LINE 番号'); await command(page, '.CANCEL', 'メールを中止');
  expect((await snapshot(page)).mail).toEqual([]);
  await compose(page, '保存', '本文'); await command(page, '', 'Y / N / EDIT'); await command(page, 'Y', 'メール #1');
  await command(page, 'SENT', 'メール一覧：1件'); await command(page, 'REPLY 1', '受信したメールに返信');
  await command(page, 'READ 99', 'その番号のメールはこの箱にありません');
  await command(page, 'HANDLE', '一人目'); await command(page, 'NEW', 'ハンドル名='); await command(page, '二人目', '登録しました');
  await command(page, 'MAIN', 'MAIN'); await command(page, '1', '電子メール'); await command(page, 'SENT', 'メール一覧：0件');
  await command(page, 'READ 1', 'その番号のメールはこの箱にありません');
  expect((await snapshot(page)).mail).toHaveLength(1);
});

test('stored mail is usable without GPU, survives offline reload/backup/import and reset fences an open draft in another tab', async ({ page, context }) => {
  await start(page, 'オフライン便り'); await command(page, '1', '電子メール');
  await compose(page, '保存する便り', 'ネットなしでも読めます。'); await command(page, 'Y', 'メール #1');
  const saved = await backup(page); expect(saved.mail).toHaveLength(1);
  await settings(page, 5); await command(page, 'CACHE', '端末を保存しています');
  await expect(page.locator('.output')).toContainText('端末をオフライン用に保存済み');
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await context.setOffline(true); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await command(page, 'X', '旧電子メール'); await command(page, 'SENT', '保存する便り'); await command(page, 'READ 1', 'ネットなしでも読めます。');
  await restore(page, saved); expect((await snapshot(page)).mail).toEqual(saved.mail);
  await context.setOffline(false);
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await command(other, '1', '電子メール'); await compose(other, '古い下書き', '送信しません。');
  await command(page, 'RESET', '初期状態に戻しますか'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await expect(other.locator('.output')).toContainText('ハンドル名を登録しますか');
  await command(other, 'SKIP', '登録を中止'); await command(other, 'Y', 'この画面では使えない');
  expect((await snapshot(page)).mail).toEqual([]);
});
