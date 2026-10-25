import { expect, test } from '@playwright/test';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import demos from '../data/pcvan/demo-posts.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { renderPost } from '../src/forums';
import { validateRecord } from '../src/storage/schema';
import { backupFixture, unreadFixture } from './backup-fixture';
import { additionalSigs } from '../src/communities';
import { command, start, enterForum, snapshot, restore, backup, noOtherUi } from './terminal-helpers';
import type { Backup } from '../src/storage/schema';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

function miti() {
  const controller = new PcvanController();
  for (const step of evidence.miti.steps) controller.submit(step.input);
  return controller;
}

function daisizen() {
  const controller = new PcvanController();
  controller.submit('13');
  controller.submit('2');
  return controller;
}

test('DAISIZEN sections preserve evidence labels without invented section numbers or jump', () => {
  const controller = daisizen();
  const output = controller.submit('HELP').join('\n');
  for (const section of evidence.daisizen.sections) {
    expect(output).toContain(`${section.label}`);
    expect(section.selector).toBeNull();
  }
  expect(evidence.daisizen.jump.input).toBeNull();
  controller.submit('MAIN');
  expect(controller.submit('J DAISIZEN').join('\n')).toContain('移動先が見つかりません');
  expect(controller.screen).toBe('main');
});

test('all seven DAISIZEN boards are independently selectable with scoped numbers and back', () => {
  const controller = daisizen();
  const output = controller.submit('FORUMS').join('\n');
  expect(evidence.daisizen.forums.map((forum) => forum.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  for (const forum of evidence.daisizen.forums) {
    expect(output).toContain(`${forum.number} ${forum.label}`);
    expect(controller.submit(String(forum.number)).join('\n')).toContain(`DAISIZEN / ${forum.label} / 投稿一覧`);
    expect(controller.screen).toBe('forum');
    expect(controller.submit('1').join('\n')).toContain('この画面では使えない');
    expect(controller.screen).toBe('forum');
    expect(controller.submit('BACK').join('\n')).toBe(output);
  }
  controller.submit('BACK');
  expect(controller.screen).toBe('daisizen');
  controller.submit('BACK');
  expect(controller.screen).toBe('communication');
});

test('MITI route reaches numbered original demos; gaps and invalid reads preserve the screen', () => {
  const controller = miti();
  const listing = controller.submit('LIST').join('\n');
  expect(listing.indexOf('#1 ')).toBeLessThan(listing.indexOf('#3 '));
  expect(listing).not.toMatch(/創作|再構成|https?:/);
  const read = controller.submit(' read   1 ').join('\n');
  expect(read).toContain('#1/9001　資料室');
  expect(read).toContain('★タイトル (DEMO0001)  1996/07/06  21:34');
  expect(read).toContain('★内容\n  架空の星');
  expect(read).toContain('架空の星を見つけたら、どんな名前を付けますか。');
  for (const invalid of ['READ 2', 'READ 999', 'READ 0', 'READ -1', 'READ 1.5', 'READ 9007199254740992', 'READ 1 extra', 'Q', 'J MITI']) {
    expect(controller.submit(invalid).join('\n')).toMatch(/ありません|この画面では使えない/);
    expect(controller.screen).toBe('miti-materials');
    expect(controller.submit('HELP').join('\n')).toContain(listing);
  }
  expect(controller.submit('READ 3').join('\n')).toContain('#3　資料室');
  expect(controller.submit('READ 3').join('\n')).not.toContain('#3/');
  controller.submit('BACK');
  expect(controller.screen).toBe('miti-forums');
  controller.submit('9');
  expect(controller.screen).toBe('miti-materials');
});

test('headers preserve title/body spacing and optional fields without interpreting secondary numbers', () => {
  const post = { ...demos.posts[0]!, displaySecondNumber: 0, title: '  創作　ｶﾅ  ', body: '\n  <b>文字</b>　。\n\n末尾  \n' };
  expect(renderPost(post, '表示試験', 7)).toEqual([
    '#1/0　表示試験', '★タイトル (DEMO0001)  1996/07/06  21:34  ( 7)',
    `${post.title}　名無し`, '★内容', post.body,
  ]);
  const { displaySecondNumber: _second, ...withoutSecond } = post;
  expect(renderPost(withoutSecond, '表示試験')[0]).toBe('#1　表示試験');
  expect(renderPost(withoutSecond, '表示試験')[1]).not.toContain('( 7)');
});

test('all seeded demo posts have original provenance and synthetic IDs', () => {
  expect(demos.evidence_category).toBe('D');
  expect(demos.status).toBe('reconstructed');
  for (const post of demos.posts) {
    validateRecord('posts', post);
    expect(post.origin).toBe('synthetic-demo');
    expect(post.authorId).toMatch(/^DEMO\d{4}$/);
    expect(post.title).toContain('創作デモ');
  }
});

test('human, seeded and generated headers separate stable tokens from current pen names without changing records', () => {
  const fixture = backupFixture();
  const human = fixture.posts[0]!;
  const seeded = { ...human, authorId: 'fictional-ai:resident', origin: 'local-seed:fictional' };
  const generated = { ...seeded, id: 'run', origin: 'local-ai:webllm:test-model',
    simulation: { runId: 'run', simulatedAt: '1996-07-06T12:34:00.000Z', fictional: true as const } };
  const members = [...fixture.members, { id: seeded.authorId, handle: '常連', actor: 'ai' as const }];
  const before = structuredClone({ posts: [human, seeded, generated], members });
  expect(renderPost(human, '広場', undefined, members).slice(1, 3)).toEqual([
    '★タイトル (SYN-7MFTMGGA7CMOM)  2026/10/20  10:02', `${human.title}　人間`,
  ]);
  const original = renderPost(generated, '広場', undefined, members);
  expect(original.slice(1, 3)).toEqual([
    '★タイトル (SYN-5C6R92FE6GO9F)  1996/07/06  21:34', `${generated.title}　常連`,
  ]);
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(SYN-5C6R92FE6GO9F)');
  expect(original.join('\n')).not.toMatch(/fictional-ai:|架空の投稿時刻|local-ai:|runId|AI住人|シミュレーション/);
  expect({ posts: [human, seeded, generated], members }).toEqual(before);
  for (const member of members) member.handle = '同じ名前';
  const duplicateTokens = members.map((member) => renderPost({ ...human, authorId: member.id }, '広場', undefined, members)[1]);
  expect(new Set(duplicateTokens).size).toBe(members.length);
  for (const post of [human, seeded, generated]) {
    const renamed = renderPost(post, '広場', undefined, members);
    expect(renamed[1]).toBe(renderPost(post, '広場', undefined, before.members)[1]);
    expect(renamed[2]).toBe(`${post.title}　同じ名前`);
    expect(renderPost(post, '広場', undefined, [...members].reverse())).toEqual(renamed);
    expect(renderPost(post, '広場', undefined, JSON.parse(JSON.stringify(members)))).toEqual(renamed);
  }
  expect([human, seeded, generated]).toEqual(before.posts);
});

test('legacy, missing and unusable names never turn internal keys into presentation identities', () => {
  const human = backupFixture().posts[0]!;
  for (const authorId of ['missing', 'fictional-ai:missing', 'local-human:old', '<b>record key</b>', 'DEMO9999', '01234567-89ab-cdef-0123-456789abcdef']) {
    const rendered = renderPost({ ...human, authorId }, '広場');
    expect(rendered[1]).toContain('(不明)');
    expect(rendered[2]).toBe(`${human.title}　名無し`);
    expect(rendered.join('\n')).not.toContain(authorId);
  }
  for (const handle of ['', '　 \t', '\u200b', 'first\nsecond', 'fictional-ai:resident', '01234567-89ab-cdef-0123-456789abcdef', human.authorId]) {
    const rendered = renderPost(human, '広場', undefined, [{ id: human.authorId, handle, actor: 'human' }]);
    expect(rendered[1]).toContain('(SYN-7MFTMGGA7CMOM)');
    expect(rendered[2]).toBe(`${human.title}　名無し`);
  }
  const ids = ['DEMO0001', '01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdee'];
  const resolved = ids.map((id) => renderPost({ ...human, authorId: id }, '広場', undefined,
    [{ id, handle: '筆名', actor: 'human' }])[1]!);
  expect(new Set(resolved).size).toBe(ids.length);
  for (const header of resolved) expect(header).toMatch(/★タイトル \(SYN-[0-9A-V]{13}\)/);
  const literal = renderPost({ ...human, title: '  和文　ｶﾅ <i>題</i>  ', body: '\n  <b>文字</b>　。\n\n末尾  \n' },
    '広場', undefined, [{ id: human.authorId, handle: '  <b>筆名</b>  ', actor: 'human' }]);
  expect(literal[2]).toBe('  和文　ｶﾅ <i>題</i>  　<b>筆名</b>');
  expect(literal[4]).toBe('\n  <b>文字</b>　。\n\n末尾  \n');
  for (const post of demos.posts) {
    expect(renderPost(post, '見本')[1]).toContain(`(${post.authorId})`);
    expect(renderPost(post, '見本')[2]).toBe(`${post.title}　名無し`);
  }
});

test('legacy imports render without assigning fields, seeding content or changing the backup', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (fixture) => {
    const rp = '/src/storage/repository.ts', fp = '/src/forums.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { renderPost } = await import(fp) as typeof import('../src/forums');
    const repo = await openRepository('legacy-forum-identity');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const before = await repo.exportBackup();
    const output = before.posts.map((p) => renderPost(p, '広場', undefined, before.members));
    const after = await repo.exportBackup();
    repo.close();
    const reopened = await openRepository('legacy-forum-identity');
    await reopened.replaceFromJson(JSON.stringify({ ...after, members: [...after.members].reverse() }), { confirmReplace: true });
    const restored = await reopened.exportBackup();
    const repeated = restored.posts.map((p) => renderPost(p, '広場', undefined, restored.members));
    reopened.close();
    return { before, after, restored, output, repeated };
  }, backupFixture());
  expect(result.before.members).toEqual(backupFixture().members);
  expect(result.before.posts).toEqual(backupFixture().posts);
  expect(result.after).toEqual(result.before);
  expect(result.restored).toEqual(result.before);
  expect(result.repeated).toEqual(result.output);
  expect(result.output[0]![1]).toContain('(SYN-7MFTMGGA7CMOM)');
});

