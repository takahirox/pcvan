import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { TerminalOlt } from '../src/olt';
import { about } from '../src/settings';
import { renderPost } from '../src/forums';
import { emptyOlt, appendOlt } from '../src/olt-state';
import { backupFixture } from './backup-fixture';
import type { AiActivity } from '../src/storage/schema';
import { mockWorker, mockPendingWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { command, start, snapshot, noOtherUi, enterForum, post, backup, restore } from './terminal-helpers';
import { epoch, state, speech, directory, room, advance, residents } from './olt-helpers';

test('terminal directory, literal commands, IME, history, transitions, handles, reentry and forum posting', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '夜の客'); await room(page);
  await noOtherUi(page);
  await command(page, '/WHO', '夜の客');
  for (const text of ['MAIN', 'BACK', 'WRITE', 'HELP', 'STOP']) await command(page, text, `<夜の客> ${text}`);
  const input = page.locator('#command');
  await input.fill('変換中'); await input.dispatchEvent('compositionstart');
  await input.press('Enter'); await advance(page, 3); await expect(input).toHaveValue('変換中');
  expect((await state(page))!.rooms.flatMap((r) => r.lines).some((l) => l.text === '変換中')).toBe(false);
  await input.dispatchEvent('compositionend'); await input.press('Enter');
  await expect(page.locator('.output')).toContainText('<夜の客> 変換中');
  await input.press('ArrowUp'); await expect(input).toHaveValue('変換中'); await input.fill('');
  await command(page, '//LEAVE', '<夜の客> /LEAVE'); await command(page, '/HELP', '/LEAVE');
  await command(page, '/JOIN 1', '自然の談話室');
  await command(page, '/LEAVE', '部屋を退出'); await command(page, '2', '星と道具');
  const before = await state(page); await command(page, '/JOIN 2', '星と道具');
  expect((await state(page))!.rooms.find((r) => r.id === 'night')!.lines).toEqual(before!.rooms.find((r) => r.id === 'night')!.lines);
  await command(page, '/HANDLE', 'ハンドル設定'); await command(page, 'RENAME 夜更け', '夜更け');
  await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '元の画面');
  await command(page, 'JOIN 2', '発言='); await command(page, '名前を変えました', '<夜更け> 名前を変えました');
  await command(page, '/MAIN', 'MAIN'); await enterForum(page); await post(page, 'OLT帰り', '今夜の星を見ました。');
  await noOtherUi(page); expect(await speech(page)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});

test('delayed human-to-resident and resident-to-resident chat preserve input, shared identities, and private mail', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '星の客');
  await residents(page); await consent(page); await room(page);
  await command(page, '今夜の星について教えて', '<星の客>'); expect(await speech(page)).toHaveLength(0);
  await advance(page, 6); await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
  const first = (await speech(page))[0]!;
  expect(Date.parse(first.createdAt) - epoch.getTime()).toBeGreaterThanOrEqual(8000);
  const input = page.locator('#command'); await input.fill('日本語の途中'); await input.dispatchEvent('compositionstart');
  const output = await page.locator('.output').textContent(); await advance(page, 6);
  expect(await page.locator('.output').textContent()).toBe(output); await expect(input).toHaveValue('日本語の途中'); await expect(input).toBeFocused();
  await input.dispatchEvent('compositionend'); await input.fill(''); await advance(page, 7);
  await expect.poll(async () => (await speech(page)).length).toBeGreaterThanOrEqual(2);
  const lines = await speech(page); expect(lines[1]!.authorId).not.toBe(first.authorId);
  const data = await snapshot(page); expect(data.members.some((m) => m.id === first.authorId && m.actor === 'ai')).toBe(true);
  expect((data.settings.find((r) => r.id === 'ai-activity')!.value as unknown as AiActivity).batch).toBeNull();
  const count = lines.length; await advance(page, 35); expect((await speech(page)).length).toBeLessThanOrEqual(3);
  expect(count).toBeGreaterThan(0);
  const replay = await command(page, '/LIST', '日時 JST');
  const who = await command(page, '/WHO', '参加者');
  for (const line of lines) {
    const member = data.members.find((m) => m.id === line.authorId)!;
    const token = renderPost({ ...data.posts[0]!, authorId: member.id }, '照合', undefined, data.members)[1]!.match(/\((SYN-[0-9A-V]{13})\)/)![1];
    expect(replay).toContain(`(${token}) <${member.handle}> ${line.text}`);
    // These residents were already present; entry does not replay their arrivals.
    expect(replay).not.toContain(`(${token}) * ${member.handle} 入室`);
    expect(who).toContain(`(${token}) ${member.handle}`);
  }
  await noOtherUi(page);
  const prompts = await page.evaluate(() => (window as unknown as { journeyWorker: { prompts: Record<string, unknown>[] } }).journeyWorker.prompts);
  expect(prompts.every((p) => p.kind === 'olt' && !Object.hasOwn(p, 'mail'))).toBe(true);
});

