import { openSettings } from './settings-helpers';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AiActivity, Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';

const from = '2026-10-21T00:00:00.000Z';
const oneHour = '2026-10-21T01:00:00.000Z';
const threeDays = '2026-10-24T00:00:00.000Z';
const modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

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
  }, { fixture: backupFixture(), from, oneHour, threeDays });
  expect(result.zero).toBeNull();
  expect(result.one?.runs.length ?? 0).toBeLessThanOrEqual(6);
  expect(result.plan.runs).toHaveLength(6);
  expect(result.plan).toEqual(result.repeat);
  expect(new Set(result.plan.runs.map((run) => run.personaId)).size).toBeGreaterThan(1);
  expect(new Set(result.plan.runs.map((run) => run.forumId)).size).toBe(2);
  expect(result.plan.runs.some((run) => run.replyToPostId)).toBe(true);
  expect(result.topics!.runs.every((run) => !run.replyToPostId)).toBe(true);
  expect(result.plan.runs.every((run) => run.simulatedAt > from && run.simulatedAt < threeDays)).toBe(true);
  expect(result.disabled).toBeNull(); expect(result.empty).toBeNull(); expect(result.clockBackwards).toBeNull();
  expect(result.hardCap).toBeLessThanOrEqual(12); expect(result.hardCap).toBeGreaterThan(6);
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
    // Reducing the configured cap also limits a larger interrupted plan.
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
  }, { fixture: backupFixture(), from, threeDays, modelId });
  expect(result.off.maxPosts).toBe(4); expect(result.off.consent).toBe(false); expect(result.disabled.batch).toBeNull();
  expect(result.quota).toBe('quota'); expect(result.rolledBack).toBe(true);
  expect(result.post).toEqual(result.duplicate);
  expect(result.retry.batch!.runs.map((run) => run.status)).toEqual(['committed', 'running', 'pending']);
  expect(result.calls).toBe(2);
  expect(result.simPosts).toHaveLength(3);
  expect(result.simPosts.every((post) => post.createdAt === '2026-10-24T01:00:00.000Z' &&
    post.simulation!.fictional && post.simulation!.simulatedAt < post.createdAt && post.id === post.simulation!.runId)).toBe(true);
  expect(result.roundTrip).toBe(true);
  expect(result.cappedCalls).toBe(1); expect(result.disabledAfter.maxPosts).toBe(0);
});

declare global {
  interface Window {
    activityMock: { mode: string; loads: number; calls: number; release?: () => void };
  }
}

