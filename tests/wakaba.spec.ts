import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { wakaba } from '../src/wakaba';
import { buildPrompt } from '../src/ai/generation';
import { localConversation } from '../src/storage/community';
import { emptyConference } from '../src/conference';
import { appendOlt, emptyOlt, OLT_SETTING } from '../src/olt-state';
import { CONFERENCE_SETTING } from '../src/storage/schema';
import { backupFixture, unreadFixture } from './backup-fixture';
import { command, start, snapshot, backup, restore, noOtherUi } from './terminal-helpers';
import type { Backup, JsonValue } from '../src/storage/schema';
import type { Page } from '@playwright/test';

function world(): Backup {
  const data = unreadFixture();
  data.sigs[0]!.keyword = 'local-wakaba'; data.forums[0]!.boardNo = 1;
  return data;
}
function protectedServices(data: Backup): Backup {
  const at = '2026-10-20T01:02:03.000Z', conference = emptyConference(), olt = emptyOlt(at);
  conference.nextNumber = 2;
  conference.contributions.push({ id: 'protected-conference', number: 1, authorId: 'human', title: '会議の記録',
    body: '会議だけの本文を保持', createdAt: at, origin: 'local-human' });
  appendOlt(olt.rooms[0]!, 'human', 'say', 'OLTだけの本文を保持', 'local-human', Date.parse(at));
  data.settings.push({ id: CONFERENCE_SETTING, value: conference as unknown as JsonValue },
    { id: OLT_SETTING, value: olt as unknown as JsonValue });
  return data;
}
async function enter(page: Page) {
  await command(page, '16', '通信が初めての方も'); await command(page, '1', '投稿一覧');
}
// Session/history may change. Inactive fixtures have no generation; the activity
// watermark is ordinary bookkeeping, all other settings remain protected.
function protectedRecords(data: Backup) {
  return { ...data, session: null, settings: data.settings.map((s) => s.id === 'ai-activity'
    ? { ...s, value: { ...(s.value as object), lastActivityAt: null } } : s) };
}

test('MAIN/index welcome selects only one authored board with exact parents through connection wrapper', () => {
  for (const Controller of [PcvanController, ConnectionController]) for (const viaIndex of [false, true]) {
    const c = new Controller(); c.submit('HELP');
    if (viaIndex) c.submit('2');
    const caller = c.submit('HELP');
    const welcome = c.submit('16').slice(1);
    expect(c.screen).toBe('wakaba'); expect(c.forum).toBeNull();
    expect(welcome.join('\n')).toContain('1 はじめての広場');
    expect(c.submit('HELP')).toEqual(welcome); expect(c.submit('LIST')).toEqual(welcome);
    for (const invalid of ['0', '3', '01', 'WRITE', 'READ 1', 'REPLY 1', 'J WAKABA']) {
      expect(c.submit(invalid).join('\n')).toContain('この画面では使えない'); expect(c.forum).toBeNull();
    }
    expect(c.submit('1').join('\n')).toContain('WRITE で最初の投稿');
    expect(c.forum).toEqual({ keyword: wakaba.keyword, boardNo: 1, name: wakaba.name });
    expect(c.needsContent).toBe(true);
    expect(c.submit('BACK')).toEqual(welcome); expect(c.forum).toBeNull();
    expect(c.submit('BACK')).toEqual(caller);
    c.submit('16'); c.submit('1'); c.submit('MAIN'); expect(c.screen).toBe('main');
    expect(c.submit('J WAKABA').join('\n')).toContain('移動先が見つかりません');
    c.submit('13'); expect(c.submit('HELP').join('\n')).not.toContain(wakaba.name);
  }
});

