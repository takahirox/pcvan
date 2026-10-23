import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AiActivity } from '../src/storage/schema';
import type { ResidentSettings } from '../src/ai/personas';
import type { OltState } from '../src/olt-state';
import { random } from '../src/ai/activity';
import { mockWorker, mockPendingWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { command, start, snapshot, noOtherUi, enterForum, post, backup, restore } from './terminal-helpers';

const epoch = new Date('2026-10-21T13:04:00Z'); // 22:04 JST, inside the visit window.
const state = async (page: Page) => (await snapshot(page)).settings.find((s) => s.id === 'olt-rooms')?.value as unknown as OltState | undefined;
const speech = async (page: Page) => (await state(page))?.rooms.flatMap((r) => r.lines).filter((l) => l.origin.startsWith('local-ai:')) ?? [];
async function directory(page: Page) {
  await command(page, 'MAIN', 'MAIN'); await command(page, '13', 'コミュニケーション');
  await command(page, '2', '大自然'); await command(page, 'OLT', '部屋一覧');
}
async function room(page: Page, n = 2) { await directory(page); await command(page, `JOIN ${n}`, '発言='); }
async function advance(page: Page, ticks: number) {
  // Let the command queue, worker microtasks and IDB settle between paced ticks.
  for (let i = 0; i < ticks; i++) {
    await page.clock.runFor(3000);
    await page.evaluate(() => new Promise<void>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => { r.result.close(); resolve(); }; }));
  }
}
async function residents(page: Page, quiet = false) {
  const data = await snapshot(page), aiRow = data.settings.find((r) => r.id === 'ai-activity')!, residentRow = data.settings.find((r) => r.id === 'ai-residents')!;
  const ai = aiRow.value as unknown as AiActivity, profiles = (residentRow.value as unknown as ResidentSettings).profiles;
  const slot = Math.floor(epoch.getTime() / 1_200_000), day = Math.floor(epoch.getTime() / 86_400_000);
  const selected = profiles.slice(0, 2);
  let seed = '';
  for (let i = 0; i < 10000; i++) {
    seed = `olt-test-${i}`;
    if (selected.every((p) => random(`${seed}:olt:${p.id}:${slot}:visit`) < .9 && random(`${seed}:olt:${p.id}:away:${day}`) >= .12)) break;
  }
  Object.assign(ai, { seed, batch: null, nextDue: Object.fromEntries(profiles.map((p) => [p.id, new Date(epoch.getTime() + 3_600_000).toISOString()])) });
  for (const [i, p] of profiles.entries()) Object.assign(p, { frequency: i < 2 ? 1 : 0, participation: 1,
    preferredBoards: ['MITI:9'], weekdayHours: [22], weekendHours: [22], reply: 1, inactivity: quiet ? 1 : 0 });
  await page.evaluate(async (rows) => {
    const r = indexedDB.open('pcvan-local'); const db = await new Promise<IDBDatabase>((resolve) => { r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve) => { const tx = db.transaction('settings', 'readwrite'); for (const row of rows) tx.objectStore('settings').put(row); tx.oncomplete = () => resolve(); }); db.close();
  }, [aiRow, residentRow]);
}

