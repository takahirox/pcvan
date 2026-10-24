import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { command, start, snapshot, backup, restore, noOtherUi } from './terminal-helpers';

const binary = Buffer.concat([Buffer.from(Array.from({ length: 256 }, (_, i) => i)), Buffer.from([0, 255, 254, 192, 175, 13, 10, 10, 13, 0])]);
async function pick(page: Page, bytes = binary, name = 'original.bin', response = 'ファイルメール確認') {
  const choosing = page.waitForEvent('filechooser');
  await command(page, 'PICK');
  await (await choosing).setFiles({ name, mimeType: 'application/octet-stream', buffer: bytes });
  await expect(page.locator('.output')).toContainText(response);
  await expect(page.locator('#command')).toBeFocused();
}
async function acquire(page: Page, bytes: Buffer, number = 1) {
  await command(page, `ACQUIRE ${number}`, 'Y: 取得');
  const downloading = page.waitForEvent('download'); await command(page, 'Y', 'ファイル取得をブラウザーに依頼');
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('pcvan-mail-original.bin');
  expect(await readFile((await download.path())!)).toEqual(bytes);
  await command(page, 'Y', 'この画面では使えない');
}
for (const route of [
  { name: 'MAIN 1', steps: ['1'], title: '電子メール', parent: 'ＰＣ－ＶＡＮ' },
  { name: 'MAIN X', steps: ['X'], title: '旧電子メール', parent: 'ＰＣ－ＶＡＮ' },
  { name: 'DAISIZEN MAIL', steps: ['13', '2', 'MAIL'], title: '電子メール', parent: '大自然' },
]) {
  test(`${route.name}: explicit file selection, IME review, single save, inert exact-byte acquisition, reload and JSON restore`, async ({ page }) => {
    const requests: string[] = []; page.on('request', (r) => requests.push(r.url()));
    const downloads: string[] = []; page.on('download', (d) => downloads.push(d.suggestedFilename()));
    await start(page);
    const enter = async () => {
      await command(page, 'MAIN', 'MAIN');
      for (const step of route.steps) await command(page, step, 'コマンド=');
    };
    await enter(); await command(page, 'HELP', 'WRITE-FILE');
    await command(page, 'WRITE-FILE hoshimori', '登録しますか'); await command(page, 'Y', 'ハンドル名=');
    await command(page, 'ファイルの主', '件名=');
    await command(page, '  秘密のファイル件名  ', 'PICK:');
    expect((await snapshot(page)).mail).toEqual([]);
    await pick(page); expect(downloads).toEqual([]);
    const input = page.locator('#command');
    await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
    expect((await snapshot(page)).mail).toEqual([]); await input.dispatchEvent('compositionend');
    await command(page, 'EDIT', '件名='); await command(page, '編集したファイル件名', 'ファイルメール確認');
    await command(page, 'HELP', `${binary.length} bytes`);
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#command')!;
      for (const line of ['Y', 'Y']) { input.value = line; input.form!.requestSubmit(); }
    });
    await expect(page.locator('.output')).toContainText('ファイルメール #1 を保存しました');
    const saved = await snapshot(page); expect(saved.mail).toHaveLength(1);
    expect(saved.mail![0]!.file!.data).toBe(binary.toString('base64'));
    expect(saved.session!.commandHistory).not.toContain('編集したファイル件名');
    expect(saved.mail![0]).not.toHaveProperty('recipientConfirmation');
    const verify = async () => {
      await command(page, 'SENT', `[ファイル ${binary.length} bytes]`);
      const output = await command(page, 'READ 1', `pcvan-mail-original.bin / ${binary.length} bytes`);
      expect(output).toContain('編集したファイル件名'); expect(output).not.toContain(binary.toString('base64'));
      expect(output).not.toContain('★内容'); expect(output).toContain('既読確認：確認なし');
      const count = downloads.length;
      await command(page, 'ACQUIRE 1', 'Y: 取得'); await command(page, 'HELP', 'Y: 取得');
      await command(page, 'N', '操作を中止'); await command(page, 'Y', 'この画面では使えない');
      expect(downloads).toHaveLength(count);
      await acquire(page, binary); await command(page, 'BACK', route.title); await command(page, 'BACK', route.parent);
    };
    await verify(); const exported = await backup(page);
    await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await enter(); await verify();
    await restore(page, exported); await enter(); await verify();
    expect((await snapshot(page)).mail).toEqual(exported.mail);
    await noOtherUi(page);
    expect(requests.filter((url) => !url.startsWith('http://127.0.0.1:14373/'))).toEqual([]);
  });
}
for (const size of [0, 262144]) {
  test(`file mail preserves ${size} exact bytes after JSON restoration`, async ({ page }) => {
    const bytes = Buffer.alloc(size); for (let i = 0; i < size; i++) bytes[i] = i % 256;
    await start(page, '境界の人'); await command(page, '1', '電子メール');
    await command(page, 'WRITE-FILE hoshimori', '件名='); await command(page, '境界', 'PICK:');
    await pick(page, bytes); await command(page, 'Y', 'ファイルメール #1');
    await command(page, 'SENT', `[ファイル ${size} bytes]`); await acquire(page, bytes);
    const saved = await backup(page); await restore(page, saved);
    await command(page, 'MAIN', 'MAIN'); await command(page, 'X', '旧電子メール');
    await command(page, 'SENT', `[ファイル ${size} bytes]`); await acquire(page, bytes);
  });
}

