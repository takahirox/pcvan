import { serviceDate, calendarSetting } from '../src/calendar';
import { expect, test } from '@playwright/test';
import { PcvanController } from '../src/navigation';
import { conferenceState, starterConference } from '../src/conference';
import { backupFixture } from './backup-fixture';
import { command, start, post, snapshot, backup, restore, noOtherUi } from './terminal-helpers';
import type { Page } from '@playwright/test';

async function enter(page: Page) {
  await command(page, '13', 'コミュニケーション');
  await command(page, '2', 'DAISIZEN');
  await command(page, 'CONFERENCE', '電子会議室');
}

test('conference controller reads retained contributions and keeps list context isolated from all other services', () => {
  const controller = new PcvanController(), data = backupFixture();
  data.settings.push({ id: 'daisizen-conference', value: starterConference('2026-10-23T12:00:00.000Z') as never });
  controller.setContent(data);
  controller.submit('13'); controller.submit('2'); const sig = controller.submit('HELP');
  const list = controller.submit('conference');
  expect(list.join('\n')).toContain('発言一覧：3件');
  expect(list.join('\n')).not.toContain('参加者');
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull(); expect(controller.isOlt).toBe(false);
  expect(controller.isConference).toBe(true); expect(controller.needsContent).toBe(true);
  expect(controller.submit('READ 2').join('\n')).toContain('返信先：#1');
  expect(controller.submit('HELP')).toEqual(list); expect(controller.submit('LIST')).toEqual(list);
  for (const invalid of ['READ 0', 'READ -1', 'READ 1.5', 'READ 9007199254740993', 'READ 99', 'JOIN 1', '/WHO', '/LEAVE', 'SEND hello', 'MAIL', 'FORUMS', '1', 'こんにちは']) {
    expect(controller.submit(invalid).join('\n')).not.toContain('★内容');
    expect(controller.submit('HELP')).toEqual(list); expect(controller.isConference).toBe(true);
  }
  expect(controller.submit('BACK')).toEqual(sig);
  expect(controller.isConference).toBe(false); expect(controller.submit('CONFERENCE')).toEqual(list);
  expect(controller.submit('MAIN')).toEqual(controller.welcome);
  controller.submit('13'); controller.submit('2'); controller.submit('CONFERENCE');
  controller.submit('BACK'); controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(controller.welcome);
  data.settings = []; controller.setContent(data);
  controller.submit('13'); controller.submit('2');
  expect(controller.submit('CONFERENCE').join('\n')).toContain('最初の発言');
  expect(controller.submit('READ 1').join('\n')).toContain('その番号の発言はありません');
});

test('production anonymous read → registration → reply/edit → save → list/read → return/reload and JSON round-trip', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await start(page); const initial = await snapshot(page);
  const seeded = conferenceState(initial);
  expect(seeded.contributions).toHaveLength(3);
  expect(new Set(seeded.contributions.map((r) => r.authorId)).size).toBeGreaterThanOrEqual(2);
  await enter(page); await command(page, 'READ 2', '返信先：#1');
  expect((await snapshot(page)).members).toEqual(initial.members);
  await command(page, 'REPLY 999', '返信先の発言がありません');
  for (const invalid of ['JOIN 1', '/WHO', '/LIST', '/LEAVE', 'READ 0']) await command(page, invalid, 'この画面では使えない');
  await command(page, 'REPLY 2', '登録しますか'); await command(page, 'SKIP', '読むだけでも');
  await command(page, 'REPLY 2', '登録しますか'); await command(page, 'Y', 'ハンドル名=');
  await command(page, '散歩の人', 'タイトル='); await command(page, '声のメモ', '本文');
  for (const line of ['  日本語　ｶﾅ <b>鳥</b>  ', '', '朝の散歩で聞きました。']) await command(page, line, '本文=');
  await command(page, 'BACK', '下書きは保持'); await command(page, '.END', '本文：3行');
  await command(page, 'MAIN', '下書きは保持'); await command(page, '', 'Y / N / EDIT');
  await command(page, 'EDIT', 'LINE 番号'); await command(page, 'TITLE 散歩の記録', 'タイトルを変更');
  await command(page, 'LINE 3  朝の風  ', '本文を変更'); await command(page, 'REVIEW', '投稿しますか');
  await command(page, 'Y', '発言 #4 を登録しました'); await command(page, 'Y', 'この画面では使えない');
  await command(page, 'LIST', '#4 散歩の記録 RE#2'); await command(page, 'READ 4', '返信先：#2');
  const saved = await backup(page), row = conferenceState(saved).contributions[3]!;
  expect(row).toMatchObject({ title: '散歩の記録', body: '  日本語　ｶﾅ <b>鳥</b>  \n\n 朝の風  ',
    authorId: saved.members.find((m) => m.handle === '散歩の人')!.id, replyToPostId: seeded.contributions[1]!.id, origin: 'local-human' });
  await expect(page.locator('.output b')).toHaveCount(0);
  for (const key of ['posts', 'forums', 'mail', 'readStates'] as const) expect(saved[key]).toEqual(initial[key]);
  const activity = (data: typeof saved) => data.settings.find((s) => s.id === 'ai-activity')!.value as object;
  expect({ ...activity(saved), lastActivityAt: null }).toEqual({ ...activity(initial), lastActivityAt: null });
  // Both Settings surfaces retain the conference, and the modal preserves typed input.
  const input = page.locator('#command'); await input.fill('未送信の日本語');
  const transcript = await page.locator('.output').textContent();
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(input).toHaveValue('未送信の日本語'); expect(await page.locator('.output').textContent()).toBe(transcript);
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', '発言一覧：4件');
  await command(page, 'BACK', 'FORUMS:'); await command(page, 'CONFERENCE', '#4 散歩の記録');
  await page.reload(); await expect(page.locator('.output')).toContainText('番号またはコマンド=');
  await enter(page); await command(page, 'READ 4', row.body);
  expect(conferenceState(await snapshot(page))).toEqual(conferenceState(saved));
  await restore(page, saved); await command(page, 'READ 4', serviceDate(row.createdAt, calendarSetting(saved)));
  expect(conferenceState(await snapshot(page))).toEqual(conferenceState(saved));
  await command(page, 'MAIN', 'MAIN'); await noOtherUi(page);
});

