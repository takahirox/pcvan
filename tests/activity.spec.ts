import { expect, test } from '@playwright/test';
import { originalPersonas } from '../src/ai/personas';
import type { AiActivity, Backup } from '../src/storage/schema';
import { activityFixture as backupFixture } from './backup-fixture';

const from = '2026-10-21T00:00:00.000Z';
const oneHour = '2026-10-21T01:00:00.000Z';
const threeDays = '2026-10-24T00:00:00.000Z';
const modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

function planningFixture() {
  const data = backupFixture();
  data.settings.push({ id: 'ai-residents', value: { version: 1, profiles: originalPersonas.map((p) => ({ ...p,
    participation: 1, absence: 0, reply: 1, inactivity: 0, preferredBoards: ['forum', 'other'], affinities: {},
    weekdayHours: Array.from({ length: 24 }, (_, n) => n), weekendHours: Array.from({ length: 24 }, (_, n) => n) })) } as never });
  return data;
}

test('legacy imported rosters retain deliberate removals in planning, retained runs and in-flight commits', async ({ page }) => {
  await page.clock.setFixedTime(new Date(oneHour)); await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, from, oneHour, modelId }) => {
    const rp = '/src/storage/repository.ts', ap = '/src/ai/activity.ts', pp = '/src/ai/personas.ts', bp = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { emptyActivity, scheduleActivity } = await import(ap) as typeof import('../src/ai/activity');
    const { originalPersonas } = await import(pp) as typeof import('../src/ai/personas');
    const { runActivityBatch } = await import(bp) as typeof import('../src/ai/activity-runner');
    const profiles = originalPersonas.map((p) => ({ ...p, frequency: p.id === 'hoshimori' ? 1 : 0,
      participation: 1, absence: 0, reading: 0, inactivity: 0, reply: 0, newThread: 1,
      weekdayHours: Array.from({ length: 24 }, (_, i) => i), weekendHours: Array.from({ length: 24 }, (_, i) => i) }));
    fixture.posts = fixture.posts.map((p) => ({ ...p, authorId: p.authorId === 'ai' ? 'human' : p.authorId }));
    fixture.members = fixture.members.filter((m) => !['ai', 'fictional-ai:hoshimori'].includes(m.id));
    fixture.settings.push({ id: 'ai-residents', value: { version: 1, profiles } as never });
    const state = { ...emptyActivity(from, 'removed-legacy'), consent: true,
      nextDue: Object.fromEntries(profiles.map((p) => [p.id, from])) };
    const repo = await openRepository('removed-legacy');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    const planned = await repo.openActivity(oneHour);
    const run = { id: 'retained:hoshimori', personaId: 'hoshimori', forumId: 'forum', simulatedAt: oneHour, status: 'pending' as const };
    const retained = { ...state, lastActivityAt: oneHour, batch: { id: 'retained', from, to: oneHour, modelId, runs: [run] } };
    const calls: string[] = [];
    const budget = { attempts: 0, committed: 0 };
    const engine = { async load() {}, dispose() {}, async generate() {
      calls.push(run.personaId);
      // Deletion in a second connection while inference is already running.
      const other = await openRepository('removed-legacy');
      await other.delete('members', 'fictional-ai:hoshimori'); other.close();
      return JSON.stringify({ personaId: run.personaId, forumId: run.forumId, title: '活動', body: '住人の話題' });
    } };
    await repo.put('settings', { id: 'ai-activity', value: retained as never });
    await runActivityBatch(repo, () => repo.exportBackup(), retained, engine, new AbortController().signal, budget, () => {});
    const skippedCalls = calls.length;
    const pruned = scheduleActivity(await repo.exportBackup(), retained, oneHour);
    // A retained running result also cannot recreate the absent identity.
    await repo.put('settings', { id: 'ai-activity', value: { ...retained,
      batch: { ...retained.batch, runs: [{ ...run, status: 'running' }] } } as never });
    const late = await repo.commitAiRun(run.id, '{}');
    repo.close();
    const reopened = await openRepository('removed-legacy');
    const recovered = await reopened.openActivity(oneHour);
    // Once explicitly restored, the resident can start; deletion during inference
    // must still prevent the generated post from restoring that member.
    await reopened.put('members', { id: 'fictional-ai:hoshimori', handle: profiles[0]!.handle, actor: 'ai' });
    await reopened.put('settings', { id: 'ai-activity', value: retained as never });
    await runActivityBatch(reopened, () => reopened.exportBackup(), retained, engine, new AbortController().signal, budget, () => {});
    const saved = await reopened.exportBackup(); reopened.close();
    return { planned, skippedCalls, pruned, late, recovered, calls, budget, saved, originalPosts: fixture.posts };
  }, { fixture: backupFixture(), from, oneHour, modelId });
  expect(result.planned.batch).toBeNull(); expect(result.skippedCalls).toBe(0);
  expect(result.pruned.batch).toBeNull(); expect(result.recovered.batch).toBeNull(); expect(result.late).toBeUndefined();
  expect(result.calls).toEqual(['hoshimori']); expect(result.budget).toEqual({ attempts: 1, committed: 0 });
  expect(result.saved.members.filter((m) => m.actor === 'ai')).toHaveLength(9);
  expect(result.saved.members.some((m) => m.id === 'fictional-ai:hoshimori')).toBe(false);
  expect(result.saved.posts).toEqual(result.originalPosts);
});

