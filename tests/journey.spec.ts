import { openSettings, closeSettings, loadModel } from './settings-helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import type { AiActivity, Backup } from '../src/storage/schema';

// These journeys use only the production UI, downloads and file chooser. No
// repository imports, seeded database, real model, credentials or app server.
async function command(page: Page, line: string, response: string) {
  const output = page.locator('.output');
  const start = (await output.textContent())!.length;
  const input = page.getByRole('textbox', { name: 'コマンド', exact: true });
  await closeSettings(page);
  await input.fill(line);
  await input.press('Enter');
  await expect.poll(async () => (await output.textContent())!.slice(start)).toContain(response);
  if (!/^(WRITE|REPLY \d+)$/.test(line)) await expect(input).toBeFocused();
  return (await output.textContent())!.slice(start);
}

async function enterForum(page: Page) {
  await command(page, 'J MITI', 'MITI / 未知の世界');
  await command(page, '3', 'MITI / フォーラム');
  await command(page, '9', '投稿一覧');
}

async function backup(page: Page): Promise<Backup> {
  const downloading = page.waitForEvent('download');
  await openSettings(page, 'storage');
  await page.getByRole('button', { name: 'JSON バックアップを保存' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^pcvan-backup-.*\.json$/);
  return JSON.parse(await readFile((await download.path())!, 'utf8'));
}

async function restore(page: Page, saved: Backup) {
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({
    name: 'journey.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)),
  });
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('全データ');
    await dialog.accept();
  });
  await page.getByRole('button', { name: '全データを置き換えて復元' }).click();
  await expect(page.getByRole('status', { name: 'ローカル保存の状態' })).toContainText('バックアップを復元しました');
}