test('Wakaba numbered/gapped unread reads, anonymous guidance and missing/empty/ambiguous mappings are read-only', () => {
  const c = new PcvanController(), data = world(); c.setContent(data); c.setMemberId('human');
  c.submit('16'); c.submit('1'); const before = structuredClone(data);
  expect(c.submit('UNREAD').join('\n')).toContain('#4 返事 RE#1 [未読]');
  expect(c.submit('NEXT').join('\n')).toContain('#4/12　はじめての広場');
  expect(c.submit('READ 4').join('\n')).toContain('返信先：#1');
  expect(c.submit('READ 9').join('\n')).toContain('96/11/21  10:00');
  expect(c.submit('READ 2').join('\n')).toContain('その番号の投稿はありません');
  expect(data).toEqual(before);
  c.setMemberId(undefined);
  for (const cmd of ['UNREAD', 'NEXT']) expect(c.submit(cmd).join('\n')).toContain('HANDLE');
  expect(c.submit('READ 1').join('\n')).toContain('★内容');
  c.setMemberId('human'); data.posts = [];
  expect(c.submit('LIST').join('\n')).toContain('WRITE で最初の投稿');
  data.forums[0]!.boardNo = 9;
  expect(c.submit('LIST').join('\n')).toContain('見つからないか、重複');
  data.forums[0]!.boardNo = 1; data.forums.push({ ...data.forums[0]!, id: 'duplicate' });
  for (const cmd of ['LIST', 'NEXT', 'UNREAD']) expect(c.submit(cmd).join('\n')).toContain('見つからないか、重複');
  expect(c.submit('READ 4').join('\n')).not.toContain('★内容');
  data.forums.pop(); data.sigs.push({ ...data.sigs[0]!, id: 'duplicate' });
  expect(c.submit('NEXT').join('\n')).toContain('見つからないか、重複');
  data.sigs = []; data.forums = [];
  expect(c.submit('LIST').join('\n')).toContain('WRITE で最初の投稿');
});

test('pristine production reading, reply/edit/save/cancel, literal IME input, About, log and JSON reload', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await start(page, '初めの人'); await command(page, '2', '索引'); await enter(page);
  const before = await snapshot(page), board = before.forums.find((f) => f.name === wakaba.name)!;
  const starters = before.posts.filter((p) => p.forumId === board.id);
  expect(starters).toHaveLength(3); expect(new Set(starters.map((p) => p.authorId)).size).toBe(2);
  expect(starters.every((p) => p.origin === wakaba.origin && !p.simulation)).toBe(true);
  await command(page, 'READ 2', '返信先：#1');
  await command(page, 'WRITE', 'タイトル='); await command(page, '.CANCEL', '投稿を中止');
  expect((await snapshot(page)).posts).toEqual(before.posts);
  await command(page, 'REPLY 1', '返信先：#1');
  const input = page.locator('#command'); await input.fill('  日本語 <b>題</b>');
  await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('  日本語 <b>題</b>');
  await input.dispatchEvent('compositionend'); await input.press('Enter');
  await command(page, '  <i>本文</i>　ｶﾅ  ', '本文=');
  await command(page, '.TEXT NEXT', '本文='); await command(page, '.TEXT UNREAD', '本文=');
  await command(page, '.END', '投稿しますか'); await command(page, 'EDIT', 'LINE 番号');
  await command(page, 'TITLE はじめの返信', 'タイトルを変更'); await command(page, 'REVIEW', '投稿しますか');
  await command(page, 'Y', '発言 #4 を登録しました'); await command(page, 'READ 4', '返信先：#1');
  const saved = await snapshot(page), human = saved.posts.find((p) => p.forumId === board.id && p.number === 4)!;
  expect(human).toMatchObject({ origin: 'local-human', body: '  <i>本文</i>　ｶﾅ  \nNEXT\nUNREAD', replyToPostId: starters.find((p) => p.number === 1)!.id });
  expect(saved.posts.filter((p) => p.id !== human.id)).toEqual(before.posts);
  expect(saved.mail).toEqual(before.mail); expect(saved.members).toEqual(before.members);
  await expect(page.locator('.output i, .output b')).toHaveCount(0);
  await command(page, 'BACK', '通信が初めての方も'); await command(page, 'BACK', '索引');
  await command(page, 'MAIN', 'MAIN'); await enter(page);
  await command(page, 'ABOUT', 'わかば調査（2026-10-24'); await command(page, 'BACK', '投稿一覧');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.about-panel > summary').click();
  await expect(page.locator('.settings-about')).toContainText('LOCAL-WAKABA:1');
  await page.keyboard.press('Escape'); await noOtherUi(page);
  const downloading = page.waitForEvent('download'); await command(page, 'LOG');
  expect(await readFile((await (await downloading).path())!, 'utf8')).toContain(human.body);
  const exported = await backup(page); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await enter(page); await command(page, 'READ 4', human.body);
  await restore(page, exported); await command(page, 'MAIN', 'MAIN'); await enter(page);
  await command(page, 'READ 4', human.body);
  expect((await snapshot(page)).posts).toEqual(saved.posts); expect(external).toEqual([]);
});