test('model authorization survives cap/pause edits but never transfers to another model or its pending batch', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const selected = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
  const result = await page.evaluate(async ({ fixture, from, threeDays, modelId, selected }) => {
    const path = '/src/storage/repository.ts'; const activityPath = '/src/ai/activity.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const { emptyActivity } = await import(activityPath) as typeof import('../src/ai/activity');
    const repo = await openRepository('model-consent');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    await repo.put('settings', { id: 'ai-activity', value: emptyActivity(from, 'community') as never });
    await repo.authorizeModel(modelId, from);
    const capped = await repo.configureActivity(3, modelId, from);
    const paused = await repo.configureActivity(0, modelId, from);
    const resumed = await repo.configureActivity(3, modelId, from);
    const pending = await repo.openActivity(threeDays);
    const changed = await repo.configureActivity(3, selected, threeDays);
    const blocked = await repo.openActivity(threeDays);
    const authorized = await repo.authorizeModel(selected, threeDays);
    const switchedBack = await repo.configureActivity(3, modelId, threeDays);
    repo.close();
    return { capped, paused, resumed, pending, changed, blocked, authorized, switchedBack };
  }, { fixture: planningFixture(), from, threeDays, modelId, selected });
  for (const state of [result.capped, result.paused, result.resumed]) expect(state.consent).toBe(true);
  expect(result.pending.batch!.runs).toHaveLength(3);
  expect(result.changed).toMatchObject({ modelId: selected, consent: false });
  expect(result.blocked.consent).toBe(false);
  expect(result.blocked.batch).toEqual(result.pending.batch);
  expect(result.authorized).toMatchObject({ modelId: selected, consent: true });
  expect(result.authorized.batch).toEqual({ ...result.pending.batch, modelId: selected });
  expect(result.switchedBack).toMatchObject({ modelId, consent: false });
});

