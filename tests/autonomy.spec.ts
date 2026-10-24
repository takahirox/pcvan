import { expect, test } from '@playwright/test';
import { command, start, enterForum, post, snapshot, noOtherUi, restore } from './terminal-helpers';
import { mockWorker, mockPendingWorker } from './ai-helpers';
import { epoch, hour, lifestyles, consent, generated } from './autonomy-helpers';
import type { AiActivity } from '../src/storage/schema';

// Every generation below comes from the real startup/timer path, never an AI command.
test('visible timer saves delayed human and resident replies, preserves input, renews bounds and catches up after reopening', async ({ page, context }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '星を見る人');
  expect((await snapshot(page)).posts).toHaveLength(72);
  await lifestyles(page); await consent(page);
  await expect(page.locator('.generate-ai, .preview-ai, .save-ai, .discard-ai, .persona-select, .forum-select')).toHaveCount(0);
  await enterForum(page); await post(page, '人間の星', '人間の星を眺めました。');
  const human = (await snapshot(page)).posts.find((p) => p.title === '人間の星')!;
  await page.clock.fastForward(20 * 60_000); expect(await generated(page)).toEqual([]);
  await command(page, 'WRITE', 'タイトル='); await command(page, '書きかけの題', '本文');
  const transcript = await page.locator('.output').textContent();
  await page.locator('#command').fill('変換中の本文'); await page.locator('#command').dispatchEvent('compositionstart');
  await page.clock.fastForward(41 * 60_000);
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  const first = (await generated(page))[0]!;
  expect(first).toMatchObject({ authorId: 'fictional-ai:hoshimori', replyToPostId: human.id, forumId: human.forumId });
  expect(Date.parse(first.simulation!.simulatedAt) - Date.parse(human.createdAt)).toBeGreaterThanOrEqual(20 * 60_000);
  await expect(page.locator('#command')).toHaveValue('変換中の本文'); await expect(page.locator('#command')).toBeFocused();
  expect(await page.locator('.output').textContent()).toBe(transcript);
  await page.locator('#command').dispatchEvent('compositionend'); await command(page, '.CANCEL', '中止');
  await page.clock.fastForward(hour);
  await expect.poll(async () => (await generated(page)).length).toBe(2);
  const second = (await generated(page)).find((p) => p.id !== first.id)!;
  expect(second).toMatchObject({ authorId: 'fictional-ai:kusabue', replyToPostId: first.id, forumId: first.forumId });
  await command(page, 'LIST', '投稿一覧'); await command(page, `READ ${second.number}`, '返信先：#' + first.number);
  await noOtherUi(page);
  // Long-open pages continue without reconnecting or another setup interaction.
  await page.clock.fastForward(6 * hour);
  await expect.poll(async () => (await generated(page)).length).toBeGreaterThan(2);
  const beforeClose = await generated(page);
  const reopenAt = new Date(await page.evaluate(() => Date.now()) + 30 * 24 * hour);
  await page.close();
  const reopened = await context.newPage(); await reopened.clock.install({ time: reopenAt }); await mockWorker(reopened, 'ok');
  await reopened.goto('/'); await expect(reopened.locator('.output')).toContainText('MAIN');
  await expect.poll(async () => (await generated(reopened)).length).toBeGreaterThan(beforeClose.length);
  await expect.poll(async () => {
    const data = await snapshot(reopened);
    const state = data.settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity;
    return state.batch?.runs.every((r) => r.status === 'committed') ?? true;
  }).toBe(true);
  const after = await generated(reopened), added = after.filter((p) => !beforeClose.some((old) => old.id === p.id));
  expect(added.length).toBeLessThanOrEqual(4);
  expect(added.every((p) => Date.parse(p.simulation!.simulatedAt) >= reopenAt.getTime() - 72 * hour)).toBe(true);
  expect(new Set(after.map((p) => p.id)).size).toBe(after.length);
  expect((await snapshot(reopened)).posts.filter((p) => p.origin === 'local-seed:fictional')).toHaveLength(30);
  await enterForum(reopened); await command(reopened, 'LIST', '投稿一覧'); await command(reopened, `READ ${added.at(-1)!.number}`, '★内容');
});