async function post(page: Page, title: string, body: string, line = 'WRITE') {
  await command(page, line, `> ${line}`);
  const dialog = page.getByRole('dialog');
  await page.getByLabel('投稿タイトル', { exact: true }).fill(title);
  await page.getByLabel('投稿本文', { exact: true }).fill(body);
  await page.getByRole('button', { name: '内容を確認', exact: true }).click();
  const reply = /^REPLY (\d+)$/.exec(line);
  expect(await page.locator('.post-preview').textContent()).toBe(`${reply ? `RE#${reply[1]}\n` : ''}${title}\n\n${body}`);
  await page.getByRole('button', { name: 'この内容で投稿する', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function createHuman(page: Page) {
  await openSettings(page, 'member');
  await page.getByLabel('新しいハンドル').fill('旅の利用者');
  await page.getByRole('button', { name: '人間の利用者を作成' }).click();
  await expect(page.getByLabel('ローカル利用者', { exact: true })).toContainText('旅の利用者');
}

function observe(context: BrowserContext, origin: string) {
  const unexpected: string[] = [];
  const aiAssets: string[] = [];
  const errors: string[] = [];
  context.on('request', (request) => {
    const url = new URL(request.url());
    // A static file server suffices: no backend endpoints, writes or third-party
    // requests are allowed, including failed attempts to call them.
    if (url.origin !== origin || request.method() !== 'GET' ||
        !/^\/(?:index\.html|sw\.js|favicon\.ico|assets\/[^/]+\.(?:js|css))?$/.test(url.pathname)) {
      unexpected.push(`${request.method()} ${request.url()}`);
    }
    if (/webllm/.test(url.pathname)) aiAssets.push(url.pathname);
  });
  const watch = (page: Page) => page.on('pageerror', (error) => errors.push(error.message));
  context.pages().forEach(watch);
  context.on('page', watch);
  return { unexpected, aiAssets, errors };
}

test('journey: all MAIN mappings and concise screens through keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.output')).toContainText('番号またはコマンド=');
  await expect(page.locator('.output')).toContainText('PC-VAN 接続中…');
  const greeting = await command(page, 'HELP', '番号またはコマンド=');
  const labels = [
    '電子メール', '索引', 'ニュース', 'データベース', '公共情報と政治', 'ビジネス',
    'インターネット', 'コンピュータ', 'ショッピングモール', '電子出版', '趣味', '生活',
    'コミュニケーション', 'ＰＣ－ＶＡＮ利用情報（無料）', '☆★☆ おすすめ ☆★☆',
    '☆★☆ わかばマーク ☆★☆', 'ＢＩＧＬＯＢＥガイド', 'インターサイト',
    'ＢＩＧＬＯＢＥイベント（無料）', 'ＢＩＧＬＯＢＥ情報誌ご案内', 'オリンピック特設コーナー',
  ];
  expect(greeting.match(/(?:^| {2,})\s*\d{1,2} /gm)).toHaveLength(21);
  const mappings = [...labels.map((label, index) => [String(index + 1), label]), ['X', '旧電子メール'], ['Q', '終了']];
  expect(mappings).toHaveLength(23);
  const url = page.url();
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => navigations.push(frame.url()));
  for (const [selector, label] of mappings) {
    expect(greeting).toContain(`${selector!.padStart(2)} ${label}`);
    const result = await command(page, selector!, `${selector} ${label}`);
    expect(result).not.toContain('未実装');
    if (selector === 'Q') {
      await command(page, 'RECONNECT', 'PC-VAN 接続中');
      await command(page, 'HELP', '番号またはコマンド=');
    } else {
      if (!['2', '13'].includes(selector!)) expect(result).toContain('0件');
      await command(page, 'BACK', '番号またはコマンド=');
    }
  }
  await command(page, 'J UNKNOWN', '移動先が見つかりません');
  const input = page.getByRole('textbox', { name: 'コマンド', exact: true });
  await closeSettings(page);
  await input.fill('未送信');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('J UNKNOWN');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('未送信');
  for (const [line, destination] of [['J MITI', '未知の世界'], ['3', 'フォーラム'], ['9', '資料室']]) {
    await command(page, line!, `MITI / ${destination}`);
    await command(page, 'invalid', 'この画面では使えない');
  }
  const reading = await command(page, 'READ 1', '★内容');
  expect(reading).toMatch(/#1[^\n]*資料室\n★タイトル \([^)]+\)  \d{2}\/\d{2}\/\d{2}  \d{2}:\d{2}\n[^\n]+\n★内容\n/);
  await command(page, 'MAIN', '番号またはコマンド=');
  await command(page, '13', '1 未知の世界');
  await command(page, '2', '大自然＆動植物');
  for (const [service, empty] of [
    ['MAIL', '受信箱：0件'], ['LIBRARY', 'ファイル一覧：0件'],
    ['OLT', '参加者：0人'], ['OSL', 'ファイル一覧：0件'], ['CONFERENCE', '参加者：0人'],
  ]) {
    await command(page, service!, empty!);
    await command(page, 'BACK', '大自然＆動植物');
  }
  // Verified route/header citations must never authenticate invented prompts.
  expect(await page.locator('.output').textContent()).not.toMatch(/(?:画面|配置|プロンプト|挨拶文)[^\n]*\[(?:A|B) \/ verified\]/);
  expect(navigations).toEqual([]);
  expect(page.url()).toBe(url);
});

test('journey: offline human post, reply, unread, reload and JSON round-trip without WebGPU or backend', async ({ browser, baseURL }) => {
  // Fresh nonpersistent profile: no cookies, local world, service worker or keys.
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const observed = observe(context, baseURL!);
  await context.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  try {
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect.poll(async () => (await backup(page)).posts.length).toBe(30);
    await openSettings(page, 'ai');
    await expect(page.locator('.ai-message')).toContainText('WebGPU が利用できない');
    await expect(page.locator('.ai-load')).toBeDisabled();
    await expect(page.locator('input[type="password"], input[name*="api-key" i]')).toHaveCount(0);
    await openSettings(page, 'offline');
    await page.locator('.cache-shell').click();
    await expect(page.locator('.shell-status')).toContainText('オフライン用に保存済み');
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.network-status')).toContainText('オフライン');
    await enterForum(page);
    await command(page, 'READ 1', '★タイトル (半田ごて)');
    await createHuman(page);
    const title = '旅の記録　ｶﾅ';
    const body = '一行目\n\n  二行目 <b>文字のまま</b>  \n';
    await post(page, title, body);
    await command(page, 'LIST', `#17 ${title} [未読]`);
    await command(page, 'READ 17', body);
    await expect(page.locator('.output b')).toHaveCount(0);
    await command(page, 'LIST', `#17 ${title} [既読]`);
    await post(page, `RE#17 ${title}`, '返信です。\nオフラインから。', 'REPLY 17');
    await command(page, 'LIST', `#18 RE#17 ${title} [未読]`);
    await command(page, 'READ 18', '返信先 RE#17');
    const beforeReference = (await page.locator('.output').textContent())!.length;
    await page.getByRole('link', { name: '返信先 RE#17 を読む' }).click();
    await expect.poll(async () => (await page.locator('.output').textContent())!.slice(beforeReference)).toContain(body);
    const saved = await backup(page);
    expect(saved.posts).toHaveLength(32);
    expect(saved.posts.filter((p) => p.origin === 'local-human').map((row) => row.origin)).toEqual(['local-human', 'local-human']);
    // Backups follow IndexedDB primary-key order, not random-ID creation order.
    const original = saved.posts.find((row) => row.number === 17)!;
    const reply = saved.posts.find((row) => row.number === 18)!;
    expect(reply.replyToPostId).toBe(original.id);
    expect(saved.readStates).toEqual([{ memberId: saved.members.find((m) => m.actor === 'human')!.id, forumId: original.forumId, lastReadNumber: 18 }]);
    await page.reload();
    await enterForum(page);
    const list = await command(page, 'LIST', `#18 RE#17 ${title} [既読]`);
    expect(list).toContain(`#17 ${title} [既読]`);
    expect((await backup(page)).posts).toEqual(saved.posts);
    // Change the live world before restore so an inert import cannot pass.
    await post(page, '復元で消える投稿', '三件目');
    expect((await backup(page)).posts).toHaveLength(33);
    await restore(page, saved);
    expect(await backup(page)).toEqual(saved);
    await page.reload();
    await enterForum(page);
    await command(page, 'READ 18', '返信先 RE#17');
    await expect(page.getByRole('link', { name: '返信先 RE#17 を読む' })).toBeVisible();
    const reloaded = await backup(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'readStates'] as const) {
      expect(reloaded[key]).toEqual(saved[key]);
    }
    expect(reloaded.settings.filter((r) => r.id !== 'ai-activity')).toEqual(saved.settings.filter((r) => r.id !== 'ai-activity'));
    expect(reloaded.settings.find((r) => r.id === 'ai-activity')!.value).toMatchObject({ version: 2, maxPosts: 4, consent: false });
    expect(observed.unexpected).toEqual([]);
    expect(observed.aiAssets).toEqual([]);
    expect(observed.errors).toEqual([]);
  } finally { await context.close(); }
});