test('silent residents, expiry and reload produce bounded chronology without closed-tab inference', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '静かな客');
  await residents(page, true); await consent(page); await room(page);
  await command(page, 'こんばんは', '<静かな客>'); await advance(page, 10);
  expect(await speech(page)).toEqual([]);
  const before = await state(page); expect(before!.rooms.flatMap((r) => r.residents)).toHaveLength(2);
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await room(page);
  const after = await state(page);
  expect(after!.rooms.flatMap((r) => r.lines).filter((l) => l.kind === 'enter')).toHaveLength(before!.rooms.flatMap((r) => r.lines).filter((l) => l.kind === 'enter').length);
  await page.clock.setSystemTime(new Date('2026-10-22T03:00:00Z'));
  await command(page, '/WHO', '参加者：1人');
  expect((await state(page))!.rooms.flatMap((r) => r.residents)).toEqual([]);
  expect(await speech(page)).toEqual([]);
  await command(page, '/LEAVE', '退出');
});

test('two tabs share attendance and arbitrate each AI turn once', async ({ page, context }) => {
  // Playwright's clock belongs to the context: install and advance it once for
  // both tabs, with no wall-clock drift into the next conversational turn.
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '同じ客');
  await residents(page); await consent(page); await room(page);
  const other = await context.newPage(); await mockWorker(other, 'ok'); await other.goto('/');
  // Complete the connection through MAIN rather than its paused presentation timer.
  await room(other);
  const joined = await state(page), night = joined!.rooms.find((r) => r.id === 'night')!;
  expect(night.visitors).toHaveLength(2); expect(night.lines.filter((l) => l.kind === 'enter' && l.authorId === night.visitors[0]!.memberId)).toHaveLength(1);
  await command(page, 'ふたりで星を見ています', '<同じ客>');
  await advance(page, 7);
  expect(await Promise.all([page, other].map((p) => p.evaluate(() => Date.now())))).toEqual([epoch.getTime() + 21_000, epoch.getTime() + 21_000]);
  await expect.poll(async () => (await speech(page)).length).toBe(1);
  const lines = await speech(page); expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
  expect((await state(page))!.rooms.find((r) => r.id === 'night')!.pending).toBeNull();
  const allPrompts = await Promise.all([page, other].map((p) => p.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)));
  expect(allPrompts.reduce((n, v) => n + v, 0)).toBe(lines.length);
  await command(other, '/LEAVE', '退出'); await command(page, '/WHO', '同じ客');
  expect((await state(page))!.rooms.find((r) => r.id === 'night')!.visitors).toHaveLength(1);
});

for (const mode of ['invalid', 'failure', 'unsupported'] as const) {
  test(`${mode} inference preserves terminal room navigation and never fabricates speech`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await mockWorker(page, mode === 'unsupported' ? 'ok' : mode);
    if (mode === 'unsupported') await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
    await start(page, '読む客'); await residents(page);
    if (mode !== 'unsupported') await consent(page);
    await room(page); await command(page, '星の話をしませんか', '<読む客>'); await advance(page, 20);
    expect(await speech(page)).toEqual([]); await command(page, '/WHO', '読む客');
    await command(page, '/LEAVE', '退出'); await noOtherUi(page);
  });
}

