import { expect, test } from '@playwright/test';
import { backupFixture } from './backup-fixture';

const start = '2026-10-21T00:00:00.000Z';
const modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
test('all ten seeded profiles are distinct; routines obey local dates and seeded decisions include quiet periods', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, start }) => {
    const a = '/src/ai/activity.ts'; const p = '/src/ai/personas.ts';
    const { emptyActivity, scheduleActivity, routineFactor, HOUR } = await import(a) as typeof import('../src/ai/activity');
    const { originalPersonas: personas } = await import(p) as typeof import('../src/ai/personas');
    const all = new Set<string>(); const hours = new Set<number>(); let quiet = 0; let topics = 0; let replies = 0;
    for (let day = 0; day < 40; day++) {
      const from = new Date(Date.parse(start) + day * 24 * HOUR).toISOString();
      const to = new Date(Date.parse(from) + 24 * HOUR).toISOString();
      const state = { ...emptyActivity(from, 'community'), consent: true, maxPosts: 12 };
      const scheduled = scheduleActivity(fixture, state, to);
      if (!scheduled.batch) quiet++;
      for (const run of scheduled.batch?.runs ?? []) {
        all.add(run.personaId); hours.add(new Date(run.simulatedAt).getUTCHours());
        if (run.replyToPostId) replies++; else topics++;
      }
    }
    const profile = { ...personas[0]!, weekdayHours: [0], weekendHours: [12], utcOffsetMinutes: 540 };
    const factors = [
      routineFactor(profile, Date.parse('2026-10-23T15:00:00Z')), // Saturday midnight JST
      routineFactor(profile, Date.parse('2026-10-24T03:00:00Z')), // Saturday noon JST
      routineFactor({ ...profile, utcOffsetMinutes: -600 }, Date.parse('2026-10-23T15:00:00Z')),
      routineFactor({ ...profile, utcOffsetMinutes: -600 }, Date.parse('2026-10-23T10:00:00Z')),
    ];
    const state = { ...emptyActivity(start, 'community'), consent: true };
    const zero = scheduleActivity(fixture, state, start);
    let hourly = state;
    let quietHours = 0;
    for (let hour = 1; hour <= 72; hour++) {
      hourly = scheduleActivity(fixture, hourly, new Date(Date.parse(start) + hour * HOUR).toISOString());
      if (!hourly.batch) quietHours++;
      for (const run of hourly.batch?.runs ?? []) run.status = 'committed';
    }
    const muted = { ...fixture, settings: [...fixture.settings, { id: 'ai-residents', value: {
      version: 1, profiles: personas.map((p) => ({ ...p, frequency: 0 })),
    } }] };
    const silent = scheduleActivity(muted as never, state, '2026-10-24T00:00:00.000Z');
    const long = scheduleActivity(fixture, state, '2030-10-24T00:00:00.000Z');
    return { profiles: personas, all: [...all], hours: [...hours], factors, zero, silent, long, topics, replies, quiet, quietHours };
  }, { fixture: backupFixture(), start });
  expect(result.profiles).toHaveLength(10);
  for (const field of ['id', 'handle', 'occupation', 'routine', 'profile'] as const) {
    expect(new Set(result.profiles.map((p) => p[field])).size).toBe(10);
  }
  expect(result.all).toHaveLength(10); expect(result.hours.length).toBeGreaterThan(8);
  expect(result.factors).toEqual([.04, 1, .04, 1]);
  expect(result.quietHours).toBeGreaterThan(0);
  expect(result.zero.batch).toBeNull(); expect(result.silent.batch).toBeNull();
  expect(result.topics).toBeGreaterThan(0); expect(result.replies).toBeGreaterThan(0);
  expect(result.long.truncated).toBe(true); expect(result.long.batch!.runs.length).toBeLessThanOrEqual(4);
  expect(result.long.batch!.runs.every((r) => r.simulatedAt >= '2030-10-21T00:00:00.000Z')).toBe(true);
  expect(Object.values(result.long.nextDue!).every((t) => t > '2030-10-24T00:00:00.000Z')).toBe(true);
});

