import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { openSettings, closeSettings } from './settings-helpers';

const start = '2026-10-21T00:00:00.000Z';
const modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
async function snapshot(page: Page): Promise<Backup> {
  return page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository();
    try { return await repo.exportBackup(); } finally { repo.close(); }
  });
}
async function mockModel(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
    Object.assign(window, { residentMock: { loads: 0, calls: 0, prompts: [] } });
  });
  await page.route('**/src/ai/webllm-adapter.ts', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export function modelWeightsCached() { return Promise.resolve(true); }
    export function createWebLlmAdapter() {
      const mock = window.residentMock;
      return {
        async load(id, report) { mock.loads++; report(1); }, dispose() {},
        async generate(prompt) {
          mock.calls++; mock.prompts.push(JSON.parse(prompt.user));
          const { personaId, forumId, replyToPostId } = JSON.parse(prompt.user);
          return JSON.stringify({ personaId, forumId, ...(replyToPostId ? { replyToPostId } : {}),
            title: '住人の話題', body: '今日の観察 ' + personaId + ' ' + mock.calls });
        }
      };
    }
  ` }));
}

test('all ten seeded profiles are distinct; routines obey local dates and seeded decisions include quiet periods', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, start }) => {
    const a = '/src/ai/activity.ts'; const p = '/src/ai/personas.ts';
    const { emptyActivity, scheduleActivity, routineFactor, HOUR } = await import(a) as typeof import('../src/ai/activity');
    const { personas } = await import(p) as typeof import('../src/ai/personas');
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

test('first-use consent bootstraps empty boards; always-open visits produce delayed human and AI replies with one model and a visit budget', async ({ page, context }) => {
  await page.clock.install({ time: new Date(start) });
  await page.clock.pauseAt(new Date(Date.parse(start) + 1000));
  await mockModel(page);
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  let saved = await snapshot(page);
  expect(saved.members).toHaveLength(10); expect(saved.posts).toEqual([]); expect(saved.forums).toEqual([]);
  await page.clock.runFor(120_000);
  expect(await page.evaluate(() => (window as any).residentMock.loads)).toBe(0);
  await openSettings(page, 'ai');
  await page.locator('.ai-load').click();
  await expect(page.locator('.ai-message')).toContainText('準備ができました');
  saved = await snapshot(page);
  expect(saved.forums).toHaveLength(2); expect(saved.posts).toEqual([]);
  expect(saved.members.every((m) => m.actor === 'ai')).toBe(true);
  // Set independent due times. Keep all unrelated residents silent in this scenario.
  await page.evaluate(async ({ modelId }) => {
    const r = '/src/storage/repository.ts'; const a = '/src/ai/activity.ts'; const p = '/src/ai/personas.ts';
    const { openRepository } = await import(r) as typeof import('../src/storage/repository');
    const { emptyActivity, random, HOUR } = await import(a) as typeof import('../src/ai/activity');
    const { personas } = await import(p) as typeof import('../src/ai/personas');
    const repo = await openRepository();
    const now = Date.now(); const day = Math.floor((now + 540 * 60_000) / (24 * HOUR));
    let seed = '0';
    for (let i = 0; i < 100; i++) {
      if (['hoshimori', 'hankote', 'kusabue'].every((id) => random(`${i}:${id}:away:${Math.floor(day / 3)}`) >= .12) &&
          [['hoshimori', 1], ['hankote', 31], ['kusabue', 61]].every(([id, minute]) =>
            random(`${i}:${id}:${now + Number(minute) * 60_000}:explore`) > .1)) { seed = String(i); break; }
    }
    const profiles = personas.map((p) => ({ ...p, frequency: ['hoshimori', 'hankote', 'kusabue'].includes(p.id) ? .2 : 0,
      participation: 1, weekdayHours: Array.from({ length: 24 }, (_, i) => i), weekendHours: Array.from({ length: 24 }, (_, i) => i),
      reading: 0, inactivity: 0, newThread: p.id === 'hoshimori' ? 1 : 0, reply: p.id === 'hoshimori' ? 0 : 1,
      preferredBoards: [p.id === 'kusabue' ? 'DAISIZEN:1' : 'MITI:9'] }));
    await repo.put('settings', { id: 'ai-residents', value: { version: 1, profiles } as never });
    const state = { ...emptyActivity(new Date(now).toISOString(), seed), modelId, consent: true, maxPosts: 3 };
    for (const p of personas) state.nextDue![p.id] = new Date(now + 12 * HOUR).toISOString();
    state.nextDue!.hoshimori = new Date(now + 60_000).toISOString();
    state.nextDue!.hankote = new Date(now + 31 * 60_000).toISOString();
    state.nextDue!.kusabue = new Date(now + 61 * 60_000).toISOString();
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    repo.close();
  }, { modelId });
  await closeSettings(page);
  await page.clock.runFor(60_000);
  await expect.poll(async () => (await snapshot(page)).posts.length).toBe(1);
  const first = (await snapshot(page)).posts[0]!;
  expect(first.authorId).toBe('fictional-ai:hoshimori'); expect(first.replyToPostId).toBeUndefined();
  await page.clock.runFor(29 * 60_000);
  expect((await snapshot(page)).posts).toHaveLength(1);
  await page.clock.runFor(60_000);
  await expect.poll(async () => (await snapshot(page)).posts.length).toBe(2);
  const second = (await snapshot(page)).posts.find((p) => p.replyToPostId === first.id)!;
  expect(second.authorId).toBe('fictional-ai:hankote');
  // A human arrives later on the other board. The third resident responds on her own visit.
  await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository(); const world = await repo.exportBackup();
    const human = await repo.createHumanMember('訪問者');
    const forum = world.forums.find((f) => f.sigId.endsWith('DAISIZEN'))!;
    await repo.createPost({ forumId: forum.id, authorId: human.id, title: '草木の話', body: '庭の草木を観察しています。', origin: 'local-human' });
    repo.close();
  });
  await page.clock.runFor(29 * 60_000);
  expect((await snapshot(page)).posts).toHaveLength(3);
  await page.clock.runFor(60_000);
  await expect.poll(async () => (await snapshot(page)).posts.length).toBe(4);
  saved = await snapshot(page);
  const human = saved.posts.find((p) => p.origin === 'local-human')!;
  expect(saved.posts.find((p) => p.authorId === 'fictional-ai:kusabue')!.replyToPostId).toBe(human.id);
  expect(saved.posts.filter((p) => p.simulation).every((p) => Date.parse(p.createdAt) >= Date.parse(p.simulation!.simulatedAt))).toBe(true);
  expect(await page.evaluate(() => (window as any).residentMock.loads)).toBe(1);
  expect(await page.evaluate(() => (window as any).residentMock.calls)).toBe(3);
  const prompts = await page.evaluate(() => (window as any).residentMock.prompts);
  expect(prompts[1].replyTarget.author).toBe('星守'); expect(prompts[1].affinities.hoshimori).toBe(.7);
  // An already-loaded model holds one cross-tab lease until explicitly unloaded.
  const other = await context.newPage(); await mockModel(other);
  await other.goto('http://127.0.0.1:14374');
  await openSettings(other, 'ai'); await other.locator('.ai-load').click();
  await expect(other.locator('.ai-message')).toContainText('別のタブ');
  expect(await other.evaluate(() => (window as any).residentMock.loads)).toBe(0);
  await other.close();
  // Reconnect and repeated visibility/timer events must not replenish a visit's allowance.
  const command = page.getByRole('textbox', { name: 'コマンド', exact: true });
  for (const line of ['MAIN', 'Q', 'RECONNECT']) { await command.fill(line); await command.press('Enter'); }
  await page.clock.fastForward(24 * 60 * 60_000);
  expect(await page.evaluate(() => (window as any).residentMock.calls)).toBe(3);

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

test('resident editor persists the selected profile through reload without changing its ID', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await openSettings(page, 'ai');
  await page.locator('.ai-persona').selectOption('tsumugi');
  await page.locator('.ai-resident-editor > summary').click();
  await page.getByLabel('住人のハンドル').fill('つむぎ便り');
  await page.getByLabel('職業', { exact: true }).fill('交代勤務の介護職');
  await page.getByLabel('活動頻度').fill('0.5');
  await page.getByRole('button', { name: 'この住人の設定を保存' }).click();
  await expect(page.locator('.ai-message')).toContainText('住人の設定を保存しました');
  await page.reload(); await openSettings(page, 'ai');
  await page.locator('.ai-persona').selectOption('tsumugi');
  await page.locator('.ai-resident-editor > summary').click();
  await expect(page.getByLabel('住人のハンドル')).toHaveValue('つむぎ便り');
  await expect(page.getByLabel('活動頻度')).toHaveValue('0.5');
  expect((await snapshot(page)).members.find((m) => m.id === 'fictional-ai:tsumugi')!.handle).toBe('つむぎ便り');
});
