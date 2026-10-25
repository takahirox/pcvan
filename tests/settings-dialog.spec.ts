import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { command, start, enterForum, post, snapshot, noOtherUi } from './terminal-helpers';
import { epoch, hour, lifestyles } from './autonomy-helpers';
import { mockWorker, mockPendingWorker, mockModel } from './ai-helpers';
import type { AiActivity } from '../src/storage/schema';
import type { ResidentSettings } from '../src/ai/personas';

const dialog = (page: Page) => page.getByRole('dialog', { name: '設定 / Options', exact: true });
async function open(page: Page, panel?: string) {
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: '閉じる', exact: true })).toBeFocused();
  if (panel) await dialog(page).locator(`.${panel}-panel > summary`).click();
}
async function close(page: Page) {
  await dialog(page).getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible(); await expect(page.locator('#command')).toBeFocused();
}
async function choose(page: Page, text: string) {
  const choosing = page.waitForEvent('filechooser');
  await dialog(page).getByRole('button', { name: 'JSON から復元', exact: true }).click();
  await (await choosing).setFiles({ name: 'world.json', mimeType: 'application/json', buffer: Buffer.from(text) });
}
async function cap(page: Page, max: number) {
  await dialog(page).getByLabel('自動投稿上限', { exact: false }).fill(String(max));
  await dialog(page).getByRole('button', { name: '活動設定を保存', exact: true }).click();
  await expect(dialog(page).locator('.settings-message')).toContainText(max ? '有効' : '休止');
}
async function load(page: Page) {
  await dialog(page).getByRole('button', { name: 'モデルを読み込む', exact: true }).click();
  await expect(dialog(page).locator('.confirmation-copy')).toContainText('数百 MB〜数 GB');
  await dialog(page).getByRole('button', { name: '同意してモデルを読み込む', exact: true }).click();
}
async function activity(page: Page) {
  return (await snapshot(page)).settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
}