async function mockModel(page: Page, supported = true) {
  await page.addInitScript((supported) => {
    Object.defineProperty(navigator, 'gpu', { value: supported ? {} : undefined, configurable: true });
    window.activityMock = { mode: 'ok', loads: 0, calls: 0 };
  }, supported);
  await page.route('**/src/ai/webllm-adapter.ts', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export function createWebLlmAdapter() {
      return {
        async load(id, report, signal) {
          window.activityMock.loads++; report(0.5);
          if (window.activityMock.mode === 'load-fail') throw new Error('offline');
        },
        async generate(prompt, signal) {
          const mock = window.activityMock; mock.calls++;
          if (mock.mode === 'wait') await new Promise((resolve) => { mock.release = resolve; });
          if (mock.mode === 'fail') throw new Error('GPU lost');
          if (mock.mode === 'invalid') return '{}';
          const data = JSON.parse(prompt.user);
          return JSON.stringify({ personaId: data.personaId, forumId: data.forumId,
            ...(data.replyToPostId ? { replyToPostId: data.replyToPostId } : {}),
            title: '架空の活動', body: '今生成した創作 ' + data.personaId + '/' + mock.calls });
        },
        dispose() {},
      };
    }` }));
}

async function seed(page: Page, maxPosts = 3) {
  await page.evaluate(async ({ fixture, from, modelId, maxPosts }) => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository();
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const activityPath = '/src/ai/activity.ts';
    const { emptyActivity } = await import(activityPath) as typeof import('../src/ai/activity');
    await repo.put('settings', { id: 'ai-activity', value: { ...emptyActivity(from, 'community'), consent: true } as never });
    await repo.configureActivity(maxPosts, modelId, from);
    repo.close();
  }, { fixture: backupFixture(), from, modelId, maxPosts });
}

async function snapshot(page: Page): Promise<Backup> {
  return page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository();
    try { return await repo.exportBackup(); } finally { repo.close(); }
  });
}

test('queued HELP preserves the reconnect backlog and completes while inference is pending', async ({ page }) => {
  await page.clock.setFixedTime(new Date(threeDays));
  await mockModel(page);
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  const command = page.getByRole('textbox', { name: 'コマンド', exact: true });
  await command.fill('Q'); await command.press('Enter');
  await expect.poll(async () => (await snapshot(page)).session?.commandHistory.at(-1)).toBe('Q');
  await seed(page); // Enabled cap of three with a 72-hour-old watermark.
  await page.evaluate(() => {
    window.activityMock.mode = 'wait';
    const input = document.querySelector<HTMLInputElement>('#command')!;
    const form = document.querySelector<HTMLFormElement>('.command-form')!;
    for (const line of ['RECONNECT', 'HELP']) {
      input.value = line;
      form.requestSubmit();
    }
  });
  // Persisting HELP proves command processing is not waiting for generation.
  await expect.poll(async () => (await snapshot(page)).session?.commandHistory.slice(-2)).toEqual(['RECONNECT', 'HELP']);
  const pending = await snapshot(page);
  const activity = pending.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
  expect(activity.batch?.runs).toHaveLength(3);
  expect(pending.posts.filter((post) => post.simulation)).toHaveLength(0);
  await expect.poll(() => page.evaluate(() => window.activityMock.calls)).toBe(1);
  await page.evaluate(() => { window.activityMock.mode = 'ok'; window.activityMock.release?.(); });
  await expect(page.locator('.ai-activity-message')).toContainText('3/3');
  expect((await snapshot(page)).posts.filter((post) => post.simulation)).toHaveLength(3);
  expect(await page.evaluate(() => window.activityMock.calls)).toBe(3);
});

test('opt-in persists; reopening generates a bounded backlog with fictional time inspection', async ({ page }) => {
  await page.clock.setFixedTime(new Date(threeDays));
  await mockModel(page);
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  expect(await page.evaluate(() => window.activityMock.loads)).toBe(0);
  await openSettings(page, 'ai');
  await page.locator('.ai-activity-cap').fill('4');
  await openSettings(page, 'ai');
  await page.locator('.ai-activity-save').click();
  await expect(page.locator('.ai-message')).toContainText('有効');
  expect(await page.evaluate(() => window.activityMock.loads)).toBe(0);
  await seed(page, 4);
  await page.reload();
  await expect(page.locator('.ai-activity-message')).toContainText('4/4');
  expect(await page.evaluate(() => window.activityMock.calls)).toBe(4);
  const posts = (await snapshot(page)).posts.filter((post) => post.simulation);
  expect(posts).toHaveLength(4);
  expect(new Set(posts.map((post) => post.authorId)).size).toBeGreaterThan(1);
  await expect(page.locator('.ai-records')).toContainText('fictional=true');
  await expect(page.locator('.ai-records')).toContainText('generatedAt=');
  const before = await snapshot(page);
  await page.reload();
  await expect(page.locator('.ai-message')).toContainText('AI はオフ');
  expect(await page.evaluate(() => window.activityMock.loads)).toBe(0);
  expect((await snapshot(page)).posts).toEqual(before.posts);
});

test('cancel keeps terminal usable, late output is ignored, retry skips committed work and closure resumes', async ({ page }) => {
  await page.clock.setFixedTime(new Date(threeDays));
  await mockModel(page);
  await page.goto('http://127.0.0.1:14374');
  await seed(page);
  await page.reload();
  await expect(page.locator('.ai-activity-message')).toContainText('3/3');
  // Start a new elapsed interval, then delay inference and cancel it.
  await seed(page);
  await page.addInitScript(() => { window.activityMock.mode = 'wait'; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.activityMock.calls)).toBe(1);
  const command = page.getByRole('textbox', { name: 'コマンド', exact: true });
  await command.fill('HELP'); await command.press('Enter');
  await expect(page.locator('.output')).toContainText('MAIN');
  await openSettings(page, 'ai');
  await page.locator('.ai-stop').click();
  await page.evaluate(() => { window.activityMock.mode = 'ok'; window.activityMock.release?.(); });
  await expect(page.locator('.ai-runs')).toContainText('cancelled');
  expect((await snapshot(page)).posts.filter((post) => post.simulation)).toHaveLength(0);
  await openSettings(page, 'ai');
  await page.locator('.ai-activity-retry').click();
  await expect(page.locator('.ai-activity-message')).toContainText('3/3');
  expect((await snapshot(page)).posts.filter((post) => post.simulation)).toHaveLength(3);
  // A running run left by an abruptly closed page is retried under its original ID.
  await seed(page);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.activityMock.calls)).toBe(1);
  const interrupted = await snapshot(page);
  const secondPage = await page.context().newPage();
  await page.close();
  await mockModel(secondPage);
  await secondPage.addInitScript(() => { window.activityMock.mode = 'ok'; });
  await secondPage.goto('http://127.0.0.1:14374');
  await expect(secondPage.locator('.ai-activity-message')).toContainText('3/3');
  const recovered = await snapshot(secondPage);
  const oldState = interrupted.settings.find((row) => row.id === 'ai-activity')!.value as { batch: { id: string } };
  expect(recovered.posts.filter((post) => post.simulation).every((post) => post.simulation!.runId.startsWith(oldState.batch.id))).toBe(true);
});

for (const mode of ['load-fail', 'fail', 'invalid', 'unsupported', 'no-locks']) {
  test(`${mode} leaves pending work recoverable and terminal available without automatic retries`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(threeDays));
    await mockModel(page, mode !== 'unsupported');
    await page.goto('http://127.0.0.1:14374');
    await seed(page);
    await page.addInitScript((mode) => {
      window.activityMock.mode = mode;
      if (mode === 'no-locks') Object.defineProperty(navigator, 'locks', { value: undefined });
    }, mode);
    await page.reload();
    await expect(page.locator(mode === 'no-locks' ? '.ai-activity-message' : '.ai-message')).toContainText(
      mode === 'no-locks' ? '排他制御' : mode === 'unsupported' ? 'WebGPU' : 'AI を利用できません');
    expect((await snapshot(page)).posts.filter((post) => post.simulation)).toHaveLength(0);
    expect(await page.evaluate(() => window.activityMock.calls)).toBe(['load-fail', 'unsupported', 'no-locks'].includes(mode) ? 0 : 1);
    const command = page.getByRole('textbox', { name: 'コマンド', exact: true });
    await command.fill('HELP'); await command.press('Enter');
    await expect(page.locator('.output')).toContainText('MAIN');
    const calls = await page.evaluate(() => window.activityMock.calls);
    await page.evaluate(() => { for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('visibilitychange')); });
    expect(await page.evaluate(() => window.activityMock.calls)).toBe(calls);
    await openSettings(page, 'ai');
    await page.locator('.ai-activity-disable').click();
    await expect(page.locator('.ai-activity-message')).toContainText('無効');
    await page.reload();
    expect(await page.evaluate(() => window.activityMock.loads)).toBe(0);
  });
}