test('repository identities map by SIG keyword and board number; empty/missing/ambiguous boards stay empty', () => {
  const controller = miti();
  const content = backupFixture();
  content.sigs[0]!.keyword = 'miti';
  content.forums[0]!.boardNo = 9;
  // Reverse storage order, and give the lower number a later date: numbering
  // determines the stable order, independently of IDs/timestamps.
  content.posts[0]!.createdAt = '2026-10-21T01:02:03.000Z';
  content.posts.reverse();
  controller.setContent(content);
  const listing = controller.submit('LIST').join('\n');
  expect(listing.indexOf('#1 ')).toBeLessThan(listing.indexOf('#4 '));
  expect(listing).not.toContain('創作デモ投稿');
  expect(controller.submit('READ 4').join('\n')).toContain('#4/12　資料室');
  expect(controller.submit('READ 2').join('\n')).toContain('投稿はありません');
  content.posts = [];
  expect(controller.submit('LIST').join('\n')).toContain('投稿はありません');
  content.forums[0]!.boardNo = 8;
  expect(controller.submit('LIST').join('\n')).toContain('見つからないか、重複');
  content.forums[0]!.boardNo = 9;
  content.forums.push({ ...content.forums[0]!, id: 'duplicate' });
  expect(controller.submit('LIST').join('\n')).toContain('見つからないか、重複');
  expect(controller.submit('READ 1').join('\n')).toContain('投稿はありません');
  expect(controller.screen).toBe('miti-materials');
  expect(controller.submit('MAIN')).toEqual(controller.welcome);
});