test('keyboard Settings preserves terminal text, traps focus, guards IME and persists display choices at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 }); await start(page, '書く人');
  await enterForum(page); await command(page, 'READ 1', '★内容');
  const input = page.locator('#command'); await input.fill('書きかけ　ｶﾅ');
  await input.press('Shift+Tab'); await page.getByRole('log').press('Shift+Tab');
  await expect(page.getByRole('button', { name: '設定 / Options', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const modal = dialog(page), closeButton = modal.getByRole('button', { name: '閉じる', exact: true });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(modal.locator('.about-panel > summary')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(closeButton).toBeFocused();
  await page.keyboard.press('Tab'); await expect(modal.locator('.display-panel > summary')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(modal.getByRole('combobox', { name: '表示色', exact: true })).toBeFocused();
  // Native popup selection is controlled through Playwright; focus, checkbox,
  // form submission and modal navigation use keyboard events.
  await modal.getByRole('combobox', { name: '表示色', exact: true }).selectOption('green');
  await expect(modal.getByRole('combobox', { name: '表示色', exact: true })).toHaveValue('green');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab'); await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); await expect(modal.getByRole('button', { name: '表示設定を保存', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(modal.locator('.settings-message')).toHaveText('表示設定を保存しました。');
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'green');
  expect(await modal.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await modal.dispatchEvent('compositionstart'); await page.keyboard.press('Escape');
  await expect(modal).toBeVisible(); await modal.dispatchEvent('compositionend'); await page.keyboard.press('Escape');
  await expect(input).toBeFocused(); await expect(input).toHaveValue('書きかけ　ｶﾅ');
  await input.fill(''); await command(page, 'READ 2', '返信先：#1'); await noOtherUi(page);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'green');
  await open(page); await expect(dialog(page).getByLabel('光彩・走査線')).toBeChecked();
});

for (const stage of ['title', 'body', 'review']) {
  test(`deliberate Settings preserves the active ${stage} prompt and never submits it on close`, async ({ page }) => {
    await mockWorker(page, 'ok'); await start(page, '編集中'); await enterForum(page);
    await command(page, 'WRITE', 'タイトル=');
    if (stage !== 'title') await command(page, '保持する題名', '本文');
    if (stage === 'review') { await command(page, '保持する本文', '本文='); await command(page, '.END', '投稿しますか'); }
    const input = page.locator('#command'); const text = stage === 'review' ? 'Y' : '未送信　日本語';
    await input.fill(text); const output = await page.locator('.output').textContent();
    await open(page, 'ai'); await load(page);
    await expect(dialog(page).locator('.ai-status')).toContainText('モデル準備完了');
    await close(page); await expect(input).toHaveValue(text);
    expect(await page.locator('.output').textContent()).toBe(output);
    expect((await snapshot(page)).posts).toHaveLength(82);
    await input.press('Enter');
    if (stage === 'title') { await expect(page.locator('.output')).toContainText('本文を1行ずつ'); await command(page, '本文', '本文='); }
    if (stage !== 'review') { await command(page, '.END', '投稿しますか'); await command(page, 'Y', 'を登録しました'); }
    else await expect(page.locator('.output')).toContainText('を登録しました');
    expect((await snapshot(page)).posts).toHaveLength(83);
  });
}

test('terminal IME defers Settings without losing text; neutral setup cue supports per-world deferral', async ({ page }) => {
  await mockWorker(page, 'ok'); await start(page);
  const input = page.locator('#command'); await input.fill('変換中'); await input.dispatchEvent('compositionstart');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible(); await expect(input).toHaveValue('変換中');
  await input.dispatchEvent('compositionend');
  await page.getByRole('button', { name: 'AIモデルの準備', exact: true }).click();
  await expect(dialog(page).locator('.ai-panel')).toHaveAttribute('open', '');
  await dialog(page).getByRole('button', { name: 'あとで準備', exact: true }).click();
  await expect(dialog(page).locator('.settings-message')).toContainText('延期');
  expect(await activity(page)).toMatchObject({ setupDeferred: true, consent: false, maxPosts: 4 });
  await close(page); await expect(page.getByRole('button', { name: 'AIモデルの準備', exact: true })).not.toBeVisible();
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await expect(page.getByRole('button', { name: 'AIモデルの準備', exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});

test('Settings model selector, refusal, affirmative consent, pause and on-demand provenance share stored actions', async ({ page }) => {
  await mockWorker(page, 'ok'); await start(page); const transcript = await page.locator('.output').textContent();
  await open(page, 'ai'); const modal = dialog(page);
  await modal.getByRole('combobox', { name: 'モデル', exact: true }).selectOption({ index: 1 });
  await expect(modal.locator('.settings-message')).toContainText('モデルを選択');
  await cap(page, 0);
  await modal.getByRole('button', { name: 'モデルの保存状態を確認', exact: true }).click();
  await expect(modal.locator('.ai-status')).toContainText('重みは');
  await modal.getByRole('button', { name: 'モデルを読み込む', exact: true }).click();
  await expect(modal.locator('.confirmation-copy')).toContainText('数百 MB〜数 GB');
  await modal.getByRole('button', { name: '中止', exact: true }).click();
  expect(await activity(page)).toMatchObject({ consent: false });
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
  await load(page); await expect(modal.locator('.ai-status')).toContainText('モデル準備完了');
  expect(await activity(page)).toMatchObject({ consent: true, modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', maxPosts: 0 });
  await expect(modal.locator('.generate-ai, .preview-ai, .save-ai, .discard-ai, .persona-select, .forum-select, .ai-reply')).toHaveCount(0);
  expect((await snapshot(page)).posts).toHaveLength(82);
  await modal.getByRole('button', { name: '処理を中止・モデルを解放', exact: true }).click();
  await expect(modal.locator('.ai-status')).toContainText('キャンセル');
  await modal.locator('.about-panel > summary').click(); await expect(modal.locator('.settings-about')).toContainText('local-ai:webllm:');
  await close(page); expect(await page.locator('.output').textContent()).toBe(transcript);
  await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, '3', 'Qwen2.5-1.5B');
});

test('filtered resident profiles and schedule fields are editable, validated, cancellable and restored on reload', async ({ page }) => {
  await start(page); await open(page, 'ai'); const modal = dialog(page);
  await modal.getByText('住人のプロフィール・生活時間', { exact: true }).click();
  expect(await modal.locator('.resident-select option').count()).toBe(100);
  await modal.locator('.resident-filter').fill('夜間');
  expect(await modal.locator('.resident-select option').count()).toBeLessThan(15);
  await modal.locator('.resident-filter').fill('');
  const editedIds = ['hoshimori', 'akari', 'hibari', 'aozora', 'hakobera'];
  for (const id of editedIds) {
    await modal.getByRole('combobox', { name: '編集する住人', exact: true }).selectOption(id);
    await modal.locator('textarea[name="routine"]').fill(`生活時間 ${id}`);
    await modal.locator('textarea[name="frequency"]').fill('0.5');
    await modal.getByRole('button', { name: '住人の設定を保存', exact: true }).click();
    await expect.poll(async () => ((await snapshot(page)).settings.find((r) => r.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles.find((p) => p.id === id)!.routine).toBe(`生活時間 ${id}`);
  }
  await modal.locator('textarea[name="weekdayHours"]').fill('6,18,22');
  await modal.locator('textarea[name="affinities"]').fill('{"hoshimori":0.8}');
  await modal.locator('textarea[name="frequency"]').fill('9');
  await modal.getByRole('button', { name: '住人の設定を保存', exact: true }).click();
  await expect(modal.locator('.settings-message')).toContainText('操作できません');
  await expect(modal.locator('textarea[name="frequency"]')).toHaveValue('9');
  await modal.locator('textarea[name="frequency"]').fill('0');
  await modal.getByRole('button', { name: '住人の設定を保存', exact: true }).click();
  await expect(modal.locator('.settings-message')).toContainText('住人の設定を保存');
  const saved = await snapshot(page), profiles = (saved.settings.find((r) => r.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles;
  expect(profiles.filter((p) => editedIds.includes(p.id)).every((p) => p.routine === `生活時間 ${p.id}`)).toBe(true);
  expect(profiles.at(-1)).toMatchObject({ frequency: 0, weekdayHours: [6,18,22], affinities: { hoshimori: .8 } });
  await modal.locator('textarea[name="handle"]').fill('破棄する名前');
  await modal.getByRole('button', { name: '変更を破棄', exact: true }).click();
  await expect(modal.locator('textarea[name="handle"]')).not.toHaveValue('破棄する名前');
  await close(page); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  expect((await snapshot(page)).settings.find((r) => r.id === 'ai-residents')!.value).toEqual(saved.settings.find((r) => r.id === 'ai-residents')!.value);
});

for (const work of ['load', 'generate'] as const) {
  test(`Settings can cancel pending ${work} without late output or blocking human posting`, async ({ page }) => {
    await page.clock.install({ time: epoch });
    await mockPendingWorker(page, work); await start(page, '手動'); await lifestyles(page); await open(page, 'ai'); await load(page);
    const modal = dialog(page);
    if (work === 'generate') {
      await expect(modal.locator('.ai-status')).toContainText('モデル準備完了');
      await page.clock.fastForward(hour);
    }
    await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork)).toContain(work === 'load' ? 'reload' : 'chatCompletionNonStreaming');
    await modal.getByRole('button', { name: '処理を中止・モデルを解放', exact: true }).click();
    await expect(modal.locator('.ai-status')).toContainText('キャンセル');
    await close(page); await enterForum(page); await post(page, '手動で投稿', 'モデル処理は不要');
    expect((await snapshot(page)).posts).toHaveLength(83);
  });
}

test('model progress and failures stay in Settings; a failed load leaves terminal reading and posting available', async ({ page }) => {
  await mockModel(page); await start(page, '試す人', 'http://127.0.0.1:14374'); await open(page, 'ai');
  await page.evaluate(() => { (window as unknown as { aiMock: { mode: string } }).aiMock.mode = 'load-wait'; });
  await load(page); await expect(dialog(page).locator('.ai-status')).toContainText('42%');
  await dialog(page).getByRole('button', { name: '処理を中止・モデルを解放', exact: true }).click();
  await page.evaluate(() => { const mock = (window as unknown as { aiMock: { mode: string; complete(): void } }).aiMock; mock.complete(); mock.mode = 'load-fail'; });
  await load(page); await expect(dialog(page).locator('.ai-status')).toContainText('offline weights unavailable');
  await close(page); await expect(page.locator('.output')).not.toContainText('offline weights unavailable');
  await enterForum(page); await command(page, 'READ 1', '★内容'); await post(page, '読み込み失敗後', '投稿できます');
});

test('Settings native JSON import/export require replacement consent, retain rollback, restore and reset with backup', async ({ page }) => {
  await start(page, '保存する人'); await enterForum(page); await post(page, '保存する題', '日本語\n\n本文');
  await command(page, 'READ 17', '★内容'); await open(page, 'storage'); const modal = dialog(page);
  const downloading = page.waitForEvent('download'); await modal.getByRole('button', { name: 'JSON を保存', exact: true }).click();
  const saved = JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
  expect(saved.posts).toHaveLength(83); expect(saved.readStates).toHaveLength(1);
  await choose(page, '{'); await expect(modal.locator('.settings-message')).toContainText('操作できません');
  const changed = structuredClone(saved); changed.posts.find((p: { title: string }) => p.title === '保存する題').title = '復元した題';
  await choose(page, JSON.stringify(changed)); await expect(modal.locator('.confirmation-copy')).toContainText('取り消せません');
  await modal.getByRole('button', { name: '中止', exact: true }).click(); expect((await snapshot(page)).posts).toEqual(saved.posts);
  await choose(page, JSON.stringify(changed));
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) { if (this.name === 'posts') throw new DOMException('test quota', 'QuotaExceededError'); return key === undefined ? native.call(this, value) : native.call(this, value, key); };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.add = native; } });
  });
  await modal.getByRole('button', { name: '置き換えて復元する', exact: true }).click();
  await expect(modal.locator('.settings-message')).toContainText('操作できません'); expect((await snapshot(page)).posts).toEqual(saved.posts);
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  await choose(page, JSON.stringify(changed)); await modal.getByRole('button', { name: '置き換えて復元する', exact: true }).click();
  await expect(modal).not.toBeVisible(); await expect(page.locator('#command')).toBeFocused();
  await command(page, 'READ 17', '復元した題');
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  expect((await snapshot(page)).posts).toEqual(changed.posts);
  await open(page, 'storage'); await modal.getByRole('button', { name: '初期状態に戻す', exact: true }).click();
  await expect(modal.locator('.confirmation-copy')).toContainText('モデルの重み・端末キャッシュは保持');
  await modal.getByRole('button', { name: '中止', exact: true }).click(); expect((await snapshot(page)).posts).toHaveLength(83);
  await modal.getByRole('button', { name: '初期状態に戻す', exact: true }).click();
  const backupBeforeReset = page.waitForEvent('download'); await modal.getByRole('button', { name: '先に JSON を保存', exact: true }).click(); await backupBeforeReset;
  await modal.locator('.confirm-action').click(); await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await expect(page.locator('#command')).toBeFocused(); expect((await snapshot(page)).posts).toHaveLength(82);
  expect((await snapshot(page)).members.every((m) => m.actor === 'ai')).toBe(true); expect(await activity(page)).toMatchObject({ consent: false, maxPosts: 4 });
});

test('Settings stale consent and file picker completion cannot overwrite cross-tab changes', async ({ page, context }) => {
  await mockWorker(page, 'ok'); await start(page); await open(page, 'ai');
  await dialog(page).getByRole('button', { name: 'モデルを読み込む', exact: true }).click();
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await open(other, 'ai'); await cap(other, 0);
  await expect(dialog(page).locator('.settings-confirmation')).not.toBeVisible();
  await expect(dialog(page).locator('.settings-message')).toContainText('変わりました');
  expect(await activity(page)).toMatchObject({ consent: false });
  await dialog(page).locator('.storage-panel > summary').click();
  const choosing = page.waitForEvent('filechooser'); await dialog(page).getByRole('button', { name: 'JSON から復元', exact: true }).click();
  const picker = await choosing; const old = await snapshot(page);
  await page.keyboard.press('Escape');
  await picker.setFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) });
  await expect(dialog(page)).not.toBeVisible(); await open(page);
  await expect(dialog(page).locator('.settings-confirmation')).not.toBeVisible();
});

