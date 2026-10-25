import { expect, test } from '@playwright/test';
import { command, start, snapshot, restore, noOtherUi } from './terminal-helpers';
import original from '../data/pcvan/fictional-community.json' with { type: 'json' };
import expansion from '../data/pcvan/expanded-community.json' with { type: 'json' };
import wakaba from '../data/pcvan/wakaba.json' with { type: 'json' };
import bulletin from '../data/pcvan/bulletin.json' with { type: 'json' };
import starters from '../data/pcvan/forum-starters.json' with { type: 'json' };

// Explicit route/count oracle: a missing route or dropped fixture cannot redefine expectations.
const routes: [string[], string, string, number][] = [
  [['J MITI', '3', '9'], 'MITI:9', '古いキーボード、Ａだけ無口', 16],
  [['13', '2', 'FORUMS', '1'], 'DAISIZEN:1', '鉢を半歩動かしました', 14],
  [['13', '2', 'FORUMS', '2'], 'DAISIZEN:2', '長い観察記録の分け方', 3],
  [['13', '2', 'FORUMS', '3'], 'DAISIZEN:3', '図書館のしおり：書名と観察を分けて', 4],
  [['13', '2', 'FORUMS', '4'], 'DAISIZEN:4', '葉の裏を描き忘れました', 3],
  [['13', '2', 'FORUMS', '5'], 'DAISIZEN:5', '朝の声のメモ帳', 4],
  [['13', '2', 'FORUMS', '6'], 'DAISIZEN:6', '近郊の尾根道、昼までの往復', 4],
  [['13', '2', 'FORUMS', '7'], 'DAISIZEN:7', '日曜の一時間観察会の相談', 4],
  [['13', '3', '1'], 'LOCAL-DOSV:1', '相談室の約束とシリアルの話', 6],
  [['13', '3', '2'], 'LOCAL-DOSV:2', '週末の工作机：ログの行数を数える', 4],
  [['13', '4', '1'], 'LOCAL-GAMES:1', '攻略室より：先の話はひと声を', 4],
  [['13', '4', '2'], 'LOCAL-GAMES:2', '週末スコア帳：自己記録でどうぞ', 4],
  [['13', '5', '1'], 'LOCAL-GV:1', '今月の寄り合い：帰宅の一杯', 6],
  [['16', '1'], 'LOCAL-WAKABA:1', '返信の前にひとつ質問', 3],
  [['13', '6'], 'LOCAL-BULLETIN:1', '散歩スケッチの仲間募集', 3],
];