test('independent resident plans are deterministic, varied, bounded and require model consent', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, from, oneHour, threeDays }) => {
    const path = '/src/ai/activity.ts';
    const { emptyActivity, planActivity } = await import(path) as typeof import('../src/ai/activity');
    const state = { ...emptyActivity(from, 'community'), maxPosts: 6, consent: true };
    const plan = planActivity(fixture, state, threeDays)!;
    return {
      zero: planActivity(fixture, state, from), one: planActivity(fixture, state, oneHour), plan,
      repeat: planActivity(fixture, state, threeDays),
      topics: planActivity({ ...fixture, posts: [] }, state, threeDays),
      disabled: planActivity(fixture, emptyActivity(from), threeDays),
      clockBackwards: planActivity(fixture, state, '2026-10-20T00:00:00.000Z'),
      empty: planActivity({ ...fixture, forums: [] }, state, threeDays),
      hardCap: planActivity(fixture, { ...state, maxPosts: 100000 }, threeDays)!.runs.length,
    };
  }, { fixture: planningFixture(), from, oneHour, threeDays });
  expect(result.zero).toBeNull();
  expect(result.one?.runs.length ?? 0).toBeLessThanOrEqual(6);
  expect(result.plan.runs.length).toBeGreaterThan(1); expect(result.plan.runs.length).toBeLessThanOrEqual(6);
  expect(result.plan).toEqual(result.repeat);
  expect(new Set(result.plan.runs.map((run) => run.personaId)).size).toBeGreaterThan(1);
  expect(new Set(result.plan.runs.map((run) => run.forumId)).size).toBeGreaterThanOrEqual(1);
  expect(result.plan.runs.some((run) => run.replyToPostId)).toBe(true);
  expect(result.topics!.runs.every((run) => !run.replyToPostId)).toBe(true);
  expect(result.plan.runs.every((run) => run.simulatedAt > from && run.simulatedAt === threeDays)).toBe(true);
  expect(result.disabled).toBeNull(); expect(result.empty).toBeNull(); expect(result.clockBackwards).toBeNull();
  expect(result.hardCap).toBeLessThanOrEqual(12); expect(result.hardCap).toBeGreaterThan(1);
});

test('reply-only residents stay silent without eligible parents instead of starting topics', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, from, threeDays, modelId }) => {
    const a = '/src/ai/activity.ts'; const p = '/src/ai/personas.ts';
    const { emptyActivity, planActivity, availableResident } = await import(a) as typeof import('../src/ai/activity');
    const { personas } = await import(p) as typeof import('../src/ai/personas');
    const profiles = personas.map((profile) => ({ ...profile, frequency: profile.id === 'hoshimori' ? 1 : 0,
      participation: 1, absence: 0, preferredBoards: ['forum'], weekdayHours: Array.from({ length: 24 }, (_, i) => i),
      weekendHours: Array.from({ length: 24 }, (_, i) => i), reading: 0, inactivity: 0, newThread: 0, reply: 1 }));
    const content = { ...fixture, forums: [fixture.forums[0]!], settings: [
      { id: 'ai-residents', value: { version: 1, profiles } },
    ] } as unknown as Backup;
    const state = { ...emptyActivity(from, 'community'), consent: true };
    for (let n = 0; !availableResident(profiles[0]!, Date.parse(threeDays), state.seed!) && n < 1000; n++) state.seed = `reading-${n}`;
    const parent = fixture.posts[0]!;
    const ineligible = [
      [], [{ ...parent, origin: 'imported' }], [{ ...parent, authorId: 'fictional-ai:hoshimori' }],
      [{ ...parent, createdAt: threeDays }], [{ ...parent, forumId: 'other' }],
      [parent, { ...parent, id: 'answered', number: 2, authorId: 'fictional-ai:hoshimori',
        origin: `local-ai:webllm:${modelId}`, replyToPostId: parent.id }],
    ];
    const silent = ineligible.map((posts) => planActivity({ ...content, posts }, state, threeDays));
    const replies = planActivity({ ...content, posts: [parent] }, state, threeDays);
    profiles[0]!.newThread = 1; profiles[0]!.reply = 0;
    const topics = planActivity({ ...content, posts: [] }, state, threeDays);
    return { silent, replies, topics };
  }, { fixture: backupFixture(), from, threeDays, modelId });
  expect(result.silent.filter((_, i) => i !== 3)).toEqual(Array(5).fill(null));
  expect(result.silent[3]!.runs[0]!.replyToPostId).toBe('first');
  expect(result.replies!.runs.length).toBeGreaterThan(0);
  expect(result.replies!.runs.every((run) => run.replyToPostId === 'first')).toBe(true);
  expect(result.topics!.runs.length).toBeGreaterThan(0);
  expect(result.topics!.runs.every((run) => !run.replyToPostId)).toBe(true);
});