for (const mode of ['invalid', 'failure'] as const) {
  test(`scheduled ${mode} stops bounded retries, preserves failed work and leaves human posting usable`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await mockWorker(page, mode); await start(page, '利用者');
    await lifestyles(page); await consent(page); await page.clock.fastForward(hour);
    await expect.poll(async () => {
      const state = (await snapshot(page)).settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity;
      return state.batch?.runs[0]?.status;
    }).toBe('failed');
    await page.clock.fastForward(24 * hour);
    expect(await page.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)).toBe(1);
    expect(await generated(page)).toEqual([]);
    await expect(page.locator('.output')).not.toContainText('AI を利用できません');
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click(); await page.locator('.ai-panel > summary').click();
    await expect(page.locator('.ai-status')).toContainText('停止・失敗');
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await enterForum(page); await post(page, '人間の投稿', 'モデル失敗後も使えます。');
    expect((await snapshot(page)).posts).toHaveLength(73);
  });
}

test('automatic activity waits for the other tab model lease and resumes when that tab closes', async ({ page, context }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page); await lifestyles(page); await consent(page);
  const other = await context.newPage(); await other.clock.install({ time: new Date(epoch.getTime() + hour + 60_000) });
  await mockWorker(other, 'ok'); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await expect.poll(async () => (await snapshot(other)).settings.find((r) => r.id === 'ai-activity')!.value).toMatchObject({ batch: { runs: expect.any(Array) } });
  expect(await generated(other)).toEqual([]);
  expect(await other.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
  await page.close(); await other.clock.fastForward(60_000);
  await expect.poll(async () => (await generated(other)).length).toBe(1);
  await other.clock.fastForward(60_000); expect(await generated(other)).toHaveLength(1);
});

test('pausing scheduled inference discards late output and persisted pause survives reopening', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockPendingWorker(page, 'generate'); await start(page, '利用者');
  await lifestyles(page); await consent(page); await page.clock.fastForward(hour);
  await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork)).toContain('chatCompletionNonStreaming');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.activity-form input').fill('0'); await page.getByRole('button', { name: '活動設定を保存', exact: true }).click();
  await expect(page.locator('.ai-status')).toContainText('休止中'); await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await page.clock.fastForward(24 * hour);
  expect(await generated(page)).toEqual([]);
  expect((await snapshot(page)).settings.find((r) => r.id === 'ai-activity')!.value).toMatchObject({ maxPosts: 0, consent: true });
});

test('due opportunities never authorize a download and missing Web Locks blocks model work', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok');
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
  await start(page); await page.clock.fastForward(72 * hour);
  expect(await generated(page)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click(); await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText('初回モデル同意待ち');
  await page.getByRole('button', { name: 'モデルを読み込む', exact: true }).click();
  await page.getByRole('button', { name: '同意してモデルを読み込む', exact: true }).click();
  await expect(page.locator('.ai-status')).toContainText('Web Locks 非対応');
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});

test('changing model cancels pending inference, keeps its run and requires renewed consent before automatic saving', async ({ page }) => {
  const { mockModel } = await import('./ai-helpers');
  await page.clock.install({ time: epoch }); await mockModel(page); await start(page, '利用者', 'http://127.0.0.1:14374');
  await lifestyles(page); await consent(page);
  await page.evaluate(() => { (window as unknown as { aiMock: { mode: string } }).aiMock.mode = 'wait'; });
  await page.clock.fastForward(hour);
  await expect.poll(() => page.evaluate(() => (window as unknown as { aiMock: { prompts: unknown[] } }).aiMock.prompts.length)).toBe(1);
  const before = (await snapshot(page)).settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity;
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.model-select').selectOption({ index: 1 });
  await expect(page.locator('.settings-message')).toContainText('モデルを選択');
  await page.evaluate(() => { const m = (window as unknown as { aiMock: { mode: string; complete(): void } }).aiMock; m.mode = 'ok'; m.complete(); });
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await page.clock.fastForward(60_000);
  expect(await generated(page)).toEqual([]);
  const changed = (await snapshot(page)).settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity;
  expect(changed.consent).toBe(false); expect(changed.batch!.id).toBe(before.batch!.id);
  expect(await page.evaluate(() => (window as unknown as { aiMock: { loads: string[] } }).aiMock.loads.length)).toBe(1);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.getByRole('button', { name: 'モデルを読み込む', exact: true }).click();
  await page.getByRole('button', { name: '同意してモデルを読み込む', exact: true }).click();
  await expect(page.locator('.ai-status')).toContainText('モデル準備完了');
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await page.clock.fastForward(60_000);
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  expect((await generated(page))[0]).toMatchObject({ id: before.batch!.runs[0]!.id, origin: 'local-ai:webllm:Qwen2.5-1.5B-Instruct-q4f16_1-MLC' });
});