test('empty DAISIZEN board and invalid forum selectors preserve navigation', () => {
  const controller = daisizen();
  const sigScreen = controller.submit('HELP');
  expect(controller.submit('1').join('\n')).toContain('この画面では使えない');
  expect(controller.submit('HELP')).toEqual(sigScreen);
  controller.submit('FORUMS');
  const forums = controller.submit('HELP');
  for (const invalid of ['0', '8', '9', 'READ 1', 'J DAISIZEN', 'Q']) {
    expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
    expect(controller.submit('HELP')).toEqual(forums);
  }
  expect(controller.submit('7').join('\n')).toContain('投稿はありません');
  expect(controller.submit('READ 1').join('\n')).toContain('投稿はありません');
  controller.submit('BACK');
  controller.submit('1');
  expect(controller.submit('READ 1').join('\n')).toContain('小さな庭の便り');
});

test('unread controls cover MITI, every DAISIZEN board and additional SIG boards with actual parent paths', () => {
  const routes = [
    { keyword: 'MITI', boardNo: 9, steps: ['J MITI', '3', '9'], parent: 'miti-forums' },
    ...evidence.daisizen.forums.map((f) => ({ keyword: 'DAISIZEN', boardNo: f.number, steps: ['13', '2', 'FORUMS', String(f.number)], parent: 'daisizen-forums' })),
    ...additionalSigs.flatMap((s) => s.boards.map((b) => ({ keyword: s.keyword, boardNo: b.number, steps: ['13', s.selector, String(b.number)], parent: 'community' }))),
  ];
  for (const route of routes) {
    const controller = new PcvanController(), content = unreadFixture();
    content.sigs[0]!.keyword = route.keyword;
    content.forums[0]!.boardNo = route.boardNo; content.forums[1]!.boardNo = 99;
    controller.setContent(content); controller.setMemberId('human');
    for (const step of route.steps) controller.submit(step);
    const before = structuredClone(content), screen = controller.screen;
    const listing = controller.submit('  unRead  ').join('\n');
    expect(listing).toContain('未読一覧（番号順）');
    expect(listing).toContain('#4 返事 RE#1 [未読]');
    expect(listing).toContain('#9 最後の便り [未読]');
    expect(listing).not.toContain('#1 こんにちは');
    expect(listing.indexOf('#4 ')).toBeLessThan(listing.indexOf('#9 '));
    const next = controller.submit(' next ').join('\n');
    expect(next).toContain('#4/12'); expect(next).toContain('返事　今の筆名');
    expect(next).toContain('1996/11/20  10:03'); expect(next).toContain('返信先：#1');
    for (const invalid of ['NEXT 1', 'NEXT NEXT', 'UNREAD 1', 'UN READ', 'NEXT extra', 'READ 4 extra', '']) {
      expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
      expect(controller.screen).toBe(screen);
    }
    expect(controller.submit('LIST').join('\n')).toContain('#1 こんにちは [既読]');
    expect(controller.submit('HELP').join('\n')).toContain('投稿一覧（番号順）');
    expect(controller.submit('HELP').join('\n')).toContain('UNREAD: 未読一覧 / NEXT: 次の未読');
    expect(content).toEqual(before);
    controller.submit('BACK'); expect(controller.screen).toBe(route.parent);
    controller.submit('MAIN'); expect(controller.screen).toBe('main');
  }
});

