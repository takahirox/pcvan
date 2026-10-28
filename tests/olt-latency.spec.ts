import { expect, test } from '@playwright/test';
import { mockWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { start, command } from './terminal-helpers';
import { epoch, residents, room, advance, speech, state } from './olt-helpers';

for (const context of ['daisizen', 'wakaba'] as const) {
  test(`production ${context} Enter to visible warm reply timing`, async ({ page }, info) => {
    await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
    await mockWorker(page, 'ok'); await start(page, '話す客');
    await residents(page, false, context === 'wakaba' ? 'LOCAL-WAKABA:1' : 'DAISIZEN:1');
    await consent(page); await room(page, 1, context);
    await page.evaluate(() => {
      const timings: Record<string, number> = {};
      Object.assign(window, { oltTimings: timings });
      const record = (stage: string) => { timings[stage] ??= Date.now(); };
      document.querySelector('form')!.addEventListener('submit', () => record('enter'));
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value, key) {
        if (this.name === 'settings' && value.id === 'olt-rooms') {
          const rooms = value.value.rooms;
          const stages = [
            rooms.some((r: any) => r.lines.some((l: any) => l.origin === 'local-human' && l.kind === 'say')) && 'durable',
            rooms.some((r: any) => r.pending) && 'eligible',
            rooms.some((r: any) => r.lines.some((l: any) => l.origin.startsWith('local-ai:'))) && 'commit',
          ].filter(Boolean) as string[];
          this.transaction.addEventListener('complete', () => stages.forEach(record));
        }
        return key === undefined ? put.call(this, value) : put.call(this, value, key);
      };
      const request = navigator.locks.request.bind(navigator.locks);
      navigator.locks.request = ((name: string, options: any, callback: any) => request(name, options, (lock) => {
        if (lock && name === 'pcvan-ai-activity') record('workerClaim');
        return callback(lock);
      })) as typeof navigator.locks.request;
      const send = Worker.prototype.postMessage;
      // The fixture replaces Worker; wrap that actual production-facing worker.
      Worker.prototype.postMessage = function(message: any) {
        if (message.kind === 'chatCompletionNonStreaming') {
          record('generationStart');
          const receive = this.onmessage;
          this.onmessage = (event) => {
            if (event.data.uuid === message.uuid) record('generationEnd');
            receive?.call(this, event);
          };
        }
        return send.call(this, message);
      };
      new MutationObserver(() => {
        if (document.querySelector('.output')!.textContent!.includes('星の観察、いいですね。')) record('visible');
      }).observe(document.querySelector('.output')!, { subtree: true, characterData: true, childList: true });
    });
    const wallStarted = performance.now();
    await command(page, '星の観察について教えて', '<話す客>');
    for (let i = 0; i < 400; i++) {
      await page.clock.runFor(100);
      await new Promise((resolve) => setTimeout(resolve, 15));
      if (await page.evaluate(() => !!(window as any).oltTimings.visible)) break;
    }
    await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
    const timings = await page.evaluate(() => (window as any).oltTimings as Record<string, number>);
    const wallElapsedMs = Math.round(performance.now() - wallStarted);
    const elapsed = Object.fromEntries(Object.entries(timings).map(([key, value]) => [key, value - timings.enter!]));
    await info.attach('warm-mock-timings', { body: JSON.stringify({ ...elapsed, wallElapsedMs }), contentType: 'application/json' });
    console.log(context, { ...elapsed, wallElapsedMs });
    expect(elapsed.visible).toBeDefined();
    expect(elapsed.visible).toBeLessThan(10_000);
    expect(elapsed.generationStart).toBeLessThan(1000);
    await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
    await page.locator('.ai-panel > summary').click();
    await expect(page.locator('.ai-status')).toContainText('表示完了');
    await expect(page.locator('.ai-status')).toContainText('warm');
    await expect(page.locator('.ai-status')).toContainText('発言保存=');
    await expect(page.locator('.ai-status')).not.toContainText('星の観察について教えて');
  });
}

