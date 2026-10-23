import { expect, test } from '@playwright/test';
import type { ConferenceState } from '../src/storage/schema';

const now = '2026-10-23T12:00:00.000Z';
test('conference transactions allocate concurrent numbers, validate authors/parents, deduplicate and roll back failed writes', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts', cp = '/src/conference.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { conferenceState } = await import(cp) as typeof import('../src/conference');
    const repo = await openRepository('conference-transactions'), other = await openRepository('conference-transactions');
    await repo.openActivity(now); const human = await repo.createHumanMember('記録係');
    const before = await repo.exportBackup(), draft = { id: 'human-1', authorId: human.id, title: '草の便り', body: '　原文を保存\n  二行目  ' };
    const first = await Promise.all([repo.createConferenceContribution(draft, now), other.createConferenceContribution(draft, now)]);
    const concurrent = await Promise.all([repo.createConferenceContribution({ ...draft, id: 'human-2', replyToPostId: first[0]!.id }, now),
      other.createConferenceContribution({ ...draft, id: 'human-3' }, now)]);
    const failures: string[] = [];
    for (const change of [{ id: 'human-1', title: 'collision' }, { authorId: 'missing' }, { authorId: 'fictional-ai:kusabue' },
      { title: ' ' }, { body: '\u001b[2J' }, { replyToPostId: '' }, { replyToPostId: 'resident-forum:DAISIZEN:1' },
      { replyToPostId: before.posts[0]!.id }, { replyToPostId: 'invalid' }]) {
      try { await repo.createConferenceContribution({ ...draft, id: 'invalid', ...change }, now); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    try { await repo.delete('members', human.id); failures.push('deleted'); } catch (e) { failures.push((e as { code: string }).code); }
    try { await repo.put('members', { ...human, actor: 'ai' }); failures.push('changed'); } catch (e) { failures.push((e as { code: string }).code); }
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings' && value.id === 'daisizen-conference') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.createConferenceContribution({ ...draft, id: 'retry' }, now); }
    catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.put = native; }
    const afterFailure = conferenceState(await repo.exportBackup());
    const retry = await repo.createConferenceContribution({ ...draft, id: 'retry' }, now);
    const after = await repo.exportBackup(); repo.close(); other.close();
    return { before, after, first, concurrent, failures, afterFailure, retry };
  }, now);
  expect(result.first[0]).toEqual(result.first[1]); expect(result.first[0]!.number).toBe(4);
  expect(result.concurrent.map((r) => r.number).sort()).toEqual([5, 6]);
  expect(result.failures).toEqual([...Array(11).fill('validation'), 'quota']);
  expect(result.afterFailure.contributions).toHaveLength(6); expect(result.afterFailure.nextNumber).toBe(7);
  expect(result.retry.number).toBe(7); expect(result.retry.createdAt).toBe(now);
  for (const key of ['posts', 'sigs', 'forums', 'mail', 'readStates'] as const) expect(result.after[key]).toEqual(result.before[key]);
  expect(result.after.settings.filter((s) => s.id !== 'daisizen-conference')).toEqual(result.before.settings.filter((s) => s.id !== 'daisizen-conference'));
});

