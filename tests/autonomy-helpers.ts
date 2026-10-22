import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { snapshot } from './terminal-helpers';
import { random } from '../src/ai/activity';
import type { AiActivity, JsonValue } from '../src/storage/schema';
import type { ResidentSettings } from '../src/ai/personas';

export const epoch = new Date('2026-10-21T00:00:00Z');
export const hour = 3_600_000;

/** Deterministic lifestyles/due times only; the app must plan, infer and commit. */
export async function lifestyles(page: Page, cap = 4) {
  const data = await snapshot(page);
  const activity = data.settings.find((r) => r.id === 'ai-activity')!;
  const state = activity.value as unknown as AiActivity;
  const residents = data.settings.find((r) => r.id === 'ai-residents')!;
  const profiles = (residents.value as unknown as ResidentSettings).profiles;
  const now = await page.evaluate(() => Date.now());
  const localDay = Math.floor((now + 540 * 60_000) / (24 * hour));
  let seed = '';
  for (let n = 0; n < 1000; n++) {
    seed = `autonomy-${n}`;
    if (profiles.slice(0, 2).every((p, i) => random(`${seed}:${p.id}:away:${Math.floor(localDay / 3)}`) >= .12 &&
      random(`${seed}:${p.id}:${now + (i + 1) * hour}:explore`) > .1)) break;
  }
  Object.assign(state, { seed, maxPosts: cap, nextDue: Object.fromEntries(profiles.map((p, i) =>
    [p.id, new Date(now + (i + 1) * hour).toISOString()])) });
  for (const [i, p] of profiles.entries()) Object.assign(p, {
    frequency: i < 2 ? 1 : 0, participation: 1, preferredBoards: ['MITI:9'],
    weekdayHours: Array.from({ length: 24 }, (_, i) => i), weekendHours: Array.from({ length: 24 }, (_, i) => i),
    reading: 0, inactivity: 0, newThread: 0, reply: 1,
    interests: i === 0 ? ['人間の星'] : ['創作'], affinities: i === 1 ? { hoshimori: 1 } : {},
  });
  await page.evaluate(async (rows) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      for (const row of rows) tx.objectStore('settings').put(row);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  }, [activity, residents] as { id: string; value: JsonValue }[]);
}

export async function consent(page: Page) {
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await page.getByRole('button', { name: 'モデルを読み込む', exact: true }).click();
  await expect(page.locator('.confirmation-copy')).toContainText('数百 MB〜数 GB');
  await page.getByRole('button', { name: '同意してモデルを読み込む', exact: true }).click();
  await expect(page.locator('.ai-status')).toContainText('モデル準備完了');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
}

export async function generated(page: Page) { return (await snapshot(page)).posts.filter((p) => p.simulation); }
