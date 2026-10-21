import { openSettings, closeSettings, loadModel } from './settings-helpers';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { backupFixture } from './backup-fixture';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { createHash } from 'node:crypto';

// Mutable static deployment for real SW lifecycle tests, including subpath hosting.
async function deployment() {
  let release = 1;
  let failAssets = false;
  let mixedHtml = false;
  const worker = await readFile('dist/sw.js', 'utf8');
  const index = await readFile('dist/index.html', 'utf8');
  const integrity = (text: string) => `sha256-${createHash('sha256').update(text).digest('base64')}`;
  const html = () => index.replace('<body>', `<body data-release="${release}">`);
  const server = createServer(async (request, response) => {
    const path = new URL(request.url!, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (path === '/observer') { response.end('<title>Outside app scope</title>'); return; }
    if (!path.startsWith('/pcvan/')) { response.writeHead(404).end(); return; }
    const file = path.slice('/pcvan/'.length) || 'index.html';
    if (file.includes('..')) { response.writeHead(404).end(); return; }
    if (failAssets && file.endsWith('.js') && file !== 'sw.js') { response.writeHead(503).end(); return; }
    try {
      const body = file === 'sw.js' ? worker.replace('const cacheName = `${prefix}', 'const cacheName = `${prefix}release' + release + '-')
        .replace(integrity(index), integrity(html()))
        : file === 'index.html' ? html() + (mixedHtml ? '<!-- mixed deployment -->' : '')
        : await readFile(resolve('dist', file));
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address() as { port: number };
  return {
    origin: `http://127.0.0.1:${address.port}`,
    update: () => { release++; },
    fail: (value: boolean) => { failAssets = value; },
    mismatch: (value: boolean) => { mixedHtml = value; },
    close: () => new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done())),
  };
}

async function saveShell(page: Page) {
  await openOffline(page);
  await page.locator('.cache-shell').click();
  await expect(page.locator('.shell-status')).toContainText('オフライン用に保存済み');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

async function openOffline(page: Page) {
  await openSettings(page, 'offline');
}

async function update(page: Page) {
  await page.evaluate(async () => {
    const registration = (await navigator.serviceWorker.getRegistration())!;
    await registration.update();
    const worker = registration.installing;
    if (worker && !['installed', 'redundant'].includes(worker.state)) {
      await new Promise<void>((done) => worker.addEventListener('statechange', () => {
        if (['installed', 'redundant'].includes(worker.state)) done();
      }));
    }
  });
}

async function restore(page: Page) {
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI';
  fixture.forums[0]!.boardNo = 9;
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.restore').click();
  await expect(page.locator('.storage-status')).toContainText('バックアップを復元しました');
  return fixture;
}

async function backup(page: Page) {
  const downloaded = page.waitForEvent('download');
  await openSettings(page, 'storage');
  await page.locator('.backup').click();
  return JSON.parse(await readFile((await (await downloaded).path())!, 'utf8'));
}

async function command(page: Page, text: string, response: string) {
  const input = page.getByRole('textbox', { name: 'コマンド', exact: true });
  const length = (await page.locator('.output').textContent())!.length;
  await closeSettings(page);
  await input.fill(text); await input.press('Enter');
  await expect.poll(async () => (await page.locator('.output').textContent())!.slice(length)).toContain(response);
}

test('production assets and opt-in service worker resolve under /pcvan/', async ({ page, context, request }) => {
  const site = await deployment();
  const base = `${site.origin}/pcvan/`;
  const requests: string[] = [];
  const failures: string[] = [];
  context.on('request', (row) => requests.push(row.url()));
  context.on('requestfailed', (row) => failures.push(row.url()));
  page.on('pageerror', (error) => failures.push(error.message));
  // Fail closed if this smoke check ever tries to fetch models or other hosts.
  await context.route('**/*', (route) => route.request().url().startsWith(base)
    ? route.continue() : route.abort());
  try {
    await page.goto(base);
    await expect(page.getByRole('textbox', { name: 'コマンド', exact: true })).toBeVisible();
    const entryUrls = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll((nodes) =>
      nodes.map((node) => node instanceof HTMLScriptElement ? node.src : (node as HTMLLinkElement).href));
    expect(entryUrls.length).toBeGreaterThanOrEqual(2);
    for (const url of entryUrls) {
      expect(url.startsWith(`${base}assets/`)).toBe(true);
      expect(requests).toContain(url);
    }
    expect(requests.some((url) => /webllm/.test(url))).toBe(false);
    expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((rows) => rows.length))).toBe(0);

    // Check every emitted asset, including lazy runtime chunks and the AI worker,
    // against its bytes on disk so an HTML fallback cannot hide a missing file.
    const assets = await readdir('dist/assets');
    expect(assets.some((name) => name.startsWith('webllm-adapter-'))).toBe(true);
    expect(assets.some((name) => name.startsWith('webllm-worker-'))).toBe(true);
    for (const name of assets) {
      const response = await request.get(`${base}assets/${name}`);
      expect(response.status(), name).toBe(200);
      expect(await response.body(), name).toEqual(await readFile(resolve('dist/assets', name)));
      if (name.endsWith('.js')) expect(response.headers()['content-type']).toContain('javascript');
      if (name.endsWith('.css')) expect(response.headers()['content-type']).toContain('text/css');
    }

    // Exercise the real dynamic import without loading a model or needing WebGPU.
    await openSettings(page, 'ai');
    await page.locator('.ai-cache-check').click();
    await expect(page.locator('.ai-cache-status')).toContainText('未保存または不完全');
    expect(requests.some((url) => url.startsWith(`${base}assets/webllm-adapter-`))).toBe(true);
    await saveShell(page);
    const registration = await page.evaluate(async () => {
      const row = (await navigator.serviceWorker.getRegistration())!;
      return { scope: row.scope, script: row.active!.scriptURL,
        rootControlled: !!await navigator.serviceWorker.getRegistration(new URL('/', location.href).href) };
    });
    expect(registration).toEqual({ scope: base, script: `${base}sw.js`, rootControlled: false });
    expect(requests.every((url) => url.startsWith(base))).toBe(true);
    expect(failures).toEqual([]);
  } finally { await page.close(); await site.close(); }
});

test('opt-in minimal shell reloads offline on a subpath; missing AI leaves local reading, posting, backup and restore usable', async ({ page, context }) => {
  const site = await deployment();
  try {
    await page.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { value: {} }); });
    const requests: string[] = [];
    context.on('request', (request) => requests.push(request.url()));
    await page.goto(`${site.origin}/pcvan/`);
    await expect(page.locator('.shell-status')).toContainText('未保存');
    expect(await page.evaluate(() => caches.keys())).toEqual([]);
    const fixture = await restore(page);
    await saveShell(page);
    const keys = await page.evaluate(async () => {
      const [name] = await caches.keys();
      return (await (await caches.open(name!)).keys()).map((row) => row.url);
    });
    expect(keys).toHaveLength(3);
    expect(keys.some((key) => /webllm/.test(key))).toBe(false);
    expect(requests.every((url) => url.startsWith(site.origin))).toBe(true);
    await context.setOffline(true);
    await expect(page.locator('.network-status')).toContainText('オフライン');
    await page.reload();
    await expect(page.locator('.shell-status')).toContainText('オフライン用に保存済み');
    await openSettings(page, 'ai');
    await loadModel(page);
    await expect(page.locator('.ai-message')).toContainText('端末・閲覧・手動投稿は利用できます');
    await command(page, 'J MITI', 'MITI / 未知の世界');
    await command(page, '3', 'MITI / フォーラム');
    await command(page, '9', '投稿一覧');
    await command(page, 'READ 1', 'こんにちは');
    await command(page, 'WRITE', '> WRITE');
    await page.getByLabel('投稿タイトル', { exact: true }).fill('オフライン投稿');
    await page.getByLabel('投稿本文', { exact: true }).fill('通信がなくても保存できます。');
    await page.getByRole('button', { name: '内容を確認', exact: true }).click();
    await page.getByRole('button', { name: 'この内容で投稿する', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await openOffline(page);
    await page.getByRole('link', { name: 'JSON バックアップ・復元へ' }).click();
    expect(new URL(page.url()).hash).toBe('#local-backup');
    const saved = await backup(page);
    expect(saved.posts).toHaveLength(fixture.posts.length + 1);
    expect(saved.posts.find((row: { title: string }) => row.title === 'オフライン投稿')).toMatchObject({ number: 8, origin: 'local-human' });
    await restore(page);
    expect((await backup(page)).posts).toEqual(fixture.posts);
    await context.setOffline(false);
    await expect(page.locator('.network-status')).toContainText('オンライン');
  } finally { await context.setOffline(false); await page.close(); await site.close(); }
});

