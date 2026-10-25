import type { Page } from '@playwright/test';
import type { AiActivity } from '../src/storage/schema';
import type { ResidentSettings } from '../src/ai/personas';
import type { OltState } from '../src/olt-state';
import { random } from '../src/ai/activity';
import { command, snapshot } from './terminal-helpers';

export const epoch = new Date('2026-10-21T13:04:00Z'); // 22:04 JST, inside the visit window.
export const state = async (page: Page) => (await snapshot(page)).settings.find((s) => s.id === 'olt-rooms')?.value as unknown as OltState | undefined;
export const speech = async (page: Page) => (await state(page))?.rooms.flatMap((r) => r.lines).filter((l) => l.origin.startsWith('local-ai:')) ?? [];
export async function directory(page: Page, context: 'daisizen' | 'wakaba' = 'daisizen') {
  await command(page, 'MAIN', 'MAIN');
  if (context === 'wakaba') { await command(page, '16', '通信が初めて'); await command(page, '2', '部屋一覧'); return; }
  await command(page, '13', 'コミュニケーション');
  await command(page, '2', '大自然'); await command(page, 'OLT', '部屋一覧');
}
export async function room(page: Page, n = 2, context: 'daisizen' | 'wakaba' = 'daisizen') { await directory(page, context); await command(page, `JOIN ${n}`, '発言='); }
export async function advance(page: Page, ticks: number) {
  // Let the command queue, worker microtasks and IDB settle between paced ticks.
  for (let i = 0; i < ticks; i++) {
    await page.clock.runFor(3000);
    await page.evaluate(() => new Promise<void>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => { r.result.close(); resolve(); }; }));
  }
}
export async function residents(page: Page, quiet = false, board = 'MITI:9', at = epoch) {
  const data = await snapshot(page), aiRow = data.settings.find((r) => r.id === 'ai-activity')!, residentRow = data.settings.find((r) => r.id === 'ai-residents')!;
  const oltRow = data.settings.find((r) => r.id === 'olt-rooms')!;
  // Replace the fixture timeline as well as its seed/profiles. A connection has
  // already reconciled attendance, which must not leak into this seeded setup.
  (oltRow.value as unknown as OltState).rooms.forEach((r) => { r.residents = []; r.pending = null; });
  const ai = aiRow.value as unknown as AiActivity, profiles = (residentRow.value as unknown as ResidentSettings).profiles;
  const day = Math.floor((at.getTime() + 540 * 60_000) / 86_400_000);
  const localHour = new Date(at.getTime() + 540 * 60_000).getUTCHours();
  const hours = at === epoch ? [22] : [(localHour + 23) % 24, localHour];
  const selected = profiles.slice(0, 2);
  let seed = '';
  for (let i = 0; i < 10000; i++) {
    seed = `olt-test-${i}`;
    if (selected.every((p) => {
      const cycle = 65 * 60_000, phase = random(`${seed}:olt:${p.id}:phase`) * cycle;
      const slot = Math.floor((at.getTime() - phase) / cycle);
      const draw = (key: string) => random(`${seed}:olt:${p.id}:${slot}:${key}`);
      const end = slot * cycle + phase + 60 * (.7 + draw('duration') * .3) * 60_000;
      return slot * cycle + phase >= at.getTime() - 4 * 60_000 && draw('visit') < .95 && random(`${seed}:olt:${p.id}:away:${day}`) >= .12 &&
        draw('explore') > .15 && end > at.getTime() + 8 * 60_000;
    })) break;
  }
  Object.assign(ai, { seed, batch: null, nextDue: Object.fromEntries(profiles.map((p) => [p.id, new Date(at.getTime() + 3_600_000).toISOString()])) });
  for (const [i, p] of profiles.entries()) Object.assign(p, { frequency: i < 2 ? 1 : 0, participation: 1, sessionMinutes: 60,
    preferredBoards: [board], weekdayHours: hours, weekendHours: hours, reply: 1, inactivity: quiet ? 1 : 0 });
  await page.evaluate(async (rows) => {
    const r = indexedDB.open('pcvan-local'); const db = await new Promise<IDBDatabase>((resolve) => { r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve) => { const tx = db.transaction('settings', 'readwrite'); for (const row of rows) tx.objectStore('settings').put(row); tx.oncomplete = () => resolve(); }); db.close();
  }, [aiRow, residentRow, oltRow]);
}