test('JSON backup, import and reset preserve transcript and shared authors, then clear OLT baseline', async ({ page }) => {
  await page.clock.install({ time: epoch }); await start(page, '保存する客'); await room(page);
  await command(page, '保存する発言', '<保存する客>'); await command(page, '/LEAVE', '退出');
  const saved = await backup(page), olt = saved.settings.find((s) => s.id === 'olt-rooms')!;
  await command(page, 'JOIN 1', '発言='); await command(page, '変更後', '<保存する客>'); await command(page, '/LEAVE', '退出');
  await restore(page, saved);
  const restored = (await state(page))!;
  const expected = olt.value as unknown as import('../src/olt-state').OltState;
  expect(restored.rooms.map(({ observedAt: _at, ...room }) => room)).toEqual(expected.rooms.map(({ observedAt: _at, ...room }) => room));
  await command(page, 'JOIN 2', '保存する発言'); await command(page, '/LEAVE', '退出');
  await command(page, 'RESET', '初期状態に戻しますか');
  // Approval reloads the page; its old transcript echo can disappear before polling.
  await page.locator('#command').fill('Y'); await page.locator('#command').press('Enter');
  await expect(page.locator('.output')).toContainText('初期状態に戻しました');
  expect((await state(page))!.rooms.every((r) => !r.lines.length && !r.visitors.length)).toBe(true); expect((await snapshot(page)).posts).toHaveLength(82);
});

test('pending OLT generation times out, releases its worker, and keeps navigation usable', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockPendingWorker(page, 'generate'); await start(page, '待つ客');
  await residents(page); await consent(page); await room(page); await command(page, 'こんばんは', '<待つ客>');
  await advance(page, 20); expect(await speech(page)).toEqual([]);
  await command(page, '/WHO', '待つ客'); await command(page, '/LEAVE', '退出');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click(); await expect(page.locator('.ai-status')).toContainText('時間切れ');
});

test('leaving or hiding a tab cancels in-flight inference and never commits its late result', async ({ page }) => {
  await page.clock.install({ time: epoch }); await mockPendingWorker(page, 'generate'); await start(page, '出入りする客');
  await residents(page); await consent(page); await room(page); await command(page, '星の話', '<出入りする客>');
  await advance(page, 5);
  await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork.includes('chatCompletionNonStreaming'))).toBe(true);
  await command(page, '/JOIN 1', '自然の談話室');
  await expect.poll(async () => (await state(page))!.rooms.find((r) => r.id === 'night')!.pending).toBeNull();
  await command(page, '/JOIN 2', '星と道具'); await command(page, 'もう一度こんばんは', '<出入りする客>');
  await advance(page, 5);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(page, 20); expect(await speech(page)).toEqual([]);
  await expect.poll(async () => (await state(page))!.rooms.find((r) => r.id === 'night')!.pending).toBeNull();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await command(page, '/LEAVE', '退出'); await noOtherUi(page);
});