test('failed installs are retryable; deleted shell can be repaired without touching records', async ({ page, context }) => {
  const site = await deployment();
  try {
    await page.goto(`${site.origin}/pcvan/`);
    const fixture = await restore(page);
    site.fail(true);
    await openOffline(page);
    await page.locator('.cache-shell').click();
    await expect(page.locator('.shell-status')).toContainText('失敗');
    await expect(page.locator('.cache-shell')).toBeEnabled();
    expect(await page.evaluate(() => caches.keys())).toEqual([]);
    await command(page, 'HELP', 'HELP');
    site.fail(false);
    await saveShell(page);
    await page.evaluate(async () => { for (const key of await caches.keys()) await caches.delete(key); });
    await context.setOffline(true);
    await expect(page.locator('.shell-status')).toContainText('不完全または削除');
    await context.setOffline(false);
    await saveShell(page);
    expect((await backup(page)).posts).toEqual(fixture.posts);
  } finally { await context.setOffline(false); await page.close(); await site.close(); }
});

test('failed update preserves old release; successful update waits for all tabs, cleans only its shell and retains IndexedDB', async ({ page, context }) => {
  const site = await deployment();
  try {
    await page.goto(`${site.origin}/pcvan/`);
    const fixture = await restore(page);
    await saveShell(page);
    const other = await context.newPage();
    await other.goto(`${site.origin}/pcvan/`);
    await expect(other.locator('.shell-status')).toContainText('保存済み');
    await page.evaluate(async () => {
      await (await caches.open('webllm/model')).put('/keep-model', new Response('model sentinel'));
      await (await caches.open('pcvan-shell:other-scope:old')).put('/keep-other-app', new Response('other sentinel'));
    });
    site.update(); site.fail(true);
    await update(page);
    await expect(page.locator('.shell-status')).toContainText('失敗');
    expect((await page.evaluate(() => caches.keys())).filter((key) => key.includes('/pcvan/'))).toHaveLength(1);
    site.fail(false); site.update(); site.mismatch(true);
    await update(page);
    await expect(page.locator('.shell-status')).toContainText('失敗');
    expect((await page.evaluate(() => caches.keys())).filter((key) => key.includes('/pcvan/'))).toHaveLength(1);
    const repair = await page.evaluate(async () => {
      const worker = (await navigator.serviceWorker.getRegistration())!.active!;
      const channel = new MessageChannel();
      const result = new Promise<boolean>((done) => { channel.port1.onmessage = (event) => { channel.port1.close(); done(event.data); }; });
      worker.postMessage('SAVE_SHELL', [channel.port2]);
      const saved = await result;
      const key = (await caches.keys()).find((key) => key.includes('/pcvan/'))!;
      const html = await (await (await caches.open(key)).match(new URL('index.html', location.href).href))!.text();
      return { saved, html };
    });
    expect(repair.saved).toBe(false);
    expect(repair.html).toContain('data-release="1"');
    site.mismatch(false); site.update();
    await update(page);
    await expect(page.locator('.shell-status')).toContainText('全タブを閉じて');
    await expect(page.locator('body')).toHaveAttribute('data-release', '1');
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-release', '1');
    expect((await page.evaluate(() => caches.keys())).filter((key) => key.includes('/pcvan/'))).toHaveLength(2);
    await page.goto(`${site.origin}/observer`);
    await other.close();
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/pcvan/'))!.waiting === null)).toBe(true);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((key) => key.includes('/pcvan/')).length)).toBe(1);
    expect(await page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(['webllm/model', 'pcvan-shell:other-scope:old']));
    await context.setOffline(true);
    await page.goto(`${site.origin}/pcvan/`);
    await expect(page.locator('body')).toHaveAttribute('data-release', '4');
    const result = await backup(page);
    for (const key of ['sigs', 'forums', 'posts', 'readStates'] as const) expect(result[key]).toEqual(fixture[key]);
    expect(result.members).toEqual(expect.arrayContaining(fixture.members));
    expect(result.settings).toEqual(expect.arrayContaining(fixture.settings));
  } finally { await context.setOffline(false); await page.close(); await site.close(); }
});

