import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { openSettings, closeSettings } from './settings-helpers';

const anchor = '2026-10-21T00:00:00.000Z';
async function snapshot(page: Page): Promise<Backup> {
  return page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository();
    try { return await repo.exportBackup(); } finally { repo.close(); }
  });
}
async function send(page: Page, command: string, response: string) {
  await closeSettings(page);
  const input = page.locator('#command');
  await input.fill(command); await input.press('Enter');
  await expect(page.locator('.output')).toContainText(response);
}

test('fresh first visit has a dated ten-author history before consent; reload, another tab and human replies preserve it', async ({ page, context }) => {
  await page.clock.setFixedTime(new Date(anchor));
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const other = await context.newPage();
  await other.clock.setFixedTime(new Date(anchor));
  await Promise.all([page.goto('http://127.0.0.1:14374'), other.goto('http://127.0.0.1:14374')]);
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  await expect(other.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  const initial = await snapshot(page);
  expect((await snapshot(other)).posts).toEqual(initial.posts);
  expect(initial.posts).toHaveLength(30);
  expect(initial.members).toHaveLength(10);
  expect(initial.members.every((m) => m.actor === 'ai')).toBe(true);
  expect(initial.settings.find((s) => s.id === 'community-world')!.value).toEqual({
    version: 1, createdAt: anchor, status: 'seeded', fixture: 'fictional-community-v1',
  });
  expect(new Set(initial.posts.map((p) => p.authorId)).size).toBe(10);
  expect(initial.posts.filter((p) => !p.replyToPostId)).toHaveLength(8);
  const authorCounts = initial.members.map((member) => initial.posts.filter((p) => p.authorId === member.id).length);
  expect(new Set(authorCounts).size).toBeGreaterThan(1);
  for (const f of initial.forums) {
    const posts = initial.posts.filter((p) => p.forumId === f.id).sort((a, b) => a.number - b.number);
    expect(posts.length).toBeGreaterThanOrEqual(14);
    expect(posts.map((p) => p.number)).toEqual(Array.from({ length: posts.length }, (_, i) => i + 1));
    expect(f.nextPostNumber).toBe(posts.length + 1);
    expect(posts.map((p) => p.createdAt)).toEqual(posts.map((p) => p.createdAt).sort());
  }
  const ages = initial.posts.map((p) => (Date.parse(anchor) - Date.parse(p.createdAt)) / 86_400_000);
  expect(Math.max(...ages)).toBeGreaterThan(12); expect(Math.max(...ages)).toBeLessThan(14);
  expect(Math.min(...ages)).toBeGreaterThan(0); expect(Math.min(...ages)).toBeLessThan(1);
  const dates = new Set(initial.posts.map((p) => new Date(Date.parse(p.createdAt) + 9 * 3_600_000).toISOString().slice(0, 10)));
  expect(dates.size).toBeLessThan(13);
  const gaps = initial.posts.map((p) => Date.parse(p.createdAt)).sort((a, b) => a - b);
  expect(new Set(gaps.slice(1).map((t, i) => t - gaps[i]!)).size).toBeGreaterThan(15);
  const profiles = await page.evaluate(async () => {
    const path = '/src/ai/personas.ts';
    return (await import(path) as typeof import('../src/ai/personas')).personas;
  });
  for (const p of initial.posts) {
    expect(p.origin).toBe('local-seed:fictional'); expect(p.simulation).toBeUndefined();
    expect(p.authorId).toMatch(/^fictional-ai:/);
    const localHour = new Date(Date.parse(p.createdAt) + 9 * 3_600_000).getUTCHours();
    const profile = profiles.find((row) => `fictional-ai:${row.id}` === p.authorId)!;
    expect([...profile.weekdayHours, ...profile.weekendHours]).toContain(localHour);
    if (p.replyToPostId) {
      const parent = initial.posts.find((r) => r.id === p.replyToPostId)!;
      expect(parent.forumId).toBe(p.forumId); expect(parent.number).toBeLessThan(p.number);
      expect(parent.createdAt < p.createdAt).toBe(true);
    }
  }
  for (const [line, response] of [['J MITI', 'MITI'], ['3', 'フォーラム'], ['9', '#16 皿の方が少し低い'], ['READ 1', '古いパソコン']]) await send(page, line!, response!);
  expect(await page.locator('.output').textContent()).not.toMatch(/DEMO|1996|創作/);
  expect(requests.some((url) => /webllm-adapter|webllm-worker|huggingface|mlc-ai/.test(url))).toBe(false);
  await other.clock.setFixedTime(new Date('2026-10-22T00:00:00Z'));
  await other.goto('http://127.0.0.1:14374');
  await expect(other.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  expect((await snapshot(other)).posts).toEqual(initial.posts);
  await other.close();
  await page.reload();
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  expect((await snapshot(page)).posts).toEqual(initial.posts);
  await openSettings(page, 'member');
  await page.locator('.handle').fill('訪問者'); await page.locator('.create-member').click();
  await expect(page.locator('.member-message')).toContainText('利用者を作成しました');
  for (const line of ['J MITI', '3', '9']) await send(page, line, line === '9' ? '投稿一覧' : 'MITI');
  await send(page, 'REPLY 1', '投稿一覧');
  await expect(page.getByLabel('投稿タイトル', { exact: true })).toHaveValue('RE#1 古いキーボード、Ａだけ無口');
  await page.getByLabel('投稿本文', { exact: true }).fill('うちの道具でも記録を取ってみます。');
  await page.getByRole('button', { name: '内容を確認' }).click();
  await page.getByRole('button', { name: 'この内容で投稿する' }).click();
  await expect(page.getByRole('dialog', { name: '投稿エディター', exact: true })).toBeHidden();
  await send(page, 'READ 17', '返信先 RE#1');
  const saved = await snapshot(page);
  expect(saved.posts.find((p) => p.origin === 'local-human')).toMatchObject({ number: 17, replyToPostId: 'seed:v1:repair-1' });
  expect(saved.readStates[0]!.lastReadNumber).toBe(17);
});

test('atomic seed failure rolls back every record; concurrent connections seed once, preserve backups and never refill deletions', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository('seed-atomic'); const other = await openRepository('seed-atomic');
    const before = await repo.exportJson();
    const native = IDBObjectStore.prototype.add;
    let writes = 0; let failed = false;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts' && ++writes === 8) throw new DOMException('Simulated quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.openActivity(anchor); } catch { failed = true; }
    finally { IDBObjectStore.prototype.add = native; }
    const rolledBack = before === await repo.exportJson();
    await Promise.all([repo.openActivity(anchor), other.openActivity('2026-10-22T00:00:00.000Z')]);
    const first = await repo.exportBackup(); validateBackup(first);
    await repo.replaceFromJson(JSON.stringify(first), { confirmReplace: true });
    await other.openActivity('2026-10-23T00:00:00.000Z');
    const roundtrip = await repo.exportBackup();
    const invalidMarkers: boolean[] = [];
    for (const change of [{ status: 'unknown' }, { fixture: 'other' }, { createdAt: '1996' }]) {
      const broken = structuredClone(first);
      Object.assign(broken.settings.find((s) => s.id === 'community-world')!.value as object, change);
      const before = await repo.exportJson();
      try { await repo.replaceFromJson(JSON.stringify(broken), { confirmReplace: true }); invalidMarkers.push(false); }
      catch { invalidMarkers.push(before === await repo.exportJson()); }
    }
    // Remove children first, through the public repository API. The seed marker remains.
    for (const p of [...first.posts].sort((a, b) => b.number - a.number)) await repo.delete('posts', p.id);
    await other.openActivity('2026-10-24T00:00:00.000Z');
    const cleared = await repo.exportBackup();
    const repeat = await repo.populateEmptyCommunity({ confirmPopulate: true });
    repo.close(); other.close();
    return { failed, writes, rolledBack, first, roundtrip, cleared, repeat, invalidMarkers };
  }, anchor);
  expect(result.failed).toBe(true); expect(result.rolledBack).toBe(true); expect(result.writes).toBe(8);
  expect(result.invalidMarkers).toEqual([true, true, true]);
  expect(result.first.posts).toHaveLength(30); expect(new Set(result.first.posts.map((p) => p.id)).size).toBe(30);
  expect(result.roundtrip.posts).toEqual(result.first.posts);
  expect(result.roundtrip.settings.find((s) => s.id === 'community-world')).toEqual(result.first.settings.find((s) => s.id === 'community-world'));
  expect(result.cleared.posts).toEqual([]); expect(result.cleared.forums).toEqual(result.first.forums); expect(result.repeat).toBe(false);
});