test('presentation reuses forum tokens and safe names for every line kind without writes or record mutation', async () => {
  const data = backupFixture(), original = data.posts[0]!;
  const roomState = emptyOlt(epoch.toISOString()), night = roomState.rooms[1]!;
  // Deliberately unresolved presentation fixtures never pass through storage.
  const ids = ['human', 'ai', 'DEMO0001', 'missing', 'fictional-ai:missing', '<b>key</b>', '01234567-89ab-cdef-0123-456789abcdef', '会員🌌'];
  data.members.push(...[ids[2]!, ids[6]!, ids[7]!].map((id) => ({ id, handle: '同じ名前', actor: 'human' as const })));
  data.members.forEach((m) => { m.handle = '  同じ名前  '; });
  const literal = '  <b>文字</b> fictional-ai:missing <b>key</b> SYN-123  ';
  for (const id of ids) {
    night.visitors.push({ clientId: id, memberId: id, until: '2099-01-01T00:00:00.000Z' });
    for (const kind of ['enter', 'say', 'leave'] as const) appendOlt(night, id, kind, kind === 'say' ? literal : '', kind === 'say' ? 'local-human' : 'local-presence', epoch.getTime());
  }
  let printed: string[] = [];
  const olt = new TerminalOlt({
    read: async () => data,
    repository: async () => ({ observeRoom: async () => roomState }) as never,
    print: (...lines) => printed.push(...lines), navigate: () => {}, oltContext: () => 'daisizen', ai: {} as never,
  });
  const before = structuredClone({ data, roomState });
  await olt.submit('JOIN 2');
  const labels = new Set<string>();
  for (const id of ids) {
    const member = data.members.find((m) => m.id === id);
    const token = member ? renderPost({ ...original, authorId: id }, '照合', undefined, data.members)[1]!.match(/\((SYN-[0-9A-V]{13})\)/)![1] : '不明';
    const name = member ? '同じ名前' : '名無し';
    if (member) labels.add(token);
    expect(printed[1]).toContain(`(${token}) ${name}`);
    expect(printed).toContain(`26年10月21日 22:04:00 (${token}) <${name}> ${literal}`);
    expect(printed).toContain(`26年10月21日 22:04:00 (${token}) * ${name} 入室`);
    expect(printed).toContain(`26年10月21日 22:04:00 (${token}) * ${name} 退室`);
  }
  expect(labels.size).toBe(data.members.length);
  expect(printed[1]).toContain('参加者：8人');
  expect(printed.join('\n')).not.toContain('(DEMO0001)');
  expect({ data, roomState }).toEqual(before);
  const initial = [...printed]; printed = [];
  data.members.reverse(); await olt.submit('/LIST'); expect(printed).toEqual(initial);
  for (const handle of ['', '　 \t', '\u200b', 'first\nsecond', 'fictional-ai:resident', '01234567-89ab-cdef-0123-456789abcdef', 'human']) {
    data.members.find((m) => m.id === 'human')!.handle = handle;
    printed = []; const supplied = structuredClone({ data, roomState });
    await olt.submit('/LIST');
    expect(printed[1]).toContain('(SYN-7MFTMGGA7CMOM) 名無し');
    expect(printed.join('\n')).toContain(`(SYN-7MFTMGGA7CMOM) <名無し> ${literal}`);
    expect(printed.join('\n')).toContain('(SYN-7MFTMGGA7CMOM) * 名無し 入室');
    expect(printed.join('\n')).toContain('(SYN-7MFTMGGA7CMOM) * 名無し 退室');
    expect({ data, roomState }).toEqual(supplied);
  }
  data.members.find((m) => m.id === 'ai')!.handle = '住人の新名';
  printed = []; await olt.submit('/LIST');
  expect(printed.join('\n')).toContain(`(SYN-1L35INK4123BB) <住人の新名> ${literal}`);
  expect(printed.join('\n')).toContain('(SYN-1L35INK4123BB) * 住人の新名 退室');
  data.members.find((m) => m.id === 'human')!.handle = '  <i>新名</i>  ';
  printed = []; await olt.submit('/LIST');
  expect(printed.join('\n')).toContain(`(SYN-7MFTMGGA7CMOM) <<i>新名</i>> ${literal}`);
  printed = []; await olt.submit('/LEAVE'); await olt.submit('WHO 2');
  expect(printed.join('\n')).toContain('(SYN-7MFTMGGA7CMOM) <i>新名</i>');
  expect(printed.join('\n')).not.toMatch(/fictional-ai:missing|<b>key<\/b>|DEMO0001/);
  expect(data.members).toHaveLength(before.data.members.length);
});

