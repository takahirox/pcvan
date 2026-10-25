import { serviceDate, calendarSetting } from '../src/calendar';
import { expect, test } from '@playwright/test';
import { PcvanController } from '../src/navigation';
import { conferenceHelp, conferenceState, conferenceTitle, renderConference, renderContribution, starterConference } from '../src/conference';
import { identityToken } from '../src/member-presentation';
import { renderPost } from '../src/forums';
import { renderMail } from '../src/mail';
import { validateBackup } from '../src/storage/schema';
import type { AiActivity, Member } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { command, start, post, snapshot, backup, restore, noOtherUi, settings } from './terminal-helpers';
import type { Page } from '@playwright/test';

async function enter(page: Page) {
  await command(page, '13', 'コミュニケーション');
  await command(page, '2', 'DAISIZEN');
  await command(page, 'CONFERENCE', '電子会議室');
}

test('conference author identity matches shared service tokens, refreshes names and preserves literal records and controller output', () => {
  const data = backupFixture(), state = starterConference('2026-10-23T12:00:00.000Z');
  data.members.push({ id: 'fictional-ai:kusabue', handle: '同名', actor: 'ai' },
    { id: 'fictional-ai:komadori', handle: '同名', actor: 'ai' },
    { id: 'DEMO0001', handle: '同名', actor: 'human' }, { id: '会員🌌', handle: '同名', actor: 'human' },
    { id: '01234567-89ab-cdef-0123-456789abcdef', handle: '同名', actor: 'human' });
  data.members.forEach((m) => { m.handle = '  同名  '; });
  const literal = '  日本語　ｶﾅ <b>文字</b> fictional-ai:missing SYN-123  ';
  state.contributions.forEach((row) => { row.title = literal; row.body = `${literal}\n\n　末尾  `; });
  Object.assign(state.contributions[2]!, { authorId: 'human', origin: 'local-human', createdAt: '1996-11-24T01:02:03.000Z' });
  data.settings.push({ id: 'daisizen-conference', value: state as never },
    { id: 'historical-calendar', value: { version: 1, sourceAnchor: '2026-10-23T12:00:00.000Z' } });
  validateBackup(data);
  const controller = new PcvanController(), calendar = calendarSetting(data);
  const list = renderConference(data), tokens = new Set<string>();
  // Full IDs, including Unicode, UUID and resolved DEMO members, use the same
  // shared identity namespace as forums, mail and OLT.
  for (const member of [...data.members]) {
    const row = { ...state.contributions[1]!, authorId: member.id };
    const before = structuredClone({ data, row });
    const token = identityToken(member); tokens.add(token);
    const detail = renderContribution(row, state, data.members, calendar);
    expect(detail).toEqual([conferenceTitle, `#2 ${literal}`,
      `発言者：(${token}) 同名 / ${serviceDate(row.createdAt, calendar)} (JST)`,
      '返信先：#1', '★内容', row.body, conferenceHelp, 'コマンド=']);
    expect(renderPost({ ...data.posts[0]!, authorId: member.id }, '照合', undefined, data.members)[1]).toContain(`(${token})`);
    expect(renderMail({ id: 'letter', number: 1, senderId: member.id, recipientId: 'human', subject: literal,
      body: literal, createdAt: row.createdAt, origin: 'local-human' }, data.members, [])[1]).toBe(`差出人：(${token}) 同名`);
    expect({ data, row }).toEqual(before);
    data.members.reverse();
    expect(renderContribution(row, state, data.members, calendar)).toEqual(detail);
  }
  expect(tokens.size).toBe(data.members.length);
  const records = structuredClone(state), oldDetails = state.contributions.map((row) => renderContribution(row, state, data.members, calendar));
  expect(oldDetails[2]![2]).toBe('発言者：(SYN-7MFTMGGA7CMOM) 同名 / 1996年11月24日 10:02:03 (JST)');
  for (const renamed of [false, true]) {
    if (renamed) {
      for (const member of data.members) member.handle = member.actor === 'human' ? '  <i>人間の新名</i>  ' : '住人の新名';
      data.members.reverse();
    }
    const before = structuredClone(data);
    controller.setContent(data); controller.submit('MAIN'); controller.submit('13'); controller.submit('2');
    expect(controller.submit('CONFERENCE')).toEqual(list);
    for (const row of state.contributions) {
      const member = data.members.find((m) => m.id === row.authorId)!;
      const detail = controller.submit(`READ ${row.number}`);
      expect(detail).toEqual(renderContribution(row, state, data.members, calendar));
      expect(detail[2]).toBe(`発言者：(${identityToken(member)}) ${renamed ? member.actor === 'human' ? '<i>人間の新名</i>' : '住人の新名' : '同名'} / ${serviceDate(row.createdAt, calendar)} (JST)`);
      expect(detail.filter((_, i) => i !== 2)).toEqual(oldDetails[row.number - 1]!.filter((_, i) => i !== 2));
    }
    expect(data).toEqual(before); expect(state).toEqual(records);
  }
  expect(oldDetails.every((lines) => lines[2]!.includes(' 同名 / '))).toBe(true);
});