test('storage estimate and persistence grant, denial and failure explain backups without blocking use', async ({ page }) => {
  await page.addInitScript(() => {
    let mode = 'denied';
    Object.assign(window, { storageMode: (value: string) => { mode = value; } });
    Object.defineProperty(navigator, 'storage', { value: {
      estimate: async () => { if (mode === 'error') throw new Error(); return { usage: 1048576, quota: 10485760 }; },
      persisted: async () => { if (mode === 'error') throw new Error(); return mode === 'granted'; },
      persist: async () => { if (mode === 'error') throw new Error(); return mode === 'granted'; },
    } });
  });
  await page.goto('/');
  await openOffline(page);
  await expect(page.locator('.usage-status')).toContainText('1.0 MiB / 上限 約 10.0 MiB');
  await page.locator('.persist-storage').click();
  await expect(page.locator('.persistence-status')).toContainText('許可されませんでした');
  await page.evaluate(() => (window as any).storageMode('granted'));
  await page.locator('.persist-storage').click();
  await expect(page.locator('.persistence-status')).toContainText('許可済み');
  await page.evaluate(() => (window as any).storageMode('error'));
  await page.locator('.persist-storage').click();
  await expect(page.locator('.persistence-status')).toContainText('リクエストできませんでした');
  await page.locator('.refresh-storage').click();
  await expect(page.locator('.usage-status')).toContainText('取得できません');
  await command(page, 'HELP', 'HELP');
});

