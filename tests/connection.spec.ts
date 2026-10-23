import { command, start, backup, snapshot } from './terminal-helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ConnectionController } from '../src/connection';
import { PcvanController } from '../src/navigation';

const stages = ['PC-VAN 接続中', 'PC-VAN / パーソナル通信サービス', 'デモID: LOCAL-DEMO',
  '前回使用終了:', 'プロファイル修正: N', 'ようこそ PC-VAN へ。', '＝＝＝ＰＣ－ＶＡＮ＝＝＝ (MAIN)'];
const count = (text: string, part: string) => text.split(part).length - 1;

test('entry advances in order using actual session dates and completes idempotently', () => {
  const controller = new ConnectionController();
  const saved = { lastLoginAt: '2026-10-23T01:02:03.000Z', lastLogoutAt: '2026-10-22T04:05:06.000Z', commandHistory: [] };
  controller.setSession(saved);
  const output = [...controller.welcome];
  for (let i = 0; i < 6; i++) output.push(...controller.advanceConnection());
  const text = output.join('\n');
  expect(stages.map((stage) => text.indexOf(stage))).toEqual([...stages.map((stage) => text.indexOf(stage))].sort((a, b) => a - b));
  expect(text).toContain(`前回使用終了: ${saved.lastLogoutAt} (UTC)`);
  expect(text).toContain(`今回使用開始: ${saved.lastLoginAt} (UTC)`);
  expect(output.slice(-new PcvanController().welcome.length)).toEqual(new PcvanController().welcome);
  expect(controller.screen).toBe('main');
  expect(controller.advanceConnection()).toEqual([]);
  expect(controller.completeConnection()).toEqual([]);
  expect(controller.submit('HELP')).toEqual(new PcvanController().welcome);
  expect(saved.commandHistory).toEqual([]);
});

for (let stage = 0; stage < 6; stage++) {
  test(`completion and early commands cancel entry at stage ${stage}`, () => {
    for (const skip of [true, false]) {
      const controller = new ConnectionController();
      controller.setSession({ lastLoginAt: '2026-10-23T00:00:00.000Z', lastLogoutAt: null, commandHistory: [] });
      for (let i = 0; i < stage; i++) controller.advanceConnection();
      if (skip) expect(controller.completeConnection()).toEqual(new PcvanController().welcome);
      expect(controller.submit('J MITI').join('\n')).toContain('MITI / 未知の世界');
      expect(controller.screen).toBe('miti');
      expect(controller.completeConnection()).toEqual([]);
      expect(controller.advanceConnection()).toEqual([]);
    }
  });
}

test('missing previous logout is explicit, never inferred from an earlier login', () => {
  const controller = new ConnectionController();
  controller.setSession({ lastLoginAt: '2026-10-23T00:00:00.000Z', lastLogoutAt: null, commandHistory: [] });
  controller.advanceConnection(); controller.advanceConnection();
  expect(controller.advanceConnection()).toEqual(['前回使用終了: 記録なし (UTC)', '今回使用開始: 2026-10-23T00:00:00.000Z (UTC)']);
});

test('fresh entry reaches MAIN naturally with one separate handle invitation and no credential request', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await page.goto('/');
  const input = page.locator('#command'), output = page.locator('.output');
  await input.fill('書きかけ');
  await expect(output).toContainText('ハンドル名を登録しますか');
  const text = (await output.textContent())!;
  let previous = -1;
  for (const stage of stages) { const at = text.indexOf(stage); expect(at).toBeGreaterThan(previous); previous = at; }
  expect(count(text, stages[6]!)).toBe(1);
  expect(count(text, 'ハンドル名を登録しますか')).toBe(1);
  expect(text).toContain('パスワード: ［入力・認証なし］');
  expect(text).not.toMatch(/https?:|GW|Y,N/);
  await expect(input).toHaveValue('書きかけ'); await expect(input).toBeFocused();
  const data = await snapshot(page);
  expect(data.members.filter((m) => m.actor === 'human')).toEqual([]);
  expect(data.session!.lastLogoutAt).toBeNull();
  expect(text).toContain(`今回使用開始: ${data.session!.lastLoginAt} (UTC)`);
  expect(text).toContain('前回使用終了: 記録なし (UTC)');
  await input.press('Escape'); await input.press('Escape');
  await command(page, 'Y', 'ハンドル名=');
  await input.press('Escape');
  await command(page, '訪問者', '登録しました');
  expect(external).toEqual([]);
});

