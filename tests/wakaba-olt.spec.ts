import { expect, test } from '@playwright/test';
import { PcvanController } from '../src/navigation';
import { ConnectionController } from '../src/connection';
import { TerminalOlt } from '../src/olt';
import { about } from '../src/settings';
import { emptyOlt, appendOlt } from '../src/olt-state';
import type { OltContext } from '../src/olt-state';
import type { Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { mockWorker, mockPendingWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { command, start, snapshot, noOtherUi, backup, restore } from './terminal-helpers';
import { epoch, state, speech, room, advance, residents } from './olt-helpers';

function protectedRecords(data: Backup) {
  return { ...data, session: null, settings: data.settings.filter((s) => s.id !== 'olt-rooms')
    .map((s) => s.id === 'ai-activity' ? { ...s, value: { ...(s.value as object), lastActivityAt: null } } : s) };
}

test('both controller parents carry a separate OLT context and preserve the beginner board', () => {
  for (const Controller of [PcvanController, ConnectionController]) for (const index of [false, true]) {
    const c = new Controller(); c.submit('HELP'); if (index) c.submit('2');
    const caller = c.submit('HELP'); c.submit('16'); const welcome = c.submit('HELP');
    expect(welcome).toContain('1 はじめての広場'); expect(welcome).toContain('2 OLT');
    const directory = c.submit('2').join('\n');
    expect(c.oltContext).toBe('wakaba'); expect(c.isOlt).toBe(true); expect(c.needsContent).toBe(true);
    expect(c.forum).toBeNull(); expect(c.mailContext).toBeNull(); expect(c.isConference).toBe(false);
    expect(directory).toContain('1 はじめての談話室'); expect(directory).not.toMatch(/自然の談話室|星と道具/);
    expect(c.submit('BACK')).toEqual(welcome); expect(c.oltContext).toBeNull();
    expect(c.submit('BACK')).toEqual(caller);
    c.submit('16'); c.submit('1'); expect(c.forum?.keyword).toBe('LOCAL-WAKABA');
    c.submit('BACK'); c.submit('2'); c.submit('MAIN'); expect(c.screen).toBe('main'); expect(c.oltContext).toBeNull();
  }
});

for (const index of [false, true]) for (const registered of [false, true]) {
  test(`production ${index ? 'index' : 'MAIN'} ${registered ? 'registered' : 'anonymous'} quiet/speaking visit isolates local selectors and records`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, registered ? '初めの客' : undefined);
    const before = await snapshot(page);
    if (index) await command(page, '2', '索引');
    await command(page, '16', '通信が初めて'); const dir = await command(page, '2', '部屋一覧');
    expect(dir).toContain('1 はじめての談話室 / 参加者：0人'); expect(dir).not.toMatch(/自然の談話室|星と道具/);
    for (const input of ['2', 'JOIN 2', 'WHO 2', 'JOIN 3', 'WHO 3', 'JOIN wakaba', 'JOIN 01']) {
      const out = await command(page, input, 'JOIN 1'); expect(out).not.toMatch(/自然の談話室|星と道具/);
    }
    const who = await command(page, 'WHO', '誰もいません'); expect(who).not.toMatch(/自然の談話室|星と道具/);
    await command(page, 'WHO 1', '参加者：0人'); await command(page, 'HELP', '部屋一覧'); await command(page, 'LIST', '部屋一覧');
    await command(page, 'JOIN 1', '発言='); await advance(page, 4);
    await command(page, '/WHO', registered ? '初めの客' : '参加者：0人');
    const invalidMove = await command(page, '/JOIN 2', 'その部屋はありません'); expect(invalidMove).toContain('/JOIN 1');
    await command(page, '/WHO 2', 'その部屋はありません');
    if (registered) {
      for (const input of ['MAIN', 'BACK', 'HELP', 'STOP']) await command(page, input, `<初めの客> ${input}`);
      await command(page, '//LEAVE', '<初めの客> /LEAVE');
      const input = page.locator('#command'); await input.fill('変換中の質問'); await input.dispatchEvent('compositionstart');
      await input.press('Enter'); await advance(page, 2); await expect(input).toHaveValue('変換中の質問');
      expect((await state(page))!.rooms.find((r) => r.id === 'wakaba')!.lines.some((l) => l.text === '変換中の質問')).toBe(false);
      await input.dispatchEvent('compositionend'); await input.press('Enter'); await expect(page.locator('.output')).toContainText('<初めの客> 変換中の質問');
    } else {
      await command(page, '質問してもいいですか', '発言にはハンドル');
      expect((await snapshot(page)).members.some((m) => m.actor === 'human')).toBe(false);
    }
    await command(page, '/LIST', '日時 JST'); await command(page, '/BACK', '部屋一覧');
    await command(page, 'BACK', '通信が初めて'); await command(page, 'BACK', index ? '索引' : '＝＝＝ＰＣ－ＶＡＮ');
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    expect(await speech(page)).toEqual([]);
    const olt = (await state(page))!; expect(olt.rooms.filter((r) => r.id !== 'wakaba').every((r) => r.lines.length === 0 && r.visitors.length === 0)).toBe(true);
    await room(page, 1, 'wakaba'); await command(page, '/LEAVE', '部屋一覧'); await command(page, 'BACK', '通信が初めて');
    const saved = await backup(page); await restore(page, saved); await room(page, 1, 'wakaba');
    await command(page, '/MAIN', '＝＝＝ＰＣ－ＶＡＮ'); await noOtherUi(page);
    expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
  });
}

