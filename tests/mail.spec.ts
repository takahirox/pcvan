import { expect, test } from '@playwright/test';
import { identityToken } from '../src/member-presentation';
import { renderPost } from '../src/forums';
import { command, start, snapshot, noOtherUi, backup, restore, settings } from './terminal-helpers';

async function compose(page: import('@playwright/test').Page, subject: string, body: string, to = 'hoshimori') {
  await command(page, `WRITE ${to}`, '件名='); await command(page, subject, '本文を1行ずつ');
  for (const line of body.split('\n')) await command(page, line, '本文=');
  await command(page, '.END', '送信しますか');
}

for (const route of [
  { name: 'MAIN 1', steps: ['1'], title: '電子メール', parent: 'ＰＣ－ＶＡＮ' },
  { name: 'MAIN X', steps: ['X'], title: '旧電子メール', parent: 'ＰＣ－ＶＡＮ' },
  { name: 'SIG MAIL', steps: ['13', '2', 'MAIL'], title: '電子メール', parent: '大自然' },
]) {
  test(`${route.name}: duplicate correspondents, stable-address send/edit, received reply, rename and reload/restore`, async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
    await start(page, '同名');
    const initial = await snapshot(page), human = initial.members.find((m) => m.actor === 'human')!;
    const residents = ['hoshimori', 'kusabue'].map((address) => initial.members.find((m) => m.id === `fictional-ai:${address}`)!);
    residents.forEach((m) => { m.handle = '同名'; });
    const labels = residents.map((m) => `(${identityToken(m)}) 同名`), humanToken = identityToken(human);
    expect(labels[0]).not.toBe(labels[1]);
    for (const member of [human, ...residents]) {
      expect(renderPost({ ...initial.posts[0]!, authorId: member.id }, '照合', undefined, initial.members)[1]).toContain(`(${identityToken(member)})`);
    }
    const createdAt = '2026-10-20T01:02:03.000Z';
    initial.mail = [{ id: 'incoming', number: 1, senderId: residents[0]!.id, recipientId: human.id,
      subject: '届いた便り', body: '  <b>受信本文</b>  \n\n　ｶﾅ  ', createdAt, origin: 'local-ai:webllm:fixture',
      simulation: { runId: 'incoming', simulatedAt: createdAt, fictional: true } }];
    await restore(page, initial);
    const enter = async () => {
      await command(page, 'MAIN', 'MAIN');
      for (const step of route.steps) await command(page, step, 'コマンド=');
      await expect(page.locator('.output')).toContainText(route.title);
    };
    await enter();
    const directory = await command(page, 'MEMBERS', '宛先一覧');
    expect(directory).toContain(`hoshimori / ${labels[0]}`); expect(directory).toContain(`kusabue / ${labels[1]}`);
    await command(page, 'WRITE 同名', '宛先が見つからないか重複');
    await command(page, '.CANCEL', 'メールを中止');
    // A display token is not another address mechanism.
    await command(page, `WRITE ${identityToken(residents[0])}`, '宛先が見つからないか重複');
    await command(page, '.CANCEL', 'メールを中止');
    for (const [index, address] of ['hoshimori', 'kusabue'].entries()) {
      expect(await command(page, `WRITE ${address}`, '件名=')).toContain(`MAIL / ${labels[index]}`);
      await command(page, `  同じ件名 ${index}  `, '本文を1行ずつ');
      await command(page, '  <b>本文</b>  ', '本文='); await command(page, '', '本文=');
      expect(await command(page, '.END', '送信しますか')).toContain(`宛先：${labels[index]}`);
      await command(page, 'EDIT', 'LINE 番号'); await command(page, 'LINE 1   編集した本文  ', '本文を変更');
      expect(await command(page, 'REVIEW', '送信しますか')).toContain(`宛先：${labels[index]}`);
      await command(page, 'Y', `メール #${index + 2} を送信`);
    }
    const sent = await command(page, 'SENT', 'メール一覧：2件');
    for (const [index, label] of labels.entries()) {
      expect(sent).toContain(`#${index + 2}   同じ件名 ${index}   / ${label} /`);
      const read = await command(page, `READ ${index + 2}`, '★内容');
      expect(read).toContain(`差出人：(${humanToken}) 同名`); expect(read).toContain(`宛先：${label}`);
      expect(read).toContain('  編集した本文  \n');
    }
    const beforeRead = await snapshot(page);
    expect(beforeRead.mail!.filter((m) => m.senderId === human.id).sort((a, b) => a.number - b.number).map((m) => m.recipientId)).toEqual(residents.map((m) => m.id));
    expect(beforeRead.mail!.filter((m) => m.senderId === human.id).every((m) => m.readAt === undefined)).toBe(true);
    expect(beforeRead.members).toEqual(initial.members.sort((a, b) => a.id < b.id ? -1 : 1));
    await command(page, 'INBOX', '[未読]');
    const received = await command(page, 'READ 1', '★内容');
    expect(received).toContain(`差出人：${labels[0]}`); expect(received).toContain(`宛先：(${humanToken}) 同名`);
    expect(received).toContain(initial.mail[0]!.body);
    await command(page, 'LIST', '[既読]');
    const afterRead = await snapshot(page);
    expect(afterRead.mail!.find((m) => m.id === 'incoming')).toEqual({ ...initial.mail[0], readAt: expect.any(String) });
    expect(afterRead.mail!.filter((m) => m.id !== 'incoming')).toEqual(beforeRead.mail!.filter((m) => m.id !== 'incoming'));
    expect(await command(page, 'REPLY 1', 'Re: 届いた便り')).toContain(`MAIL / ${labels[0]}`);
    await command(page, '  お返事  ', '本文=');
    expect(await command(page, '.END', '送信しますか')).toContain(`宛先：${labels[0]}`);
    await command(page, 'Y', 'メール #4 を送信');
    await command(page, 'SENT', 'RE#1');
    expect(await command(page, 'READ 4', '返信先：#1')).toContain(`宛先：${labels[0]}`);
    const saved = await backup(page);
    expect(saved.mail!.find((m) => m.number === 4)).toMatchObject({ senderId: human.id, recipientId: residents[0]!.id, replyToMailId: 'incoming', body: '  お返事  ' });
    // Rename both parties via existing product controls; mail records stay intact.
    await command(page, 'HANDLE', 'ハンドル設定'); await command(page, 'RENAME 人間の新名', 'ハンドル名を変更');
    await settings(page, 3); await command(page, 'RESIDENTS', '住人編集'); await command(page, '1', '住人の編集');
    await command(page, '1', 'handle='); await command(page, '住人の新名', '住人の編集');
    await command(page, 'SAVE', '住人の設定を保存'); await enter();
    const verify = async () => {
      const listing = await command(page, 'MEMBERS', '宛先一覧');
      expect(listing).toContain(`hoshimori / (${identityToken(residents[0])}) 住人の新名`);
      expect(listing).toContain(`kusabue / ${labels[1]}`);
      const list = await command(page, 'SENT', 'メール一覧：3件');
      expect(list).toContain(`(${identityToken(residents[0])}) 住人の新名`); expect(list).toContain(labels[1]);
      const detail = await command(page, 'READ 2', '★内容');
      expect(detail).toContain(`差出人：(${humanToken}) 人間の新名`);
      expect(detail).toContain(`宛先：(${identityToken(residents[0])}) 住人の新名`);
      await command(page, 'INBOX', '[既読]');
      const incoming = await command(page, 'READ 1', '★内容');
      expect(incoming).toContain(`差出人：(${identityToken(residents[0])}) 住人の新名`);
      expect(incoming).toContain(`宛先：(${humanToken}) 人間の新名`);
      expect((await snapshot(page)).mail).toEqual(saved.mail);
      await command(page, 'BACK', route.title); await command(page, 'BACK', route.parent);
    };
    await verify();
    const renamed = await backup(page);
    expect(renamed.posts).toEqual(initial.posts); expect(renamed.readStates).toEqual(initial.readStates);
    await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await enter(); await verify();
    await restore(page, { ...renamed, members: [...renamed.members].reverse() }); await enter(); await verify();
    await expect(page.locator('.output b')).toHaveCount(0); await noOtherUi(page); expect(external).toEqual([]);
  });
}