test('returning entry and repeated reconnect use saved logout dates without fabricating a logout on reload', async ({ page }) => {
  await start(page, '利用者');
  const first = await snapshot(page);
  await page.reload(); await expect(page.locator('.output')).toContainText(stages[6]!);
  expect((await snapshot(page)).session!.lastLogoutAt).toBeNull();
  expect((await page.locator('.output').textContent())!).toContain('前回使用終了: 記録なし (UTC)');
  for (let i = 0; i < 2; i++) {
    await command(page, 'Q', '接続を終了');
    // BACKUP queues behind the logout write, without reconnecting.
    const ended = await backup(page);
    const text = await command(page, 'RECONNECT', '番号またはコマンド=');
    const data = await snapshot(page);
    expect(text).toContain(`前回使用終了: ${ended.session!.lastLogoutAt} (UTC)`);
    expect(text).toContain(`今回使用開始: ${data.session!.lastLoginAt} (UTC)`);
    expect(count(text, stages[6]!)).toBe(1);
    expect(text).not.toContain('ハンドル名を登録しますか');
    expect(data.members).toEqual(first.members);
    expect(data.posts).toEqual(first.posts);
  }
  const data = await backup(page);
  expect(data.session!.commandHistory.filter((s) => s === 'Q')).toHaveLength(2);
  expect(data.session!.commandHistory.filter((s) => s === 'RECONNECT')).toHaveLength(2);
  const text = (await page.locator('.output').textContent())!;
  expect(count(text, 'デモID: LOCAL-DEMO')).toBe(3);
  await command(page, 'HELP'); await command(page, 'BACK');
  expect(count((await page.locator('.output').textContent())!, 'デモID: LOCAL-DEMO')).toBe(3);
});

for (const stage of [1, 2, 3, 4, 5]) {
  test(`Escape at intermediate stage ${stage} cancels later stages and preserves IME and input`, async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#command'), output = page.locator('.output');
    await expect(output).toContainText(stages[stage]!);
    await input.fill('未送信');
    await input.dispatchEvent('compositionstart');
    await input.press('Escape'); await input.press('Enter');
    expect(await output.textContent()).not.toContain('> 未送信');
    await input.dispatchEvent('compositionend');
    await input.press('Escape'); await input.press('Escape');
    await expect(output).toContainText('ハンドル名を登録しますか');
    await expect(input).toHaveValue('未送信');
    await command(page, 'SKIP', '登録を中止');
    const finished = await output.textContent();
    await page.waitForTimeout(2700);
    expect(await output.textContent()).toBe(finished);
    expect(count(finished!, stages[6]!)).toBe(1);
    expect(count(finished!, 'ハンドル名を登録しますか')).toBe(1);
  });
}

test('early commands and rapid reconnect submissions execute once without late stages or composer interference', async ({ page }) => {
  await start(page); await page.reload();
  const input = page.locator('#command'), output = page.locator('.output');
  await command(page, 'J MITI', 'MITI / 未知の世界');
  await command(page, '3', 'MITI / フォーラム'); await command(page, '9', '投稿一覧');
  await command(page, 'WRITE', '登録しますか'); await command(page, 'Y', 'ハンドル名=');
  await input.press('Escape'); await command(page, '早起き', 'タイトル=');
  await command(page, 'タイトル', '本文');
  const prompt = await output.textContent(); await page.waitForTimeout(2700);
  expect(await output.textContent()).toBe(prompt);
  await command(page, '.CANCEL', '中止'); await command(page, 'MAIN');
  // Dispatch in one browser task, before any async RECONNECT handler can run.
  await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>('#command')!;
    for (const line of ['Q', 'RECONNECT', 'J MITI']) {
      field.value = line; field.form!.requestSubmit();
    }
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  await expect(output).toContainText('> RECONNECT');
  await expect.poll(async () => count((await output.textContent())!, '> J MITI')).toBe(2);
  const data = await backup(page);
  expect(data.session!.commandHistory.filter((s) => s === 'RECONNECT')).toHaveLength(1);
  expect(data.session!.commandHistory.filter((s) => s === 'Q')).toHaveLength(1);
  const finished = await output.textContent(); await page.waitForTimeout(2700);
  expect(await output.textContent()).toBe(finished);
  expect(finished).not.toContain('デモID:');
});