test('offline shell, storage estimate and persistence controls execute from Settings without transcript chatter', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'estimate', { value: async () => ({ usage: 1024 ** 2, quota: 10 * 1024 ** 2 }) });
    Object.defineProperty(navigator.storage, 'persisted', { value: async () => false });
    Object.defineProperty(navigator.storage, 'persist', { value: async () => false });
  });
  await start(page, 'オフライン'); const transcript = await page.locator('.output').textContent(); await open(page, 'storage');
  const modal = dialog(page); await modal.getByRole('button', { name: '保存状態・容量を確認', exact: true }).click();
  await expect(modal.locator('.storage-status-text')).toContainText('使用量 約 1.0 MiB / 上限 約 10.0 MiB');
  await modal.getByRole('button', { name: '永続保存を要求', exact: true }).click();
  await expect(modal.locator('.storage-status-text')).toContainText('永続保存は許可されません');
  await modal.getByRole('button', { name: '端末をオフライン用に保存', exact: true }).click();
  await expect(modal.locator('.storage-status-text')).toContainText('端末をオフライン用に保存済み');
  await close(page); expect(await page.locator('.output').textContent()).toBe(transcript);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await context.setOffline(true); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await enterForum(page); await post(page, 'オフライン', '保存した端末から投稿');
});


