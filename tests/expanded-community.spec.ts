import { expect, test } from '@playwright/test';
import original from '../data/pcvan/fictional-community.json' with { type: 'json' };
import expansion from '../data/pcvan/expanded-community.json' with { type: 'json' };
import { additionalSigs } from '../src/communities';
import { PcvanController } from '../src/navigation';
import { command, start, post, snapshot, noOtherUi } from './terminal-helpers';
import { mockWorker } from './ai-helpers';
import { consent, epoch, hour, lifestyles, generated } from './autonomy-helpers';

const anchor = '2026-10-21T00:00:00.000Z';

test('expanded baseline preserves original fiction and shares ten authors across distinct conversations', async ({ page }) => {
  await start(page);
  const data = await snapshot(page);
  expect(data.posts).toHaveLength(82); expect(data.forums).toHaveLength(15); expect(data.members).toHaveLength(10);
  expect(data.posts.filter((p) => !p.replyToPostId)).toHaveLength(26);
  for (const p of original.posts) {
    expect(data.posts.find((old) => old.id === `seed:v1:${p.id}`)).toMatchObject({
      title: p.title, body: p.body, authorId: `fictional-ai:${p.author}`, origin: 'local-seed:fictional',
    });
  }
  const added = data.posts.filter((p) => p.origin === expansion.origin);
  expect(added).toHaveLength(36); expect(new Set(added.map((p) => p.body)).size).toBe(36);
  expect(new Set(added.map((p) => p.forumId)).size).toBe(8);
  expect(new Set(added.map((p) => p.authorId)).size).toBe(10);
  for (const p of added) {
    expect(p.simulation).toBeUndefined(); expect(Date.parse(p.createdAt)).toBeLessThan(Date.now());
    if (p.replyToPostId) expect(added.find((parent) => parent.id === p.replyToPostId)).toMatchObject({ forumId: p.forumId, number: expect.any(Number) });
  }
  expect(added.some((p) => p.body.includes('Windows 95'))).toBe(true);
  expect(added.some((p) => p.body.includes('迷路'))).toBe(true);
  expect(added.some((p) => p.body.includes('巣の場所'))).toBe(true);
  expect(added.some((p) => p.body.includes('夜勤'))).toBe(true);
  const controller = new PcvanController(); controller.setContent(data);
  for (const sig of additionalSigs) {
    controller.submit('MAIN'); controller.submit('13');
    expect(controller.submit(sig.selector)).toContain(sig.name);
    for (const board of sig.boards) {
      const listing = controller.submit(String(board.number)).join('\n');
      expect(listing).toContain(board.label); expect(listing).toContain(board.culture);
      expect(controller.forum).toMatchObject({ keyword: sig.keyword, boardNo: board.number });
      expect(controller.submit('READ 1').join('\n')).toContain('★内容');
      expect(controller.submit('READ 999').join('\n')).toContain('その番号の投稿はありません');
      expect(controller.submit('HELP').join('\n')).toBe(listing);
      expect(listing).not.toMatch(/local-seed|fictional-ai|再構成|https?:/);
      controller.submit('BACK');
    }
    controller.submit('BACK'); expect(controller.screen).toBe('communication');
  }
  // Missing places in imported worlds retain an accessible empty state.
  controller.setContent({ ...data, sigs: [], forums: [], posts: [] });
  controller.submit('4'); expect(controller.submit('1').join('\n')).toContain('投稿はありません');
  controller.submit('MAIN'); controller.submit('8');
  expect(controller.submit('SIGS').join('\n')).toContain('DOS/Vワールド');
  controller.submit('MAIN'); controller.submit('11');
  expect(controller.submit('SIGS').join('\n')).toContain('ゲーム談話室');
});

