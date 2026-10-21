import { openSettings, closeSettings, loadModel } from './settings-helpers';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { backupFixture } from './backup-fixture';
import type { Backup } from '../src/storage/schema';

declare global {
  interface Window {
    aiMock: { mode: string; loads: string[]; prompts: { system: string; user: string; schema: string }[]; disposed: number; complete?: () => void };
  }
}

async function setup(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
    window.aiMock = { mode: 'ok', loads: [], prompts: [], disposed: 0 };
  });
  await page.route('**/src/ai/webllm-adapter.ts', (route) => route.fulfill({ contentType: 'text/javascript', body: String.raw`
    export function createWebLlmAdapter() {
      const mock = window.aiMock;
      return {
        async load(modelId, progress, signal) {
          mock.loads.push(modelId); progress(0.42);
          if (mock.mode === 'load-fail') throw new Error('offline weights unavailable');
          if (mock.mode === 'load-wait') await new Promise((resolve) => { mock.complete = resolve; });
        },
        async generate(prompt, signal) {
          mock.prompts.push(prompt);
          if (mock.mode === 'inference-fail') throw new Error('GPU lost');
          if (mock.mode === 'malformed') return '{"invalid":true}';
          if (mock.mode === 'generate-wait') await new Promise((resolve) => { mock.complete = resolve; });
          const context = JSON.parse(prompt.user);
          return JSON.stringify({ personaId: context.personaId, forumId: context.forumId,
            ...(context.replyToPostId ? { replyToPostId: context.replyToPostId } : {}),
            title: '架空の空だより', body: '星空を眺める工夫を考えました。\nこれは架空の AI の投稿です。' });
        },
        dispose() { mock.disposed++; }
      };
    }
  ` }));
  await page.goto('http://127.0.0.1:14374');
  await openSettings(page, 'ai');
  await expect(page.locator('.storage-status')).toContainText('ローカル保存を利用できます');
}

async function restore(page: Page, fixture = backupFixture()) {
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.locator('.storage-status')).toContainText('バックアップを復元しました');
  await openSettings(page, 'ai');
  await page.locator('.ai-forum').selectOption('forum');
}

async function snapshot(page: Page): Promise<Backup> {
  return page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path);
    const repo = await openRepository();
    try { return await repo.exportBackup(); } finally { repo.close(); }
  });
}

async function load(page: Page) {
  await openSettings(page, 'ai');
  await loadModel(page);
  await expect(page.locator('.ai-message')).toContainText('準備ができました');
}

async function command(page: Page, line: string, response: string) {
  const before = (await page.locator('.output').textContent())!.length;
  await closeSettings(page);
  await page.getByRole('textbox', { name: 'コマンド', exact: true }).fill(line);
  await page.getByRole('textbox', { name: 'コマンド', exact: true }).press('Enter');
  await expect.poll(async () => (await page.locator('.output').textContent())!.slice(before)).toContain(response);
}

