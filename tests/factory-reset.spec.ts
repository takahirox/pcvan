import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { closeSettings, openSettings } from './settings-helpers';

const anchor = '2026-10-21T00:00:00.000Z';
const source = 'http://127.0.0.1:14374';

async function backup(page: Page): Promise<Backup> {
  await openSettings(page, 'storage');
  const downloading = page.waitForEvent('download');
  await page.locator('.backup').click();
  return JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
}

async function restore(page: Page, content: Backup) {
  await openSettings(page, 'storage');
  await page.getByLabel('復元ファイル').setInputFiles({
    name: 'before-reset.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(content)),
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.restore').click();
  await expect(page.locator('.storage-status')).toContainText('バックアップを復元しました');
}

async function reset(page: Page) {
  await openSettings(page, 'storage');
  await page.locator('.reset-world').click();
  await expect(page.getByRole('dialog', { name: '初期状態に戻しますか？' })).toBeVisible();
  await Promise.all([page.waitForEvent('load'), page.locator('.reset-confirm').click()]);
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
}

test('repository reset reuses the exact first-visit fixture, clears all local state, repeats and restores backups', async ({ page }) => {
  await page.goto(source);
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path);
    const repo = await openRepository('reset-test');
    const baseline = await openRepository('reset-baseline');
    await baseline.openActivity(anchor);
    const expected = await baseline.exportBackup();
    await repo.openActivity(anchor);
    const human = await repo.createHumanMember('消える利用者');
    const content = await repo.exportBackup();
    const forum = content.forums[0]!;
    await repo.createPost({ forumId: forum.id, authorId: human.id, title: '手動', body: '消える投稿', origin: 'local-human' });
    const ai = content.members.find((m) => m.actor === 'ai')!;
    await repo.createAiPost(ai, { forumId: forum.id, authorId: ai.id,
      title: '生成', body: '消える生成結果', origin: 'local-ai:webllm:test' });
    await repo.markRead(human.id, content.posts[0]!.id);
    const profilePath = '/src/ai/personas.ts';
    const { residentProfiles } = await import(profilePath);
    const profile = residentProfiles(content)[0]!;
    await repo.configureResident({ ...profile, handle: '変更した住人', frequency: 0 }, anchor);
    await repo.configureActivity(0, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    await repo.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    const activity = await repo.get('settings', 'ai-activity');
    await repo.put('settings', { id: 'ai-activity', value: { ...(activity!.value as object), setupDeferred: true } });
    await repo.put('settings', { id: 'terminal-display', value: { version: 1, theme: 'amber', speed: '300', effects: true } });
    await repo.put('settings', { id: 'custom', value: '消える設定' });
    await repo.recordCommand('消える履歴');
    await repo.endSession();
    const saved = await repo.exportJson();
    const before = await repo.exportBackup();
    let refused = false;
    try { await repo.resetWorld({ confirmReset: false }, anchor); } catch { refused = true; }
    const cancelled = await repo.exportBackup();
    await repo.resetWorld({ confirmReset: true }, anchor);
    const fresh = await repo.exportBackup();
    validateBackup(fresh);
    await repo.resetWorld({ confirmReset: true }, anchor);
    const repeated = await repo.exportBackup();
    repo.close();
    const reopened = await openRepository('reset-test');
    await reopened.openActivity(anchor);
    const reloaded = await reopened.exportBackup();
    await reopened.replaceFromJson(saved, { confirmReplace: true });
    const restored = await reopened.exportBackup();
    // An imported empty world remains empty until the explicit reset action.
    await reopened.replaceFromJson(JSON.stringify({ format: 'pcvan-local', version: 1,
      members: [], sigs: [], forums: [], posts: [], settings: [], readStates: [], session: null }), { confirmReplace: true });
    await reopened.openActivity(anchor);
    const imported = await reopened.exportBackup();
    await reopened.resetWorld({ confirmReset: true }, anchor);
    const afterImported = await reopened.exportBackup();
    reopened.close(); baseline.close();
    return { expected, before, refused, cancelled, fresh, repeated, reloaded, restored, imported, afterImported };
  }, anchor);
  expect(result.refused).toBe(true);
  expect(result.cancelled).toEqual(result.before);
  expect(result.restored).toEqual(result.before);
  expect(result.imported.posts).toEqual([]);
  for (const fresh of [result.fresh, result.repeated, result.reloaded, result.afterImported]) {
    for (const key of ['members', 'forums', 'sigs', 'posts', 'readStates', 'session'] as const) {
      expect(fresh[key]).toEqual(result.expected[key]);
    }
    expect(fresh.posts).toHaveLength(30);
    expect(fresh.posts.filter((p) => !p.replyToPostId)).toHaveLength(8);
    expect(fresh.members).toHaveLength(10);
    expect(fresh.forums).toHaveLength(2);
    expect(fresh.settings.map((s) => s.id)).toEqual(result.expected.settings.map((s) => s.id));
    for (const id of ['ai-residents', 'community-world']) {
      expect(fresh.settings.find((s) => s.id === id)).toEqual(result.expected.settings.find((s) => s.id === id));
    }
    expect(fresh.settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({
      version: 2, maxPosts: 4, consent: false, batch: null, bootstrap: false, truncated: false, lastActivityAt: anchor,
    });
    expect(fresh.settings.find((s) => s.id === 'ai-activity')!.value).not.toHaveProperty('setupDeferred');
  }
});

test('reset transaction failure rolls back clears, fixture writes and generation guard', async ({ page }) => {
  await page.goto(source);
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository('reset-rollback');
    await repo.openActivity(anchor); await repo.recordCommand('保持する履歴');
    const other = await openRepository('reset-rollback');
    const before = await repo.exportBackup();
    const add = IDBObjectStore.prototype.add;
    let inserted = 0;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts' && ++inserted === 8) throw new DOMException('Reset quota failure', 'QuotaExceededError');
      return key === undefined ? add.call(this, value) : add.call(this, value, key);
    };
    let code = '';
    try { await repo.resetWorld({ confirmReset: true }, anchor); } catch (error) { code = (error as { code: string }).code; }
    finally { IDBObjectStore.prototype.add = add; }
    const after = await repo.exportBackup();
    await other.put('settings', { id: 'still-current', value: true });
    const stillCurrent = await repo.get('settings', 'still-current');
    repo.close(); other.close();
    return { before, after, code, inserted, stillCurrent };
  }, anchor);
  expect(result.code).toBe('quota'); expect(result.inserted).toBe(8);
  expect(result.after).toEqual(result.before);
  expect(result.stillCurrent?.value).toBe(true);
});