test('Settings remains usable and closing it restores the pending entry draft', async ({ page }) => {
  await page.goto('/');
  await page.locator('#command').fill('保留入力');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect(page.locator('.output')).toContainText('ハンドル名を登録しますか');
  await page.keyboard.press('Escape');
  await expect(page.locator('#command')).toBeFocused();
  await expect(page.locator('#command')).toHaveValue('保留入力');
});

for (const skip of [false, true]) {
  test(`delayed startup loads dates before entry and serializes pending skips/commands (skip=${skip})`, async ({ page }) => {
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (...args: Parameters<IDBFactory['open']>) {
        const request = open.apply(this, args);
        request.addEventListener('success', (event) => {
          if (request.result.name !== 'pcvan-local') return;
          event.stopImmediatePropagation();
          (window as unknown as { releaseStartup: () => void }).releaseStartup = () => {
            request.dispatchEvent(new Event('success'));
          };
        }, { once: true });
        return request;
      };
    });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => typeof (window as unknown as { releaseStartup: unknown }).releaseStartup)).toBe('function');
    const input = page.locator('#command');
    if (skip) {
      await input.press('Escape'); await input.press('Escape');
      await input.fill('SKIP'); await input.press('Enter');
      await input.fill('J MITI'); await input.press('Enter');
    }
    await page.waitForTimeout(2700);
    expect(await page.locator('.output').textContent()).toBe('PC-VAN 接続中…');
    await page.evaluate(() => (window as unknown as { releaseStartup: () => void }).releaseStartup());
    await expect(page.locator('.output')).toContainText(skip ? 'MITI / 未知の世界' : 'ハンドル名を登録しますか');
    if (!skip) await command(page, 'SKIP', '登録を中止');
    const data = await backup(page);
    expect(data.session!.lastLogoutAt).toBeNull();
    expect(data.session!.commandHistory.filter((s) => s === 'J MITI')).toHaveLength(skip ? 1 : 0);
    const text = (await page.locator('.output').textContent())!;
    expect(count(text, stages[6]!)).toBe(1);
    expect(count(text, 'ハンドル名を登録しますか')).toBe(1);
    if (skip) expect(text).not.toContain('デモID:');
    else expect(text).toContain(`今回使用開始: ${data.session!.lastLoginAt} (UTC)`);
  });
}

test('connection presentation can finish once, and commands cancel the wait without being lost', () => {
  const controller = new ConnectionController();
  expect(controller.screen).toBe('connecting');
  expect(controller.submit('J MITI').join('\n')).toContain('MITI / 未知の世界');
  expect(controller.screen).toBe('miti');
  expect(controller.completeConnection()).toEqual([]);
  controller.submit('MAIN');
  controller.submit('Q');
  expect(controller.screen).toBe('disconnected');
  expect(controller.submit('13').join('\n')).toContain('接続は終了しています');
  expect(controller.submit(' reconnect ')).toEqual(controller.welcome);
  expect(controller.screen).toBe('connecting');
  expect(controller.completeConnection().join('\n')).toContain('MAIN');
  expect(controller.screen).toBe('main');
  expect(controller.completeConnection()).toEqual([]);
});


test('Escape skips connection once; logout/reconnect preserve session times and history', async ({ page }) => {
  await page.goto('/'); await page.locator('#command').press('Escape');
  await expect(page.locator('.output')).toContainText('ハンドル名を登録しますか');
  await command(page, 'SKIP', '登録を中止');
  await command(page, 'Q', '接続を終了');
  const ended = await backup(page); expect(ended.session!.lastLogoutAt).not.toBeNull();
  await command(page, 'RECONNECT', '接続中'); await command(page, 'HELP', '番号またはコマンド=');
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, '6', '最終ログイン:');
  const data = await backup(page);
  expect(data.session!.commandHistory.filter((s) => s === 'Q')).toHaveLength(1);
  expect(data.session!.commandHistory.filter((s) => s === 'RECONNECT')).toHaveLength(1);
});

test('typed log export contains all accepted output, literal Unicode, and excludes unsent input', async ({ page }) => {
  await start(page); await command(page, '日本語　ｶﾅ <b>文字</b>', 'この画面では使えない');
  const before = await page.locator('.output').textContent();
  const downloading = page.waitForEvent('download'); await command(page, 'LOG');
  const text = await readFile((await (await downloading).path())!, 'utf8');
  expect(text).toBe(`${before}\n> LOG`);
  await page.locator('#command').fill('未送信');
  expect(text).not.toContain('未送信');
});