test('production OLT speech → WHO → rename → LIST keeps forum identity through reload/restore at 320px', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.setViewportSize({ width: 320, height: 640 });
  await mockWorker(page, 'ok'); await start(page, '同名の客');
  const initial = await snapshot(page);
  const resident = initial.members.find((m) => m.id === 'fictional-ai:hoshimori')!;
  const human = initial.members.find((m) => m.actor === 'human')!;
  // Two real members share a handle; existing IDs and profile settings are retained.
  human.handle = resident.handle;
  await restore(page, initial); await residents(page, true); await consent(page); await room(page);
  const token = (id: string) => renderPost({ ...initial.posts[0]!, authorId: id }, '照合', undefined, initial.members)[1]!.match(/\((SYN-[0-9A-V]{13})\)/)![1];
  const humanToken = token(human.id), residentToken = token(resident.id);
  expect(humanToken).not.toBe(residentToken);
  const literal = `  <b 文字 &lt;b&gt; fictional-ai:hoshimori ${human.id} SYN-123  `;
  // Existing storage rejects complete markup. Keep that contract while checking
  // literal markup-like speech and full markup through the presentation stub.
  await command(page, '<b>文字</b>', '制御文字を含まない');
  const live = await command(page, literal, `(${humanToken}) <${human.handle}> ${literal}`);
  const who = await command(page, '/WHO', '参加者：3人');
  for (const label of [`(${humanToken}) ${human.handle}`, `(${residentToken}) ${resident.handle}`]) expect(who).toContain(label);
  const records = structuredClone((await state(page))!.rooms.find((r) => r.id === 'night')!.lines);
  await command(page, '/HANDLE', 'ハンドル設定'); await command(page, 'RENAME 新しい客', 'ハンドル名を変更');
  await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '元の画面');
  const reread = await command(page, 'JOIN 2', '日時 JST');
  expect(reread).toContain(`(${humanToken}) <新しい客> ${literal}`);
  expect(reread).toContain(`(${humanToken}) * 新しい客 入室`);
  const afterRename = (await state(page))!.rooms.find((r) => r.id === 'night')!.lines;
  expect(afterRename.slice(0, records.length)).toEqual(records);
  expect(afterRename.slice(records.length).map((l) => [l.authorId, l.kind])).toEqual([[human.id, 'leave'], [human.id, 'enter']]);
  const replay = await command(page, '/LIST', '日時 JST');
  expect(replay).toContain(`(${humanToken}) <新しい客> ${literal}`);
  expect((await state(page))!.rooms.find((r) => r.id === 'night')!.lines).toEqual(afterRename);
  expect(await page.locator('.output').textContent()).toContain(live); // Earlier scrollback keeps the old handle.
  await expect(page.locator('.output b')).toHaveCount(0);
  const input = page.locator('#command'), log = page.getByRole('log');
  await input.press('Shift+Tab'); await log.press('ArrowRight');
  await expect.poll(() => log.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await log.press('Tab'); await expect(input).toBeFocused();
  const bounds = (await input.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await command(page, '/LEAVE', '部屋を退出');
  expect(await command(page, 'WHO 2', '参加者')).toContain(`(${residentToken}) ${resident.handle}`);
  const saved = await backup(page);
  const verify = async () => {
    await room(page);
    const output = await command(page, '/LIST', '日時 JST');
    expect(output).toContain(`(${humanToken}) <新しい客> ${literal}`);
    expect(output).toContain(`(${humanToken}) * 新しい客 退室`);
    const stored = (await state(page))!.rooms.find((r) => r.id === 'night')!.lines;
    for (const line of records) expect(stored.find((l) => l.id === line.id)).toEqual(line);
    await command(page, '/MAIN', 'MAIN');
    await enterForum(page); await post(page, 'OLTからの投稿', literal);
    const own = (await snapshot(page)).posts.filter((p) => p.authorId === human.id).at(-1)!;
    expect(await command(page, `READ ${own.number}`, '★内容')).toContain(`★タイトル (${humanToken})`);
    const seed = initial.posts.find((p) => p.authorId === resident.id && p.forumId === own.forumId)!;
    expect(await command(page, `READ ${seed.number}`, '★内容')).toContain(`★タイトル (${residentToken})`);
  };
  await page.reload(); await expect(page.locator('.output')).toContainText('MAIN'); await verify();
  await restore(page, { ...saved, members: [...saved.members].reverse() }); await verify();
  const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
  const exported = await readFile((await (await downloading).path())!, 'utf8');
  expect(exported).toContain(`(${humanToken}) <新しい客> ${literal}`);
  expect(exported).toContain(`★タイトル (${residentToken})`);
  await noOtherUi(page);
});

