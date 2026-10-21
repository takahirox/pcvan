import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { command, start, settings, snapshot, noOtherUi, enterForum, post } from './terminal-helpers';
import { mockWorker, mockModel } from './ai-helpers';

async function mockState(page: Page) {
  return page.evaluate(() => (window as unknown as { aiMock: { mode: string; loads: string[]; prompts: unknown[]; disposed: number } }).aiMock);
}
async function mode(page: Page, value: string) {
  await page.evaluate((value) => { (window as unknown as { aiMock: { mode: string } }).aiMock.mode = value; }, value);
}
async function load(page: Page) {
  await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('モデル準備完了');
}

test('typed consent rejects blank, malformed and refusal; model selection, preview and save preserve provenance', async ({ page }) => {
  await mockModel(page); await start(page, '投稿者', 'http://127.0.0.1:14374'); await settings(page, 3);
  expect((await mockState(page)).loads).toEqual([]);
  await command(page, 'MODEL 2', 'モデルを選択'); await command(page, 'LOAD', '数百 MB〜数 GB');
  for (const line of ['', 'YES', 'LOAD', 'READ 1']) await command(page, line, 'Y / N');
  expect((await mockState(page)).loads).toEqual([]);
  await command(page, 'N', '操作を中止'); expect((await mockState(page)).loads).toEqual([]);
  await load(page); expect((await mockState(page)).loads).toEqual(['Qwen2.5-1.5B-Instruct-q4f16_1-MLC']);
  await command(page, 'PERSONA 2', '投稿者を選択'); await command(page, 'FORUM 1', '投稿先を選択');
  await command(page, 'REPLY 1', '返信先: 1'); await command(page, 'GENERATE', '生成中');
  await expect(page.locator('.output')).toContainText('投稿案（未保存）');
  expect((await snapshot(page)).posts).toHaveLength(30);
  await command(page, 'PREVIEW', '星の話題'); await command(page, 'SEND', '保存しますか');
  await command(page, 'Y'); await expect(page.locator('.output')).toContainText('AI 投稿を保存しました');
  await command(page, 'Y', 'HELP でモデル');
  const saved = await snapshot(page), created = saved.posts.find((p) => p.origin.startsWith('local-ai:'))!;
  expect(saved.posts).toHaveLength(31);
  expect(created).toMatchObject({ authorId: 'fictional-ai:kusabue', origin: 'local-ai:webllm:Qwen2.5-1.5B-Instruct-q4f16_1-MLC', body: '日本語の本文。\n次の行。' });
  expect(created.replyToPostId).toBeTruthy();
  await command(page, 'ABOUT', `origin=${created.origin}`); await noOtherUi(page);
});

test('cancel pending download and inference ignores late results; retry works and manual posting remains usable', async ({ page }) => {
  await mockModel(page); await start(page, '試す人', 'http://127.0.0.1:14374'); await settings(page, 3);
  await mode(page, 'load-wait'); await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('42%');
  await command(page, 'STOP', 'キャンセル');
  await page.evaluate(() => { (window as unknown as { aiMock: { complete(): void; mode: string } }).aiMock.complete(); });
  await mode(page, 'ok'); await load(page);
  await mode(page, 'wait'); await command(page, 'GENERATE', '生成中');
  await expect.poll(async () => (await mockState(page)).prompts.length).toBe(1);
  await command(page, 'MAIN', 'MAIN'); await enterForum(page); await command(page, 'READ 1', '★内容');
  await command(page, 'STOP', 'キャンセル');
  await page.evaluate(() => { (window as unknown as { aiMock: { complete(): void } }).aiMock.complete(); });
  await settings(page, 3); await command(page, 'PREVIEW', '投稿案はありません');
  expect((await snapshot(page)).posts).toHaveLength(30);
  await command(page, 'MAIN', 'MAIN'); await enterForum(page); await post(page, '手動投稿', 'AI なしで投稿');
  expect((await snapshot(page)).posts).toHaveLength(31);
});

for (const failureMode of ['load-fail', 'fail', 'malformed']) {
  test(`${failureMode} reports errors in transcript and never saves a post`, async ({ page }) => {
    await mockModel(page); await start(page, undefined, 'http://127.0.0.1:14374'); await settings(page, 3);
    if (failureMode !== 'load-fail') await load(page);
    await mode(page, failureMode);
    if (failureMode === 'load-fail') { await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y'); }
    else await command(page, 'GENERATE', '生成中');
    await expect(page.locator('.output')).toContainText('端末・閲覧・手動投稿は利用できます');
    expect((await snapshot(page)).posts).toHaveLength(30);
    await command(page, 'MAIN', 'MAIN'); await enterForum(page); await command(page, 'READ 1', '★内容');
  });
}

test('generation previews share the visit attempt budget and discard never saves', async ({ page }) => {
  await mockModel(page); await start(page, undefined, 'http://127.0.0.1:14374'); await settings(page, 3); await load(page);
  for (let i = 0; i < 12; i++) {
    await command(page, 'GENERATE');
    await expect.poll(async () => (await mockState(page)).prompts.length).toBe(i + 1);
    await command(page, 'PREVIEW', '星の話題'); await command(page, 'DISCARD', '破棄しました');
  }
  await command(page, 'GENERATE', '試行上限');
  expect((await mockState(page)).prompts).toHaveLength(12);
  expect((await snapshot(page)).posts).toHaveLength(30);
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

for (const result of ['ok', 'invalid', 'failure'] as const) {
  test(`production worker ${result} remains lazy until terminal consent`, async ({ page }) => {
    await mockWorker(page, result); await start(page); await settings(page, 3);
    await command(page, 'LOAD', '同意してモデル');
    await command(page, 'Y'); await expect(page.locator('.output')).toContainText('モデル準備完了');
    await command(page, 'GENERATE', '生成中');
    await expect(page.locator('.output')).toContainText(result === 'ok' ? '投稿案（未保存）' : '端末・閲覧・手動投稿は利用できます');
    expect((await snapshot(page)).posts).toHaveLength(30);
  });
}