test('conference safe-name and unknown-author fallbacks apply only to attribution and retain strict import validation', () => {
  const state = starterConference('2026-10-23T12:00:00.000Z'), row = state.contributions[1]!;
  row.title = '  fictional-ai:missing <b>題</b>  '; row.body = '  名無し\n\n不明 <b>本文</b>  ';
  const member: Member = { id: row.authorId, handle: '同名', actor: 'ai' };
  const normal = renderContribution(row, state, [member]);
  for (const handle of ['', '　 \t', '\u200b', 'first\nsecond', 'first\u001bsecond', 'first\u2028second',
    'fictional-ai:resident', '01234567-89ab-cdef-0123-456789abcdef', member.id]) {
    member.handle = handle;
    const before = structuredClone({ state, member });
    const detail = renderContribution(row, state, [member]);
    expect(detail[2]).toBe(`発言者：(${identityToken(member)}) 名無し / 2026年10月23日 19:00:00 (JST)`);
    expect(detail.filter((_, i) => i !== 2)).toEqual(normal.filter((_, i) => i !== 2));
    expect({ state, member }).toEqual(before);
  }
  // Missing references are tested only at the renderer boundary, including the
  // forum-only DEMO fixture exception that conference attribution must not use.
  for (const authorId of ['missing', 'fictional-ai:missing', '<b>key</b>', 'DEMO0001', '01234567-89ab-cdef-0123-456789abcdef']) {
    const missing = { ...row, authorId }, before = structuredClone({ state, missing });
    expect(renderContribution(missing, state, [member])[2]).toBe('発言者：(不明) 名無し / 2026年10月23日 19:00:00 (JST)');
    expect(renderContribution(missing, state, [member]).filter((_, i) => i !== 2)).toEqual(normal.filter((_, i) => i !== 2));
    expect({ state, missing }).toEqual(before);
  }
  const data = backupFixture();
  data.members.push({ id: 'fictional-ai:kusabue', handle: '草笛', actor: 'ai' }, member);
  data.settings.push({ id: 'daisizen-conference', value: starterConference('2026-10-23T12:00:00.000Z') as never });
  member.handle = 'こまどり'; validateBackup(data);
  data.members = data.members.filter((m) => m.id !== member.id);
  expect(() => validateBackup(data)).toThrow('Invalid conference author/provenance.');
});

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

