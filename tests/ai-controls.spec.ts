import { expect, test } from '@playwright/test';
import { command, start, settings, snapshot } from './terminal-helpers';
import { mockModel } from './ai-helpers';
import { activityFixture } from './backup-fixture';

test('typed model consent rejects blank, malformed and refusal, without manual post controls', async ({ page }) => {
  await mockModel(page); await start(page, '投稿者', 'http://127.0.0.1:14374'); await settings(page, 3);
  const menu = await page.locator('.output').textContent();
  expect(menu).not.toMatch(/GENERATE|PREVIEW|SEND|DISCARD|PERSONA|FORUM/);
  await command(page, 'MODEL 2', 'モデルを選択'); await command(page, 'LOAD', '数百 MB〜数 GB');
  for (const line of ['', 'YES', 'LOAD', 'READ 1']) await command(page, line, 'Y / N');
  expect(await page.evaluate(() => (window as unknown as { aiMock: { loads: string[] } }).aiMock.loads)).toEqual([]);
  await command(page, 'N', '操作を中止');
  await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('モデル準備完了');
  expect((await snapshot(page)).posts).toHaveLength(82);
});

test('resident profile editor persists all field types with validation and stable identity', async ({ page }) => {
  await start(page); await settings(page, 3); await command(page, 'AUTO 0', '休止');
  await command(page, 'RESIDENTS', '住人編集'); await command(page, '7', '未保存');
  await command(page, '1', 'handle='); await command(page, 'つむぎ便り', '未保存');
  await command(page, '10', 'frequency='); await command(page, '9', '未保存');
  await command(page, 'SAVE', '編集内容は保持');
  await command(page, '10', 'frequency='); await command(page, '0.5', '未保存');
  await command(page, '7', 'weekdayHours='); await command(page, '6,18,22', '未保存');
  await command(page, '16', 'affinities='); await command(page, '{"hoshimori":0.8}', '未保存');
  await command(page, 'SAVE', '住人の設定を保存');
  const saved = await snapshot(page), profiles = (saved.settings.find((s) => s.id === 'ai-residents')!.value as unknown as { profiles: { id: string; handle: string; frequency: number; weekdayHours: number[] }[] }).profiles;
  expect(profiles.find((p) => p.id === 'tsumugi')).toMatchObject({ handle: 'つむぎ便り', frequency: .5, weekdayHours: [6,18,22] });
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  expect((await snapshot(page)).members.find((m) => m.id === 'fictional-ai:tsumugi')!.handle).toBe('つむぎ便り');
});


test('imminent room replies defer new background work and share one busy engine', async ({ page }) => {
  await start(page, '待つ客', 'http://127.0.0.1:14374');
  const content = await snapshot(page);
  const result = await page.evaluate(async (content) => {
    const path = '/src/ai/controls.ts';
    const { createAiControls } = await import(path) as typeof import('../src/ai/controls');
    const state = content.settings.find((s) => s.id === 'ai-activity')!.value as unknown as import('../src/storage/schema').AiActivity;
    state.consent = true; state.batch = null;
    let opens = 0, loads = 0, factories = 0, work = 0;
    let release!: () => void, began!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const ai = createAiControls({ read: async () => content, print() {}, activity: {
      openActivity: async () => { opens++; return state; },
    } as never }, async () => { factories++; return { load: async () => { loads++; }, generate: async () => '{}', dispose() {} }; }, true);
    ai.refresh(content); ai.prioritizeRoom(Date.now() + 60_000);
    await ai.tick(); const deferred = opens;
    const signal = new AbortController().signal;
    const first = ai.runRoom(async () => { work++; began(); await pending; }, signal);
    await started;
    await ai.runRoom(async () => { work++; }, signal); await ai.tick();
    const busy = ai.status().join(' '); release(); await first;
    ai.prioritizeRoom(0); await ai.tick(); ai.invalidate();
    return { deferred, opens, loads, factories, work, busy };
  }, content);
  expect(result).toMatchObject({ deferred: 0, opens: 1, loads: 1, factories: 1, work: 1 });
  expect(result.busy).toContain('モデル使用中・待機');
});