test('profile conflicts and cross-tab display/reset refresh Settings and invalidate pending model work', async ({ page, context }) => {
  await mockPendingWorker(page, 'load'); await start(page, '古い利用者'); await open(page, 'ai');
  const modal = dialog(page); await modal.getByText('住人のプロフィール・生活時間', { exact: true }).click();
  await modal.locator('textarea[name="routine"]').fill('古い編集');
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  await open(other, 'ai'); const otherModal = dialog(other);
  await otherModal.getByText('住人のプロフィール・生活時間', { exact: true }).click();
  await otherModal.locator('textarea[name="routine"]').fill('別タブの新しい編集');
  await otherModal.getByRole('button', { name: '住人の設定を保存', exact: true }).click();
  await expect(otherModal.locator('.settings-message')).toContainText('住人の設定を保存');
  await modal.getByRole('button', { name: '住人の設定を保存', exact: true }).click();
  await expect(modal.locator('.settings-message')).toContainText('世界や住人設定が変わりました');
  await expect(modal.locator('textarea[name="routine"]')).toHaveValue('古い編集');
  expect(((await snapshot(page)).settings.find((r) => r.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles[0]!.routine).toBe('別タブの新しい編集');
  await otherModal.getByRole('combobox', { name: '表示色', exact: true }).selectOption('amber');
  await otherModal.getByRole('button', { name: '表示設定を保存', exact: true }).click();
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'amber');
  await expect(modal.getByRole('combobox', { name: '表示色', exact: true })).toHaveValue('amber');
  await load(page); await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork)).toContain('reload');
  await otherModal.locator('.storage-panel > summary').click();
  await otherModal.getByRole('button', { name: '初期状態に戻す', exact: true }).click();
  await otherModal.locator('.confirm-action').click();
  await expect(page.locator('.output')).toContainText('ハンドル名を登録しますか');
  await expect(modal).not.toBeVisible(); await expect(otherModal).not.toBeVisible();
  expect((await snapshot(page)).posts).toHaveLength(82);
  expect(await activity(page)).toMatchObject({ consent: false });
  await expect(page.locator('.terminal')).toHaveAttribute('data-theme', 'white');
});

