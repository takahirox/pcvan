import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import type { AiActivity, Backup } from '../src/storage/schema';
import { netNewsGroups, netNewsState, netNewsGroup } from '../src/netnews';
import { command, start, snapshot, backup, restore, noOtherUi } from './terminal-helpers';

async function enter(page: Page, index = 0) {
  await command(page, '7', 'インターネット / サービス一覧');
  await command(page, '1', 'NetNews / グループ一覧');
  await command(page, String(index + 1), `NetNews / ${netNewsGroups[index]!.name} / 記事一覧`);
}
const protectedRecords = (data: Backup) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
  posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings.filter((s) => s.id !== 'netnews-local') });

for (const index of [0, 1]) {
  test(`production ${netNewsGroups[index]!.name}: register, compose/edit/cancel, followup generations, search, reload/restore and literal log at 320px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url()); });
    await start(page); const fixture = await snapshot(page);
    const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    await restore(page, fixture);
    if (index) await command(page, '2', '索引');
    await command(page, '7', 'インターネット'); await command(page, '1', 'グループ一覧');
    await command(page, 'WRITE', 'この画面では使えない');
    await command(page, String(index + 1), '記事一覧：3件');
    const group = netNewsGroups[index]!, before = await snapshot(page);
    for (const invalid of ['WRITE extra', 'REPLY', 'REPLY 0', 'REPLY 01', 'REPLY -1', 'REPLY 1.5', 'REPLY 1 extra',
      'REPLY NaN', 'REPLY Infinity', 'REPLY 9007199254740992', `REPLY ${'9'.repeat(350)}`, 'REPLY 99']) {
      await command(page, invalid, 'コマンド='); await command(page, 'HELP', '記事一覧：3件');
    }
    await command(page, 'SEARCH SUBJECT 該当なし', '検索結果：0件');
    await command(page, 'REPLY 2', '現在の一覧にありません');
    await command(page, 'WRITE', '登録しますか'); await command(page, 'N', '登録を中止');
    await command(page, 'HELP', '検索結果：0件');
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    await command(page, 'LIST', '記事一覧：3件'); await command(page, 'READ 2', group.articles[1]!.body);
    await command(page, 'REPLY 2', '登録しますか'); await command(page, 'Y', 'ハンドル名=');
    await command(page, '投稿する人', '公開フォローアップ先：#2'); await command(page, 'CANCEL', '記事を中止');
    await command(page, 'HELP', group.articles[1]!.body);
    const registered = await snapshot(page);
    for (const stage of ['title', 'body', 'review', 'edit']) {
      await command(page, 'WRITE', '件名=');
      if (stage !== 'title') await command(page, '破棄する題', '本文を1行ずつ');
      if (['review', 'edit'].includes(stage)) { await command(page, '破棄する本文', '本文='); await command(page, '.END', '投稿しますか'); }
      if (stage === 'edit') await command(page, 'EDIT', 'LINE 番号');
      await command(page, stage === 'review' ? 'N' : '.CANCEL', '記事を中止');
    }
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(registered));
    expect(netNewsState(await snapshot(page)).contributions).toEqual([]);
    await command(page, 'SEARCH SUBJECT 該当なし', '検索結果：0件');
    await command(page, 'WRITE', '件名=');
    const input = page.locator('#command'), output = page.locator('.output'), literal = '  日本語　ｶﾅ <b>文字</b>  ';
    await input.fill('  新しい記事  '); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue('  新しい記事  '); await input.dispatchEvent('compositionend');
    await command(page, '  新しい記事  ', '本文を1行ずつ');
    await command(page, literal, '本文='); await command(page, '', '本文=');
    await command(page, '.TEXT MAIN', '本文='); await command(page, '.TEXT .END', '本文=');
    await command(page, 'BACK', `NetNews / ${group.name}`); await command(page, '.END', `Newsgroups: ${group.name}`);
    await command(page, 'MAIN', '下書きは保持'); await command(page, '', 'Y / N / EDIT');
    await command(page, 'EDIT', 'LINE 番号'); await command(page, 'TITLE   編集した記事  ', '件名を変更');
    await command(page, 'LINE 4   結び  ', '本文を変更');
    await command(page, 'REVIEW', `Newsgroups: ${group.name}`);
    await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    await expect(input).toHaveValue('Y'); expect(netNewsState(await snapshot(page)).contributions).toHaveLength(0);
    await input.dispatchEvent('compositionend');
    // Application Settings preserves terminal ownership and partially typed confirmation.
    const transcript = await output.textContent();
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
    await expect(input).toHaveValue('Y'); expect(await output.textContent()).toBe(transcript);
    expect(await command(page, 'Y', '記事 #4 を登録しました')).toContain('記事一覧：4件');
    await command(page, 'Y', 'この画面では使えない');
    const savedRead = await command(page, 'READ 4', `${literal}\n\nMAIN\n  結び  `);
    expect(savedRead).not.toContain('References:');
    expect(savedRead).toContain('Subject:   編集した記事  ');
    expect(savedRead).toContain('Date: Sat, 23 Nov 1996 11:00:00 +0900');
    await command(page, 'REPLY 2', `件名：${group.articles[1]!.subject}`);
    await command(page, '最初の公開返信', '本文='); await command(page, '.END', '親 Message-ID:');
    await command(page, 'EDIT', 'LINE 番号'); await command(page, 'TITLE 件名を変更しても親を保持', '件名を変更');
    await command(page, 'REVIEW', '公開フォローアップ先：#2'); await command(page, 'Y', '記事 #5 を登録しました');
    for (const [parent, number] of [[5, 6], [6, 7]]) {
      await command(page, `REPLY ${parent}`, '件名：Re: 件名を変更しても親を保持');
      await command(page, `世代${number}`, '本文='); await command(page, '.END', `公開フォローアップ先：#${parent}`);
      await command(page, 'Y', `記事 #${number} を登録しました`);
    }
    const saved = await backup(page), state = netNewsState(saved), display = netNewsGroup(saved, index);
    expect(state.contributions).toHaveLength(4); expect(protectedRecords(saved)).toEqual(protectedRecords(registered));
    expect(state.contributions[0]).toMatchObject({ title: '  編集した記事  ', body: `${literal}\n\nMAIN\n  結び  `, references: [] });
    const references = [group.articles[0]!.messageId, group.articles[1]!.messageId, state.contributions[1]!.messageId, state.contributions[2]!.messageId];
    expect(state.contributions[3]!.references).toEqual(references);
    expect(state.contributions[3]!.title).toBe('Re: 件名を変更しても親を保持');
    expect(saved.session!.commandHistory).not.toContain(literal); expect(saved.session!.commandHistory.filter((s) => s === 'Y')).toHaveLength(1); // Only the extra Y after commit is a command.
    await command(page, 'SEARCH FROM 投稿する人', '検索結果：4件');
    await command(page, 'READ 2', '現在の一覧にありません'); await command(page, 'REPLY 2', '現在の一覧にありません');
    await command(page, 'READ 7', `References: ${references.join(' ')}`);
    await command(page, 'BACK', '検索 From: 投稿する人');
    await command(page, 'WRITE', '件名='); await command(page, 'CANCEL', '記事を中止');
    await command(page, 'HELP', '検索結果：4件');
    await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', '検索結果：4件');
    await command(page, 'ABOUT', '公開フォローアップ'); await command(page, 'BACK', '検索結果：4件');
    await command(page, 'LIST', '記事一覧：7件');
    const inputBox = await input.boundingBox(); expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(321);
    await expect(input).toBeInViewport();
    const scroll = page.getByRole('log');
    expect(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const bottom = await scroll.evaluate((el) => el.scrollTop); await input.press('PageUp');
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeLessThan(bottom);
    await input.press('PageDown');
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    expect(log).toContain(savedRead); expect(log).toContain(literal); expect(log).toContain(`References: ${references.join(' ')}`);
    await page.reload(); await expect(output).toContainText('MAIN'); await enter(page, index);
    await command(page, 'READ 7', `References: ${references.join(' ')}`);
    expect(netNewsGroup(await snapshot(page), index)).toEqual(display);
    await restore(page, saved); await command(page, 'READ 4', literal);
    expect(netNewsGroup(await snapshot(page), index)).toEqual(display);
    await command(page, 'BACK', '記事一覧：7件'); await command(page, 'BACK', 'グループ一覧');
    await command(page, String(2 - index), '記事一覧：3件');
    await command(page, 'READ 4', '現在の一覧にありません');
    await expect(page.locator('.output b')).toHaveCount(0); await noOtherUi(page); expect(remote).toEqual([]);
  });
}