test('unread absent/exhausted markers, anonymous and demo readers, empty and ambiguous mappings remain read-only', () => {
  const controller = miti(), content = unreadFixture();
  controller.setContent(content); controller.setMemberId('human');
  content.readStates = [];
  expect(controller.submit('UNREAD').join('\n')).toContain('#1 こんにちは [未読]');
  expect(controller.submit('NEXT').join('\n')).toContain('#1　資料室');
  content.readStates = [{ memberId: 'human', forumId: 'forum', lastReadNumber: 100 }];
  expect(controller.submit('NEXT').join('\n')).toContain('未読の投稿はありません');
  expect(controller.submit('UNREAD').join('\n')).toContain('未読の投稿はありません');
  content.posts = [];
  expect(controller.submit('NEXT').join('\n')).toContain('未読の投稿はありません');
  expect(controller.submit('LIST').join('\n')).toContain('投稿はありません');
  content.forums[0]!.boardNo = 8;
  for (const cmd of ['NEXT', 'UNREAD']) expect(controller.submit(cmd).join('\n')).toContain('見つからないか、重複');
  content.forums[0]!.boardNo = 9; content.forums.push({ ...content.forums[0]!, id: 'duplicate' });
  for (const cmd of ['NEXT', 'UNREAD']) expect(controller.submit(cmd).join('\n')).toContain('見つからないか、重複');
  content.forums.pop(); content.sigs.push({ ...content.sigs[0]!, id: 'duplicate-sig' });
  for (const cmd of ['NEXT', 'UNREAD']) expect(controller.submit(cmd).join('\n')).toContain('見つからないか、重複');
  for (const member of [undefined, 'ai', 'missing']) {
    controller.setContent(unreadFixture()); controller.setMemberId(member);
    for (const cmd of ['NEXT', 'UNREAD']) expect(controller.submit(cmd).join('\n')).toContain('HANDLE');
    expect(controller.submit('READ 4').join('\n')).toContain('★内容');
  }
  const demo = miti(); demo.setMemberId('human');
  for (const cmd of ['NEXT', 'UNREAD']) expect(demo.submit(cmd).join('\n')).toContain('HANDLE');
  expect(demo.submit('READ 1').join('\n')).toContain('★内容');
});