test('every production forum route has authored threads anonymously on fresh startup and confirmed reset', async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  for (const reset of [false, true]) {
    if (reset) { await command(page, 'RESET', '82件'); await Promise.all([page.waitForEvent('load'), command(page, 'Y')]); await expect(page.locator('.output')).toContainText('MAIN'); }
    const data = await snapshot(page);
    expect(data.posts).toHaveLength(82); expect(data.forums).toHaveLength(15);
    expect(data.members).toHaveLength(100); expect(data.members.every((m) => m.actor === 'ai')).toBe(true);
    expect(data.posts.filter((p) => !p.replyToPostId)).toHaveLength(26);
    for (const [route, board, title, count] of routes) {
      await command(page, 'MAIN', 'MAIN');
      for (const selector of route) await command(page, selector);
      const listing = await command(page, 'LIST', title);
      expect(listing).not.toMatch(/投稿はありません|local-seed|創作|https?:/);
      const reading = await command(page, 'READ 1', '★内容');
      expect(reading).toContain(title); expect(reading).toMatch(/96\/11\//);
      const posts = data.posts.filter((p) => p.forumId === `resident-forum:${board}`).sort((a, b) => a.number - b.number);
      expect(posts).toHaveLength(count); expect(posts.map((p) => p.number)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      expect(posts.some((p) => p.replyToPostId)).toBe(true);
      for (const p of posts) {
        expect(data.members.some((m) => m.id === p.authorId && m.actor === 'ai')).toBe(true);
        if (p.replyToPostId) {
          const parent = posts.find((r) => r.id === p.replyToPostId)!;
          expect(parent.number).toBeLessThan(p.number); expect(parent.createdAt < p.createdAt).toBe(true);
        }
      }
    }
    // Preserve every established post verbatim and use a distinct origin for the ten additions.
    for (const [fixture, prefix] of [[original, 'v1'], [expansion, 'sigs-v1'], [wakaba, 'wakaba-v1'], [bulletin, 'bulletin-v1'], [starters, 'forums-v1']] as const)
      for (const p of fixture.posts) expect(data.posts.find((r) => r.id === `seed:${prefix}:${p.id}`)).toMatchObject({ title: p.title, body: p.body });
    const newPosts = data.posts.filter((p) => p.origin === starters.origin);
    expect(newPosts).toHaveLength(10); expect(new Set(newPosts.map((p) => p.body)).size).toBe(10);
    await noOtherUi(page);
  }
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('older partial and customized local worlds retain exact content across reload and backup restore', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository, validateBackup } = await import(path) as typeof import('../src/storage/repository');
    const anchor = '2026-10-21T00:00:00.000Z';
    const repo = await openRepository('old-partial'); await repo.openActivity(anchor);
    const alice = await repo.createHumanMember('一人目'), bob = await repo.createHumanMember('二人目');
    await repo.markRead(alice.id, 'seed:v1:repair-1'); await repo.markRead(bob.id, 'seed:v1:repair-2');
    const baseline = await repo.exportBackup();
    for (const p of baseline.posts.filter((p) => ['local-seed:forum-starters-v1', 'local-seed:wakaba-v1', 'local-seed:bulletin-v1'].includes(p.origin)).sort((a, b) => b.number - a.number)) await repo.delete('posts', p.id);
    for (const key of ['DAISIZEN:2', 'DAISIZEN:4', 'DAISIZEN:6', 'LOCAL-WAKABA:1']) await repo.delete('forums', `resident-forum:${key}`);
    await repo.put('forums', { id: 'custom-empty', sigId: 'resident-sig:MITI', boardNo: 99, name: '私の空き部屋', nextPostNumber: 8 });
    await repo.put('sigs', { id: 'resident-sig:DAISIZEN', keyword: 'DAISIZEN', title: '自分の自然ＳＩＧ' });
    await repo.put('settings', { id: 'private-setting', value: { keep: '設定と日時' } });
    await repo.createPost({ forumId: 'resident-forum:MITI:9', authorId: alice.id, title: '人の投稿', body: '残す', origin: 'local-human' });
    const ai = baseline.members.find((m) => m.actor === 'ai')!;
    await repo.createAiPost(ai, { forumId: 'resident-forum:MITI:9', authorId: ai.id, title: '生成の投稿', body: '残す', origin: 'local-ai:webllm:test' });
    const before = await repo.exportBackup(); repo.close();
    const reopened = await openRepository('old-partial'); await reopened.openActivity(anchor);
    const after = await reopened.exportBackup(); validateBackup(after);
    const imported = await openRepository('old-partial-import');
    await imported.replaceFromJson(JSON.stringify(before), { confirmReplace: true }); await imported.openActivity(anchor);
    const restored = await imported.exportBackup(); validateBackup(restored);
    reopened.close(); imported.close(); return { before, after, restored };
  });
  expect(result.before.posts).toHaveLength(68);
  expect(result.after).toEqual(result.before); expect(result.restored).toEqual(result.before);
});

test('restoring intentionally empty forums keeps Wakaba empty and exposes only the existing reset flow', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T00:00:00.000Z'));
  await start(page, '継続する人');
  const baseline = await snapshot(page), empty = structuredClone(baseline);
  empty.posts = []; empty.readStates = [];
  await restore(page, empty); await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  const saved = await snapshot(page);
  expect(saved.posts).toEqual([]); expect(saved.forums).toEqual(empty.forums);
  expect(saved.members).toEqual(empty.members); expect(saved.settings).toEqual(empty.settings);
  await command(page, '16'); await command(page, '1', '投稿はありません');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const modal = page.getByRole('dialog'); await modal.locator('.storage-panel > summary').click();
  await expect(modal.getByRole('button', { name: '空の標準掲示板に初期会話を追加…', exact: true })).toHaveCount(0);
  await modal.getByRole('button', { name: '初期状態に戻す', exact: true }).click();
  await expect(modal.locator('.confirmation-copy')).toContainText('82件');
  await expect(modal.locator('.confirmation-copy')).toContainText('取り消せません');
  await expect(modal.getByRole('button', { name: '先に JSON を保存', exact: true })).toBeVisible();
  await modal.locator('.cancel-action').click(); await modal.getByRole('button', { name: '閉じる', exact: true }).click();
  expect((await snapshot(page)).posts).toEqual([]); await noOtherUi(page);
});