test('terminal directory, literal commands, IME, history, transitions, handles, reentry and forum posting', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '夜の客'); await room(page);
  await noOtherUi(page);
  await command(page, '/WHO', '夜の客');
  for (const text of ['MAIN', 'BACK', 'WRITE', 'HELP', 'STOP']) await command(page, text, `<夜の客> ${text}`);
  const input = page.locator('#command');
  await input.fill('変換中'); await input.dispatchEvent('compositionstart');
  await input.press('Enter'); await advance(page, 3); await expect(input).toHaveValue('変換中');
  expect((await state(page))!.rooms.flatMap((r) => r.lines).some((l) => l.text === '変換中')).toBe(false);
  await input.dispatchEvent('compositionend'); await input.press('Enter');
  await expect(page.locator('.output')).toContainText('<夜の客> 変換中');
  await input.press('ArrowUp'); await expect(input).toHaveValue('変換中'); await input.fill('');
  await command(page, '//LEAVE', '<夜の客> /LEAVE'); await command(page, '/HELP', '/LEAVE');
  await command(page, '/JOIN 1', '自然の談話室');
  await command(page, '/LEAVE', '部屋を退出'); await command(page, '2', '星と道具');
  const before = await state(page); await command(page, '/JOIN 2', '星と道具');
  expect((await state(page))!.rooms.find((r) => r.id === 'night')!.lines).toEqual(before!.rooms.find((r) => r.id === 'night')!.lines);
  await command(page, '/HANDLE', 'ハンドル設定'); await command(page, 'RENAME 夜更け', '夜更け');
  await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '元の画面');
  await command(page, 'JOIN 2', '発言='); await command(page, '名前を変えました', '<夜更け> 名前を変えました');
  await command(page, '/MAIN', 'MAIN'); await enterForum(page); await post(page, 'OLT帰り', '今夜の星を見ました。');
  await noOtherUi(page); expect(await speech(page)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});

test('delayed human-to-resident and resident-to-resident chat preserve input, shared identities, and private mail', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '星の客');
  await residents(page); await consent(page); await room(page);
  await command(page, '今夜の星について教えて', '<星の客>'); expect(await speech(page)).toHaveLength(0);
  await advance(page, 6); await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
  const first = (await speech(page))[0]!;
  expect(Date.parse(first.createdAt) - epoch.getTime()).toBeGreaterThanOrEqual(8000);
  const input = page.locator('#command'); await input.fill('日本語の途中'); await input.dispatchEvent('compositionstart');
  const output = await page.locator('.output').textContent(); await advance(page, 6);
  expect(await page.locator('.output').textContent()).toBe(output); await expect(input).toHaveValue('日本語の途中'); await expect(input).toBeFocused();
  await input.dispatchEvent('compositionend'); await input.fill(''); await advance(page, 7);
  await expect.poll(async () => (await speech(page)).length).toBeGreaterThanOrEqual(2);
  const lines = await speech(page); expect(lines[1]!.authorId).not.toBe(first.authorId);
  const data = await snapshot(page); expect(data.members.some((m) => m.id === first.authorId && m.actor === 'ai')).toBe(true);
  expect((data.settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity).batch).toBeNull();
  const count = lines.length; await advance(page, 35); expect((await speech(page)).length).toBeLessThanOrEqual(3);
  expect(count).toBeGreaterThan(0);
  await command(page, '/WHO', '参加者'); await noOtherUi(page);
  const prompts = await page.evaluate(() => (window as unknown as { journeyWorker: { prompts: Record<string, unknown>[] } }).journeyWorker.prompts);
  expect(prompts.every((p) => p.kind === 'olt' && !Object.hasOwn(p, 'mail'))).toBe(true);
});

test('silent residents, expiry and reload produce bounded chronology without closed-tab inference', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '静かな客');
  await residents(page, true); await consent(page); await room(page);
  await command(page, 'こんばんは', '<静かな客>'); await advance(page, 10);
  expect(await speech(page)).toEqual([]);
  const before = await state(page); expect(before!.rooms.flatMap((r) => r.residents)).toHaveLength(2);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await room(page);
  const after = await state(page);
  expect(after!.rooms.flatMap((r) => r.lines).filter((l) => l.kind === 'enter')).toHaveLength(before!.rooms.flatMap((r) => r.lines).filter((l) => l.kind === 'enter').length);
  await page.clock.setSystemTime(new Date('2026-10-22T03:00:00Z'));
  await command(page, '/WHO', '参加者：1人');
  expect((await state(page))!.rooms.flatMap((r) => r.residents)).toEqual([]);
  expect(await speech(page)).toEqual([]);
  await command(page, '/LEAVE', '退出');
});