async function unreadWorld(page: Page, content = unreadFixture()) {
  await start(page); await restore(page, content); await command(page, 'MAIN', 'MAIN'); await enterForum(page);
}

// These restored fixtures have no active generation; only session/history changes.
function protectedRecords(data: Backup) {
  return { members: data.members, sigs: data.sigs, forums: data.forums, posts: data.posts, mail: data.mail,
    settings: data.settings };
}

test('production unread → rapid NEXT → exhaustion persists the exact candidates and only intended markers', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await unreadWorld(page);
  const before = await snapshot(page);
  await command(page, 'ABOUT', 'フォーラム未読の調査URL');
  await command(page, 'BACK', '投稿一覧');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  const modal = page.getByRole('dialog'); await modal.locator('.about-panel > summary').click();
  await expect(modal.locator('.settings-about')).toContainText('カテゴリーDの再構成');
  await expect(modal.locator('.settings-about')).toContainText('forum-unread-reading-issue-107');
  await page.keyboard.press('Escape');
  const unread = await command(page, '  unRead  ', '未読一覧');
  expect(unread).toContain('#4 返事 RE#1 [未読]'); expect(unread).toContain('#9 最後の便り [未読]');
  expect(unread).not.toContain('#1 こんにちは');
  expect((await snapshot(page)).readStates).toEqual(before.readStates);
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    Object.assign(window, { readWrites: 0 });
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'readStates') (window as unknown as { readWrites: number }).readWrites++;
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    const input = document.querySelector<HTMLInputElement>('#command')!;
    for (const line of [' next ', 'NEXT', 'NEXT', 'UNREAD', 'LIST', 'HELP', 'NEXT 1', 'UNREAD all', '']) {
      input.value = line; input.form!.requestSubmit();
    }
  });
  await expect(page.locator('.output')).toContainText('> UNREAD all');
  await command(page, 'UNREAD', '未読の投稿はありません');
  const output = (await page.locator('.output').textContent())!;
  expect(output.indexOf('#4/12　資料室')).toBeLessThan(output.indexOf('#9　資料室'));
  expect(output.match(/#4\/12　資料室/g)).toHaveLength(1);
  expect(output.match(/#9　資料室/g)).toHaveLength(1);
  expect(output).toContain('返事　今の筆名\n★内容\n応答\n返信先：#1');
  expect(output).toContain('  <i>最後</i>　ｶﾅ  \n\n末尾  ');
  expect(await page.evaluate(() => (window as unknown as { readWrites: number }).readWrites)).toBe(2);
  const after = await snapshot(page);
  expect(after.readStates).toEqual(before.readStates.map((s) => s.memberId === 'human' && s.forumId === 'forum' ? { ...s, lastReadNumber: 9 } : s));
  expect(protectedRecords(after)).toEqual(protectedRecords(before));
  await expect(page.locator('.output i, .output b')).toHaveCount(0);
  await command(page, 'BACK', 'MITI / フォーラム');
  const downloading = page.waitForEvent('download'); await command(page, 'LOG');
  const log = await readFile((await (await downloading).path())!, 'utf8');
  expect(log).toContain('>   unRead  '); expect(log).toContain('#4/12　資料室');
  expect(log).toContain('  <i>最後</i>　ｶﾅ  \n\n末尾  ');
  await noOtherUi(page); expect(external).toEqual([]);
});

test('production absent marker, numbered READ high-water, human/forum isolation and JSON/reload recovery', async ({ page }) => {
  const fixture = unreadFixture(); fixture.readStates = [];
  fixture.sigs.push({ id: 'daisizen', keyword: 'DAISIZEN', title: '別のSIG' });
  fixture.forums[1]!.sigId = 'daisizen'; fixture.forums[1]!.boardNo = 1;
  await unreadWorld(page, fixture);
  await command(page, 'UNREAD', '#1 こんにちは [未読]');
  await command(page, 'NEXT', '#1　資料室');
  await command(page, 'READ   9', '#9　資料室');
  await command(page, 'READ 4', '#4/12　資料室');
  await command(page, 'NEXT', '未読の投稿はありません');
  expect((await snapshot(page)).readStates).toEqual([{ memberId: 'human', forumId: 'forum', lastReadNumber: 9 }]);
  for (const line of ['MAIN', '13', '2', 'FORUMS', '1']) await command(page, line, 'コマンド=');
  await command(page, 'NEXT', '#1　自然の森／ＦＲＥＥ');
  await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  await command(page, 'NEXT', '未読の投稿はありません');
  await command(page, 'HANDLE', '人間'); await command(page, '2', '別の人 を選択');
  await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '投稿一覧');
  await command(page, 'NEXT', '#1　資料室');
  const saved = await backup(page);
  expect(saved.readStates).toEqual([
    { memberId: 'human', forumId: 'forum', lastReadNumber: 9 },
    { memberId: 'human', forumId: 'other', lastReadNumber: 1 },
    { memberId: 'human2', forumId: 'forum', lastReadNumber: 1 },
  ]);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await enterForum(page);
  await command(page, 'NEXT', '#4/12　資料室');
  await restore(page, saved); await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  await command(page, 'NEXT', '#4/12　資料室');
  expect((await snapshot(page)).readStates.find((s) => s.memberId === 'human2')!.lastReadNumber).toBe(4);
});

test('production other-tab content, current selection/name and high-water changes refresh on each command', async ({ page, context }) => {
  await unreadWorld(page);
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  // Raw IndexedDB changes deliberately send no notification: next command must refresh.
  await other.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['settings', 'members', 'readStates', 'posts'], 'readwrite');
      tx.objectStore('settings').put({ id: 'active-human-member', value: 'human2' });
      tx.objectStore('members').put({ id: 'ai', handle: '別タブの筆名', actor: 'ai' });
      tx.objectStore('readStates').put({ memberId: 'human2', forumId: 'forum', lastReadNumber: 3 });
      const posts = tx.objectStore('posts'), r = posts.get('reply'); r.onsuccess = () => posts.put({ ...r.result, body: '別タブの最新本文' });
      tx.oncomplete = () => resolve();
    }); db.close();
  });
  const read = await command(page, 'NEXT', '別タブの最新本文');
  expect(read).toContain('返事　別タブの筆名');
  let states = (await snapshot(page)).readStates;
  expect(states.find((s) => s.memberId === 'human' && s.forumId === 'forum')!.lastReadNumber).toBe(3);
  expect(states.find((s) => s.memberId === 'human2')!.lastReadNumber).toBe(4);
  await other.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('posts', 'readwrite'), store = tx.objectStore('posts'), r = store.get('ninth');
      r.onsuccess = () => store.put({ ...r.result, id: 'new-fifth', number: 5, title: '追加された便り' });
      tx.oncomplete = () => resolve();
    }); db.close();
  });
  await command(page, 'UNREAD', '#5 追加された便り [未読]');
  await command(page, 'NEXT', '#5　資料室');
  await enterForum(other); await command(other, 'READ 9', '#9　資料室');
  expect(await command(page, 'NEXT', '未読の投稿はありません')).not.toContain('★内容');
  await command(page, 'READ 1', '#1　資料室');
  states = (await snapshot(page)).readStates;
  expect(states.find((s) => s.memberId === 'human2')!.lastReadNumber).toBe(9);
});