for (const mode of ['retry-ok', 'invalid'] as const) test(`quality retry is persisted and bounded: ${mode}`, async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, mode); await start(page, '話す客'); await residents(page); await consent(page); await room(page);
  await command(page, '月を見る道具を教えて', '<話す客>');
  await expect.poll(async () => (await state(page))!.attempts).toBe(2);
  await expect.poll(async () => (await state(page))!.rooms[1]!.pending).toBeNull();
  expect(await speech(page)).toHaveLength(mode === 'retry-ok' ? 1 : 0);
  const worker = await page.evaluate(() => (window as any).journeyWorker);
  expect(worker.generations).toBe(2);
  expect(worker.settings.every((s: any) => s.max_tokens === 256 && s.temperature === .65 && s.stream === false)).toBe(true);
  expect(worker.prompts[1].speaker.id).toBe(worker.prompts[0].speaker.id);
  await advance(page, 5);
  expect((await state(page))!.attempts).toBe(2);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText(mode === 'retry-ok' ? '表示完了' : '不正な応答を拒否');
});

test('another tab activity lock queues the durable human event without spending attempts, then resumes', async ({ page, context }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '待つ客'); await residents(page); await consent(page); await room(page);
  const other = await context.newPage(); await other.goto('/');
  await other.evaluate(() => new Promise<void>((resolve) => {
    void navigator.locks.request('pcvan-ai-activity', () => new Promise<void>((release) => { Object.assign(window, { releaseActivity: release }); resolve(); }));
  }));
  await command(page, '月を見る道具を教えて', '<待つ客>'); await advance(page, 2);
  expect((await state(page))!.attempts).toBe(0);
  const waiting = (await state(page))!.rooms[1]!;
  expect(waiting.handledNumber).toBeLessThan(waiting.lines.at(-1)!.number);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText('別タブで活動中・待機');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await other.evaluate(() => (window as any).releaseActivity());
  await advance(page, 1); await expect.poll(async () => (await speech(page)).length).toBe(1);
  expect((await state(page))!.attempts).toBe(1);
  await other.close();
});

test('slow warm inference is observable, completes after drafting, and display speed reports actual paint', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'slow'); await start(page, '書く客'); await residents(page); await consent(page); await room(page);
  await command(page, '月を見る道具を教えて', '<書く客>');
  await expect.poll(() => page.evaluate(() => (window as any).journeyWorker.generations)).toBe(1);
  await page.clock.runFor(2000);
  const input = page.locator('#command'); await input.fill('まだ書いています'); await input.dispatchEvent('compositionstart');
  await page.evaluate(() => (window as any).completeOlt());
  await expect.poll(async () => (await speech(page)).length).toBe(1);
  await expect(page.locator('.output')).not.toContainText('星の観察、いいですね。');
  await expect(input).toHaveValue('まだ書いています'); await expect(input).toBeFocused();
  await input.dispatchEvent('compositionend'); await input.fill('');
  // Set the existing persisted display preference before the next production read.
  await page.evaluate(async () => {
    const r = indexedDB.open('pcvan-local');
    const db = await new Promise<IDBDatabase>((resolve) => { r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ id: 'terminal-display', value: { version: 1, theme: 'white', speed: '300', effects: false } });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  await advance(page, 1);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText('表示キュー');
  await page.clock.runFor(9000);
  await expect(page.locator('.output')).toContainText('星の観察、いいですね。');
  await page.clock.runFor(250);
  await expect(page.locator('.ai-status')).toContainText('表示完了');
  const status = await page.locator('.ai-status').textContent();
  expect(status).toMatch(/生成終了=2000/);
});