test('old connections cannot resurrect posts, settings, profiles, consent or history even without notifications', async ({ page }) => {
  await page.goto(source);
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts'; const { openRepository } = await import(path);
    const repo = await openRepository('reset-stale'); await repo.openActivity(anchor);
    const stale = await openRepository('reset-stale');
    const old = await stale.exportBackup();
    // Queue an actual write before the reset; the atomic clear must also remove it.
    await Promise.all([stale.put('settings', { id: 'racing', value: true }), repo.resetWorld({ confirmReset: true }, anchor)]);
    const before = await repo.exportBackup();
    const codes = [];
    for (const action of [
      () => stale.put('settings', { id: 'resurrected', value: true }),
      () => stale.updatePost(old.posts[0]!.id, { title: '古い編集', body: '古い本文' }),
      () => stale.createAiPost(old.members[0]!, { forumId: old.forums[0]!.id, authorId: old.members[0]!.id,
        title: '遅れた生成', body: '古い結果', origin: 'local-ai:webllm:test' }),
      () => stale.recordCommand('古い履歴'),
      () => stale.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC'),
      () => stale.commitAiRun('old-scheduled-run', '{}'),
      () => stale.replaceFromJson(JSON.stringify(old), { confirmReplace: true }),
      () => stale.resetWorld({ confirmReset: true }, anchor),
      () => stale.exportBackup(),
    ]) {
      try { await action(); codes.push('unexpected success'); } catch (error) { codes.push((error as { code: string }).code); }
    }
    const after = await repo.exportBackup(); repo.close(); stale.close();
    return { before, after, codes };
  }, anchor);
  expect(result.codes).toEqual(Array(9).fill('stale'));
  expect(result.after).toEqual(result.before);
  expect(result.after.settings.some((s) => s.id === 'racing')).toBe(false);
});

test('reset cancel, Escape and backdrop preserve the world and displayed session without loading AI', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await page.locator('#command').fill('J MITI'); await page.locator('#command').press('Enter');
  const before = await backup(page);
  const output = await page.locator('.output').textContent();
  for (const cancel of ['button', 'escape', 'backdrop']) {
    await page.locator('.reset-world').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.reset-cancel')).toBeFocused();
    await expect(page.locator('.reset-confirmation')).toContainText('この操作は取り消せません');
    if (cancel === 'button') await page.locator('.reset-cancel').click();
    else if (cancel === 'escape') await page.keyboard.press('Escape');
    else await page.mouse.click(2, 2);
    await expect(page.locator('.reset-confirmation')).toBeHidden();
    await expect(page.locator('.reset-world')).toBeFocused();
    expect(await backup(page)).toEqual(before);
    expect(await page.locator('.output').textContent()).toBe(output);
  }
  expect(requests.some((url) => /webllm|huggingface|mlc-ai/.test(url))).toBe(false);
});