test('production conference identity survives duplicate names, human contributions/replies, both renames and reload/reordered restore', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T02:00:00.000Z'));
  await page.setViewportSize({ width: 320, height: 640 });
  const remote: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) remote.push(r.url()); });
  await start(page, '同名');
  const fixture = await snapshot(page), human = fixture.members.find((m) => m.actor === 'human')!;
  const residents = ['hoshimori', 'kusabue'].map((id) => fixture.members.find((m) => m.id === `fictional-ai:${id}`)!);
  residents.forEach((m) => { m.handle = '同名'; });
  const humanToken = identityToken(human), residentTokens = residents.map(identityToken);
  expect(new Set([humanToken, ...residentTokens]).size).toBe(3);
  const activity = fixture.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
  activity.maxPosts = 0; activity.consent = false;
  const state = conferenceState(fixture), literal = '  日本語　ｶﾅ <b>草</b> fictional-ai:missing SYN-123  ';
  state.contributions.forEach((row, i) => {
    row.authorId = residents[i % 2]!.id; row.title = literal; row.body = `${literal}\n\n　末尾  `;
  });
  fixture.settings.find((s) => s.id === 'daisizen-conference')!.value = state as never;
  validateBackup(fixture); await restore(page, fixture);
  const protectedRecords = (data: typeof fixture) => ({ members: data.members, sigs: data.sigs, forums: data.forums,
    posts: data.posts, mail: data.mail, readStates: data.readStates, settings: data.settings });
  await enter(page);
  const beforeRead = await snapshot(page), oldReads: string[] = [];
  for (const [i, token] of residentTokens.entries()) {
    const row = state.contributions[i]!;
    const detail = await command(page, `READ ${row.number}`, row.body);
    expect(detail).toContain(`発言者：(${token}) 同名 / ${serviceDate(row.createdAt, calendarSetting(beforeRead))} (JST)`);
    if (i === 1) expect(detail).toContain('返信先：#1');
    oldReads.push(detail);
  }
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(beforeRead));
  await post(page, '  人間の題  ', literal);
  await post(page, '  返信の題  ', `${literal}\n\n　結び  `, 'REPLY 2');
  const written = await backup(page), writtenState = conferenceState(written);
  expect(writtenState.contributions.slice(0, 3)).toEqual(state.contributions);
  expect(writtenState.contributions.slice(3)).toMatchObject([
    { number: 4, authorId: human.id, title: '  人間の題  ', body: literal, origin: 'local-human' },
    { number: 5, authorId: human.id, title: '  返信の題  ', body: `${literal}\n\n　結び  `,
      replyToPostId: state.contributions[1]!.id, origin: 'local-human' },
  ]);
  const unrelated = (data: typeof fixture) => ({ ...protectedRecords(data), settings: data.settings.filter((s) => s.id !== 'daisizen-conference') });
  expect(unrelated(written)).toEqual(unrelated(beforeRead));
  const verify = async (renamed: boolean) => {
    const before = await snapshot(page);
    const labels = new Map([[human.id, `(${humanToken}) ${renamed ? '人間の新名' : '同名'}`],
      [residents[0]!.id, `(${residentTokens[0]}) ${renamed ? '住人の新名' : '同名'}`],
      [residents[1]!.id, `(${residentTokens[1]}) 同名`]]);
    await command(page, 'LIST', '発言一覧：5件');
    for (const row of writtenState.contributions) {
      const detail = await command(page, `READ ${row.number}`, row.body);
      expect(detail).toContain(`発言者：${labels.get(row.authorId)} / ${serviceDate(row.createdAt, calendarSetting(before))} (JST)`);
      expect(detail).toContain(`#${row.number} ${row.title}`);
      if (row.replyToPostId) expect(detail).toContain(`返信先：#${writtenState.contributions.find((p) => p.id === row.replyToPostId)!.number}`);
    }
    expect(conferenceState(await snapshot(page))).toEqual(writtenState);
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  };
  await verify(false);
  await command(page, 'HANDLE', 'ハンドル設定'); await command(page, 'RENAME 人間の新名', 'ハンドル名を変更');
  await settings(page, 3); await command(page, 'RESIDENTS', '住人編集'); await command(page, '1', '住人の編集');
  await command(page, '1', 'handle='); await command(page, '住人の新名', '住人の編集');
  await command(page, 'SAVE', '住人の設定を保存'); await command(page, 'MAIN', 'MAIN'); await enter(page);
  await verify(true);
  for (const detail of oldReads) expect(await page.locator('.output').textContent()).toContain(detail);
  const renamed = await backup(page);
  for (const key of ['sigs', 'forums', 'posts', 'mail', 'readStates'] as const) expect(renamed[key]).toEqual(written[key]);
  // Cross-service forum reads resolve the same retained author IDs to the same tokens.
  await command(page, 'BACK', 'FORUMS:');
  for (const [i, member] of residents.entries()) {
    await command(page, 'FORUMS', 'フォーラム');
    const boardNo = i === 0 ? 5 : 1;
    await command(page, String(boardNo), '投稿一覧');
    const sig = renamed.sigs.find((s) => s.keyword === 'DAISIZEN')!;
    const forum = renamed.forums.find((f) => f.sigId === sig.id && f.boardNo === boardNo)!;
    const row = renamed.posts.find((p) => p.authorId === member.id && p.forumId === forum.id)!;
    expect(await command(page, `READ ${row.number}`, '★内容')).toContain(`★タイトル (${residentTokens[i]})`);
    await command(page, 'BACK', 'フォーラム'); await command(page, 'BACK', 'FORUMS:');
  }
  await command(page, 'MAIN', 'MAIN');
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await enter(page); await verify(true);
  await restore(page, { ...renamed, members: [...renamed.members].reverse() });
  await command(page, 'MAIN', 'MAIN'); await enter(page); await verify(true);
  expect(protectedRecords(await backup(page))).toEqual(protectedRecords(renamed));
  await expect(page.locator('.output b')).toHaveCount(0); await noOtherUi(page); expect(remote).toEqual([]);
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