test('individual pause withdraws retained runs across reloads and retries without blocking other residents', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, from, oneHour, modelId }) => {
    const r = '/src/storage/repository.ts'; const a = '/src/ai/activity.ts';
    const p = '/src/ai/personas.ts'; const runner = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(r) as typeof import('../src/storage/repository');
    const { emptyActivity } = await import(a) as typeof import('../src/ai/activity');
    const { residentProfiles } = await import(p) as typeof import('../src/ai/personas');
    const { runActivityBatch } = await import(runner) as typeof import('../src/ai/activity-runner');
    const results = [];
    for (const status of ['pending', 'running', 'failed', 'cancelled'] as const) {
      const name = `resident-pause-${status}`;
      const repo = await openRepository(name);
      await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
      const state = { ...emptyActivity(oneHour, 'community'), consent: true, batch: {
        id: 'pause', from, to: oneHour, modelId, runs: ['hoshimori', 'kusabue'].map((personaId, i) => ({
          id: `pause:${personaId}`, personaId, forumId: 'forum', simulatedAt: oneHour,
          status: i === 0 ? status : 'pending' as const,
        })),
      } };
      await repo.put('settings', { id: 'ai-activity', value: state as never });
      await repo.openActivity(oneHour);
      const profile = residentProfiles(await repo.exportBackup())[0]!;
      const configured = await repo.configureResident({ ...profile, frequency: 0 }, oneHour);
      // Also recover an older backup that still retains a paused resident's action.
      await repo.put('settings', { id: 'ai-activity', value: state as never });
      repo.close();
      const reopened = await openRepository(name);
      const paused = await reopened.openActivity(oneHour);
      const calls: string[] = [];
      const engine = { async load() {}, dispose() {}, async generate(prompt: { user: string }) {
        const request = JSON.parse(prompt.user); calls.push(request.personaId);
        return JSON.stringify({ personaId: request.personaId, forumId: request.forumId, title: '活動', body: '住人の話題' });
      } };
      const budget = { attempts: 0, committed: 0 };
      for (let retry = 0; retry < 2; retry++) {
        await runActivityBatch(reopened, () => reopened.exportBackup(), state, engine,
          new AbortController().signal, budget, () => {});
      }
      const posts = (await reopened.exportBackup()).posts.filter((post) => post.simulation);
      const finished = await reopened.openActivity(oneHour);
      results.push({ configured, paused, calls, posts, finished, budget }); reopened.close();
    }
    return results;
  }, { fixture: backupFixture(), from, oneHour, modelId });
  for (const row of result) {
    expect(row.configured.batch!.runs.map((run) => run.personaId)).toEqual(['kusabue']);
    expect(row.paused.batch!.runs.map((run) => run.personaId)).toEqual(['kusabue']);
    expect(row.calls).toEqual(['kusabue']);
    expect(row.posts.map((post) => post.authorId)).toEqual(['fictional-ai:kusabue']);
    expect(row.budget).toEqual({ attempts: 1, committed: 1 });
    expect(row.finished.batch?.runs.every((run) => run.status === 'committed') ?? true).toBe(true);
  }
});