test('production failed-save editing/retry, cross-connection read refresh and import/reset discard owned NetNews drafts', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, '入力者'); await enter(page);
  await command(page, 'WRITE', '件名='); await command(page, '再試行', '本文を1行ずつ');
  const input = page.locator('#command');
  await input.fill('変換中の本文'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('変換中の本文'); await input.dispatchEvent('compositionend');
  await command(page, '変換した本文', '本文='); await command(page, '.END', '投稿しますか');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings' && value.id === 'netnews-local') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.put = native; } });
  });
  await command(page, 'Y', '入力は残っています'); expect(netNewsState(await snapshot(page)).contributions).toEqual([]);
  await command(page, 'EDIT', 'LINE 番号'); await command(page, 'LINE 1 修正した本文', '本文を変更');
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  await command(page, 'REVIEW', '投稿しますか'); await command(page, 'Y', '記事 #4 を登録しました');
  await command(page, 'READ 4', '修正した本文');
  // Another connection commits without any notification or focus event.
  await page.evaluate(async () => {
    const rp = 'http://127.0.0.1:14374/src/storage/repository.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const repo = await openRepository(), data = await repo.exportBackup();
    await repo.createNetNewsArticle({ id: 'other-tab', group: 'fj.questions.fj', authorId: data.members.find((m) => m.actor === 'human')!.id,
      title: '別の接続', body: '新着本文' }); repo.close();
  });
  await command(page, 'READ 5', '新着本文');
  const saved = await backup(page);
  await command(page, 'REPLY 5', '公開フォローアップ先：#5'); await command(page, '失われる下書き', '本文=');
  await command(page, '.END', '投稿しますか');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const maintenance = page.locator('details').filter({ has: page.getByText('ローカルデータ・保守', { exact: true }) });
  await maintenance.locator('summary').click();
  const choosing = page.waitForEvent('filechooser'); await page.locator('.import-json').click();
  await (await choosing).setFiles({ name: 'world.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await expect(page.locator('.confirmation-copy')).toContainText('未送信の下書き');
  await page.locator('.confirm-action').click(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await command(page, 'Y', 'この画面では使えない'); expect(netNewsState(await snapshot(page))).toEqual(netNewsState(saved));
  await command(page, 'WRITE', '件名='); await command(page, 'リセットで消える', '本文を1行ずつ');
  await command(page, '本文', '本文='); await command(page, '.END', '投稿しますか');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  if (await maintenance.getAttribute('open') === null) await maintenance.locator('summary').click();
  await page.locator('.reset-world').click();
  await page.locator('.confirm-action').click(); await expect(page.locator('.output')).toContainText('初期状態');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect.poll(async () => netNewsState(await snapshot(page)).contributions.length).toBe(0);
  await command(page, 'SKIP', '登録を中止'); await enter(page); await command(page, 'READ 4', '現在の一覧にありません');
  expect((await command(page, 'LIST', '記事一覧：3件'))).toContain('#1 Subject:');
});