test('inactive production browsing protects all records; NEXT persists exactly 4 then 9 with no side effects', async ({ page }) => {
  await start(page); await restore(page, protectedServices(world())); await command(page, 'MAIN', 'MAIN');
  const before = await snapshot(page);
  await command(page, '2', '索引'); await command(page, '16', '通信が初めての方も');
  for (const cmd of ['LIST', 'HELP', '0', '3', 'READ 1', 'J WAKABA']) await command(page, cmd, 'コマンド=');
  await command(page, 'WRITE', '投稿先の掲示板で WRITE');
  await command(page, 'BACK', '索引'); await command(page, 'BACK', 'MAIN'); await enter(page);
  for (const cmd of ['HELP', 'LIST', 'UNREAD', 'READ 2', 'READ 9007199254740992']) await command(page, cmd, 'コマンド=');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#command')!;
    for (let n = 0; n < 2; n++) { input.value = 'NEXT'; input.form!.requestSubmit(); }
  });
  await expect(page.locator('.output')).toContainText('#9　はじめての広場');
  const after = await snapshot(page);
  expect(after.readStates).toEqual(before.readStates.map((s) => s.memberId === 'human' && s.forumId === 'forum' ? { ...s, lastReadNumber: 9 } : s));
  expect(protectedRecords({ ...after, readStates: before.readStates })).toEqual(protectedRecords(before));
  expect((await page.locator('.output').textContent())!.match(/#4\/12　はじめての広場/g)).toHaveLength(1);
  expect(await command(page, 'NEXT', '未読の投稿はありません')).not.toContain('★内容');
  await command(page, 'READ 1', '★内容'); expect((await snapshot(page)).readStates).toEqual(after.readStates);
});

test('production refreshes another tab selection/content and fails closed on marker/refresh errors', async ({ page, context }) => {
  await start(page); await restore(page, world()); await command(page, 'MAIN', 'MAIN'); await enter(page);
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await other.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction(['posts', 'settings', 'members', 'readStates'], 'readwrite');
    tx.objectStore('settings').put({ id: 'active-human-member', value: 'human2' });
    tx.objectStore('members').put({ id: 'ai', handle: '今のタブの筆名', actor: 'ai' });
    tx.objectStore('readStates').put({ memberId: 'human2', forumId: 'forum', lastReadNumber: 3 });
    const p = tx.objectStore('posts'), r = p.get('reply'); r.onsuccess = () => p.put({ ...r.result, body: '別タブの最新本文' });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  const before = await snapshot(page);
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'readStates') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.put = native; } });
  });
  expect(await command(page, 'NEXT', '既読の保存に失敗')).not.toContain('別タブの最新本文');
  expect((await snapshot(page)).readStates).toEqual(before.readStates);
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  const read = await command(page, 'NEXT', '別タブの最新本文'); expect(read).toContain('返事　今のタブの筆名');
  expect((await snapshot(page)).readStates.find((s) => s.memberId === 'human2')!.lastReadNumber).toBe(4);
  expect((await snapshot(page)).readStates.find((s) => s.memberId === 'human' && s.forumId === 'forum')!.lastReadNumber).toBe(3);
  await other.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction('posts', 'readwrite'), p = tx.objectStore('posts'), r = p.get('ninth');
    r.onsuccess = () => p.put({ ...r.result, id: 'fifth', number: 5, title: '新着の質問' });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  await command(page, 'UNREAD', '#5 新着の質問 [未読]'); await command(page, 'NEXT', '#5　はじめての広場');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args: Parameters<typeof native>) {
      if (this.name === 'posts') throw new DOMException('read failed', 'UnknownError'); return native.apply(this, args);
    };
    Object.assign(window, { restoreGet: () => { IDBObjectStore.prototype.getAll = native; } });
  });
  expect(await command(page, 'NEXT', 'ローカル保存エラー')).not.toContain('★内容');
  await page.evaluate(() => (window as unknown as { restoreGet(): void }).restoreGet());
  await command(page, 'NEXT', '#9　はじめての広場');
});