test('cross-tab pauses before inference and during generation skip stale actions and preserve other residents', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, from, oneHour, modelId }) => {
    const r = '/src/storage/repository.ts'; const a = '/src/ai/activity.ts';
    const p = '/src/ai/personas.ts'; const runner = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(r) as typeof import('../src/storage/repository');
    const { emptyActivity } = await import(a) as typeof import('../src/ai/activity');
    const { residentProfiles } = await import(p) as typeof import('../src/ai/personas');
    const { runActivityBatch } = await import(runner) as typeof import('../src/ai/activity-runner');
    const repo = await openRepository('resident-pause-race');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const other = await openRepository('resident-pause-race');
    const state = { ...emptyActivity(from, 'community'), consent: true, maxPosts: 1, batch: {
      id: 'race', from, to: oneHour, modelId, runs: ['hoshimori', 'hankote', 'kusabue'].map((personaId) => ({
        id: `race:${personaId}`, personaId, forumId: 'forum', simulatedAt: oneHour, status: 'pending' as const,
      })),
    } };
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    await repo.openActivity(oneHour);
    const pause = async (id: string) => {
      const profile = residentProfiles(await other.exportBackup()).find((p) => p.id === id)!;
      await other.configureResident({ ...profile, frequency: 0 }, oneHour);
    };
    const actions = {
      openActivity: repo.openActivity.bind(repo), configureActivity: repo.configureActivity.bind(repo),
      authorizeModel: repo.authorizeModel.bind(repo), configureResident: repo.configureResident.bind(repo),
      commitAiRun: repo.commitAiRun.bind(repo),
      async setAiRunStatus(...args: Parameters<typeof repo.setAiRunStatus>) {
        if (args[0] === 'race:hoshimori' && args[1] === 'running') await pause('hoshimori');
        return repo.setAiRunStatus(...args);
      },
    };
    const calls: string[] = [];
    const engine = { async load() {}, dispose() {}, async generate(prompt: { user: string }) {
      const request = JSON.parse(prompt.user); calls.push(request.personaId);
      if (request.personaId === 'hankote') await pause('hankote');
      return JSON.stringify({ personaId: request.personaId, forumId: request.forumId, title: '活動', body: '住人の話題' });
    } };
    const budget = { attempts: 0, committed: 0 };
    await runActivityBatch(actions, () => repo.exportBackup(), state, engine,
      new AbortController().signal, budget, () => {});
    // Pausing after commit preserves the already saved post and idempotent acknowledgement.
    await pause('kusabue');
    const duplicate = await repo.commitAiRun('race:kusabue', 'ignored');
    const saved = await repo.exportBackup();
    repo.close(); other.close();
    return { calls, budget, saved, duplicate };
  }, { fixture: backupFixture(), from, oneHour, modelId });
  expect(result.calls).toEqual(['hankote', 'kusabue']);
  expect(result.budget).toEqual({ attempts: 2, committed: 1 });
  expect(result.saved.posts.filter((post) => post.simulation)).toEqual([result.duplicate]);
  expect(result.duplicate!.authorId).toBe('fictional-ai:kusabue');
});