test('v1 expansion is atomic, concurrent, conservative with custom boards and never runs after JSON restore', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (anchor) => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const repo = await openRepository('expanded-migration'); await repo.openActivity(anchor);
    // Reconstruct the exact pre-expansion world through supported mutations.
    const fresh = await repo.exportBackup();
    for (const p of fresh.posts.filter((p) => ['local-seed:forum-starters-v1', 'local-seed:authored-sigs-v1', 'local-seed:wakaba-v1', 'local-seed:bulletin-v1'].includes(p.origin)).sort((a, b) => b.number - a.number)) await repo.delete('posts', p.id);
    for (const f of fresh.forums.filter((f) => !['resident-forum:MITI:9', 'resident-forum:DAISIZEN:1'].includes(f.id))) await repo.delete('forums', f.id);
    for (const s of fresh.sigs.filter((s) => s.keyword.startsWith('LOCAL-'))) await repo.delete('sigs', s.id);
    const world = fresh.settings.find((s) => s.id === 'community-world')!;
    const { expansion: _version, ...v1 } = world.value as Record<string, import('../src/storage/schema').JsonValue>;
    await repo.put('settings', { ...world, value: v1 });
    const human = await repo.createHumanMember('継続利用者');
    await repo.createPost({ forumId: 'resident-forum:MITI:9', authorId: human.id, title: '残す', body: '既存の本文', origin: 'local-human' });
    await repo.markRead(human.id, 'seed:v1:repair-1');
    const settings = await repo.get('settings', 'ai-residents');
    const profiles = (settings!.value as unknown as import('../src/ai/personas').ResidentSettings).profiles;
    profiles[0]!.preferredBoards = ['MITI:9']; profiles[0]!.frequency = 0;
    await repo.put('settings', { ...settings!, value: { version: 1, profiles } as never });
    await repo.put('forums', { id: 'custom-library', sigId: 'resident-sig:DAISIZEN', boardNo: 3, name: '私の書庫', nextPostNumber: 80 });
    const before = await repo.exportBackup();
    const add = IDBObjectStore.prototype.add; let writes = 0; let failed = false;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'posts' && this.transaction.db.name === 'expanded-migration' && ++writes === 8) throw new DOMException('Expansion quota', 'QuotaExceededError');
      return key === undefined ? add.call(this, value) : add.call(this, value, key);
    };
    try { await repo.openActivity(anchor); } catch { failed = true; }
    finally { IDBObjectStore.prototype.add = add; }
    const rollback = await repo.exportBackup();
    const other = await openRepository('expanded-migration');
    await Promise.all([repo.openActivity(anchor), other.openActivity(anchor)]);
    const after = await repo.exportBackup(); validateBackup(after);
    await other.openActivity(anchor); const repeat = await repo.exportBackup();
    const restore = await openRepository('expanded-import');
    await restore.replaceFromJson(JSON.stringify(before), { confirmReplace: true });
    await restore.openActivity(anchor); const imported = await restore.exportBackup();
    // A world with deleted originals is treated as intentionally customized.
    const opted = await openRepository('expanded-optout'); await opted.openActivity(anchor);
    const baseline = await opted.exportBackup();
    await opted.put('settings', { id: 'community-world', value: v1 });
    for (const p of baseline.posts.filter((p) => ['local-seed:forum-starters-v1', 'local-seed:authored-sigs-v1', 'local-seed:wakaba-v1', 'local-seed:bulletin-v1'].includes(p.origin)).sort((a, b) => b.number - a.number)) await opted.delete('posts', p.id);
    await opted.delete('posts', 'seed:v1:repair-2');
    const optedBefore = await opted.exportBackup(); await opted.openActivity(anchor); const optedAfter = await opted.exportBackup();
    repo.close(); other.close(); restore.close(); opted.close();
    return { failed, before, rollback, after, repeat, imported, optedBefore, optedAfter };
  }, anchor);
  expect(result.failed).toBe(true); expect(result.rollback).toEqual(result.before);
  expect(result.after.posts).toHaveLength(63); // original 30 + human + 32 (custom library skipped)
  expect(result.after.posts.filter((p) => p.origin !== expansion.origin)).toEqual(result.before.posts);
  expect(result.after.members).toEqual(result.before.members); expect(result.after.readStates).toEqual(result.before.readStates);
  expect(result.after.settings.find((s) => s.id === 'ai-residents')).toEqual(result.before.settings.find((s) => s.id === 'ai-residents'));
  expect(result.after.forums.find((f) => f.id === 'custom-library')).toEqual(result.before.forums.find((f) => f.id === 'custom-library'));
  expect(result.repeat).toEqual(result.after);
  expect(result.imported.posts).toEqual(result.before.posts); expect(result.imported.forums).toEqual(result.before.forums);
  expect(result.optedAfter.posts).toEqual(result.optedBefore.posts);
});