test('conference backups reject invalid state and references without replacement; quota restore is atomic and stale drafts cannot cross import/reset', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts', cp = '/src/conference.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { conferenceState, emptyConference } = await import(cp) as typeof import('../src/conference');
    const repo = await openRepository('conference-backups'); await repo.openActivity(now);
    const human = await repo.createHumanMember('保存係');
    const row = await repo.createConferenceContribution({ id: 'human', authorId: human.id, title: '記録', body: '時刻と本文' }, now);
    const original = await repo.exportBackup(), failures: string[] = [];
    for (let i = 0; i < 12; i++) {
      const bad = structuredClone(original), setting = bad.settings.find((s) => s.id === 'daisizen-conference')!;
      const state = setting.value as unknown as ConferenceState, rows = state.contributions;
      if (i === 0) state.conferenceId = 'OTHER' as never;
      if (i === 1) state.nextNumber = row.number;
      if (i === 2) rows[1]!.number = 1;
      if (i === 3) rows[1]!.id = rows[0]!.id;
      if (i === 4) rows[1]!.replyToPostId = original.posts[0]!.id;
      if (i === 5) rows[0]!.replyToPostId = rows[1]!.id;
      if (i === 6) rows[0]!.authorId = 'missing';
      if (i === 7) rows[0]!.origin = 'local-human';
      if (i === 8) rows[0]!.createdAt = '1996-01-01';
      if (i === 9) rows[0]!.body = ' ';
      if (i === 10) rows[0]!.origin = 'local-ai:webllm:test' as never;
      if (i === 11) Object.assign(state, { attendance: [] });
      try { await repo.replaceFromJson(JSON.stringify(bad), { confirmReplace: true }); failures.push('imported'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    const afterInvalid = await repo.exportBackup();
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'settings' && value.id === 'daisizen-conference') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.replaceFromJson(JSON.stringify(original), { confirmReplace: true }); }
    catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.add = native; }
    const afterQuota = await repo.exportBackup();
    const stale = await openRepository('conference-backups');
    await repo.replaceFromJson(JSON.stringify(original), { confirmReplace: true });
    await repo.openActivity('2026-10-24T12:00:00.000Z');
    const roundTrip = conferenceState(await repo.exportBackup());
    try { await stale.createConferenceContribution({ id: 'stale', authorId: human.id, title: '古い', body: '下書き' }, now); }
    catch (e) { failures.push((e as { code: string }).code); } stale.close();
    const empty = structuredClone(original); empty.settings.find((s) => s.id === 'daisizen-conference')!.value = emptyConference() as never;
    await repo.replaceFromJson(JSON.stringify(empty), { confirmReplace: true }); await repo.openActivity(now);
    const restoredEmpty = conferenceState(await repo.exportBackup());
    const priorReset = await openRepository('conference-backups'); await repo.resetWorld({ confirmReset: true }, now);
    const reset = conferenceState(await repo.exportBackup());
    try { await priorReset.createConferenceContribution({ id: 'stale-reset', authorId: human.id, title: '古い', body: '下書き' }, now); }
    catch (e) { failures.push((e as { code: string }).code); } priorReset.close(); repo.close();
    return { original, afterInvalid, afterQuota, failures, roundTrip, restoredEmpty, reset };
  }, now);
  expect(result.failures).toEqual([...Array(12).fill('validation'), 'quota', 'stale', 'stale']);
  expect(result.afterInvalid).toEqual(result.original); expect(result.afterQuota).toEqual(result.original);
  expect(result.roundTrip).toEqual(result.original.settings.find((s) => s.id === 'daisizen-conference')!.value);
  expect(result.restoredEmpty).toMatchObject({ nextNumber: 1, contributions: [] });
  expect(result.reset.contributions).toHaveLength(3); expect(result.reset.nextNumber).toBe(4);
});

test('existing seeded, legacy and imported worlds never acquire conference examples; first send remains independent of AI planning', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts', cp = '/src/conference.ts', ap = '/src/ai/activity.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { conferenceState } = await import(cp) as typeof import('../src/conference');
    const { scheduleActivity } = await import(ap) as typeof import('../src/ai/activity');
    const repo = await openRepository('conference-old'); await repo.openActivity(now);
    await repo.delete('settings', 'daisizen-conference'); repo.close();
    const existing = await openRepository('conference-old'); await existing.openActivity(now);
    const old = conferenceState(await existing.exportBackup());
    const imported = await existing.exportBackup(); imported.posts = []; imported.readStates = [];
    await existing.replaceFromJson(JSON.stringify(imported), { confirmReplace: true }); await existing.openActivity(now);
    const afterImport = conferenceState(await existing.exportBackup());
    const human = await existing.createHumanMember('初めて');
    const first = await existing.createConferenceContribution({ id: 'first', authorId: human.id, title: '最初', body: 'こんにちは' }, now);
    const data = await existing.exportBackup(), activity = await existing.openActivity(now);
    const later = '2026-10-24T12:00:00.000Z';
    const planned = scheduleActivity(data, { ...activity, consent: true, maxPosts: 12 }, later);
    const withoutConference = structuredClone(data); withoutConference.settings = withoutConference.settings.filter((s) => s.id !== 'daisizen-conference');
    const comparison = scheduleActivity(withoutConference, { ...activity, consent: true, maxPosts: 12 }, later);
    const legacy = await openRepository('conference-legacy');
    await legacy.put('members', { id: 'old-human', handle: '古い世界', actor: 'human' });
    await legacy.openActivity(now); const legacyBefore = conferenceState(await legacy.exportBackup());
    await legacy.populateEmptyCommunity({ confirmPopulate: true }, now); const legacyAfter = conferenceState(await legacy.exportBackup());
    existing.close(); legacy.close();
    return { old, afterImport, first, data, planned, comparison, legacyBefore, legacyAfter };
  }, now);
  expect(result.old.contributions).toEqual([]); expect(result.afterImport.contributions).toEqual([]);
  expect(result.first.number).toBe(1); expect(result.data.posts).toEqual([]);
  expect(result.planned).toEqual(result.comparison);
  expect(result.legacyBefore.contributions).toEqual([]); expect(result.legacyAfter.contributions).toEqual([]);
});