test('unsupported storage APIs and service workers leave terminal and backups available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', { value: undefined });
    delete (Object.getPrototypeOf(navigator) as any).serviceWorker;
  });
  await page.goto('/');
  await expect(page.locator('.usage-status')).toContainText('取得できません');
  await expect(page.locator('.persistence-status')).toContainText('取得できません');
  await expect(page.locator('.persist-storage')).toBeDisabled();
  await expect(page.locator('.cache-shell')).toBeDisabled();
  await expect(page.locator('.backup')).toBeEnabled();
  await command(page, 'HELP', 'HELP');
});

test('real WebLLM cache probe detects missing manifest, partial shards, complete selected weights and eviction without downloads', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
  await page.goto('http://127.0.0.1:14374');
  await openSettings(page, 'ai');
  await expect(page.locator('.ai-cache-status')).toContainText('未確認');
  await openSettings(page, 'ai');
  await page.locator('.ai-cache-check').click();
  await expect(page.locator('.ai-cache-status')).toContainText('未保存または不完全');
  const modelUrl = prebuiltAppConfig.model_list.find((row) => row.model_id === 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC')!.model;
  const modelBase = await page.evaluate(async (modelUrl) => {
    const base = modelUrl.replace(/\/?$/, '/resolve/main/');
    const cache = await caches.open('webllm/model');
    await cache.put(`${base}tensor-cache.json`, new Response(JSON.stringify({ records: [{ dataPath: 'test-shard-0.bin' }, { dataPath: 'test-shard-1.bin' }] })));
    await cache.put(`${base}test-shard-0.bin`, new Response('synthetic test data, not weights'));
    return base;
  }, modelUrl);
  await openSettings(page, 'ai');
  await page.locator('.ai-cache-check').click();
  await expect(page.locator('.ai-cache-status')).toContainText('未保存または不完全');
  await page.evaluate(async (base) => { await (await caches.open('webllm/model')).put(`${base}test-shard-1.bin`, new Response('synthetic test data')); }, modelBase);
  await openSettings(page, 'ai');
  await page.locator('.ai-cache-check').click();
  await expect(page.locator('.ai-cache-status')).toContainText('保存済み');
  await expect(page.locator('.ai-cache-status')).toContainText('欠落や削除');
  await openSettings(page, 'ai');
  await page.locator('.ai-model').selectOption('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
  await expect(page.locator('.ai-cache-status')).toContainText('未確認');
  await openSettings(page, 'ai');
  await page.locator('.ai-cache-check').click();
  await expect(page.locator('.ai-cache-status')).toContainText('未保存または不完全');
  await openSettings(page, 'ai');
  await page.locator('.ai-model').selectOption('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
  await page.evaluate(async (base) => { await (await caches.open('webllm/model')).delete(`${base}test-shard-0.bin`); }, modelBase);
  await openSettings(page, 'ai');
  await page.locator('.ai-cache-check').click();
  await expect(page.locator('.ai-cache-status')).toContainText('未保存または不完全');
  expect(external).toEqual([]);
});