test('production anonymous browsing and missing-board cancel/failed submission never create a board; save creates just required records', async ({ page }) => {
  await start(page);
  const anonymous = world(); anonymous.members = anonymous.members.filter((m) => m.actor !== 'human');
  anonymous.posts.forEach((p) => { p.authorId = 'ai'; }); anonymous.readStates = []; anonymous.mail = [];
  await restore(page, anonymous); await command(page, 'MAIN', 'MAIN'); await enter(page);
  const browsing = await snapshot(page);
  for (const cmd of ['UNREAD', 'NEXT']) expect(await command(page, cmd, 'HANDLE')).not.toContain('★内容');
  await command(page, 'READ 4', '★内容'); expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(browsing));
  const missing = protectedServices(backupFixture()); missing.posts = []; missing.readStates = [];
  await restore(page, missing); await command(page, 'MAIN', 'MAIN'); await enter(page);
  const before = await snapshot(page);
  await command(page, 'WRITE', 'タイトル='); await command(page, '.CANCEL', '投稿を中止');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  await command(page, 'WRITE', 'タイトル='); await command(page, '', '200文字以内');
  await command(page, '最初の質問', '本文'); await command(page, 'よろしく', '本文='); await command(page, '.END', '投稿しますか');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'forums') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.put = native; } });
  });
  await command(page, 'Y', '入力は残っています'); expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  await command(page, 'Y', '発言 #1 を登録しました');
  const after = await snapshot(page), sig = after.sigs.find((s) => s.keyword === wakaba.keyword)!, board = after.forums.find((f) => f.sigId === sig.id)!;
  expect(after.posts).toHaveLength(1); expect(board).toMatchObject({ boardNo: 1, nextPostNumber: 2 });
  expect(protectedRecords({ ...after, posts: [], sigs: after.sigs.filter((s) => s.id !== sig.id), forums: after.forums.filter((f) => f.id !== board.id) })).toEqual(protectedRecords(before));
  await command(page, 'READ 1', 'よろしく'); await noOtherUi(page);
});

test('beginner prompt culture uses only public board context and recognizes original starter replies', () => {
  const data = protectedServices(world());
  data.members.push({ id: 'fictional-ai:tabstop', handle: 'タブストップ', actor: 'ai' });
  data.posts[0]!.origin = wakaba.origin;
  expect(localConversation(data.posts[0]!)).toBe(true);
  data.settings.push({ id: 'unrelated-private-olt', value: 'OLT秘密' });
  const prompt = buildPrompt(data, { personaId: 'tabstop', forumId: 'forum', replyToPostId: 'first' });
  const user = JSON.parse(prompt.user);
  expect(user.forum.culture).toBe(wakaba.culture); expect(user.replyTarget.body).toContain('<b>文字</b>');
  for (const privateText of ['変更しない', 'OLT秘密', '会議だけの本文を保持', 'OLTだけの本文を保持']) expect(prompt.user).not.toContain(privateText);
});