test('two tabs share attendance and arbitrate each AI turn once', async ({ page, context }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '同じ客');
  await residents(page); await consent(page); await room(page);
  const other = await context.newPage(); await other.clock.install({ time: epoch }); await mockWorker(other, 'ok'); await other.goto('/');
  await expect(other.locator('.output')).toContainText('MAIN'); await room(other);
  const joined = await state(page), night = joined!.rooms.find((r) => r.id === 'night')!;
  expect(night.visitors).toHaveLength(2); expect(night.lines.filter((l) => l.kind === 'enter' && l.authorId === night.visitors[0]!.memberId)).toHaveLength(1);
  await command(page, 'ふたりで星を見ています', '<同じ客>');
  await Promise.all([advance(page, 7), advance(other, 7)]);
  await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
  const lines = await speech(page); expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
  const allPrompts = await Promise.all([page, other].map((p) => p.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)));
  expect(allPrompts.reduce((n, v) => n + v, 0)).toBe(lines.length);
  await command(other, '/LEAVE', '退出'); await command(page, '/WHO', '同じ客');
  expect((await state(page))!.rooms.find((r) => r.id === 'night')!.visitors).toHaveLength(1);
});

for (const mode of ['invalid', 'failure', 'unsupported'] as const) {
  test(`${mode} inference preserves terminal room navigation and never fabricates speech`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await mockWorker(page, mode === 'unsupported' ? 'ok' : mode);
    if (mode === 'unsupported') await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
    await start(page, '読む客'); await residents(page);
    if (mode !== 'unsupported') await consent(page);
    await room(page); await command(page, '星の話をしませんか', '<読む客>'); await advance(page, 20);
    expect(await speech(page)).toEqual([]); await command(page, '/WHO', '読む客');
    await command(page, '/LEAVE', '退出'); await noOtherUi(page);
  });
}

test('JSON backup, import and reset preserve transcript and shared authors, then clear OLT baseline', async ({ page }) => {
  await page.clock.install({ time: epoch }); await start(page, '保存する客'); await room(page);
  await command(page, '保存する発言', '<保存する客>'); await command(page, '/LEAVE', '退出');
  const saved = await backup(page), olt = saved.settings.find((s) => s.id === 'olt-rooms')!;
  await command(page, 'JOIN 1', '発言='); await command(page, '変更後', '<保存する客>'); await command(page, '/LEAVE', '退出');
  await restore(page, saved); expect((await snapshot(page)).settings.find((s) => s.id === 'olt-rooms')).toEqual(olt);
  await command(page, 'JOIN 2', '保存する発言'); await command(page, '/LEAVE', '退出');
  await command(page, 'RESET', '初期状態に戻しますか'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  expect(await state(page)).toBeUndefined(); expect((await snapshot(page)).posts).toHaveLength(66);
});

test('pending OLT generation times out, releases its worker, and keeps navigation usable', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockPendingWorker(page, 'generate'); await start(page, '待つ客');
  await residents(page); await consent(page); await room(page); await command(page, 'こんばんは', '<待つ客>');
  await advance(page, 20); expect(await speech(page)).toEqual([]);
  await command(page, '/WHO', '待つ客'); await command(page, '/LEAVE', '退出');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click(); await expect(page.locator('.ai-status')).toContainText('時間切れ');
});

test('leaving or hiding a tab cancels in-flight inference and never commits its late result', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockPendingWorker(page, 'generate'); await start(page, '出入りする客');
  await residents(page); await consent(page); await room(page); await command(page, '星の話', '<出入りする客>');
  await advance(page, 5);
  await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork.includes('chatCompletionNonStreaming'))).toBe(true);
  await command(page, '/JOIN 1', '自然の談話室');
  await expect.poll(async () => (await state(page))!.rooms.find((r) => r.id === 'night')!.pending).toBeNull();
  await command(page, '/JOIN 2', '星と道具'); await command(page, 'もう一度こんばんは', '<出入りする客>');
  await advance(page, 5);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(page, 20); expect(await speech(page)).toEqual([]);
  await expect.poll(async () => (await state(page))!.rooms.find((r) => r.id === 'night')!.pending).toBeNull();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await command(page, '/LEAVE', '退出'); await noOtherUi(page);
});