test('legacy opt-in preserves custom directories and allocation; populated, ambiguous, colliding and imported worlds stay untouched', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ anchor, fixture }) => {
    const path = '/src/storage/repository.ts'; const communityPath = '/src/storage/community.ts'; const forumsPath = '/src/forums.ts';
    const { openRepository } = await import(path) as typeof import('../src/storage/repository');
    const { canPopulateCommunity } = await import(communityPath) as typeof import('../src/storage/community');
    const { forumPosts } = await import(forumsPath) as typeof import('../src/forums');
    const repo = await openRepository('seed-legacy');
    await repo.put('members', { id: 'existing-human', handle: '昔からの利用者', actor: 'human' });
    await repo.put('sigs', { id: 'custom-miti', keyword: 'miti', title: '私の資料室' });
    await repo.put('forums', { id: 'custom-board', sigId: 'custom-miti', boardNo: 9, name: '保存した名前', nextPostNumber: 41 });
    await repo.openActivity(anchor);
    const legacy = await repo.exportBackup();
    let refused = false;
    try { await repo.populateEmptyCommunity({ confirmPopulate: false }); } catch { refused = true; }
    const another = await openRepository('seed-legacy');
    const optins = await Promise.all([repo.populateEmptyCommunity({ confirmPopulate: true }, anchor), another.populateEmptyCommunity({ confirmPopulate: true }, anchor)]);
    const populated = await repo.exportBackup();
    const human = await repo.createPost({ forumId: 'custom-board', authorId: 'existing-human', title: '参加します', body: '返信です', origin: 'local-human', replyToPostId: 'seed:v1:repair-1' });
    const notEmpty = await repo.populateEmptyCommunity({ confirmPopulate: true });
    const empty = { ...fixture, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [], session: null };
    await repo.replaceFromJson(JSON.stringify(empty), { confirmReplace: true });
    const immediate = forumPosts(await repo.exportBackup(), 'MITI', 9);
    await repo.openActivity(anchor); await repo.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    const imported = await repo.exportBackup(); const importedOptin = await repo.populateEmptyCommunity({ confirmPopulate: true });
    await repo.replaceFromJson(JSON.stringify(imported), { confirmReplace: true });
    await repo.openActivity(anchor); const importedAgain = await repo.exportBackup();
    // Even a legacy marker in a backup must not make a restored world eligible.
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    const importedLegacy = canPopulateCommunity(await repo.exportBackup());
    const ambiguous = structuredClone(legacy); ambiguous.sigs.push({ id: 'duplicate', keyword: 'MITI', title: 'duplicate' });
    const collision = structuredClone(legacy); collision.members.push({ id: 'fictional-ai:hoshimori', handle: '人間', actor: 'human' });
    // Existing posts with no marker are never retroactively populated.
    const old = await openRepository('seed-old-populated');
    for (const s of fixture.sigs) await old.put('sigs', s);
    for (const f of fixture.forums) await old.put('forums', f);
    for (const m of fixture.members) await old.put('members', m);
    await old.createPost({ forumId: 'forum', authorId: 'human', title: '既存', body: '残す', origin: 'local-human' });
    const oldPosts = await old.list('posts'); await old.openActivity(anchor);
    const oldAfter = await old.exportBackup();
    const race = await openRepository('seed-legacy-race');
    await race.createHumanMember('先着の人'); await race.openActivity(anchor);
    const previewEligible = canPopulateCommunity(await race.exportBackup());
    const member = (await race.list('members')).find((m) => m.actor === 'human')!;
    const arrived = await race.createForumPost({ keyword: 'MITI', boardNo: 9, name: '先着の掲示板' }, {
      authorId: member.id, title: '一足先に投稿', body: '上書きしない', origin: 'local-human',
    });
    const raceResult = await race.populateEmptyCommunity({ confirmPopulate: true });
    const racePosts = await race.list('posts');
    repo.close(); another.close(); old.close(); race.close();
    return { legacy, refused, optins, populated, human, notEmpty, immediate, imported, importedOptin, importedAgain, importedLegacy,
      unsafe: [canPopulateCommunity(ambiguous), canPopulateCommunity(collision)], oldPosts, oldAfter, previewEligible, arrived, raceResult, racePosts };
  }, { anchor, fixture: backupFixture() });
  expect(result.legacy.posts).toEqual([]); expect(result.refused).toBe(true);
  expect(result.optins.sort()).toEqual([false, true]); expect(result.populated.posts).toHaveLength(30);
  expect(result.populated.sigs).toContainEqual(result.legacy.sigs[0]!);
  expect(result.populated.forums.find((f) => f.id === 'custom-board')).toMatchObject({ name: '保存した名前', nextPostNumber: 57 });
  expect(result.populated.members).toContainEqual(result.legacy.members.find((m) => m.id === 'existing-human')!);
  expect(result.human).toMatchObject({ number: 57, replyToPostId: 'seed:v1:repair-1' }); expect(result.notEmpty).toBe(false);
  expect(result.immediate).toMatchObject({ source: 'local', posts: [] });
  for (const world of [result.imported, result.importedAgain]) { expect(world.posts).toEqual([]); expect(world.forums).toEqual([]); }
  expect(result.importedOptin).toBe(false); expect(result.importedLegacy).toBe(false); expect(result.unsafe).toEqual([false, false]);
  expect(result.oldAfter.posts).toEqual(result.oldPosts);
  expect(result.previewEligible).toBe(true); expect(result.raceResult).toBe(false); expect(result.racePosts).toEqual([result.arrived]);
});

