import { expect, test } from '@playwright/test';
import { command, start, enterForum, post, backup, restore, noOtherUi, settings, snapshot } from './terminal-helpers';
import { mockWorker } from './ai-helpers';
import { identityToken } from '../src/member-presentation';
import { emptyActivity } from '../src/ai/activity';
import type { ResidentSettings } from '../src/ai/personas';
import type { AiActivity, JsonValue } from '../src/storage/schema';

test('production keyboard journey preserves all MAIN mappings, Japanese posts, read states and backup recovery', async ({ page, context }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) requests.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page, '旅の利用者');
  for (const selector of [...Array.from({ length: 21 }, (_, i) => String(i + 1)), 'X']) {
    await command(page, selector, `${selector} `); await command(page, 'MAIN', 'MAIN');
  }
  await enterForum(page); await command(page, 'READ 1', '★内容');
  await post(page, '旅の記録', '一行目\n\n  日本語　ｶﾅ  ');
  await post(page, '返信', 'キーボードだけで書いた返信。', 'REPLY 17');
  await command(page, 'READ 18', '返信先：#17');
  const saved = await backup(page); expect(saved.posts).toHaveLength(84);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await enterForum(page); await command(page, 'READ 18', 'キーボードだけ');
  await command(page, 'MAIN', 'MAIN'); await command(page, 'Q', '接続を終了');
  await command(page, 'RECONNECT', 'PC-VAN 接続中'); await command(page, 'HELP', '番号またはコマンド=');
  await restore(page, saved); expect((await snapshot(page)).posts).toEqual(saved.posts);
  await noOtherUi(page); expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('production READ → HANDLE rename → READ retains synthetic identity through reload and restore', async ({ page }) => {
  await start(page, '旅の筆名'); await enterForum(page);
  const initial = await snapshot(page);
  const seed = initial.posts.find((p) => p.forumId === 'resident-forum:MITI:9' && p.number === 1)!;
  const resident = initial.members.find((m) => m.id === seed.authorId)!;
  const read = async (number: number, title: string, handle: string) => {
    const output = await command(page, `READ ${number}`, '★内容');
    expect(output).toContain(`${title}　${handle}\n★内容`);
    const header = output.match(/★タイトル \((SYN-[0-9A-V]{13})\)  [^\n]+/)![0];
    expect(header).not.toMatch(/fictional-ai:|local-human|runId/);
    return header;
  };
  const seededHeader = await read(1, seed.title, resident.handle);
  const title = '  和文　ｶﾅ <i>題</i>  ', body = '  <b>文字</b>　。\n\n末尾  ';
  await post(page, title, body, 'REPLY 1');
  const before = await snapshot(page), humanPost = before.posts.find((p) => p.number === 17)!;
  expect(humanPost).toMatchObject({ title, body, replyToPostId: seed.id });
  const humanHeader = await read(17, title, '旅の筆名');
  expect(humanHeader).not.toBe(seededHeader);
  await command(page, 'HANDLE', '旅の筆名');
  await command(page, 'RENAME 新しい筆名', 'ハンドル名を変更');
  await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  expect(await read(17, title, '新しい筆名')).toBe(humanHeader);
  // Rename the real seeded resident through the existing profile editor.
  const profiles = (before.settings.find((s) => s.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles;
  await settings(page, 3); await command(page, 'RESIDENTS', '住人編集');
  await command(page, String(profiles.findIndex((p) => `fictional-ai:${p.id}` === resident.id) + 1), '未保存');
  await command(page, '1', 'handle='); await command(page, '住人の新筆名', '未保存');
  await command(page, 'SAVE', '住人の設定を保存');
  await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  expect(await read(1, seed.title, '住人の新筆名')).toBe(seededHeader);
  const saved = await backup(page);
  expect(saved.posts).toEqual(before.posts);
  expect(saved.members).toEqual(before.members.map((m) => ({ ...m, handle: m.id === humanPost.authorId ? '新しい筆名' : m.id === resident.id ? '住人の新筆名' : m.handle })));
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN');
  await enterForum(page);
  expect(await read(17, title, '新しい筆名')).toBe(humanHeader);
  expect(await read(1, seed.title, '住人の新筆名')).toBe(seededHeader);
  // Member ordering in old JSON backups has no role in token assignment.
  await restore(page, { ...saved, members: [...saved.members].reverse() });
  await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  expect(await read(17, title, '新しい筆名')).toBe(humanHeader);
  expect(await read(1, seed.title, '住人の新筆名')).toBe(seededHeader);
  const restored = await snapshot(page);
  expect(restored.posts).toEqual(saved.posts); expect(restored.members).toEqual(saved.members);
  expect(restored.readStates).toEqual(saved.readStates);
  await expect(page.locator('.output b, .output i')).toHaveCount(0);
  await noOtherUi(page);
});

test('production AI recovers a partially committed autonomous batch after tab loss without duplicates', async ({ page, context }) => {
  const startTime = new Date('2026-10-21T00:00:00Z'), returnTime = new Date('2026-10-24T00:00:00Z');
  await page.clock.setFixedTime(startTime); await mockWorker(page, 'interrupt'); await start(page, '旅行者');
  await enterForum(page); await post(page, '元の話題', '星を眺めました。');
  // This fixed seed schedules the same persona/forum twice, reproducing the old mock's copy collision.
  const fixture = await backup(page);
  fixture.settings.find((row) => row.id === 'ai-activity')!.value = emptyActivity(startTime.toISOString(), 'recovery-42') as unknown as JsonValue;
  const residents = fixture.settings.find((row) => row.id === 'ai-residents')!.value as unknown as ResidentSettings;
  // Pin the legacy repeated-author scenario independently of the new-world roster.
  residents.version = 1; residents.profiles = residents.profiles.slice(0, 10);
  for (const profile of residents.profiles) Object.assign(profile, { preferredBoards: ['MITI:9'], participation: 1, absence: 0, reply: 1, inactivity: 0, weekdayHours: Array.from({ length: 24 }, (_, n) => n), weekendHours: Array.from({ length: 24 }, (_, n) => n) });
  await restore(page, fixture);
  await settings(page, 3); await command(page, 'AUTO 2', '有効');
  await command(page, 'LOAD', '同意してモデル'); await command(page, 'Y');
  await expect(page.locator('.output')).toContainText('モデル準備完了');
  await command(page, 'MAIN', 'MAIN'); await command(page, 'Q', '接続を終了');
  expect((await backup(page)).session!.lastLogoutAt).toBe(startTime.toISOString());
  await page.clock.setFixedTime(returnTime); await command(page, 'RECONNECT', '接続中');
  await expect.poll(() => page.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)).toBe(2);
  const interrupted = await backup(page), generated = interrupted.posts.filter((p) => p.simulation);
  expect(generated).toHaveLength(1); expect(interrupted.posts).toHaveLength(84);
  const batch = (interrupted.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity).batch!;
  expect(batch.runs.map((run) => run.status)).toEqual(['committed', 'running']);
  expect(batch.runs[1]!.personaId).not.toBe(batch.runs[0]!.personaId);
  expect(batch.runs[1]!.forumId).toBe(batch.runs[0]!.forumId);
  await page.close(); const resumed = await context.newPage(); await resumed.clock.setFixedTime(returnTime); await mockWorker(resumed, 'ok');
  await resumed.goto('/');
  await expect.poll(async () => (await snapshot(resumed)).posts.length).toBe(85);
  const recovered = await backup(resumed);
  expect(recovered.posts.filter((p) => p.simulation)).toHaveLength(2);
  const recoveredBatch = (recovered.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity).batch!;
  for (const run of batch.runs) expect(recovered.posts.some((p) => p.id === run.id)).toBe(true);
  expect(recoveredBatch.runs.length).toBeLessThanOrEqual(2);
  expect(new Set(recovered.posts.filter((p) => p.simulation).map((p) => p.body)).size).toBe(2);
  expect(recovered.posts.find((p) => p.id === generated[0]!.id)).toEqual(generated[0]);
  await enterForum(resumed);
  const generatedPost = recovered.posts.filter((p) => p.simulation)[0]!;
  const author = recovered.members.find((m) => m.id === generatedPost.authorId)!;
  const generatedRead = await command(resumed, `READ ${generatedPost.number}`, '★内容');
  expect(generatedRead).toContain(`${generatedPost.title}　${author.handle}\n★内容`);
  const generatedToken = generatedRead.match(/★タイトル \((SYN-[0-9A-V]{13})\)/)![1];
  expect(generatedToken).toBe(identityToken(author));
  expect((await snapshot(resumed)).posts).toEqual(recovered.posts);
  await settings(resumed, 3); await command(resumed, 'HELP', 'committed');
  await command(resumed, 'MAIN', 'MAIN'); await command(resumed, 'Q', '接続を終了');
  await command(resumed, 'RECONNECT', '接続中'); await command(resumed, 'HELP', '番号またはコマンド=');
  expect((await backup(resumed)).posts).toEqual(recovered.posts); await noOtherUi(resumed);
});