test('failed dialog import keeps a human draft; confirmed import cancels it and clears unsubmitted text', async ({ page }) => {
  await start(page, '下書き'); const saved = await snapshot(page); await enterForum(page);
  await command(page, 'WRITE', 'タイトル='); await command(page, '保持する題名', '本文');
  await command(page, '保持する本文', '本文='); await page.locator('#command').fill('未送信の行');
  await open(page, 'storage'); await choose(page, JSON.stringify(saved));
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) { if (this.name === 'posts') throw new DOMException('test quota', 'QuotaExceededError'); return key === undefined ? native.call(this, value) : native.call(this, value, key); };
    Object.assign(window, { restoreAdd: () => { IDBObjectStore.prototype.add = native; } });
  });
  await dialog(page).getByRole('button', { name: '置き換えて復元する', exact: true }).click();
  await expect(dialog(page).locator('.settings-message')).toContainText('操作できません');
  await close(page); await expect(page.locator('#command')).toHaveValue('未送信の行');
  await page.evaluate(() => (window as unknown as { restoreAdd(): void }).restoreAdd());
  await command(page, '.END', '保持する本文');
  await page.locator('#command').fill('Y');
  await open(page); await choose(page, JSON.stringify(saved));
  await dialog(page).getByRole('button', { name: '置き換えて復元する', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible(); await expect(page.locator('#command')).toHaveValue('');
  await command(page, 'Y', 'この画面では使えない');
  expect((await snapshot(page)).posts).toHaveLength(82);
});

