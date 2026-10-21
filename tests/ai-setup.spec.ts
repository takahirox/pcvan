import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AiActivity, Backup } from '../src/storage/schema';
import { openSettings, closeSettings, loadModel } from './settings-helpers';
import { backupFixture } from './backup-fixture';

const origin = 'http://127.0.0.1:14374';
const modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
async function mock(page: Page, supported = true) {
  await page.addInitScript((gpu) => {
    Object.defineProperty(navigator, 'gpu', { value: gpu ? {} : undefined, configurable: true });
    window.aiMock = { mode: 'ok', loads: [], prompts: [], disposed: 0 };
  }, supported);
  await page.route('**/src/ai/webllm-adapter.ts', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export const modelWeightsCached = async () => false;
    export function createWebLlmAdapter() {
      return {
        async load(id, progress, signal) {
          window.aiMock.loads.push(id); progress(.42);
          if (window.aiMock.mode === 'load-fail') throw new Error('GPU / storage unavailable');
          if (window.aiMock.mode === 'load-wait') await new Promise(resolve => window.aiMock.complete = resolve);
        },
        async generate() { throw new Error('Unexpected inference'); },
        dispose() { window.aiMock.disposed++; }
      };
    }` }));
}
async function snapshot(page: Page): Promise<Backup> {
  return page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path);
    const repo = await openRepository();
    try { return await repo.exportBackup(); } finally { repo.close(); }
  });
}
function activity(content: Backup) {
  return content.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
}
async function expectNoLoad(page: Page) {
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([]);
  expect(activity(await snapshot(page)).consent).toBe(false);
}
async function command(page: Page, line: string) {
  await page.locator('#command').fill(line); await page.locator('#command').press('Enter');
  await expect(page.locator('.output')).toContainText(`> ${line}`);
}

test('fresh invitation is outside the transcript; visit, declining, Escape and IME never load a model', async ({ page }) => {
  let imports = 0;
  page.on('request', (request) => { if (request.url().includes('webllm-adapter')) imports++; });
  await mock(page); await page.goto(origin);
  await expect(page.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await expect(page.getByRole('complementary', { name: 'AIモデルの準備', exact: true })).toBeVisible();
  await expect(page.locator('.ai-setup-status')).toHaveAttribute('role', 'status');
  await expect(page.locator('.ai-setup-status')).toContainText('ローカルAI機能を利用するにはモデルの読み込みが必要です。');
  await expect(page.locator('.ai-setup')).not.toHaveClass(/compact/);
  expect(await page.locator('.ai-setup').innerText()).not.toMatch(/AI住人|10人|架空|シミュレーション/);
  await expect(page.locator('#command')).toBeFocused();
  expect((await snapshot(page)).posts).toHaveLength(30);
  await command(page, 'J MITI'); await command(page, '3'); await command(page, '9'); await command(page, 'READ 1');
  await expect(page.locator('.output')).toContainText('★タイトル (半田ごて)');
  await expect(page.locator('.output')).not.toContainText('fictional-ai:');
  await page.locator('#command').fill('書きかけ　ｶﾅ');
  const before = await page.locator('.output').textContent();
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-consent')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'AIモデルを読み込む', exact: true })).toBeVisible();
  await expect(page.locator('.ai-consent')).toContainText('AI が架空の掲示板投稿を生成します。');
  await expect(page.locator('.ai-consent')).not.toContainText('住人');
  await expect(page.locator('.ai-consent-close')).toBeFocused();
  await expect(page.locator('.ai-consent')).toContainText('数百 MB〜数 GB');
  await expect(page.locator('.ai-consent')).toContainText('ブラウザーの保存領域と WebGPU / GPU メモリ');
  await expect(page.locator('.ai-consent')).toContainText('Hugging Face / MLC / GitHub');
  await expect(page.locator('.ai-consent')).toContainText('すべてこの端末内');
  await page.keyboard.press('Tab'); await expect(page.locator('.ai-consent .ai-model')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('.ai-consent-close')).toBeFocused();
  await page.locator('.ai-consent').dispatchEvent('compositionstart');
  await page.keyboard.press('Escape'); await expect(page.locator('.ai-consent')).toBeVisible();
  await page.locator('.ai-consent').dispatchEvent('compositionend');
  await page.keyboard.press('Escape'); await expect(page.locator('.ai-consent')).toBeHidden();
  await expect(page.locator('.ai-setup-start')).toBeFocused();
  await page.locator('.ai-setup-start').click(); await page.locator('.ai-consent-close').click();
  await expectNoLoad(page);
  expect(imports).toBe(0);
  expect(await page.locator('.output').textContent()).toBe(before);
  await expect(page.locator('#command')).toHaveValue('書きかけ　ｶﾅ');
  await expect(page.locator('.settings-dialog')).toBeHidden();
});

test('deferral survives reload/reconnect; reentry shows progress, cancellation, failure/retry and genuine readiness', async ({ page }) => {
  await mock(page); await page.goto(origin);
  await page.locator('.ai-setup-later').click();
  await expect(page.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await expect(page.locator('.ai-setup')).toHaveClass(/compact/);
  await expect(page.locator('#command')).toBeFocused();
  expect(activity(await snapshot(page))).toMatchObject({ consent: false, maxPosts: 4, setupDeferred: true });
  await page.reload();
  await expect(page.locator('.ai-setup-later')).toBeHidden();
  await command(page, 'Q'); await command(page, 'RECONNECT');
  await expect(page.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await expectNoLoad(page);
  await page.evaluate(() => { window.aiMock.mode = 'load-wait'; });
  await page.locator('.ai-setup-start').click();
  await expectNoLoad(page);
  await page.locator('.ai-consent-confirm').click();
  await expect(page.locator('.ai-setup-status')).toContainText('42%');
  await expect(page.locator('.ai-setup-status')).toContainText('AIモデルを読み込み中…');
  await expect(page.locator('.ai-setup-progress')).toHaveAttribute('value', '0.42');
  expect(activity(await snapshot(page)).consent).toBe(true);
  await expect(page.locator('.ai-setup-status')).not.toContainText('準備完了');
  await command(page, 'J MITI');
  await page.locator('.ai-setup-stop').click();
  await expect(page.locator('#command')).toBeFocused();
  await expect(page.locator('.ai-setup-status')).toContainText('キャンセル');
  await page.evaluate(() => { window.aiMock.complete?.(); window.aiMock.mode = 'load-fail'; });
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-setup-status')).toContainText('読み込み失敗');
  await expect(page.locator('.ai-setup-start')).toHaveText('読み込みを再試行');
  await expect(page.locator('.ai-consent')).toBeHidden();
  await page.evaluate(() => { window.aiMock.mode = 'ok'; });
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-setup-status')).toContainText('モデル準備完了');
  await expect(page.locator('.ai-setup')).toHaveClass(/compact/);
  await expect(page.locator('.ai-setup-start')).toBeHidden();
  await expect(page.locator('.ai-setup-later')).toBeHidden();
  await expect(page.locator('.ai-setup-progress')).toBeHidden();
  await expect(page.locator('.ai-setup-status')).not.toContainText('投稿');
  expect(await page.evaluate(() => window.aiMock.loads.length)).toBe(3);
  expect((await snapshot(page)).posts).toHaveLength(30);
  await page.locator('.ai-setup-options').click();
  await expect(page.locator('.ai-activity-message')).toBeVisible();
  await page.locator('.ai-activity-disable').click(); await closeSettings(page);
  await expect(page.locator('.ai-setup-status')).toContainText('休止中');
  await expect(page.locator('.ai-setup-later')).toBeHidden();
});

for (const profile of ['unsupported', 'consented', 'disabled'] as const) {
  test(`${profile} profile gets an accurate compact status without a new invitation or download`, async ({ page }) => {
    await mock(page, profile !== 'unsupported'); await page.goto(origin);
    await expect(page.locator('.ai-setup')).toBeVisible();
    if (profile !== 'unsupported') {
      await page.evaluate(async ({ profile, modelId }) => {
        const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
        const repo = await openRepository();
        if (profile === 'disabled') await repo.configureActivity(0, modelId);
        else await repo.authorizeModel(modelId);
        repo.close();
      }, { profile, modelId });
      await page.reload();
    }
    await expect(page.locator('.ai-setup-later')).toBeHidden();
    await expect(page.locator('.ai-setup-status')).toContainText(profile === 'unsupported' ? 'WebGPU' : profile === 'disabled' ? '休止中' : '同意済み');
    if (profile !== 'consented') await expect(page.locator('.ai-setup-start')).toBeHidden();
    expect(await page.evaluate(() => window.aiMock.loads)).toEqual([]);
    await command(page, 'HELP');
    expect((await snapshot(page)).posts).toHaveLength(30);
  });
}

test('Settings uses the same model selector and consent flow, retaining selection and focus after declining', async ({ page }) => {
  await mock(page); await page.goto(origin); await openSettings(page, 'ai');
  const selected = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
  await page.locator('.ai-model').selectOption(selected);
  await page.locator('.ai-load').click();
  await expect(page.locator('.ai-consent .ai-model')).toHaveValue(selected);
  await page.locator('.ai-consent-close').click();
  await expect(page.locator('.ai-load')).toBeFocused();
  await expectNoLoad(page);
  await loadModel(page);
  await expect(page.locator('.ai-message')).toContainText('モデル準備完了');
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([selected]);
  await expect(page.locator('.settings-dialog .ai-model')).toHaveCount(1);
  await closeSettings(page);
  await expect(page.locator('.ai-setup-status')).toContainText('モデル準備完了');
});

test('saving a different model in Settings requires new consent before scheduled or manual loading', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T00:00:00.000Z'));
  await mock(page); await page.goto(origin);
  await page.locator('.ai-setup-start').click(); await page.locator('.ai-consent-confirm').click();
  await expect(page.locator('.ai-setup-status')).toContainText('モデル準備完了');
  const selected = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
  await openSettings(page, 'ai');
  await page.locator('.ai-model').selectOption(selected);
  await page.locator('.ai-activity-save').click();
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  expect(activity(await snapshot(page))).toMatchObject({ modelId: selected, consent: false });
  await closeSettings(page);
  // Run the actual scheduled-activity check after enough time for resident work.
  const later = '2026-10-24T00:00:00.000Z';
  await page.clock.setFixedTime(new Date(later));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => activity(await snapshot(page)).lastActivityAt).toBe(later);
  expect(activity(await snapshot(page)).batch).toBeNull();
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([modelId]);
  await openSettings(page, 'ai'); await page.locator('.ai-load').click();
  await expect(page.locator('.ai-consent .ai-model')).toHaveValue(selected);
  await page.locator('.ai-consent-close').click();
  expect(activity(await snapshot(page)).consent).toBe(false);
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([modelId]);
  await page.locator('.ai-load').click(); await page.locator('.ai-consent-confirm').click();
  await expect(page.locator('.ai-message')).toContainText('モデル準備完了');
  expect(activity(await snapshot(page))).toMatchObject({ modelId: selected, consent: true });
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([modelId, selected]);
});

test('multiple tabs re-evaluate deferral, consent, pause and re-enable; stale confirmation cannot authorize', async ({ page, context }) => {
  await mock(page); await page.goto(origin);
  const other = await context.newPage(); await mock(other); await other.goto(origin);
  await page.locator('.ai-setup-later').click();
  await expect(other.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await other.locator('.ai-setup-start').click();
  await expect(other.locator('.ai-consent')).toBeVisible();
  await openSettings(page, 'ai'); await page.locator('.ai-activity-disable').click();
  await expect(other.locator('.ai-consent')).toBeHidden();
  await expect(other.locator('.ai-setup-status')).toContainText('休止中');
  await expectNoLoad(other);
  await page.locator('.ai-activity-cap').fill('4'); await page.locator('.ai-activity-save').click();
  await expect(other.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await other.locator('.ai-setup-start').click(); await other.locator('.ai-consent-confirm').click();
  await expect(other.locator('.ai-setup-status')).toContainText('モデル準備完了');
  await closeSettings(page);
  await expect(page.locator('.ai-setup-status')).toContainText('同意済み');
  await expect(page.locator('.ai-setup-status')).not.toContainText('準備完了');
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([]);
});

test('restore replaces deferred/ready UI with current world state and never reseeds imported history', async ({ page }) => {
  await mock(page); await page.goto(origin);
  await page.locator('.ai-setup-later').click();
  await openSettings(page, 'storage');
  const fixture = backupFixture();
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'world.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.locator('.storage-status')).toContainText('バックアップを復元しました');
  await closeSettings(page);
  await expect(page.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await page.locator('.ai-setup-start').click(); await page.locator('.ai-consent-confirm').click();
  await expect(page.locator('.ai-setup-status')).toContainText('モデル準備完了');
  expect((await snapshot(page)).posts).toEqual(fixture.posts);
  // An external restore with identical configuration still invalidates loaded work.
  const saved = await snapshot(page);
  await page.evaluate(async (saved) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository(); await repo.replaceFromJson(JSON.stringify(saved), { confirmReplace: true }); repo.close();
  }, saved);
  await expect(page.locator('.ai-setup-status')).not.toContainText('準備完了');
  await expect(page.locator('.ai-setup-status')).toContainText('同意済み');
});

test('stale setup tokens reject authorization and deferral atomically; malformed deferral fails restore', async ({ page }) => {
  await mock(page); await page.goto(origin);
  await expect(page.locator('.ai-setup')).toBeVisible();
  const result = await page.evaluate(async (modelId) => {
    const path = '/src/storage/repository.ts'; const a = '/src/ai/activity.ts';
    const { openRepository } = await import(path); const { setupContext } = await import(a);
    const repo = await openRepository(); const before = await repo.exportBackup(); const token = setupContext(before);
    await repo.configureActivity(0, modelId);
    const failures = [];
    for (const operation of [() => repo.authorizeModel(modelId, undefined, token), () => repo.deferAiSetup(token)]) {
      try { await operation(); } catch { failures.push(true); }
    }
    const paused = await repo.exportBackup();
    const malformed = structuredClone(before);
    malformed.settings.find((r: {id: string}) => r.id === 'ai-activity').value.setupDeferred = 'yes';
    try { await repo.replaceFromJson(JSON.stringify(malformed), { confirmReplace: true }); } catch { failures.push(true); }
    const after = await repo.exportBackup(); repo.close(); return { failures, paused, after };
  }, modelId);
  expect(result.failures).toHaveLength(3);
  expect(result.after).toEqual(result.paused);
  expect(activity(result.after)).toMatchObject({ maxPosts: 0, consent: false });
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([]);
});

test('narrow viewport keeps the invitation, consent actions and command input reachable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await mock(page); await page.goto(origin);
  await expect(page.locator('.ai-setup-start')).toBeInViewport();
  await expect(page.locator('#command')).toBeInViewport();
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-consent-close')).toBeInViewport();
  await expect(page.locator('.ai-consent-confirm')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.keyboard.press('Escape'); await command(page, 'HELP');
  await expectNoLoad(page);
});

test('model changes invalidate open confirmation; restoring during download ignores late readiness and requires current-world consent', async ({ page }) => {
  await mock(page); await page.goto(origin);
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-consent')).toBeVisible();
  const selected = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
  await page.evaluate(async (selected) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository(); await repo.configureActivity(4, selected); repo.close();
  }, selected);
  await expect(page.locator('.ai-consent')).toBeHidden();
  await expectNoLoad(page);
  await page.evaluate(() => { window.aiMock.mode = 'load-wait'; });
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-consent .ai-model')).toHaveValue(selected);
  await page.locator('.ai-consent-confirm').click();
  await expect(page.locator('.ai-setup-status')).toContainText('42%');
  await expect(page.locator('#command')).toBeFocused();
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([selected]);
  // A different imported world must neither inherit readiness nor receive old results.
  await page.evaluate(async (fixture) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository(); await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true }); repo.close();
  }, backupFixture());
  await expect(page.locator('.ai-setup-start')).toHaveText('モデルを読み込む');
  await page.evaluate(() => { window.aiMock.complete?.(); window.aiMock.mode = 'ok'; });
  await expect(page.locator('.ai-setup-status')).not.toContainText('準備完了');
  expect((await snapshot(page)).posts).toEqual(backupFixture().posts);
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-consent .ai-model')).toHaveValue(modelId);
  expect(activity(await snapshot(page)).consent).toBe(false);
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([selected]);
  await page.locator('.ai-consent-confirm').click();
  await expect(page.locator('.ai-setup-status')).toContainText('モデル準備完了');
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([selected, modelId]);

});


test('restored legacy opt-in remains authorized without showing a new invitation or confirmation', async ({ page }) => {
  await mock(page); await page.goto(origin);
  const fixture = backupFixture();
  fixture.settings.push({ id: 'ai-activity', value: {
    version: 1, maxPosts: 4, modelId, lastActivityAt: new Date().toISOString(), batch: null,
  } });
  await page.evaluate(async (fixture) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository(); await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true }); repo.close();
  }, fixture);
  await expect(page.locator('.ai-setup-status')).toContainText('同意済み');
  await expect(page.locator('.ai-setup-later')).toBeHidden();
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([]);
  await page.locator('.ai-setup-start').click();
  await expect(page.locator('.ai-setup-status')).toContainText('モデル準備完了');
  await expect(page.locator('.ai-consent')).toBeHidden();
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual([modelId]);
  expect((await snapshot(page)).posts).toEqual(fixture.posts);
});