test('terminal human identity, read/write/reply, reload and scheduled replies work across SIGs', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '巡回する人');
  await lifestyles(page);
  // Pin two ordinary scheduled opportunities to separate communities, using the
  // same resident IDs and real consent/timer/inference/commit path.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction('settings', 'readwrite'); const store = tx.objectStore('settings');
    const r = store.get('ai-residents'); r.onsuccess = () => {
      const row = r.result; row.value.profiles[0].preferredBoards = ['LOCAL-DOSV:1']; row.value.profiles[0].interests = ['人間の星'];
      row.value.profiles[1].preferredBoards = ['LOCAL-GAMES:1']; row.value.profiles[1].interests = ['人間の星']; store.put(row);
    };
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  await consent(page);
  for (const selector of ['3', '4']) {
    await command(page, 'MAIN', 'MAIN'); await command(page, '13', 'コミュニケーション');
    await command(page, selector); await command(page, '1', '投稿一覧');
    await command(page, 'READ 1', '★内容');
    await post(page, '人間の星', '人間の星：今夜の試行の結果を報告します。');
    await post(page, '続きの質問', '読んだ話の続きです。', 'REPLY 1');
    await command(page, 'LIST', '続きの質問');
  }
  const saved = await snapshot(page), humans = saved.posts.filter((p) => p.origin === 'local-human');
  expect(humans).toHaveLength(4); expect(new Set(humans.map((p) => p.authorId)).size).toBe(1);
  expect(saved.members.filter((m) => m.actor === 'human')).toHaveLength(1);
  await page.clock.fastForward(20 * 60_000); expect(await generated(page)).toEqual([]);
  await page.clock.fastForward(41 * 60_000);
  await expect.poll(async () => (await generated(page)).length).toBe(1);
  await page.clock.fastForward(hour);
  await expect.poll(async () => (await generated(page)).length).toBe(2);
  for (const p of await generated(page)) {
    expect(humans.find((h) => h.id === p.replyToPostId)).toMatchObject({ forumId: p.forumId, title: '人間の星' });
    expect(Date.parse(p.simulation!.simulatedAt) - Date.parse(humans.find((h) => h.id === p.replyToPostId)!.createdAt)).toBeGreaterThanOrEqual(20 * 60_000);
  }
  expect(new Set((await generated(page)).map((p) => p.forumId)).size).toBe(2);
  const prompts = await page.evaluate(() => (window as unknown as { journeyWorker: { prompts: Record<string, unknown>[] } }).journeyWorker.prompts);
  for (const prompt of prompts) {
    expect((prompt.forum as { culture: string }).culture).toBeTruthy();
    expect(JSON.stringify(prompt.recentPosts)).not.toContain('夜勤');
    expect((prompt.memory as unknown[]).length).toBeLessThanOrEqual(2);
  }
  await expect(page.locator('.output')).not.toContainText('LOCAL-');
  await noOtherUi(page); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  const reloaded = await snapshot(page);
  expect(reloaded.posts.filter((p) => p.simulation)).toHaveLength(2);
  expect(reloaded.posts.filter((p) => p.origin === 'local-human')).toEqual(humans);
  expect(reloaded.readStates).toEqual(saved.readStates);
  await command(page, '13'); await command(page, '4'); await command(page, '1', '投稿一覧');
  const read = await command(page, 'READ 5', '人間の星　巡回する人');
  expect(read).toMatch(/★タイトル \(SYN-[0-9A-V]{13}\)/);
});