test('confirmed reset reloads this and other tabs into clean MAIN, preserves caches, and supports backup recovery', async ({ page, context }) => {
  await page.clock.setFixedTime(new Date(anchor));
  await page.goto('/');
  const fixture = backupFixture();
  fixture.sigs[0]!.keyword = 'MITI'; fixture.forums[0]!.boardNo = 9;
  fixture.posts[1]!.origin = 'local-ai:webllm:test';
  fixture.settings.push({ id: 'active-human-member', value: 'human' },
    { id: 'terminal-display', value: { version: 1, theme: 'amber', speed: 'instant', effects: true } });
  await restore(page, fixture);
  const saved = await backup(page);
  const other = await context.newPage(); await other.clock.setFixedTime(new Date(anchor)); await other.goto('/');
  for (const line of ['J MITI', '3', '9', 'REPLY 1']) {
    await other.locator('#command').fill(line); await other.locator('#command').press('Enter');
  }
  await expect(other.getByRole('dialog', { name: '投稿エディター' })).toBeVisible();
  await other.locator('.post-body').fill('消える下書き');
  await page.evaluate(async () => {
    localStorage.setItem('unrelated-origin-data', 'keep');
    for (const name of ['webllm-test-weights', 'pcvan-shell-test']) {
      const cache = await caches.open(name); await cache.put('/reset-cache-sentinel', new Response('keep'));
    }
  });
  const otherReload = other.waitForEvent('load');
  await reset(page); await otherReload;
  for (const tab of [page, other]) {
    await expect(tab.locator('.settings-dialog')).toBeHidden();
    await expect(tab.locator('dialog[open]')).toHaveCount(0);
    await expect(tab.locator('.output')).toContainText('番号またはコマンド=');
    await expect(tab.locator('.output')).not.toContainText('REPLY 1');
    await expect(tab.locator('.terminal')).toHaveAttribute('data-theme', 'white');
    await expect(tab.locator('.terminal')).not.toHaveClass(/effects/);
    await tab.locator('#command').press('ArrowUp'); await expect(tab.locator('#command')).toHaveValue('');
    await expect(tab.locator('.reply-reference')).toBeHidden();
  }
  await openSettings(page, 'storage');
  await expect(page.locator('.storage-status')).toContainText('初期状態に戻しました');
  const fresh = await backup(page);
  expect(fresh.posts).toHaveLength(30); expect(fresh.members).toHaveLength(10);
  expect(fresh.forums).toHaveLength(2); expect(fresh.readStates).toEqual([]);
  expect(fresh.session).toMatchObject({ lastLoginAt: anchor, lastLogoutAt: null, commandHistory: [] });
  expect(fresh.settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ maxPosts: 4, consent: false });
  expect(await page.evaluate(async () => ({ unrelated: localStorage.getItem('unrelated-origin-data'),
    weights: await (await caches.open('webllm-test-weights')).match('/reset-cache-sentinel').then((r) => r?.text()),
    shell: await (await caches.open('pcvan-shell-test')).match('/reset-cache-sentinel').then((r) => r?.text()),
  }))).toEqual({ unrelated: 'keep', weights: 'keep', shell: 'keep' });
  await page.reload(); expect((await backup(page)).posts).toEqual(fresh.posts);
  await reset(page); expect((await backup(page)).posts).toEqual(fresh.posts);
  await restore(page, saved); expect(await backup(page)).toEqual(saved);
  await closeSettings(page);
});

test('reset write failure reports an error in Settings and preserves current UI and data', async ({ page }) => {
  await page.goto('/');
  const before = await backup(page);
  const output = await page.locator('.output').textContent();
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts') {
        IDBObjectStore.prototype.add = add;
        throw new DOMException('Simulated reset failure', 'QuotaExceededError');
      }
      return key === undefined ? add.call(this, value) : add.call(this, value, key);
    };
  });
  await page.locator('.reset-world').click(); await page.locator('.reset-confirm').click();
  await expect(page.locator('.storage-status')).toContainText('保存容量が足りません');
  expect(await page.locator('.output').textContent()).toBe(output);
  expect(await backup(page)).toEqual(before);
  await reset(page); expect((await backup(page)).posts).toHaveLength(30);
});