test('explicit lazy load, model/persona selection, validated preview and single save persist inspectable AI provenance', async ({ page }) => {
  let imports = 0;
  page.on('request', (request) => { if (request.url().includes('/webllm-adapter.ts')) imports++; });
  await setup(page);
  expect(imports).toBe(0);
  expect((await snapshot(page)).members.filter((m) => m.id.startsWith('fictional-ai:'))).toHaveLength(10);
  await restore(page);
  await openSettings(page, 'ai');
  await page.locator('.ai-model').selectOption('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
  await openSettings(page, 'ai');
  await page.locator('.ai-persona').selectOption('kusabue');
  await openSettings(page, 'ai');
  await page.locator('.ai-reply').selectOption('first');
  await load(page);
  const before = await snapshot(page);
  expect(imports).toBe(1);
  expect(await page.evaluate(() => window.aiMock.loads)).toEqual(['Qwen2.5-1.5B-Instruct-q4f16_1-MLC']);
  await openSettings(page, 'ai');
  await page.locator('.ai-generate').click();
  await expect(page.locator('.ai-preview')).toContainText('草笛 [架空の AI]');
  expect(await snapshot(page)).toEqual(before);
  await page.locator('.ai-send').dblclick();
  await expect(page.locator('.ai-message')).toContainText('AI 投稿を保存しました');
  const after = await snapshot(page);
  expect(after.posts).toHaveLength(before.posts.length + 1);
  const post = after.posts.find((row) => row.number === 8)!;
  expect(post).toMatchObject({ authorId: 'fictional-ai:kusabue', replyToPostId: 'first', forumId: 'forum', origin: 'local-ai:webllm:Qwen2.5-1.5B-Instruct-q4f16_1-MLC' });
  await expect(page.locator('.ai-records')).toContainText(`actor=ai / origin=${post.origin}`);
  expect(after.settings).toEqual(before.settings);
  await command(page, 'J MITI', 'MITI / 未知の世界');
  await command(page, '3', 'MITI / フォーラム');
  await command(page, '9', '投稿一覧');
  await command(page, 'READ 8', post.body);
  await page.reload();
  await openSettings(page, 'ai');
  await expect(page.locator('.ai-records')).toContainText('fictional-ai:kusabue');
  await expect(page.locator('.ai-message')).toContainText('AI はオフ');
  expect((await snapshot(page)).posts).toEqual(after.posts);
});

test('malformed generation never posts, discarding is inert, and deleting the parent blocks save', async ({ page }) => {
  await setup(page); await restore(page); await load(page);
  const before = await snapshot(page);
  await page.evaluate(() => { window.aiMock.mode = 'malformed'; });
  await openSettings(page, 'ai');
  await page.locator('.ai-generate').click();
  await expect(page.locator('.ai-message')).toContainText('AI を利用できません');
  await expect(page.locator('.ai-send')).toBeHidden();
  expect(await snapshot(page)).toEqual(before);
  await page.evaluate(() => { window.aiMock.mode = 'ok'; });
  await load(page);
  await openSettings(page, 'ai');
  await page.locator('.ai-generate').click();
  await expect(page.locator('.ai-preview')).toBeVisible();
  await openSettings(page, 'ai');
  await page.locator('.ai-discard').click();
  expect(await snapshot(page)).toEqual(before);
  await openSettings(page, 'ai');
  await page.locator('.ai-reply').selectOption('reply');
  await openSettings(page, 'ai');
  await page.locator('.ai-generate').click();
  await expect(page.locator('.ai-preview')).toBeVisible();
  await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path);
    const repo = await openRepository();
    await repo.delete('posts', 'reply'); repo.close();
  });
  const deleted = await snapshot(page);
  await openSettings(page, 'ai');
  await page.locator('.ai-send').click();
  await expect(page.locator('.ai-message')).toContainText('AI 投稿を保存できません');
  expect(await snapshot(page)).toEqual(deleted);
});

test('cancel load or generation ignores late results; restore invalidates pending work', async ({ page }) => {
  await setup(page); await restore(page);
  const before = await snapshot(page);
  await page.evaluate(() => { window.aiMock.mode = 'load-wait'; });
  await openSettings(page, 'ai');
  await loadModel(page);
  await expect(page.locator('.ai-progress')).toHaveAttribute('value', '0.42');
  await openSettings(page, 'ai');
  await page.locator('.ai-stop').click();
  await page.evaluate(() => { window.aiMock.complete?.(); window.aiMock.mode = 'ok'; });
  await expect(page.locator('.ai-message')).toContainText('キャンセル');
  await expect(page.locator('.ai-generate')).toBeDisabled();
  await load(page);
  await page.evaluate(() => { window.aiMock.mode = 'generate-wait'; });
  await openSettings(page, 'ai');
  await page.locator('.ai-generate').click();
  await expect.poll(() => page.evaluate(() => window.aiMock.prompts.length)).toBe(1);
  // Commands continue while the adapter is pending; inference never holds the queue.
  await command(page, 'J MITI', 'MITI / 未知の世界');
  await openSettings(page, 'ai');
  await page.locator('.ai-stop').click();
  await page.evaluate(() => { window.aiMock.complete?.(); window.aiMock.mode = 'ok'; });
  await expect(page.locator('.ai-preview')).toBeHidden();
  expect((await snapshot(page)).posts).toEqual(before.posts);
  await load(page);
  await page.evaluate(() => { window.aiMock.mode = 'generate-wait'; });
  await openSettings(page, 'ai');
  await page.locator('.ai-generate').click();
  await expect.poll(() => page.evaluate(() => window.aiMock.prompts.length)).toBe(2);
  await restore(page);
  await page.evaluate(() => { window.aiMock.complete?.(); });
  await expect(page.locator('.ai-preview')).toBeHidden();
  await expect(page.locator('.ai-generate')).toBeDisabled();
  expect((await snapshot(page)).posts).toEqual(before.posts);
});