for (const missing of [true, false]) {
  test(`production ${missing ? 'older missing' : 'intentionally empty'} conference stays empty, cancels and accepts its first human contribution`, async ({ page }) => {
    await start(page); const data = await snapshot(page);
    data.posts = []; data.readStates = [];
    data.settings = data.settings.filter((s) => s.id !== 'daisizen-conference');
    if (!missing) data.settings.push({ id: 'daisizen-conference', value: { version: 1, conferenceId: 'DAISIZEN', nextNumber: 1, contributions: [] } });
    await restore(page, data); await enter(page); await command(page, 'LIST', '発言一覧：0件');
    await command(page, 'READ 1', 'その番号の発言はありません');
    await command(page, 'WRITE', '登録しますか'); await command(page, 'Y', 'ハンドル名='); await command(page, '初投稿の人', 'タイトル=');
    await command(page, '.CANCEL', '投稿を中止');
    const before = await snapshot(page);
    expect(conferenceState(before).contributions).toEqual([]); expect(before.posts).toEqual([]);
    for (const stage of ['title', 'body', 'review', 'edit']) {
      await command(page, 'WRITE', 'タイトル=');
      if (stage !== 'title') await command(page, '題名', '本文');
      if (['review', 'edit'].includes(stage)) { await command(page, '取り消す', '本文='); await command(page, '.END', '投稿しますか'); }
      if (stage === 'edit') await command(page, 'EDIT', 'LINE 番号');
      await command(page, 'CANCEL', '投稿を中止');
    }
    expect(conferenceState(await snapshot(page))).toEqual(conferenceState(before));
    await page.reload(); await expect(page.locator('.output')).toContainText('番号またはコマンド=');
    await enter(page); await command(page, 'LIST', '発言一覧：0件');
    await post(page, '最初の便り', '　この道にも秋が来ました。'); await command(page, 'READ 1', 'この道にも秋');
    const saved = await backup(page);
    expect(conferenceState(saved).contributions).toHaveLength(1); expect(saved.posts).toEqual([]);
    await restore(page, before); await command(page, 'LIST', '発言一覧：0件');
    expect(conferenceState(await snapshot(page)).contributions).toEqual([]);
  });
}

test('production IME guards, failed conference save/retry and removed reply parent retain a safe draft', async ({ page }) => {
  await start(page, '入力者'); await enter(page); await command(page, 'REPLY 1', 'タイトル=');
  const input = page.locator('#command');
  for (const [line, expected] of [['変換中の題', '本文を1行ずつ'], ['  草の声  ', '本文='], ['.END', '投稿しますか']]) {
    await input.fill(line!); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue(line!); await input.dispatchEvent('compositionend');
    await command(page, line!, expected!);
  }
  await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('Y'); await input.dispatchEvent('compositionend');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings' && value.id === 'daisizen-conference') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.put = native; } });
  });
  await command(page, 'Y', '入力は残っています');
  expect(conferenceState(await snapshot(page)).contributions).toHaveLength(3);
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  await command(page, 'Y', '発言 #4 を登録しました'); await command(page, 'Y', 'この画面では使えない');
  await command(page, 'READ 4', '  草の声  ');
  expect(conferenceState(await snapshot(page)).contributions).toHaveLength(4);
  await command(page, 'REPLY 4', 'タイトル='); await command(page, '残す題', '本文');
  await command(page, '保持する本文', '本文='); await command(page, '.END', '投稿しますか');
  // A concurrent local change removes the parent after the draft starts.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const req = indexedDB.open('pcvan-local'); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('settings', 'readwrite'), store = tx.objectStore('settings'), req = store.get('daisizen-conference');
      req.onsuccess = () => { req.result.value.contributions.pop(); store.put(req.result); }; tx.oncomplete = () => resolve();
    }); db.close();
  });
  await command(page, 'Y', '入力は残っています'); await command(page, 'EDIT', 'LINE 番号');
  await command(page, 'REVIEW', '保持する本文'); await command(page, 'N', '投稿を中止');
  expect(conferenceState(await snapshot(page)).contributions).toHaveLength(3);
});