test('Settings previews legacy population, requires confirmation and hides the action after population', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  // Simulate a pre-feature database, without using restore (which intentionally opts out).
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...db.objectStoreNames], 'readwrite');
      for (const name of db.objectStoreNames) tx.objectStore(name).clear();
      tx.objectStore('members').add({ id: 'old-human', handle: '以前の人', actor: 'human' });
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    }); db.close();
  });
  await page.reload(); await openSettings(page, 'storage');
  const action = page.locator('.populate-community');
  await expect(action).toBeVisible(); await expect(page.locator('.community-population')).toContainText('30件・8つの話題');
  page.once('dialog', (d) => d.dismiss()); await action.click(); expect((await snapshot(page)).posts).toEqual([]);
  page.once('dialog', (d) => d.accept()); await action.click();
  await expect(action).toBeHidden(); expect((await snapshot(page)).posts).toHaveLength(30);
  await expect(page.locator('.community-provenance')).toContainText('fictional-community-v1');
  await openSettings(page, 'about'); await expect(page.locator('.about-controls')).toContainText('local-seed:fictional');
  await page.reload(); await openSettings(page, 'storage'); await expect(action).toBeHidden();
  expect((await snapshot(page)).posts).toHaveLength(30);
});

test('later autonomous AI selects seed parents, remembers its own seed posts and commits distinct generated provenance with a mock model', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  await expect(page.locator('.ai-activity-message')).toContainText('AI 設定が必要');
  const result = await page.evaluate(async (anchor) => {
    const r = '/src/storage/repository.ts'; const a = '/src/ai/activity.ts'; const g = '/src/ai/generation.ts'; const b = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(r) as typeof import('../src/storage/repository');
    const { scheduleActivity } = await import(a) as typeof import('../src/ai/activity');
    const { buildPrompt } = await import(g) as typeof import('../src/ai/generation');
    const { runActivityBatch } = await import(b) as typeof import('../src/ai/activity-runner');
    const repo = await openRepository('seed-ai-continuity');
    await repo.openActivity(anchor);
    const seeded = await repo.exportBackup();
    const consent = await repo.authorizeModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', anchor);
    const state = scheduleActivity(seeded, { ...consent, seed: 'community', maxPosts: 12 }, '2026-10-24T00:00:00.000Z');
    // Every possible target in this world is a seed. No human or generated post is needed.
    const replies = state.batch!.runs.filter((r) => r.replyToPostId);
    const topics = state.batch!.runs.filter((r) => !r.replyToPostId);
    state.batch!.runs = replies.slice(0, 2);
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    const prompts: any[] = []; const budget = { attempts: 0, committed: 0 };
    await runActivityBatch(repo, () => repo.exportBackup(), state, {
      async load() {}, dispose() {}, async generate(prompt) {
        const data = JSON.parse(prompt.user); prompts.push(data);
        return JSON.stringify({ personaId: data.personaId, forumId: data.forumId, replyToPostId: data.replyToPostId,
          title: '観察の続きを試しました', body: 'その手順を紙に書いて試しました。次は同じ時刻でもう一度見てみます。' + prompts.length });
      },
    }, new AbortController().signal, budget, () => {});
    const after = await repo.exportBackup();
    const own = JSON.parse(buildPrompt(seeded, { personaId: 'hankote', forumId: 'resident-forum:MITI:9', replyToPostId: 'seed:v1:repair-3' }).user);
    repo.close(); return { replies, topics, prompts, budget, after, seeded, own };
  }, anchor);
  expect(result.replies.length).toBeGreaterThan(0); expect(result.topics.length).toBeGreaterThan(0);
  expect(result.budget.committed).toBe(result.prompts.length); expect(result.budget.committed).toBeGreaterThan(0);
  for (const p of result.prompts) {
    expect(p.replyTarget.body.length).toBeGreaterThan(0); expect(p.recentPosts.length).toBeGreaterThan(0);
    expect(result.seeded.posts.some((s) => s.id === p.replyToPostId)).toBe(true);
  }
  expect(result.own.memory.some((p: any) => p.id === 'seed:v1:repair-4')).toBe(true);
  expect(result.own.replyTarget.author).toBe('水玉');
  const generated = result.after.posts.filter((p) => p.simulation);
  expect(generated).toHaveLength(result.budget.committed);
  expect(generated.every((p) => p.origin.startsWith('local-ai:webllm:') && p.replyToPostId?.startsWith('seed:v1:'))).toBe(true);
  expect(result.after.posts.filter((p) => p.origin === 'local-seed:fictional')).toEqual(result.seeded.posts);
});