test('paused residents remain silent on timer opportunities while another resident can reply', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page);
  await lifestyles(page); await consent(page);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.getByText('住人のプロフィール・生活時間', { exact: true }).click();
  await page.locator('textarea[name="frequency"]').fill('0');
  await page.getByRole('button', { name: '住人の設定を保存', exact: true }).click();
  await expect(page.locator('.settings-message')).toContainText('住人の設定を保存');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.clock.fastForward(hour); expect(await generated(page)).toEqual([]);
  await page.clock.fastForward(hour);
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  expect((await generated(page))[0]!.authorId).toBe('fictional-ai:kusabue');
});

test('a reopened approved model can fail loading without requiring a manual post workflow', async ({ page, context }) => {
  const { mockModel } = await import('./ai-helpers');
  await page.clock.install({ time: epoch }); await mockModel(page); await start(page, '利用者', 'http://127.0.0.1:14374');
  await lifestyles(page); await consent(page); await page.close();
  const reopened = await context.newPage(); await reopened.clock.install({ time: new Date(epoch.getTime() + hour + 60_000) });
  await mockModel(reopened, 'load-fail');
  await reopened.goto('http://127.0.0.1:14374'); await expect(reopened.locator('.output')).toContainText('MAIN');
  await expect.poll(() => reopened.evaluate(() => (window as unknown as { aiMock: { loads: string[] } }).aiMock.loads.length)).toBe(1);
  await reopened.getByRole('button', { name: '設定 / Options', exact: true }).click(); await reopened.locator('.ai-panel > summary').click();
  await expect(reopened.locator('.ai-status')).toContainText('offline weights unavailable');
  await expect(reopened.locator('.ai-status')).toContainText('停止・失敗');
  expect(await generated(reopened)).toEqual([]);
  await reopened.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(reopened.locator('.output')).not.toContainText('offline weights unavailable');
  await enterForum(reopened); await post(reopened, 'モデル読込失敗後', '人間は投稿できます。');
});

test('scheduled quota failure rolls back numbering and retry saves the same run atomically', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page);
  await lifestyles(page); await consent(page);
  const original = await snapshot(page);
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restoreAdd: () => { IDBObjectStore.prototype.add = native; } });
  });
  await page.clock.fastForward(hour);
  await expect.poll(async () => {
    const state = (await snapshot(page)).settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity;
    return state.batch?.runs[0]?.status;
  }).toBe('failed');
  const failed = await snapshot(page);
  expect(failed.posts).toEqual(original.posts); expect(failed.forums).toEqual(original.forums);
  await page.evaluate(() => (window as unknown as { restoreAdd(): void }).restoreAdd());
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await expect(page.locator('.ai-status')).toContainText('停止・失敗');
  await page.getByRole('button', { name: '未完了の活動を再試行', exact: true }).click();
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  const state = failed.settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity;
  expect((await generated(page))[0]!.id).toBe(state.batch!.runs[0]!.id);
});

test('hidden pages defer inference and a restored page resumes on visibility without reconnecting', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page);
  await lifestyles(page); await consent(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.clock.fastForward(hour + 60_000); expect(await generated(page)).toEqual([]);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  await expect(page.locator('#command')).toBeFocused();
});


test('restoring approved activity resumes on the timer without reopening model settings', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page);
  await lifestyles(page); await consent(page);
  const saved = await snapshot(page);
  await restore(page, saved);
  await page.clock.fastForward(hour + 60_000);
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  expect((await generated(page))[0]!.origin).toContain('local-ai:webllm:');
});