test('production NEXT write/refresh failures reveal no body and allow retry', async ({ page }) => {
  await unreadWorld(page); const before = await snapshot(page);
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'readStates') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restoreReadPut: () => { IDBObjectStore.prototype.put = native; } });
  });
  expect(await command(page, 'NEXT', '既読の保存に失敗しました。再試行')).not.toContain('★内容');
  expect((await snapshot(page)).readStates).toEqual(before.readStates);
  await page.evaluate(() => (window as unknown as { restoreReadPut(): void }).restoreReadPut());
  await command(page, 'NEXT', '#4/12　資料室');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args: Parameters<typeof native>) {
      if (this.name === 'posts') throw new DOMException('test read', 'UnknownError');
      return native.apply(this, args);
    };
    Object.assign(window, { restoreGetAll: () => { IDBObjectStore.prototype.getAll = native; } });
  });
  expect(await command(page, 'NEXT', 'ローカル保存エラー')).not.toContain('★内容');
  await command(page, 'BACK', 'MITI / フォーラム');
  await page.evaluate(() => (window as unknown as { restoreGetAll(): void }).restoreGetAll());
  await command(page, '9', '投稿一覧'); await command(page, 'NEXT', '#9　資料室');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
});

test('production anonymous and restored-empty worlds never seed content or create read state', async ({ page }) => {
  const fixture = unreadFixture(); fixture.members = fixture.members.filter((m) => m.actor !== 'human');
  fixture.posts = fixture.posts.map((p) => ({ ...p, authorId: 'ai' })); fixture.readStates = []; fixture.mail = [];
  await unreadWorld(page, fixture); const before = await snapshot(page);
  for (const line of ['UNREAD', 'NEXT']) {
    const result = await command(page, line, 'HANDLE');
    expect(result).not.toContain('登録しますか'); expect(result).not.toContain('★内容');
  }
  await command(page, 'LIST', '#4 返事'); await command(page, 'READ 4', '★内容');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  expect((await snapshot(page)).readStates).toEqual([]);
  const empty = unreadFixture(); empty.sigs = []; empty.forums = []; empty.posts = []; empty.readStates = [];
  await restore(page, empty); await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  const emptyBefore = await snapshot(page);
  await command(page, 'UNREAD', '未読の投稿はありません'); await command(page, 'NEXT', '未読の投稿はありません');
  await command(page, 'READ 1', '投稿はありません');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(emptyBefore));
  expect((await snapshot(page)).readStates).toEqual([]);
});