// Replace only the worker transport. The production WebLLM adapter, validation,
// controls, activity lifecycle and IndexedDB commits all remain real.
async function mockWorker(page: Page, mode: 'interrupt' | 'ok' | 'invalid' | 'failure') {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, 'gpu', { value: {} });
    const stats = { generations: 0, loads: 0 };
    Object.assign(window, { journeyWorker: stats });
    class MockWorker {
      onmessage?: (event: MessageEvent) => void;
      onerror?: () => void;
      postMessage(message: { kind: string; uuid: string; content: { request: { messages: { content: string }[] } } }) {
        let content: unknown = null;
        if (message.kind === 'reload') stats.loads++;
        if (message.kind === 'chatCompletionNonStreaming') {
          stats.generations++;
          if (mode === 'interrupt' && stats.generations === 2) return;
          if (mode === 'failure') { queueMicrotask(() => this.onerror?.()); return; }
          const data = JSON.parse(message.content.request.messages[1]!.content);
          const raw = mode === 'invalid' ? '{}' : JSON.stringify({
            personaId: data.personaId, forumId: data.forumId,
            ...(data.replyToPostId ? { replyToPostId: data.replyToPostId } : {}),
            title: '架空の旅だより', body: `これは創作の活動です。${data.personaId}/${stats.generations}`,
          });
          content = { choices: [{ finish_reason: 'stop', message: { content: raw } }] };
        }
        queueMicrotask(() => this.onmessage?.(new MessageEvent('message', {
          data: { uuid: message.uuid, kind: 'return', content },
        })));
      }
      terminate() {}
    }
    window.Worker = MockWorker as unknown as typeof Worker;
  }, mode);
}

async function workerStats(page: Page) {
  return page.evaluate(() => (window as unknown as { journeyWorker: { generations: number; loads: number } }).journeyWorker);
}