test('atomic result/status, concurrent commits, rollback, interrupted retry, caps and backup timestamps', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T01:00:00.000Z'));
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ fixture, from, threeDays, modelId }) => {
    const repoPath = '/src/storage/repository.ts';
    const runnerPath = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(repoPath) as typeof import('../src/storage/repository');
    const { runActivityBatch } = await import(runnerPath) as typeof import('../src/ai/activity-runner');
    const repo = await openRepository('activity-atomic');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const off = await repo.openActivity(from);
    const disabled = await repo.openActivity(threeDays);
    await repo.configureActivity(3, modelId, from);
    await repo.authorizeModel(modelId, from);
    const activityPath = '/src/ai/activity.ts';
    const { emptyActivity } = await import(activityPath) as typeof import('../src/ai/activity');
    const configured = await repo.get('settings', 'ai-activity');
    await repo.put('settings', { ...configured!, value: { ...emptyActivity(from, 'community'), maxPosts: 3, consent: true } as never });
    const state = await repo.openActivity(threeDays);
    const first = state.batch!.runs[0]!;
    const response = (run: typeof first) => JSON.stringify({ personaId: run.personaId, forumId: run.forumId,
      ...(run.replyToPostId ? { replyToPostId: run.replyToPostId } : {}), title: '再接続の話題', body: `架空の活動 ${run.id}` });
    await repo.setAiRunStatus(first.id, 'running');
    // A quota failure at the final status write rolls back post, member and number.
    const beforeFailure = await repo.exportJson();
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    };
    let quota = '';
    try { await repo.commitAiRun(first.id, response(first)); } catch (error) { quota = (error as { code: string }).code; }
    finally { IDBObjectStore.prototype.put = nativePut; }
    const rolledBack = await repo.exportJson() === beforeFailure;
    const otherTab = await openRepository('activity-atomic');
    const [post, duplicate] = await Promise.all([repo.commitAiRun(first.id, response(first)), otherTab.commitAiRun(first.id, response(first))]);
    otherTab.close();
    const second = state.batch!.runs[1]!;
    await repo.setAiRunStatus(second.id, 'running');
    repo.close(); // Simulate tab loss with a durable running status and one committed post.
    const resumed = await openRepository('activity-atomic');
    const retry = await resumed.openActivity('2026-10-27T00:00:00.000Z');
    let calls = 0;
    const engine = {
      async load() {}, dispose() {},
      async generate(prompt: { user: string }) {
        calls++;
        const request = JSON.parse(prompt.user);
        return JSON.stringify({ personaId: request.personaId, forumId: request.forumId,
          ...(request.replyToPostId ? { replyToPostId: request.replyToPostId } : {}), title: '架空の返事', body: `再試行での創作 ${calls}` });
      },
    };
    const budget = { attempts: 0, committed: 0 };
    await runActivityBatch(resumed, () => resumed.exportBackup(), retry, engine, new AbortController().signal, budget, () => {});
    // Explicit repeated retry uses the persisted statuses, with zero additional model calls.
    await runActivityBatch(resumed, () => resumed.exportBackup(), retry, engine, new AbortController().signal, budget, () => {});
    const completed = await resumed.exportBackup();
    const simPosts = completed.posts.filter((post) => post.simulation);
    await resumed.replaceFromJson(JSON.stringify(completed), { confirmReplace: true });
    const roundTrip = JSON.stringify(completed) === await resumed.exportJson().then((json) => JSON.stringify(JSON.parse(json)));
    const statuses = (await resumed.openActivity('2026-10-27T00:00:00.000Z')).batch;
    // Reducing the cap below already persisted saves blocks work even with a fresh in-memory budget.
    await resumed.configureActivity(3, modelId, from);
    const larger = await resumed.openActivity(threeDays);
    await resumed.configureActivity(1, modelId, threeDays);
    let cappedCalls = 0;
    const capped = { ...engine, async generate(prompt: { user: string }) { cappedCalls++; return engine.generate(prompt); } };
    const capBudget = { attempts: 0, committed: 0 };
    await runActivityBatch(resumed, () => resumed.exportBackup(), larger, capped, new AbortController().signal, capBudget, () => {});
    await resumed.configureActivity(0, modelId, threeDays);
    await runActivityBatch(resumed, () => resumed.exportBackup(), larger, capped, new AbortController().signal, capBudget, () => {});
    const disabledAfter = await resumed.openActivity('2026-10-28T00:00:00.000Z');
    resumed.close();
    return { off, disabled, quota, rolledBack, post, duplicate, retry, calls: calls - cappedCalls,
      simPosts, roundTrip, statuses, cappedCalls, disabledAfter };
  }, { fixture: planningFixture(), from, threeDays, modelId });
  expect(result.off.maxPosts).toBe(4); expect(result.off.consent).toBe(false); expect(result.disabled.batch).toBeNull();
  expect(result.quota).toBe('quota'); expect(result.rolledBack).toBe(true);
  expect(result.post).toEqual(result.duplicate);
  expect(result.retry.batch!.runs.slice(0, 2).map((run) => run.status)).toEqual(['running', 'pending']);
  expect(result.calls).toBe(2);
  expect(result.simPosts).toHaveLength(3);
  expect(result.simPosts.every((post) => post.createdAt === '2026-10-24T01:00:00.000Z' &&
    post.simulation!.fictional && post.simulation!.simulatedAt <= post.createdAt && post.id === post.simulation!.runId)).toBe(true);
  expect(result.roundTrip).toBe(true);
  expect(result.cappedCalls).toBe(0); expect(result.disabledAfter.maxPosts).toBe(0);
});

declare global {
  interface Window {
    activityMock: { mode: string; loads: number; calls: number; release?: () => void };
  }
}