test('visible idle visit starts and continues resident topics, with quiet gaps and finite capacity', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'chatter'); await start(page, '読む客'); await residents(page); await consent(page); await room(page);
  const counts: number[] = [];
  for (let i = 0; i < 60; i++) {
    await page.clock.runFor(5000);
    await new Promise((resolve) => setTimeout(resolve, 15));
    counts.push((await speech(page)).length);
  }
  const lines = await speech(page);
  expect(lines.length).toBeGreaterThanOrEqual(3); expect(lines.length).toBeLessThanOrEqual(10);
  expect(new Set(lines.map((l) => l.authorId)).size).toBe(2);
  expect(counts.some((n, i) => i > 3 && n === counts[i - 4])).toBe(true);
  expect(lines.some((l, i) => i && Date.parse(l.createdAt) - Date.parse(lines[i - 1]!.createdAt) >= 60_000)).toBe(true);
  const worker = await page.evaluate(() => (window as any).journeyWorker);
  expect(worker.generations).toBe(lines.length);
  expect((await state(page))!.organicAttempts).toBeLessThanOrEqual(16);
  await command(page, '/LEAVE', '退出');
  const count = lines.length; await advance(page, 20); expect(await speech(page)).toHaveLength(count);
});


test('authorized cold engine is distinguished from a warm reply and repeated human lines keep distinct events', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '話す客'); await residents(page); await consent(page); await room(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await command(page, '月を見る道具を教えて', '<話す客>');
  await expect.poll(async () => (await speech(page)).length).toBe(1);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText('cold');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  // Same words are two separate durable events, and bypass resident cooldowns.
  await command(page, '月を見る道具を教えて', '<話す客>');
  await expect.poll(async () => (await speech(page)).length).toBe(2);
  expect((await state(page))!.attempts).toBe(2);
  expect(await page.evaluate(() => (window as any).journeyWorker.loads)).toBe(2);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText('warm');
});

test('model activity contention expires a human wait without inference or an unbounded queue', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '待つ客'); await residents(page); await consent(page); await room(page);
  await page.evaluate(() => new Promise<void>((resolve) => {
    void navigator.locks.request('pcvan-ai-activity', () => new Promise<void>((release) => { Object.assign(window, { releaseActivity: release }); resolve(); }));
  }));
  await command(page, '月を見る道具を教えて', '<待つ客>');
  await advance(page, 22);
  await expect.poll(async () => {
    const r = (await state(page))!.rooms[1]!;
    return r.handledNumber >= r.lines.find((l) => l.kind === 'say' && l.origin === 'local-human')!.number;
  }).toBe(true);
  expect((await state(page))!.attempts).toBe(0);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText('返信待ち期限切れ');
  await page.evaluate(() => (window as any).releaseActivity());
  expect(await speech(page)).toHaveLength(0);
});


for (const mode of ['unconsented', 'quiet', 'capped'] as const) test(`Options explains an honest silent room: ${mode}`, async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '読む客'); await residents(page, mode === 'quiet');
  if (mode !== 'unconsented') await consent(page);
  await room(page);
  if (mode === 'capped') await page.evaluate(async () => {
    const request = indexedDB.open('pcvan-local');
    const db = await new Promise<IDBDatabase>((resolve) => { request.onsuccess = () => resolve(request.result); });
    const tx = db.transaction('settings', 'readwrite'), row = tx.objectStore('settings').get('olt-rooms');
    row.onsuccess = () => { row.result.value.attempts = 24; tx.objectStore('settings').put(row.result); };
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  await command(page, '月を見る道具を教えて', '<読む客>'); await advance(page, 1);
  expect(await speech(page)).toHaveLength(0);
  expect(await page.evaluate(() => (window as any).journeyWorker.generations)).toBe(0);
  if (mode === 'unconsented') expect(await page.evaluate(() => (window as any).journeyWorker.loads)).toBe(0);
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).toContainText(mode === 'unconsented' ? 'モデル未同意・活動休止' : mode === 'quiet' ? '適任の在室住人なし' : '時間枠の上限');
  await expect(page.locator('.output')).not.toContainText('OLT 経過 ms');
});
