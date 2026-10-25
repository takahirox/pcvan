import { expect, test } from '@playwright/test';
import { command, start, settings, snapshot } from './terminal-helpers';
import { mockModel } from './ai-helpers';

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