test('Wakaba two-tab attendance and shared turn arbitration use the shared residents and model', async ({ page, context }) => {
  await page.clock.install({ time: epoch }); await mockWorker(page, 'ok'); await start(page, '同じ初心者');
  await residents(page, false, 'LOCAL-WAKABA:1'); await consent(page); await room(page, 1, 'wakaba');
  const other = await context.newPage(); await other.clock.install({ time: epoch }); await mockWorker(other, 'ok'); await other.goto('/');
  await expect(other.locator('.output')).toContainText('MAIN'); await room(other, 1, 'wakaba');
  const joined = (await state(page))!.rooms.find((r) => r.id === 'wakaba')!;
  expect(joined.visitors).toHaveLength(2); expect(joined.residents).toHaveLength(2);
  expect(joined.lines.filter((l) => l.kind === 'enter' && l.authorId === joined.visitors[0]!.memberId)).toHaveLength(1);
  await command(page, '初めての質問です', '<同じ初心者>');
  await Promise.all([advance(page, 7), advance(other, 7)]);
  await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
  const turns = await speech(page); expect(turns.every((l) => l.id.startsWith('olt:wakaba:'))).toBe(true);
  const generations = await Promise.all([page, other].map((p) => p.evaluate(() => (window as unknown as { journeyWorker: { generations: number } }).journeyWorker.generations)));
  expect(generations.reduce((a, b) => a + b, 0)).toBe(turns.length);
  const who = await command(page, '/WHO', '同じ初心者'); expect(who).toContain('SYN-');
  await command(other, '/LEAVE', '部屋一覧'); await command(page, '/WHO', '同じ初心者');
  expect((await state(page))!.rooms.find((r) => r.id === 'wakaba')!.visitors).toHaveLength(1);
});

for (const action of ['departure', 'settings', 'hidden'] as const) {
  test(`Wakaba pending inference is cancelled on ${action} before another visit`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await mockPendingWorker(page, 'generate'); await start(page, '待つ初心者');
    await residents(page, false, 'LOCAL-WAKABA:1'); await consent(page); await room(page, 1, 'wakaba');
    await command(page, '最初の質問です', '<待つ初心者>'); await advance(page, 5);
    await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork.includes('chatCompletionNonStreaming'))).toBe(true);
    if (action === 'departure') { await command(page, '/LEAVE', '部屋一覧'); await room(page); }
    if (action === 'settings') {
      await command(page, '/HANDLE', 'ハンドル設定'); await command(page, 'RENAME 学ぶ客', '学ぶ客');
      await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '元の画面'); await command(page, 'JOIN 1', '発言=');
    }
    if (action === 'hidden') await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await state(page))!.rooms.find((r) => r.id === 'wakaba')!.pending).toBeNull();
    await advance(page, 20); expect(await speech(page)).toEqual([]);
    expect((await state(page))!.attempts).toBeGreaterThan(0);
  });
}

for (const mode of ['context', 'reentry']) test(`late output is fenced after ${mode} changes`, async () => {
  const data = backupFixture(), saved = emptyOlt(epoch.toISOString()), w = saved.rooms.find((r) => r.id === 'wakaba')!;
  data.settings.push({ id: 'olt-rooms', value: saved as never });
  appendOlt(w, 'human', 'say', '質問', 'local-human', epoch.getTime());
  let context: OltContext | null = 'wakaba', release!: () => void, started!: () => void;
  let committed = 0; const printed: string[] = [];
  const began = new Promise<void>((resolve) => { started = resolve; });
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { visibilityState: 'visible' } });
  const olt = new TerminalOlt({ read: async () => data, oltContext: () => context, print: (...lines) => printed.push(...lines), navigate: () => {},
    repository: async () => ({ observeRoom: async () => saved, claimRoomTurn: async () => ({ id: 'turn', authorId: 'fictional-ai:hoshimori', modelId: 'test', context: '', until: '2099-01-01T00:00:00.000Z' }),
      finishRoomTurn: async (_id: string, _token: string, raw?: string) => { if (raw) committed++; } }) as never,
    ai: { runRoom: async (run: (engine: unknown, signal: AbortSignal) => Promise<void>, signal: AbortSignal) => {
      try { await run({ generate: async () => { started(); await delayed; return '{}'; } }, signal); } catch (e) { if (!signal.aborted) throw e; }
    } } as never,
  });
  try {
    await olt.submit('JOIN 1'); const running = olt.tick(() => false); await began;
    context = 'daisizen';
    if (mode === 'reentry') { await olt.submit('JOIN 1'); context = 'wakaba'; await olt.submit('JOIN 1'); }
    const before = [...printed]; release(); await running;
    expect(committed).toBe(0); expect(printed).toEqual(before);
    context = null; expect(await olt.submit('HELP')).toBe(false); expect(olt.active).toBe(false);
  } finally { if (previous) Object.defineProperty(globalThis, 'document', previous); else Reflect.deleteProperty(globalThis, 'document'); }
});

test('About makes Wakaba capability, uncertainty, reconstruction and compatibility discoverable', () => {
  const text = about(backupFixture()).join('\n');
  for (const term of ['Issue #113', '2026-10-24', 'はじめての談話室', 'wakaba', 'カテゴリーD', '全室共通1時間24試行', '旧2室', '正確な構成は低確度', 'wakaba-beginner-olt-issue-113']) expect(text).toContain(term);
});