test('Internet sample Settings explains missing human, supports cancellation and explicitly targets each selected human', async ({ page }) => {
  await start(page); expect((await snapshot(page)).mail).toEqual([]);
  await open(page, 'mail-sample');
  await expect(dialog(page).locator('.mail-sample-recipient')).toContainText('HANDLE');
  await dialog(page).locator('.load-mail-sample').click();
  await expect(dialog(page).locator('.settings-message')).toContainText('会員は自動作成しません');
  expect((await snapshot(page)).members.filter((m) => m.actor === 'human')).toEqual([]);
  await close(page); await command(page, 'HANDLE', 'ハンドル設定'); await command(page, 'NEW', 'ハンドル名=');
  await command(page, '最初の読者', '登録しました');
  expect((await snapshot(page)).mail).toEqual([]);
  await open(page);
  await expect(dialog(page).locator('.mail-sample-recipient')).toContainText('最初の読者');
  await dialog(page).locator('.load-mail-sample').click(); await dialog(page).locator('.cancel-action').click();
  expect((await snapshot(page)).mail).toEqual([]);
  await dialog(page).locator('.load-mail-sample').click(); await dialog(page).locator('.confirm-action').click();
  await expect(dialog(page).locator('.settings-message')).toContainText('創作メールをローカルに追加しました');
  await close(page);
  await command(page, 'HANDLE', 'ハンドル設定'); await command(page, 'NEW', 'ハンドル名='); await command(page, '次の読者', '登録しました');
  await open(page); await expect(dialog(page).locator('.mail-sample-recipient')).toContainText('次の読者');
  await dialog(page).locator('.load-mail-sample').click(); await dialog(page).locator('.confirm-action').click();
  await expect(dialog(page).locator('.settings-message')).toContainText('創作メールをローカルに追加しました');
  const data = await snapshot(page);
  expect(data.mail).toHaveLength(2); expect(new Set(data.mail!.map((m) => m.recipientId)).size).toBe(2);
});

for (const operation of ['restore', 'reset'] as const) {
  test(`${operation} invalidates a pending sample action and reviewed external reply across tabs; empty mail stays empty`, async ({ page, context }) => {
    await start(page, '置換前の読者'); const empty = await snapshot(page);
    await open(page, 'mail-sample'); await dialog(page).locator('.load-mail-sample').click();
    await dialog(page).locator('.confirm-action').click();
    await expect(dialog(page).locator('.settings-message')).toContainText('創作メールをローカルに追加しました');
    await close(page);
    const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
    await command(other, '1', '電子メール'); await command(other, 'INBOX', '[未読]');
    await command(other, 'REPLY 1', '本文を1行ずつ'); await command(other, '古い返事', '本文=');
    await command(other, '.END', 'このブラウザー内に保存しますか');
    await open(other, 'mail-sample'); await dialog(other).locator('.load-mail-sample').click();
    await expect(dialog(other).locator('.confirm-action')).toBeVisible();
    if (operation === 'restore') {
      await open(page, 'storage'); await choose(page, JSON.stringify(empty));
      await expect(dialog(page).locator('.confirm-action')).toHaveText('置き換えて復元する');
      await Promise.all([other.waitForEvent('load'), dialog(page).locator('.confirm-action').click()]);
      await expect(dialog(page)).not.toBeVisible();
    } else {
      await command(page, 'RESET', '初期状態に戻しますか');
      await Promise.all([page.waitForEvent('load'), other.waitForEvent('load'), command(page, 'Y')]);
    }
    await expect(other.locator('.output')).toContainText('MAIN');
    await expect(dialog(other)).not.toBeVisible();
    await command(other, 'SKIP'); await command(other, 'Y', 'この画面では使えない');
    expect((await snapshot(page)).mail).toEqual([]);
    await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
    expect((await snapshot(page)).mail).toEqual([]);
  });
}