test('journey: production AI resumes a partially committed run after tab loss without duplicate posts', async ({ context, page, baseURL }) => {
  const observed = observe(context, baseURL!);
  const start = new Date('2026-10-21T00:00:00Z');
  const reconnect = new Date('2026-10-24T00:00:00Z');
  await page.clock.setFixedTime(start);
  await mockWorker(page, 'interrupt');
  await page.goto('/');
  await createHuman(page);
  await enterForum(page);
  await post(page, '人間の話題', '自分で書いた最初の話題です。');
  await openSettings(page, 'ai');
  await loadModel(page);
  await expect(page.locator('.ai-message')).toContainText('モデル準備完了');
  await page.locator('.ai-activity-cap').fill('2');
  await openSettings(page, 'ai');
  await page.locator('.ai-activity-save').click();
  await expect(page.locator('.ai-message')).toContainText('有効');
  expect(await workerStats(page)).toEqual({ generations: 0, loads: 1 });
  await command(page, 'MAIN', '番号またはコマンド=');
  await command(page, 'Q', '接続を終了しました');
  // Output precedes queued session writes. Finish logout at the old clock value
  // before advancing time, otherwise that write can consume the idle interval.
  expect((await backup(page)).session!.lastLogoutAt).toBe(start.toISOString());
  await page.clock.setFixedTime(reconnect);
  await command(page, 'RECONNECT', 'PC-VAN 接続中');
  await expect.poll(async () => (await workerStats(page)).generations).toBe(2);
  await command(page, 'HELP', '番号またはコマンド=');
  const interrupted = await backup(page);
  const activity = interrupted.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
  expect(activity.batch!.runs.map((run) => run.status)).toEqual(['committed', 'running']);
  const committed = interrupted.posts.find((row) => row.simulation)!;
  expect(interrupted.posts).toHaveLength(32);
  await page.close();
  const resumed = await context.newPage();
  await resumed.clock.setFixedTime(reconnect);
  await mockWorker(resumed, 'ok');
  await resumed.goto(baseURL!);
  await expect(resumed.locator('.ai-activity-message')).toContainText('2/2');
  expect(await workerStats(resumed)).toEqual({ generations: 1, loads: 1 });
  const recovered = await backup(resumed);
  expect(recovered.posts).toHaveLength(33);
  expect(recovered.posts.find((row) => row.id === committed.id)).toEqual(committed);
  const generated = recovered.posts.filter((row) => row.simulation);
  expect(generated.map((row) => row.id).sort()).toEqual(activity.batch!.runs.map((run) => run.id).sort());
  for (const f of recovered.forums) expect(f.nextPostNumber).toBe(Math.max(...recovered.posts.filter((p) => p.forumId === f.id).map((p) => p.number)) + 1);
  expect(generated.every((row) => row.origin.startsWith('local-ai:webllm:') && row.simulation!.fictional &&
    row.createdAt === reconnect.toISOString() && row.simulation!.simulatedAt < row.createdAt)).toBe(true);
  await expect(resumed.locator('.ai-records')).toContainText('actor=ai');
  const generatedMiti = generated.find((p) => p.forumId === 'resident-forum:MITI:9');
  if (generatedMiti) {
    await enterForum(resumed);
    const handle = recovered.members.find((m) => m.id === generatedMiti.authorId)!.handle;
    await command(resumed, `READ ${generatedMiti.number}`, `★タイトル (${handle})`);
  } else {
    for (const [line, response] of [['13', 'コミュニケーション'], ['2', '大自然＆動植物'], ['FORUMS', 'フォーラム（電子掲示板）'], ['1', '投稿一覧']]) await command(resumed, line!, response!);
    const handle = recovered.members.find((m) => m.id === generated[0]!.authorId)!.handle;
    await command(resumed, `READ ${generated[0]!.number}`, `★タイトル (${handle})`);
  }
  await expect(resumed.locator('.output')).not.toContainText('[架空の投稿時刻]');
  await expect(resumed.locator('.output')).not.toContainText('fictional-ai:');
  await command(resumed, 'MAIN', '番号またはコマンド=');
  await command(resumed, 'Q', '接続を終了しました');
  await command(resumed, 'RECONNECT', 'PC-VAN 接続中');
  await command(resumed, 'HELP', '番号またはコマンド=');
  expect((await backup(resumed)).posts).toEqual(recovered.posts);
  expect((await workerStats(resumed)).generations).toBe(1);
  expect(observed.unexpected).toEqual([]);
  expect(observed.errors).toEqual([]);
});

for (const mode of ['invalid', 'failure'] as const) {
  test(`journey: production AI ${mode} leaves manual posting, reading and backup usable`, async ({ page }) => {
    await mockWorker(page, mode);
    await page.goto('/');
    await createHuman(page);
    await enterForum(page);
    await post(page, '元の話題', 'AI がなくても使えます。');
    await openSettings(page, 'ai');
    await page.locator('.ai-forum').selectOption({ index: 0 });
    await openSettings(page, 'ai');
    await loadModel(page);
    await expect(page.locator('.ai-message')).toContainText('モデル準備完了');
    await openSettings(page, 'ai');
    await page.locator('.ai-generate').click();
    await expect(page.locator('.ai-message')).toContainText('端末・閲覧・手動投稿は利用できます');
    await expect(page.locator('.ai-send')).toBeHidden();
    await command(page, 'READ 17', 'AI がなくても使えます。');
    await post(page, '失敗後の返信', '手動の返信を保存できます。', 'REPLY 17');
    const saved = await backup(page);
    expect(saved.posts).toHaveLength(32);
    expect(saved.posts.filter((row) => row.origin === 'local-human')).toHaveLength(2);
    expect(saved.members.filter((row) => row.actor === 'human')).toHaveLength(1);
    expect(saved.members.filter((row) => row.id.startsWith('fictional-ai:'))).toHaveLength(10);
  });
}