test('fresh visitor registers in mail, edits multiline Japanese with IME, retries quota and sees the same sent letter from all three routes', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await start(page);
  const resident = (await snapshot(page)).members.find((m) => m.id === 'fictional-ai:hoshimori')!;
  const correspondent = `(${identityToken(resident)}) 星守`;
  await command(page, '1', '電子メール'); await command(page, 'MEMBERS', `hoshimori / ${correspondent}`);
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
  await command(page, 'REVIEW', `宛先：${correspondent}`);
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
  await command(page, 'SENT', `#1 夜の便り / ${correspondent}`); await command(page, 'READ 1', '件名：夜の便り');
  const data = await snapshot(page);
  expect(data.mail).toHaveLength(1); expect(data.posts).toHaveLength(66); expect(data.members.filter((m) => m.actor === 'human')).toHaveLength(1);
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
  await command(page, 'RESET', '初期状態に戻しますか');
  await Promise.all([page.waitForEvent('load'), other.waitForEvent('load'), command(page, 'Y')]);
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await expect(other.locator('.output')).toContainText('MAIN');
  // Only one tab receives the shared welcome invitation; discard it if present.
  await command(other, 'SKIP'); await command(other, 'Y', 'この画面では使えない');
  expect((await snapshot(page)).mail).toEqual([]);
});