test('profile edits, pause/resume and old-backup migration preserve identities, pending work and atomic restore', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, start, modelId }) => {
    const r = '/src/storage/repository.ts'; const p = '/src/ai/personas.ts';
    const { openRepository } = await import(r) as typeof import('../src/storage/repository');
    const { residentProfiles } = await import(p) as typeof import('../src/ai/personas');
    const repo = await openRepository('resident-migration');
    for (const [index, id] of ['hoshimori', 'kusabue', 'hankote'].entries()) {
      fixture.members.push({ id: `fictional-ai:${id}`, handle: id, actor: 'ai' });
      fixture.posts.push({ id: `old:${id}`, forumId: 'forum', number: 8 + index, authorId: `fictional-ai:${id}`,
        title: '以前の投稿', body: `保存済みの ${id}`, createdAt: '2026-10-20T01:05:00.000Z', origin: `local-ai:webllm:${modelId}` });
    }
    fixture.forums[0]!.nextPostNumber = 11;
    const originalPosts = structuredClone(fixture.posts);
    const run = { id: 'legacy:0', personaId: 'hoshimori', forumId: 'forum', simulatedAt: '2026-10-21T01:00:00.000Z', status: 'running' };
    fixture.settings.push({ id: 'ai-activity', value: { version: 1, maxPosts: 2, modelId, lastActivityAt: start,
      batch: { id: 'legacy', from: start, to: '2026-10-21T02:00:00.000Z', modelId, runs: [run] } } });
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const migrated = await repo.openActivity('2026-10-24T00:00:00.000Z');
    const profile = { ...residentProfiles(await repo.exportBackup())[0]!, handle: '星の番人', occupation: '夜間校正係',
      weekdayHours: [1, 2], utcOffsetMinutes: -600, frequency: .25, interests: ['星', '本'], reply: .9 };
    const edited = await repo.configureResident(profile, '2026-10-24T00:00:00.000Z');
    const paused = await repo.configureActivity(0, modelId, '2026-10-24T00:00:00.000Z');
    const stillPaused = await repo.openActivity('2026-11-24T00:00:00.000Z');
    const resumed = await repo.configureActivity(2, modelId, '2026-11-24T00:00:00.000Z');
    const now = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(now), { confirmReplace: true });
    const restored = await repo.exportBackup();
    const invalidChanges = [
      { ...profile, frequency: 99 }, { ...profile, handle: '' }, { ...profile, weekdayHours: [24] },
      { ...profile, utcOffsetMinutes: 900 }, { ...profile, reply: -1 },
    ];
    const rejected: boolean[] = [];
    for (const invalid of invalidChanges) {
      const before = await repo.exportJson();
      try { await repo.configureResident(invalid); rejected.push(false); }
      catch { rejected.push(before === await repo.exportJson()); }
    }
    const broken = structuredClone(now);
    (broken.settings.find((s) => s.id === 'ai-residents')!.value as any).profiles.pop();
    const before = await repo.exportJson(); let atomic = false;
    try { await repo.replaceFromJson(JSON.stringify(broken), { confirmReplace: true }); }
    catch { atomic = before === await repo.exportJson(); }
    const offFixture = structuredClone(fixture);
    (offFixture.settings.find((s) => s.id === 'ai-activity')!.value as any).maxPosts = 0;
    await repo.replaceFromJson(JSON.stringify(offFixture), { confirmReplace: true });
    const off = await repo.openActivity('2026-12-24T00:00:00.000Z');
    // Imported empty worlds must never acquire new SIGs or demo messages.
    const empty = { ...fixture, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [], session: null };
    await repo.replaceFromJson(JSON.stringify(empty), { confirmReplace: true });
    await repo.openActivity(start); await repo.authorizeModel(modelId, start);
    const imported = await repo.exportBackup(); repo.close();
    return { migrated, edited, paused, stillPaused, resumed, now, restored, rejected, atomic, off, imported, originalPosts };
  }, { fixture: backupFixture(), start, modelId });
  expect(result.migrated).toMatchObject({ version: 2, consent: true, maxPosts: 2 });
  expect(result.migrated.batch!.runs[0]).toMatchObject({ id: 'legacy:0', status: 'running' });
  for (const state of [result.edited, result.paused, result.stillPaused, result.resumed]) expect(state.batch).toEqual(result.migrated.batch);
  expect(Date.parse(result.resumed.nextDue!.hoshimori!)).toBeGreaterThan(Date.parse('2026-11-24T00:00:00.000Z'));
  expect(result.now.posts).toHaveLength(result.originalPosts.length);
  expect(result.now.posts).toEqual(expect.arrayContaining(result.originalPosts)); expect(result.now.members).toContainEqual({ id: 'fictional-ai:hoshimori', handle: '星の番人', actor: 'ai' });
  expect(result.restored).toEqual(result.now); expect(result.rejected.every(Boolean)).toBe(true); expect(result.atomic).toBe(true);
  expect(result.off).toMatchObject({ maxPosts: 0, consent: false });
  expect(result.imported.forums).toEqual([]); expect(result.imported.posts).toEqual([]);
});