test('picker cancellation, empty selection, read errors, oversized/unsafe files, reselection and save failure never partially save', async ({ page }) => {
  await start(page, '選択する人'); await command(page, '1', '電子メール');
  await command(page, 'WRITE-FILE INET#one@letters.example.invalid', '既存のローカル住人1人');
  await command(page, 'hoshimori', '件名='); await command(page, '選択の試験', 'PICK:');
  for (const event of ['cancel', 'change']) {
    const choosing = page.waitForEvent('filechooser'); await command(page, 'PICK'); await choosing;
    await page.locator('input[type=file]').dispatchEvent(event);
    await expect(page.locator('.output')).toContainText('選択を中止しました');
    expect((await snapshot(page)).mail).toEqual([]);
  }
  await pick(page, binary, '../unsafe.bin', 'ファイルを読み込めません');
  // Native pickers expose a basename; use unsupported punctuation to test rejection.
  await pick(page, binary, 'unsafe name.bin', 'ファイルを読み込めません');
  await pick(page, Buffer.alloc(262145), 'large.bin', 'ファイルを読み込めません');
  await page.evaluate(() => {
    const native = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = () => Promise.reject(new DOMException('Synthetic read failure', 'NotReadableError'));
    Object.assign(window, { restoreFileRead: () => { File.prototype.arrayBuffer = native; } });
  });
  await pick(page, binary, 'unreadable.bin', 'Synthetic read failure');
  await page.evaluate(() => (window as unknown as { restoreFileRead(): void }).restoreFileRead());
  expect((await snapshot(page)).mail).toEqual([]);
  await pick(page); await command(page, 'EDIT', '件名='); await command(page, '変更した件名', 'ファイルメール確認');
  await pick(page, Buffer.from([255, 0, 13, 10]));
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'session' && key === 'mail-next-number') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restoreFilePut: () => { IDBObjectStore.prototype.put = native; } });
  });
  await command(page, 'Y', '保存を確認できません'); expect((await snapshot(page)).mail).toEqual([]);
  await command(page, 'Y', 'REVIEW:');
  await page.evaluate(() => (window as unknown as { restoreFilePut(): void }).restoreFilePut());
  await command(page, 'REVIEW', 'ファイルメール確認'); await command(page, 'Y', 'ファイルメール #1');
  await command(page, 'SENT', 'ファイル'); await acquire(page, Buffer.from([255, 0, 13, 10]));
});

for (const operation of ['reset', 'restore'] as const) {
  for (const stage of ['picker', 'read', 'review', 'acquire'] as const) {
    test(`cross-tab ${operation} invalidates file ${stage} and queued approvals`, async ({ page, context }) => {
      await start(page, '古いファイル'); await command(page, '1', '電子メール');
      await command(page, 'WRITE-FILE hoshimori', '件名='); await command(page, '保存済み', 'PICK:');
      await pick(page); await command(page, 'Y', 'ファイルメール #1');
      const saved = await backup(page), other = await context.newPage();
      const downloads: string[] = []; other.on('download', (d) => downloads.push(d.suggestedFilename()));
      await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN'); await command(other, 'X', '旧電子メール');
      if (stage === 'acquire') { await command(other, 'SENT', 'ファイル'); await command(other, 'ACQUIRE 1', 'Y: 取得'); }
      else {
        await command(other, 'WRITE-FILE hoshimori', '件名='); await command(other, '破棄する', 'PICK:');
        if (stage === 'review') await pick(other);
        else {
          if (stage === 'read') await other.evaluate(() => { File.prototype.arrayBuffer = () => new Promise(() => {}); });
          const choosing = other.waitForEvent('filechooser'); await command(other, 'PICK');
          const chooser = await choosing;
          if (stage === 'read') await chooser.setFiles({ name: 'waiting.bin', mimeType: 'application/octet-stream', buffer: binary });
        }
      }
      if (operation === 'reset') {
        await command(page, 'RESET', '初期状態に戻しますか');
        await Promise.all([page.waitForEvent('load'), other.waitForEvent('load'), command(page, 'Y')]);
      } else await Promise.all([other.waitForEvent('load'), restore(page, saved)]);
      await expect(other.locator('.output')).toContainText('MAIN'); await command(other, 'SKIP');
      await command(other, 'Y', 'この画面では使えない'); expect(downloads).toEqual([]);
      expect((await snapshot(page)).mail).toHaveLength(operation === 'reset' ? 0 : 1);
    });
  }
}
