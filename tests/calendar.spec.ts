import { expect, test } from '@playwright/test';
import { initialCalendar, serviceDate, calendarSetting } from '../src/calendar';
import { ConnectionController } from '../src/connection';
import { renderPost } from '../src/forums';
import { identityToken } from '../src/member-presentation';
import { renderMail, renderMailList } from '../src/mail';
import { renderContribution, starterConference, conferenceState } from '../src/conference';
import { validateRecord } from '../src/storage/schema';
import { mockWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { residents, advance, speech } from './olt-helpers';
import { activityFixture, backupFixture } from './backup-fixture';
import { backup, command, enterForum, post, restore, snapshot, start } from './terminal-helpers';

const anchor = '2026-10-23T01:02:03.000Z';
const calendar = { version: 1 as const, sourceAnchor: anchor };
const setting = { id: 'historical-calendar', value: calendar };
const stamp = '2026年10月23日 10:02:03';

test('real JST formats entry, forum, mail and conference without changing effective times or literal text', () => {
  const data = backupFixture(); data.settings.push(setting);
  const literal = '2026-10-23 / 1996-11-22 / 97年01月01日';
  const post = { ...data.posts[0]!, createdAt: anchor, title: literal, body: literal };
  const mail = { id: 'letter', number: 1, senderId: 'human', recipientId: 'ai', subject: literal, body: literal, createdAt: anchor, origin: 'local-human' };
  const state = starterConference(anchor), row = { ...state.contributions[0]!, createdAt: anchor, body: literal };
  const before = structuredClone([post, mail, row]);
  const controller = new ConnectionController(); controller.setContent(data);
  controller.setSession({ lastLoginAt: anchor, lastLogoutAt: null, commandHistory: [] });
  controller.advanceConnection(); controller.advanceConnection();
  expect(controller.advanceConnection()).toEqual(['前回使用終了: 記録なし (JST)', `今回使用開始: ${stamp} (JST)`]);
  expect(renderPost(post, '広場', undefined, data.members, calendar)[1]).toContain('2026/10/23  10:02');
  expect(renderMailList([mail], data.members, 'human', 'SENT', calendar).join('\n')).toContain(stamp);
  expect(renderMail(mail, data.members, [mail], calendar)).toContain(`日時：${stamp} (JST)`);
  expect(renderContribution(row, state, data.members, calendar).join('\n')).toContain(stamp);
  for (const rendered of [renderPost(post, '広場', undefined, data.members, calendar), renderMail(mail, data.members, [mail], calendar), renderContribution(row, state, data.members, calendar)]) expect(rendered).toContain(literal);
  for (const record of [post, mail]) {
    const caughtUp = { ...record, simulation: { runId: record.id, simulatedAt: '2026-10-21T14:30:00.000Z', fictional: true as const } };
    if ('title' in caughtUp) expect(renderPost(caughtUp, '広場', undefined, data.members, calendar)[1]).toContain('2026/10/21  23:30');
    else {
      expect(renderMail(caughtUp, data.members, [mail], calendar)).toContain('日時：2026年10月21日 23:30:00 (JST)');
      expect(renderMailList([caughtUp], data.members, 'human', 'SENT', calendar).join('\n')).toContain('2026年10月21日 23:30:00');
    }
  }
  expect([post, mail, row]).toEqual(before);
});

test('JST midnight, month/year rollover, leap input and historical imports have independent expected values', () => {
  for (const [input, expected] of [
    ['2026-10-23T14:59:59.000Z', '2026年10月23日 23:59:59'],
    ['2026-10-23T15:00:00.000Z', '2026年10月24日 00:00:00'],
    ['2026-10-31T15:00:00.000Z', '2026年11月01日 00:00:00'],
    ['2026-12-31T15:00:00.000Z', '2027年01月01日 00:00:00'],
    ['1996-02-28T15:00:00.000Z', '1996年02月29日 00:00:00'],
    ['1997-12-31T14:59:59.000Z', '1997年12月31日 23:59:59'],
  ]) {
    expect(serviceDate(input!, calendar)).toBe(expected);
    expect(serviceDate(input!, calendar)).toBe(expected); // rendering never compounds
  }
  expect(serviceDate('2028-02-29T15:00:00.000Z', { version: 1, sourceAnchor: '2028-02-28T00:00:00.000Z' })).toBe('2028年03月01日 00:00:00');
  // Historical instants use the same JST arithmetic, including the UTC year edge.
  expect(serviceDate('1995-12-31T15:00:00.000Z', calendar)).toBe('1996年01月01日 00:00:00');
});

test('legacy fallback uses only timestamp fields; historical-only provenance uses a deterministic non-era source', () => {
  const data = backupFixture();
  expect(initialCalendar(data, anchor).sourceAnchor).toBe('2026-10-20T01:00:00.000Z');
  expect(initialCalendar(data, '2030-01-01T00:00:00.000Z')).toEqual(initialCalendar(data, anchor));
  const provenance = { version: 1, status: 'legacy', createdAt: anchor };
  const withWorld = { ...data, settings: [...data.settings, { id: 'community-world', value: provenance }] };
  expect(initialCalendar(withWorld, '2030-01-01T00:00:00.000Z')).toEqual(calendar);
  expect(provenance.createdAt).toBe(anchor);
  data.settings.push({ id: 'authored-date', value: '1900-01-01T00:00:00.000Z' });
  data.posts[0]!.body = '1900-01-01T00:00:00.000Z';
  data.settings.push({ id: 'community-world', value: { version: 1, status: 'legacy', createdAt: '1996-11-20T01:00:00.000Z' } });
  expect(initialCalendar(data, anchor).sourceAnchor).toBe('2026-10-20T01:00:00.000Z');
  data.posts = []; data.session = null;
  const historical = initialCalendar(data, anchor);
  expect(historical.sourceAnchor).toBe('2024-11-20T01:00:00.000Z');
  expect(initialCalendar(data, '2030-01-01T00:00:00.000Z')).toEqual(historical);
  expect(serviceDate('1996-11-20T01:00:00.000Z', historical)).toBe('1996年11月20日 10:00:00');
  expect(serviceDate(anchor, historical)).toBe('2026年10月23日 10:02:03');
  expect(initialCalendar({ ...data, settings: [], posts: [] }, anchor)).toEqual(calendar);
  for (const value of [{ version: 2, sourceAnchor: anchor }, { version: 1, sourceAnchor: '1996-11-20T00:00:00.000Z' }, { version: 1, sourceAnchor: '2026-10-23' }, { ...calendar, extra: true }, { version: 1 }]) expect(() => validateRecord('settings', { id: 'historical-calendar', value })).toThrow();
});

for (const [timezoneId, anchor, stamp, forumStamp, replyStamp] of [
  ['Asia/Tokyo', '2026-10-23T01:02:03.000Z', '2026年10月23日 10:02:03', '2026/10/23  10:02', '2026年10月23日 10:02:23'],
  ['America/Los_Angeles', '2027-12-31T14:59:50.000Z', '2027年12月31日 23:59:50', '2027/12/31  23:59', '2028年01月01日 00:00:10'],
] as const) {
  test(`production connected journey, live/replayed OLT, reload, backup and tabs (${timezoneId})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 }, timezoneId, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const calendar = { version: 1, sourceAnchor: anchor };
    await page.clock.install({ time: new Date(anchor) });
    await page.clock.setFixedTime(new Date(anchor));
    await mockWorker(page, 'slow');
    await page.goto('/');
    await expect(page.locator('.output')).toContainText(`今回使用開始: ${stamp} (JST)`);
    await expect(page.locator('.output')).toContainText('前回使用終了: 記録なし (JST)');
    await command(page, 'Y', 'ハンドル名='); await command(page, '暦の旅人', '登録しました');
    await enterForum(page);
    const literal = `${anchor} は本文のまま`;
    await post(page, '日付を残す', literal); await command(page, 'LIST', '日付を残す');
    let data = await backup(page);
    const own = data.posts.find((p) => p.title === '日付を残す')!;
    expect(await command(page, `READ ${own.number}`, literal)).toContain(forumStamp);
    await command(page, 'MAIN', 'MAIN'); await command(page, '1', '電子メール');
    await command(page, 'WRITE hoshimori', '件名='); await command(page, '暦の手紙', '本文');
    await command(page, literal, '本文='); await command(page, '.END', '送信しますか'); await command(page, 'Y', '送信しました');
    expect(await command(page, 'SENT', '暦の手紙')).toContain(stamp);
    expect(await command(page, 'READ 1', literal)).toContain(`日時：${stamp} (JST)`);
    await command(page, 'MAIN', 'MAIN'); await command(page, '13', 'コミュニケーション'); await command(page, '2', 'DAISIZEN');
    await command(page, 'CONFERENCE', '電子会議室'); await post(page, '会議の暦', literal);
    expect(await command(page, 'READ 4', literal)).toContain(stamp);
    await command(page, 'BACK', 'DAISIZEN'); await command(page, 'OLT', '部屋一覧'); await residents(page, false, 'MITI:9', new Date(anchor));
    await consent(page);
    const joined = await command(page, 'JOIN 2', '日時 JST');
    const oltLabel = `(${identityToken(data.members.find((m) => m.id === own.authorId))}) <暦の旅人>`;
    expect(joined).toContain('参加者：');
    expect(joined).not.toContain('* 暦の旅人 入室');
    const live = await command(page, literal, `${stamp} ${oltLabel} ${literal}`);
    // A queued /LIST waits for the live write and replays the identical dated line.
    const replay = await command(page, '/LIST', `<暦の旅人> ${literal}`);
    expect(replay).toContain(`${stamp} ${oltLabel} ${literal}`);
    expect(live).toContain(`${stamp} ${oltLabel} ${literal}`);
    // Cross JST midnight/year rollover while the model receives only bounded room context.
    await page.clock.setFixedTime(new Date(Date.parse(anchor) + 20_000)); await advance(page, 1);
    await expect.poll(() => page.evaluate(() => (window as any).journeyWorker.generations)).toBe(1);
    await page.evaluate(() => (window as any).completeOlt());
    await advance(page, 6);
    await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
    const reply = (await speech(page))[0]!;
    expect(reply.createdAt).toBe(new Date(Date.parse(anchor) + 20_000).toISOString());
    expect(await command(page, '/LIST', reply.text)).toContain(`${replyStamp} (`);
    await command(page, '/LEAVE', '部屋を退出');
    const rejoined = await command(page, 'JOIN 2', '日時 JST');
    expect(rejoined).toContain('参加者：');
    expect(rejoined).not.toContain('* 暦の旅人 退室');
    await command(page, '/MAIN', 'MAIN');
    await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, '3', 'コマンド=');
    await command(page, 'AUTO 0', '休止');
    await command(page, 'MAIN', 'MAIN'); data = await backup(page);
    expect(data.posts.find((p) => p.id === own.id)!.createdAt).toBe(anchor);
    expect(data.mail![0]!.createdAt).toBe(anchor);
    expect(conferenceState(data).contributions[3]!.createdAt).toBe(anchor);
    expect(calendarSetting(data)).toEqual(calendar);
    const checkSaved = async (tab: typeof page) => {
      await command(tab, 'MAIN', 'MAIN'); await enterForum(tab);
      expect(await command(tab, `READ ${own.number}`, literal)).toContain(forumStamp);
      await command(tab, 'MAIN', 'MAIN'); await command(tab, '1', '電子メール'); await command(tab, 'SENT', '暦の手紙');
      expect(await command(tab, 'READ 1', literal)).toContain(stamp);
      await command(tab, 'MAIN', 'MAIN'); await command(tab, '13', 'コミュニケーション'); await command(tab, '2', 'DAISIZEN');
      await command(tab, 'CONFERENCE', '電子会議室'); expect(await command(tab, 'READ 4', literal)).toContain(stamp);
      await command(tab, 'BACK', 'DAISIZEN'); await command(tab, 'OLT', '部屋一覧');
      expect(await command(tab, 'JOIN 2', '日時 JST')).toContain(`${stamp} ${oltLabel} ${literal}`);
      await command(tab, '/MAIN', 'MAIN');
    };
    await page.clock.setFixedTime(new Date(Date.parse(anchor) + 86_400_000));
    await page.reload(); await expect(page.locator('.output')).toContainText('番号またはコマンド=');
    await expect(page.locator('.output')).toContainText('前回使用終了: 記録なし (JST)');
    await checkSaved(page);
    await restore(page, data); await checkSaved(page);
    const restored = await snapshot(page);
    expect(restored.posts).toEqual(data.posts); expect(restored.mail).toEqual(data.mail);
    expect(conferenceState(restored)).toEqual(conferenceState(data));
    const other = await context.newPage(); await other.clock.setFixedTime(new Date(Date.parse(anchor) + 2 * 86_400_000));
    await other.goto('/'); await expect(other.locator('.output')).toContainText('番号またはコマンド=');
    await checkSaved(other); expect(calendarSetting(await snapshot(other))).toEqual(calendar);
    await other.close(); await context.close();
  });
}

test('atomic initialization, pending catch-up legacy imports, historical imports and reset preserve the source clock', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374/tests/module.html');
  const result = await page.evaluate(async ({ fixture, anchor }) => {
    const repositoryPath = '/src/storage/repository.ts', calendarPath = '/src/calendar.ts';
    const { openRepository } = await import(repositoryPath) as typeof import('../src/storage/repository');
    const { calendarSetting, serviceDate } = await import(calendarPath) as typeof import('../src/calendar');
    const repo = await openRepository('calendar-migration');
    fixture.settings.push({ id: 'ai-activity', value: { version: 1, maxPosts: 1, modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', lastActivityAt: anchor,
      batch: { id: 'pending', modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', from: '2026-10-18T00:00:00.000Z', to: '2026-10-19T00:00:00.000Z',
        runs: [{ id: 'pending:1', personaId: 'hoshimori', forumId: 'forum', simulatedAt: '2026-10-18T14:30:00.000Z', status: 'pending' }] } } });
    // The same dated legacy document is restored under different actual clocks.
    const DateClass = Date;
    const importAt = async (at: string, data = fixture) => {
      class FixedDate extends DateClass { constructor(value?: string | number) { super(value ?? at); } static now() { return DateClass.parse(at); } }
      globalThis.Date = FixedDate as DateConstructor;
      try { await repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true }); }
      finally { globalThis.Date = DateClass; }
      return repo.exportBackup();
    };
    const first = await importAt(anchor), second = await importAt('2030-01-01T00:00:00.000Z');
    const before = await repo.exportJson();
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value, key) {
      if (this.transaction.db.name === 'calendar-migration' && this.name === 'settings' && value.id === 'historical-calendar') throw new DOMException('Calendar quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    let rolledBack = false;
    try { await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true }); }
    catch { rolledBack = before === await repo.exportJson(); }
    finally { IDBObjectStore.prototype.add = native; }
    let immutable = 0;
    for (const action of [
      () => repo.put('settings', { id: 'historical-calendar', value: { version: 1, sourceAnchor: anchor } }),
      () => repo.delete('settings', 'historical-calendar'),
    ]) { try { await action(); } catch { immutable++; } }
    const catchUp = serviceDate('2026-10-18T14:30:00.000Z', calendarSetting(first));
    // A retained intent is authored during the current visit, never backdated.
    await repo.setAiRunStatus('pending:1', 'running');
    await repo.commitAiRun('pending:1', JSON.stringify({ personaId: 'hoshimori', forumId: 'forum', title: '遅れた便り', body: '本文' }));
    const afterCommit = await repo.exportBackup();
    const committed = afterCommit.posts.find((p) => p.id === 'pending:1');
    const committedDisplay = serviceDate(committed!.simulation!.simulatedAt, calendarSetting(afterCommit));
    const era = structuredClone(fixture);
    era.settings = [{ id: 'community-world', value: { version: 1, status: 'legacy', createdAt: '1996-11-20T01:00:00.000Z' } }];
    era.session = null;
    era.posts.forEach((p) => { p.createdAt = '1996-11-20T01:00:00.000Z'; });
    const historical = await importAt(anchor, era), historicalAgain = await importAt('2030-01-01T00:00:00.000Z', era);
    const eraDisplay = serviceDate(era.posts[0]!.createdAt, calendarSetting(historical));
    await repo.resetWorld({ confirmReset: true }, anchor);
    const fresh = await repo.exportBackup();
    await repo.resetWorld({ confirmReset: true }, '2026-10-24T02:00:00.000Z');
    const reset = await repo.exportBackup(); repo.close();
    const concurrent = await openRepository('calendar-concurrent'), other = await openRepository('calendar-concurrent');
    await Promise.all([concurrent.openActivity(anchor), other.openActivity('2026-10-24T02:00:00.000Z')]);
    const a = calendarSetting(await concurrent.exportBackup()), b = calendarSetting(await other.exportBackup());
    concurrent.close(); other.close();
    return { first, second, rolledBack, immutable, catchUp, committed, committedDisplay, historical, historicalAgain, eraDisplay, fresh, reset, a, b };
  }, { fixture: activityFixture(), anchor });
  expect(calendarSetting(result.first)).toEqual({ version: 1, sourceAnchor: '2026-10-18T00:00:00.000Z' });
  expect(calendarSetting(result.second)).toEqual(calendarSetting(result.first));
  expect(result.first.posts).toEqual(backupFixture().posts); expect(result.first.session).toEqual(backupFixture().session);
  expect(result.rolledBack).toBe(true); expect(result.immutable).toBe(2); expect(result.catchUp).toBe('2026年10月18日 23:30:00');
  expect(result.committedDisplay).toBe(serviceDate(result.committed!.simulation!.simulatedAt, calendarSetting(result.first)));
  expect(result.first.settings.find((s) => s.id === 'ai-activity')!.value).toEqual(result.second.settings.find((s) => s.id === 'ai-activity')!.value);
  expect(Date.parse(result.committed!.simulation!.simulatedAt)).toBeGreaterThan(Date.parse('2026-10-18T14:30:00.000Z'));
  expect(Date.parse(result.committed!.createdAt)).toBeGreaterThanOrEqual(Date.parse(result.committed!.simulation!.simulatedAt));
  expect(result.eraDisplay).toBe('1996年11月20日 10:00:00');
  expect(calendarSetting(result.historicalAgain)).toEqual(calendarSetting(result.historical));
  expect(result.historical.settings.find((s) => s.id === 'community-world')!.value).toMatchObject({ createdAt: '1996-11-20T01:00:00.000Z' });
  expect(calendarSetting(result.fresh)).toEqual(calendar);
  expect(calendarSetting(result.reset)).toEqual({ version: 1, sourceAnchor: '2026-10-24T02:00:00.000Z' });
  expect(result.a).toEqual(result.b); expect([anchor, '2026-10-24T02:00:00.000Z']).toContain(result.a?.sourceAnchor);
});

test('production legacy and era-only imports keep existing dates stable across restoration times and date new activity', async ({ page }) => {
  await page.clock.setFixedTime(new Date(anchor)); await start(page, '復元する人');
  const source = await snapshot(page);
  for (const era of [false, true]) {
    const legacy = structuredClone(source), instant = era ? '1996-11-20T01:00:00.000Z' : anchor;
    legacy.session = null;
    legacy.settings = legacy.settings.filter((s) => !['historical-calendar', 'community-world', 'ai-activity', 'olt-rooms'].includes(s.id));
    if (era) legacy.settings.push({ id: 'community-world', value: { version: 1, status: 'legacy', createdAt: instant } });
    legacy.posts.forEach((p) => { p.createdAt = instant; });
    const conference = legacy.settings.find((s) => s.id === 'daisizen-conference')!.value as unknown as ReturnType<typeof starterConference>;
    conference.contributions.forEach((r) => { r.createdAt = instant; });
    const oldHeader = era ? '1996/11/20  10:00' : '2026/10/23  10:02';
    let firstCalendar;
    for (const wallClock of [anchor, '2030-01-01T00:00:00.000Z']) {
      await page.clock.setFixedTime(new Date(wallClock));
      await restore(page, legacy); await command(page, 'MAIN', 'MAIN'); await enterForum(page);
      expect(await command(page, 'READ 1', '★内容')).toContain(oldHeader);
      const restored = await snapshot(page);
      expect(restored.posts).toEqual(legacy.posts);
      expect(conferenceState(restored)).toEqual(conferenceState(legacy));
      if (firstCalendar) expect(calendarSetting(restored)).toEqual(firstCalendar);
      else firstCalendar = calendarSetting(restored);
    }
    if (era) {
      await page.clock.setFixedTime(new Date(anchor));
      await post(page, '復元後の新しい日付', '本文の日付 2026-10-23');
      expect(await command(page, 'READ 17', '本文の日付 2026-10-23')).toContain('2026/10/23  10:02');
      expect(calendarSetting(await snapshot(page))).toEqual({ version: 1, sourceAnchor: '2024-11-20T01:00:00.000Z' });
    }
  }
});