test('production composition, IME and other services own UNREAD/NEXT without forum marker writes', async ({ page }) => {
  await unreadWorld(page); const before = await snapshot(page);
  const input = page.locator('#command');
  await input.fill('NEXT'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('NEXT'); expect((await snapshot(page)).readStates).toEqual(before.readStates);
  await input.dispatchEvent('compositionend'); await input.fill('');
  await command(page, 'WRITE', 'タイトル='); await command(page, 'NEXT', '本文を1行ずつ');
  await command(page, 'UNREAD', '本文='); await command(page, 'NEXT', '本文=');
  const preview = await command(page, '.END', '投稿しますか'); expect(preview).toContain('1: UNREAD\n2: NEXT');
  await command(page, '.CANCEL', '投稿を中止');
  for (const route of [['MAIN', '1'], ['MAIN', '13', '2', 'CONFERENCE'], ['MAIN', '7', '1', '1']]) {
    for (const line of route) await command(page, line, 'コマンド=');
    for (const line of ['NEXT', 'UNREAD']) expect(await command(page, line, 'この画面では使えない')).not.toContain('★内容');
  }
  expect((await snapshot(page)).readStates).toEqual(before.readStates);
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before)); await noOtherUi(page);
});

test('production stale replacement without notifications stops queued NEXT; restore/reset discard old markers', async ({ page, context }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'BroadcastChannel', { value: undefined }); });
  await unreadWorld(page); await command(page, 'NEXT', '#4/12　資料室');
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.output')).toContainText('MAIN');
  const empty = unreadFixture(); empty.posts = []; empty.readStates = [];
  await restore(other, empty);
  const reloaded = page.waitForEvent('load');
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#command')!;
    for (let i = 0; i < 2; i++) { input.value = 'NEXT'; input.form!.requestSubmit(); }
  });
  await reloaded; await expect(page.locator('.output')).toContainText('MAIN');
  expect(await page.locator('.output').textContent()).not.toContain('★内容');
  expect((await snapshot(page)).readStates).toEqual([]);
  await enterForum(page); await command(page, 'NEXT', '未読の投稿はありません');
  await restore(page, unreadFixture()); await command(page, 'MAIN', 'MAIN'); await enterForum(page);
  await command(page, 'NEXT', '#4/12　資料室');
  await command(page, 'RESET', '初期状態に戻しますか');
  await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  await expect.poll(async () => { await page.locator('#command').press('Escape'); return page.locator('.output').textContent(); }).toContain('登録しますか');
  await command(page, 'SKIP', '登録を中止'); await enterForum(page); await command(page, 'NEXT', 'HANDLE');
  const reset = await snapshot(page);
  expect(reset.readStates).toEqual([]); expect(reset.posts.some((p) => p.id === 'ninth')).toBe(false);
});