test('human OLT priority during a batch lets the current job commit, then yields and preserves remaining jobs', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T01:00:00.000Z'));
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (fixture) => {
    const cp = '/src/ai/controls.ts', rp = '/src/storage/repository.ts', ap = '/src/ai/activity.ts';
    const { createAiControls } = await import(cp) as typeof import('../src/ai/controls');
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { emptyActivity } = await import(ap) as typeof import('../src/ai/activity');
    const repo = await openRepository('olt-batch-priority');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const now = new Date().toISOString();
    const state = { ...emptyActivity(now, 'olt-priority'), consent: true, batch: {
      id: 'priority', from: '2026-10-24T00:00:00.000Z', to: now,
      modelId: emptyActivity(now).modelId,
      runs: ['hoshimori', 'hankote', 'kusabue'].map((personaId) => ({
        id: `priority:${personaId}`, personaId, forumId: 'forum', simulatedAt: now, status: 'pending' as const,
      })),
    } };
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    await repo.openActivity(now);
    const events: string[] = [];
    let loads = 0, factories = 0, disposed = 0;
    let began!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const engine = { async load() { loads++; }, dispose() { disposed++; },
      async generate(prompt: { user: string }, signal: AbortSignal) {
        const request = JSON.parse(prompt.user);
        events.push(`generate:${request.personaId}`);
        if (events.length === 1) { began(); await pending; }
        signal.throwIfAborted();
        return JSON.stringify({ personaId: request.personaId, forumId: request.forumId,
          title: '住人の話題', body: `夜空を見上げました。${request.personaId}` });
      } };
    const ai = createAiControls({ read: () => repo.exportBackup(), print() {}, activity: {
      openActivity: () => repo.openActivity(),
      setAiRunStatus: (...args: Parameters<typeof repo.setAiRunStatus>) => repo.setAiRunStatus(...args),
      async commitAiRun(...args: Parameters<typeof repo.commitAiRun>) {
        const post = await repo.commitAiRun(...args);
        events.push(`commit:${args[0]}`); return post;
      },
    } as never }, async () => { factories++; return engine; }, true);
    ai.refresh(await repo.exportBackup());
    const batch = ai.tick();
    await Promise.race([started, batch.then(() => { throw new Error(ai.status().join('\n')); })]);
    // The saved-human-speech event can arrive while a background job is running.
    ai.prioritizeRoom(Date.now() + 60_000);
    const signal = new AbortController().signal;
    await ai.runRoom(async () => { events.push('premature-room'); }, signal);
    release(); await batch;
    const yielded = await repo.exportBackup();
    const yieldedState = yielded.settings.find((s) => s.id === 'ai-activity')!.value as unknown as import('../src/storage/schema').AiActivity;
    const busy = ai.busy;
    // This acquires the same activity lock and reuses the same warm model.
    await ai.runRoom(async (shared) => {
      if (shared !== engine) throw new Error('OLT must reuse the background model');
      events.push('room'); ai.prioritizeRoom(0);
    }, signal);
    await ai.tick();
    const resumed = await repo.exportBackup();
    ai.invalidate(); repo.close();
    return { events, busy, yieldedState, resumed, loads, factories, disposed };
  }, activityFixture());
  expect(result.busy).toBe(false);
  expect(result.yieldedState.batch!.runs.map((r) => r.status)).toEqual(['committed', 'pending', 'pending']);
  expect(result.yieldedState.allowance).toMatchObject({ attempts: 1, committed: 1 });
  expect(result.events).toEqual([
    'generate:hoshimori', 'commit:priority:hoshimori', 'room',
    'generate:hankote', 'commit:priority:hankote', 'generate:kusabue', 'commit:priority:kusabue',
  ]);
  expect(result.resumed.posts.filter((p) => p.simulation).map((p) => p.id).sort()).toEqual([
    'priority:hankote', 'priority:hoshimori', 'priority:kusabue',
  ]);
  expect(result).toMatchObject({ loads: 1, factories: 1, disposed: 1 });
});