test('anonymous OLT reading preserves fictional attendance and never invents a human identity', async ({ page }) => {
  await page.clock.install({ time: epoch }); await start(page); const before = await snapshot(page);
  await room(page);
  const who = await command(page, '/WHO', '参加者：');
  expect(who).not.toMatch(/名無し|不明/);
  await command(page, '読むだけ', '発言にはハンドルが必要');
  const replay = await command(page, '/LIST', '日時 JST');
  expect(replay).not.toMatch(/名無し|不明/);
  const after = await snapshot(page);
  expect(after.members).toEqual(before.members);
  expect((await state(page))!.rooms.flatMap((r) => r.visitors)).toEqual([]);
  expect((await state(page))!.rooms.flatMap((r) => r.lines).some((l) => after.members.find((m) => m.id === l.authorId)?.actor === 'human')).toBe(false);
  await command(page, '/LEAVE', '部屋を退出しました。');
});

test('About discloses OLT identity sources, confidence, continuity and reconstructed placement', () => {
  const text = about(backupFixture()).join('\n');
  for (const detail of ['2026-10-24', '1997-12-22', '1994年3月', '1996年11月への継続は中程度',
    '原本と省略された別紙は未回収', 'トークン位置', '現名の再表示', '公開日は未確認',
    'https://www.law.co.jp/cases/pcvan.htm', 'https://someya.sakura.ne.jp/poem/tansi/tansimain.html',
    'https://www.vector.co.jp/soft/win95/net/se024554.html']) expect(text).toContain(detail);
});

test('connection, visible world ticks and resume reconcile all rooms before directory entry without model consent', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '時間の客');
  const initial = await state(page);
  expect(initial!.rooms.every((r) => r.observedAt === epoch.toISOString())).toBe(true);
  expect(initial!.rooms.flatMap((r) => r.lines)).toEqual([]);
  await residents(page);
  await advance(page, 5); // still on MAIN, never visited OLT
  expect((await state(page))!.rooms.flatMap((r) => r.residents)).toHaveLength(2);
  for (const context of ['daisizen', 'wakaba'] as const) {
    await directory(page, context);
    const before = (await state(page))!;
    const roomId = context === 'wakaba' ? 'wakaba' : 'night';
    const target = before.rooms.find((r) => r.id === roomId)!;
    await expect(page.locator('.output')).toContainText(`${context === 'wakaba' ? '1 はじめての談話室' : '2 星と道具の部屋'} / 参加者：${target.residents.length}人`);
    const joined = await command(page, `JOIN ${context === 'wakaba' ? 1 : 2}`, '発言=');
    expect((await state(page))!.rooms.map((r) => r.residents)).toEqual(before.rooms.map((r) => r.residents));
    for (const p of target.residents) {
      const name = (await snapshot(page)).members.find((m) => m.id === p.memberId)!.handle;
      expect(joined).not.toContain(`* ${name} 入室`);
    }
    await command(page, '/WHO', '参加者'); await command(page, '/LIST', '日時 JST');
    expect((await state(page))!.rooms.map((r) => r.residents)).toEqual(before.rooms.map((r) => r.residents));
    await command(page, '/MAIN', 'MAIN');
  }
  const notices = (await state(page))!.rooms.flatMap((r) => r.lines).filter((l) => l.authorId.startsWith('fictional-ai:'));
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenAt = (await state(page))!.rooms[0]!.observedAt;
  await page.clock.setSystemTime(new Date(epoch.getTime() + 24 * 3_600_000));
  await advance(page, 6);
  expect((await state(page))!.rooms[0]!.observedAt).toBe(hiddenAt);
  const input = page.locator('#command'); await input.fill('変換中'); await input.dispatchEvent('compositionstart');
  const transcript = await page.locator('.output').textContent();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await state(page))!.rooms[0]!.observedAt).not.toBe(hiddenAt);
  expect((await state(page))!.rooms.flatMap((r) => r.lines).filter((l) => l.authorId.startsWith('fictional-ai:'))).toEqual(notices);
  expect(await page.locator('.output').textContent()).toBe(transcript);
  await expect(input).toHaveValue('変換中'); await expect(input).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});

