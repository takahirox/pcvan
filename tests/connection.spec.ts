import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ConnectionController } from '../src/connection';
import type { Session } from '../src/storage/schema';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };

async function savedSession(page: Page): Promise<Session | null> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const opening = indexedDB.open('pcvan-local');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      const tx = db.transaction('session');
      const reading = tx.objectStore('session').get('current');
      reading.onsuccess = () => resolve(reading.result ?? null);
      reading.onerror = () => reject(reading.error);
      tx.oncomplete = () => db.close();
    };
  }));
}

test('connection presentation can finish once, and commands cancel the wait without being lost', () => {
  const controller = new ConnectionController();
  expect(controller.screen).toBe('connecting');
  expect(controller.welcome.join('\n')).toContain('[D / reconstructed]');
  expect(controller.welcome.join('\n')).toContain('1996年の挨拶文は未確認');
  expect(controller.submit('J MITI').join('\n')).toContain('MITI / 未知の世界');
  expect(controller.screen).toBe('miti');
  expect(controller.completeConnection()).toEqual([]);
  controller.submit('MAIN');
  controller.submit('Q');
  expect(controller.screen).toBe('disconnected');
  expect(controller.submit('13').join('\n')).toContain('接続は終了しています');
  expect(controller.submit(' reconnect ')).toEqual(controller.welcome);
  expect(controller.screen).toBe('connecting');
  expect(controller.completeConnection().join('\n')).toContain('MAIN（1996年頃');
  expect(controller.screen).toBe('main');
  expect(controller.completeConnection()).toEqual([]);
});

test('skip, automatic completion, logout and reconnect persist times without network or modem APIs', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-20T10:00:01Z'));
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.assign(window, { connectionCalls: calls });
    const deny = (name: string) => function () { calls.push(name); throw new Error(`Unexpected ${name}`); };
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'RTCPeerConnection', 'WebTransport']) {
      Object.defineProperty(window, name, { value: deny(name), configurable: true });
    }
    Object.defineProperty(navigator, 'sendBeacon', { value: deny('sendBeacon') });
    Object.defineProperty(navigator, 'serial', { value: { requestPort: deny('serial'), getPorts: deny('serial') } });
  });
  await page.goto('/');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.context().setOffline(true);
  const skip = page.getByRole('button', { name: '接続演出をスキップ' });
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const output = page.locator('.output');
  await expect(skip).toBeVisible();
  await expect(output).not.toContainText('MAIN（1996年頃');
  await expect.poll(async () => (await savedSession(page))?.lastLoginAt).toBeTruthy();
  const firstLogin = (await savedSession(page))!.lastLoginAt;
  await skip.click();
  await expect(output).toContainText('MAIN（1996年頃');
  await expect(skip).toBeHidden();
  await expect(input).toBeFocused();
  await page.clock.runFor(2000);
  await input.fill('Q');
  await input.press('Enter');
  await expect.poll(async () => (await savedSession(page))?.lastLogoutAt).toBeTruthy();
  const loggedOut = (await savedSession(page))!;
  expect(loggedOut.lastLoginAt).toBe(firstLogin);
  await expect(page.locator('.session-times')).toContainText(loggedOut.lastLogoutAt!);
  await page.clock.runFor(2000);
  await input.fill('RECONNECT');
  await input.press('Enter');
  await expect(skip).toBeVisible();
  await expect.poll(async () => (await savedSession(page))?.lastLoginAt).not.toBe(firstLogin);
  expect((await savedSession(page))!.lastLogoutAt).toBe(loggedOut.lastLogoutAt);
  await page.clock.runFor(1200);
  await expect(skip).toBeHidden();
  expect((await output.textContent())!.trimEnd().endsWith(`\n${mainMenu.prompt.text}`)).toBe(true);
  await input.fill('13');
  await input.press('Enter');
  await expect(output).toContainText('再構成の仮設ブリッジ');
  expect(await page.evaluate(() => (window as unknown as { connectionCalls: string[] }).connectionCalls)).toEqual([]);
  expect(requests).toEqual([]);
  await page.context().setOffline(false);
  await page.reload();
  await expect.poll(async () => (await savedSession(page))?.lastLogoutAt).toBe(loggedOut.lastLogoutAt);
  await expect(page.locator('.session-times')).toContainText(loggedOut.lastLogoutAt!);
});

test('log download matches every displayed UTF-8 byte, including Japanese and line breaks', async ({ page }) => {
  await page.goto('/');
  // A command during the connection effect immediately opens MAIN and is handled.
  const input = page.getByRole('textbox', { name: 'コマンド' });
  const line = '  日本語：ＡＢＣ　。、 ｶﾀｶﾅ <b>文字</b>  ';
  await input.fill(line);
  await input.press('Enter');
  await expect(page.getByRole('button', { name: '接続演出をスキップ' })).toBeHidden();
  await expect(page.locator('.output')).toContainText('MAIN（1996年頃');
  const visible = (await page.locator('.output').textContent())!;
  expect(visible).toContain(`> ${line}\n`);
  expect(visible).toContain('\n 1 電子メール');
  await input.fill('書きかけの入力');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '端末ログを保存 (.txt)' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^pcvan-terminal-.*\.txt$/);
  expect(await readFile((await download.path())!)).toEqual(Buffer.from(visible, 'utf8'));
  await expect(input).toHaveValue('書きかけの入力');
});