test('a tab missing reset notifications cannot accept its old consent dialog or download a model', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.addInitScript(() => {
    Object.defineProperty(window, 'BroadcastChannel', { value: undefined });
    Object.defineProperty(navigator, 'gpu', { value: {} });
  });
  const modelRequests: string[] = [];
  other.on('request', (r) => { if (/webllm|huggingface|mlc-ai/.test(r.url())) modelRequests.push(r.url()); });
  await other.goto('/');
  await other.locator('.ai-setup-start').click();
  await expect(other.locator('.ai-consent')).toBeVisible();
  await reset(page);
  // No focus event: exercise the atomic epoch guard itself, not the notification.
  await Promise.all([other.waitForEvent('load'), other.locator('.ai-consent-confirm').click()]);
  await expect(other.locator('.ai-consent')).toBeHidden();
  await expect(other.locator('.ai-setup-later')).toBeVisible();
  expect((await backup(other)).settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false });
  expect(modelRequests).toEqual([]);
});

for (const work of ['download', 'inference', 'scheduled inference'] as const) {
  test(`reset terminates pending ${work}, rejects late worker results and requires new consent`, async ({ page }) => {
    await page.addInitScript((work) => {
      Object.defineProperty(navigator, 'gpu', { value: {} });
      class WaitingWorker {
        onmessage?: (event: MessageEvent) => void;
        pending?: () => void;
        postMessage(message: { kind: string; uuid: string; content: { request: { messages: { content: string }[] } } }) {
          let content: unknown = null;
          if (message.kind === 'chatCompletionNonStreaming') {
            const data = JSON.parse(message.content.request.messages[1]!.content);
            content = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
              personaId: data.personaId, forumId: data.forumId, title: '古い生成結果', body: 'リセット後には保存しない',
            }) } }] };
          }
          const finish = () => this.onmessage?.(new MessageEvent('message', { data: { uuid: message.uuid, kind: 'return', content } }));
          if (message.kind === 'reload' || message.kind === 'chatCompletionNonStreaming') {
            const key = message.kind === 'reload' ? 'reset-test-loads' : 'reset-test-generations';
            sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key)) + 1));
            if ((work === 'download' && message.kind === 'reload') ||
                (work !== 'download' && message.kind === 'chatCompletionNonStreaming')) { this.pending = finish; return; }
          }
          queueMicrotask(finish);
        }
        terminate() {
          sessionStorage.setItem('reset-test-terminated', 'true');
          // Deliberately deliver a late response even after termination.
          const pending = this.pending; this.pending = undefined;
          if (pending) queueMicrotask(pending);
        }
      }
      window.Worker = WaitingWorker as unknown as typeof Worker;
    }, work);
    await page.clock.setFixedTime(new Date(anchor));
    await page.goto('/'); await openSettings(page, 'ai');
    await page.locator('.ai-load').click(); await page.locator('.ai-consent-confirm').click();
    if (work !== 'download') {
      await expect(page.locator('.ai-message')).toContainText('モデル準備完了');
      if (work === 'inference') await page.locator('.ai-generate').click();
      else {
        // Pin the scheduler seed/due times; inference still uses production
        // controls, planning, worker transport and repository transactions.
        await page.evaluate(async (anchor) => {
          const db = await new Promise<IDBDatabase>((resolve) => {
            const opening = indexedDB.open('pcvan-local'); opening.onsuccess = () => resolve(opening.result);
          });
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('settings', 'readwrite'); const store = tx.objectStore('settings');
            const read = store.get('ai-activity');
            read.onsuccess = () => {
              const row = read.result; row.value.seed = 'reset-scheduled-test';
              for (const id of Object.keys(row.value.nextDue)) row.value.nextDue[id] = anchor;
              store.put(row);
            };
            tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
          });
          db.close();
        }, anchor);
        await page.clock.setFixedTime(new Date('2026-10-24T00:00:00.000Z'));
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      }
      await expect.poll(() => page.evaluate(() => sessionStorage.getItem('reset-test-generations'))).toBe('1');
    } else {
      await expect.poll(() => page.evaluate(() => sessionStorage.getItem('reset-test-loads'))).toBe('1');
    }
    await reset(page);
    expect(await page.evaluate(() => sessionStorage.getItem('reset-test-terminated'))).toBe('true');
    const fresh = await backup(page);
    expect(fresh.posts).toHaveLength(30);
    expect(fresh.posts.every((post) => post.origin === 'local-seed:fictional')).toBe(true);
    expect(fresh.settings.find((s) => s.id === 'ai-activity')!.value).toMatchObject({ consent: false, batch: null });
    await closeSettings(page);
    await expect(page.locator('.ai-setup-later')).toBeVisible();
    await expect(page.locator('.ai-preview')).toBeHidden();
    await expect(page.locator('.ai-progress')).toHaveAttribute('value', '0');
    await page.locator('.ai-setup-start').click();
    await expect(page.locator('.ai-consent')).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('reset-test-loads'))).toBe('1');
    await page.keyboard.press('Escape');
  });
}