for (const mode of ['conversation', 'self-greeting', 'echo'] as const) test(`first visit Japanese chat validates ${mode} output before history or transcript`, async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, mode); await start(page, '初めの客');
  await residents(page); await consent(page); await room(page);
  const human = 'こんにちは、初めてのOLTでドキドキしています';
  await command(page, human, '<初めの客>');
  // A real second visitor's entrance is appended after the human utterance.
  // It must not become the reply target. Append a valid, atomic status fixture.
  await page.evaluate(async () => {
    const dataRequest = indexedDB.open('pcvan-local');
    const db = await new Promise<IDBDatabase>((resolve) => { dataRequest.onsuccess = () => resolve(dataRequest.result); });
    const tx = db.transaction(['settings', 'members'], 'readwrite');
    const request = tx.objectStore('settings').get('olt-rooms');
    request.onsuccess = () => {
      const row = request.result, room = row.value.rooms.find((r: { id: string }) => r.id === 'night');
      tx.objectStore('members').put({ id: 'late-visitor', handle: '後からの客', actor: 'human' });
      room.visitors.push({ clientId: 'late', memberId: 'late-visitor', until: new Date(Date.now() + 45_000).toISOString() });
      const number = room.nextNumber++;
      room.lines.push({ id: `olt:night:${number}`, number, authorId: 'late-visitor', kind: 'enter', text: '', origin: 'local-presence', createdAt: new Date().toISOString() });
      tx.objectStore('settings').put(row);
    };
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  await advance(page, 7);
  await expect.poll(() => page.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)).toBeGreaterThan(0);
  const prompts = await page.evaluate(() => (window as unknown as { journeyWorker: { prompts: { replyTo: { text: string }; addressee: { id: string; handle: string }; speaker: { id: string } }[] } }).journeyWorker.prompts);
  expect(prompts[0]!.replyTo.text).toBe(human);
  expect(prompts[0]!.addressee.handle).toBe('初めの客');
  expect(prompts[0]!.speaker.id).not.toBe(prompts[0]!.addressee.id);
  if (mode === 'conversation') {
    await expect.poll(async () => (await speech(page)).length).toBe(1);
    expect((await speech(page))[0]!.text).toContain('初めの客さん');
    expect((await speech(page))[0]!.text).toContain('双眼鏡');
    await advance(page, 7);
    await expect.poll(async () => (await speech(page)).length).toBeGreaterThanOrEqual(2);
    const lines = await speech(page); expect(lines[1]!.authorId).not.toBe(lines[0]!.authorId);
  } else {
    expect(await speech(page)).toEqual([]);
    await command(page, '/LIST', '日時 JST');
    expect(await page.locator('.output').textContent()).not.toContain('ドキドキワクワク');
    expect((await state(page))!.attempts).toBe(1);
    expect((await state(page))!.rooms.find((r) => r.id === 'night')!.pending).toBeNull();
  }
});

test('the world presence timer cancels an in-flight model turn when its speaker departs', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockPendingWorker(page, 'generate'); await start(page, '見送る客');
  await residents(page); await consent(page); await room(page);
  await command(page, '今夜の星はどうですか', '<見送る客>'); await advance(page, 5);
  await expect.poll(async () => (await state(page))!.rooms[1]!.pending?.authorId).toBeTruthy();
  await page.evaluate(async () => {
    const request = indexedDB.open('pcvan-local');
    const db = await new Promise<IDBDatabase>((resolve) => { request.onsuccess = () => resolve(request.result); });
    const tx = db.transaction('settings', 'readwrite'), get = tx.objectStore('settings').get('olt-rooms');
    get.onsuccess = () => {
      const row = get.result, room = row.value.rooms[1];
      room.residents.find((p: { memberId: string }) => p.memberId === room.pending.authorId).until = new Date(Date.now() + 1000).toISOString();
      tx.objectStore('settings').put(row);
    };
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  await advance(page, 5);
  await expect.poll(async () => (await state(page))!.rooms[1]!.pending).toBeNull();
  expect(await speech(page)).toEqual([]);
  await command(page, '/LEAVE', '退出');
  await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
  await page.locator('.ai-panel > summary').click();
  await expect(page.locator('.ai-status')).not.toContainText('時間切れ');
});