for (const mode of ['load-fail', 'inference-fail']) {
  test(`${mode} explains unavailable AI and leaves terminal reading and manual posting usable`, async ({ page }) => {
    await setup(page); await restore(page);
    if (mode === 'inference-fail') await load(page);
    await page.evaluate((value) => { window.aiMock.mode = value; }, mode);
    if (mode === 'load-fail') await loadModel(page);
    else await page.locator('.ai-generate').click();
    await expect(page.locator('.ai-message')).toContainText('端末・閲覧・手動投稿は利用できます');
    await command(page, 'J MITI', 'MITI / 未知の世界');
    await command(page, '3', 'MITI / フォーラム');
    await command(page, '9', '投稿一覧');
    await command(page, 'READ 1', 'こんにちは');
    await closeSettings(page);
    await page.getByRole('textbox', { name: 'コマンド', exact: true }).fill('WRITE');
    await page.getByRole('textbox', { name: 'コマンド', exact: true }).press('Enter');
    await page.getByLabel('投稿タイトル', { exact: true }).fill('手動投稿');
    await page.getByLabel('投稿本文', { exact: true }).fill('AI エラーの後も投稿できます。');
    await page.getByRole('button', { name: '内容を確認', exact: true }).click();
    await page.getByRole('button', { name: 'この内容で投稿する', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await snapshot(page)).posts.find((post) => post.number === 8)).toMatchObject({ origin: 'local-human', title: '手動投稿' });
  });
}

test('unsupported WebGPU has no model requests and preserves ordinary commands', async ({ page }) => {
  const external: string[] = [];
  const aiAssets: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
  page.on('request', (request) => { if (/webllm-(adapter|worker)/.test(request.url())) aiAssets.push(request.url()); });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { value: undefined }); });
  await page.goto('/');
  await openSettings(page, 'ai');
  await expect(page.locator('.ai-message')).toContainText('WebGPU が利用できない');
  await expect(page.locator('.ai-load')).toBeDisabled();
  await command(page, 'J MITI', 'MITI / 未知の世界');
  await command(page, '3', 'MITI / フォーラム');
  await command(page, '9', '投稿一覧');
  await command(page, 'READ 1', '★内容');
  expect(external).toEqual([]);
  expect(aiAssets).toEqual([]);
});

test('background model progress stays inspectable after Settings closes without replacing the terminal', async ({ page }) => {
  await setup(page);
  await restore(page);
  await page.evaluate(() => { window.aiMock.mode = 'load-wait'; });
  await loadModel(page);
  await expect(page.locator('.ai-progress')).toHaveAttribute('value', '0.42');
  await expect(page.locator('.ai-message')).toBeVisible();
  await closeSettings(page);
  const before = await page.locator('.output').textContent();
  await page.evaluate(() => { window.aiMock.complete?.(); });
  await expect(page.locator('.settings-notice')).toContainText('AIの状態が更新されました');
  await expect(page.locator('.open-settings')).toContainText('•');
  expect(await page.locator('.output').textContent()).toBe(before);
  await openSettings(page, 'ai');
  await expect(page.locator('.ai-message')).toContainText('準備ができました');
  await page.evaluate(() => { window.aiMock.mode = 'inference-fail'; });
  await page.locator('.ai-generate').click();
  await expect(page.locator('.ai-message')).toContainText('再試行はモデル読込から');
  await expect(page.locator('.ai-load')).toBeEnabled();
});


test('manual previews share the page visit generation attempt limit', async ({ page }) => {
  await setup(page); await restore(page); await load(page);
  for (let attempt = 0; attempt < 12; attempt++) {
    await page.locator('.ai-generate').click();
    await expect(page.locator('.ai-preview')).toBeVisible();
    await page.locator('.ai-discard').click();
  }
  expect(await page.evaluate(() => window.aiMock.prompts.length)).toBe(12);
  await expect(page.locator('.ai-generate')).toBeDisabled();
  await expect(page.locator('.ai-activity-message')).toContainText('試行 12/12');
  expect((await snapshot(page)).posts).toEqual(backupFixture().posts);
});
