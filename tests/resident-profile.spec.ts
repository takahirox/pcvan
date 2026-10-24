import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { profileArgument, renderResidentProfile } from '../src/resident-profile';
import { identityToken } from '../src/member-presentation';
import { personas } from '../src/ai/personas';
import { about } from '../src/settings';
import { TerminalOlt } from '../src/olt';
import { emptyOlt } from '../src/olt-state';
import type { Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { command, start, snapshot, restore, noOtherUi } from './terminal-helpers';
import { epoch, directory } from './olt-helpers';
import { mockWorker } from './ai-helpers';

function fixture() {
  const data = backupFixture();
  data.members.push(...personas.map((p) => ({ id: `fictional-ai:${p.id}`, actor: 'ai' as const, handle: p.handle })));
  return data;
}

test('public projection uses actual members, current fields, exact arguments, bounded literal text and no private fields', () => {
  const data = fixture(), member = data.members.find((m) => m.id === 'fictional-ai:hoshimori')!;
  member.handle = '  <b>星  の人</b>  ';
  const profiles = structuredClone([...personas]);
  Object.assign(profiles[0]!, { handle: '古い設定名', occupation: '<i>校正</i>', interests: ['<庭>', '星  空'],
    routine: 'PRIVATE-ROUTINE', profile: 'PRIVATE-INSTRUCTION', affinities: { kusabue: .9 } });
  data.settings.push({ id: 'ai-residents', value: { version: 1, profiles } as never });
  const before = structuredClone(data);
  for (const identity of ['hoshimori', member.id, identityToken(member), identityToken(member).toLowerCase(), '<b>星  の人</b>']) {
    expect(renderResidentProfile(data, identity)).toEqual(['ハンドル：<b>星  の人</b>', `表示ID：${identityToken(member)}`, '職業：<i>校正</i>', '興味：<庭>、星  空']);
  }
  expect(profileArgument('  pRoFiLe   <b>星  の人</b>  ')).toBe('<b>星  の人</b>');
  expect(profileArgument('PROFILE')).toBe(''); expect(profileArgument('PROFILES x')).toBeNull();
  expect(renderResidentProfile(data, '', true)[0]).toContain('/PROFILE');
  expect(renderResidentProfile(data, '')[0]).toContain('使い方：PROFILE');
  expect(data).toEqual(before);
  member.handle = '🌌'.repeat(10000);
  const out = renderResidentProfile(data, 'hoshimori');
  expect(Array.from(out[0]!.slice('ハンドル：'.length))).toHaveLength(80);
  expect(out[0]!.endsWith('…')).toBe(true); expect(member.handle).toBe('🌌'.repeat(10000));
  for (const handle of ['fictional-ai:leak', 'bad\nname', '01234567-89ab-cdef-0123-456789abcdef']) {
    member.handle = handle; expect(renderResidentProfile(data, 'hoshimori')[0]).toBe('ハンドル：名無し');
  }
});

test('reserved keys and tokens precede handles, ambiguity is independent of order and restored absences stay absent', () => {
  const data = fixture(), first = data.members.find((m) => m.id === 'fictional-ai:hoshimori')!, other = data.members.find((m) => m.id === 'fictional-ai:kusabue')!;
  other.handle = 'hoshimori'; expect(renderResidentProfile(data, 'hoshimori')[1]).toContain(identityToken(first));
  other.handle = identityToken(first); expect(renderResidentProfile(data, other.handle)[1]).toContain(identityToken(first));
  first.handle = other.handle = '同名';
  for (const reverse of [false, true]) {
    if (reverse) data.members.reverse();
    expect(renderResidentProfile(data, '同名')[0]).toContain('複数');
    expect(renderResidentProfile(data, identityToken(first))[1]).toContain(identityToken(first));
  }
  data.members.find((m) => m.id === 'human')!.handle = first.handle = '人と同名';
  expect(renderResidentProfile(data, '人と同名')[0]).toContain('複数');
  for (const identity of ['human', '人間', 'AI', 'ai', identityToken(data.members.find((m) => m.id === 'human')), 'missing', 'INET#test@example.invalid']) {
    expect(renderResidentProfile(data, identity)).toEqual(['プロフィールを利用できません。']);
  }
  data.members = data.members.filter((m) => m !== first); other.handle = 'hoshimori';
  expect(renderResidentProfile(data, 'hoshimori')).toEqual(['プロフィールを利用できません。']);
  expect(renderResidentProfile(data, identityToken(first))).toEqual(['プロフィールを利用できません。']);
  other.actor = 'human'; expect(renderResidentProfile(data, 'kusabue')).toEqual(['プロフィールを利用できません。']);
  const before = structuredClone(data); renderResidentProfile(data, 'hoshimori'); expect(data).toEqual(before);
});

for (const contextName of ['daisizen', 'wakaba'] as const) for (const replacement of ['invalidate', 'context', 'reentry'] as const) {
  test(`${contextName} delayed profile never prints after ${replacement} and lookup never observes attendance`, async () => {
    const data = fixture(), state = emptyOlt(epoch.toISOString());
    let context: typeof contextName | null = contextName, delay = false, release!: (data: Backup) => void;
    let printed: string[] = [], observations = 0;
    const olt = new TerminalOlt({ read: () => delay ? new Promise((resolve) => { release = resolve; }) : Promise.resolve(data),
      print: (...lines) => printed.push(...lines), navigate: () => {}, oltContext: () => context,
      repository: async () => ({ observeRoom: async () => { observations++; return state; } }) as never, ai: {} as never });
    await olt.submit('PROFILE hoshimori'); expect(observations).toBe(0);
    await olt.submit('JOIN 1'); const before = observations; printed = [];
    delay = true; const pending = olt.submit('/PROFILE hoshimori');
    if (replacement === 'invalidate') olt.invalidate();
    if (replacement === 'context') context = null;
    if (replacement === 'reentry') { delay = false; await olt.submit('/JOIN 1'); printed = []; }
    release(data); await pending;
    expect(printed).toEqual([]); expect(observations).toBe(before + (replacement === 'reentry' ? 1 : 0));
  });
}

// Exercise TerminalCommands in its existing browser/source-module environment.
test('mail lookup fences reset/restore and context changes; existing prompts own PROFILE input', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const results = await page.evaluate(async (data) => {
    const path = '/src/commands.ts'; const { TerminalCommands } = await import(path);
    const results: unknown[] = [];
    for (const mode of ['reset', 'restore', 'context', 'next-command']) {
      let delayed = false, release!: (data: Backup) => void, box = 'INBOX'; const printed: string[] = [];
      const c = new TerminalCommands({ read: () => delayed ? new Promise((resolve) => { release = resolve; }) : Promise.resolve(data),
        mailbox: () => box ? { box, title: 'mail' } : null, print: (...lines: string[]) => printed.push(...lines), ai: {}, repository: async () => { throw new Error('unexpected repository call'); } });
      delayed = true; const pending = c.submit('PROFILE hoshimori');
      if (mode === 'reset') c.invalidate();
      // The OLT ownership check yields once before the mailbox read.
      while (!release) await Promise.resolve();
      if (mode === 'restore') c.invalidate();
      if (mode === 'context') box = '';
      if (mode === 'next-command') { delayed = false; await c.submit('MEMBERS'); printed.length = 0; }
      release(data); await pending; results.push(printed);
    }
    let printed: string[] = [];
    const c = new TerminalCommands({ read: async () => data, mailbox: () => ({ box: 'INBOX', title: 'mail' }),
      print: (...lines: string[]) => printed.push(...lines), ai: { status: () => [] }, repository: async () => ({ put: () => { throw new Error('unexpected write'); } }), destination: () => null });
    for (const line of ['WRITE hoshimori', 'PROFILE hoshimori', 'PROFILE hoshimori', '.END']) await c.submit(line);
    results.push(printed); printed = []; await c.submit('.CANCEL');
    await c.submit('WRITE'); printed = []; await c.submit('PROFILE hoshimori'); results.push(printed); await c.submit('.CANCEL');
    await c.submit('RESET'); printed = []; await c.submit('PROFILE hoshimori'); results.push(printed); await c.submit('N');
    await c.submit('SETTINGS'); await c.submit('3'); await c.submit('RESIDENTS'); await c.submit('1'); await c.submit('2');
    printed = []; await c.submit('PROFILE hoshimori'); results.push(printed);
    return results;
  }, fixture());
  for (const output of results.slice(0, 4)) expect(output).toEqual([]);
  expect((results[4] as string[]).join('\n')).toContain('件名：PROFILE hoshimori');
  expect((results[5] as string[]).join('\n')).toContain('宛先が見つからない');
  expect((results[6] as string[]).join('\n')).toContain('Y / N');
  expect((results[7] as string[]).join('\n')).toContain('PROFILE hoshimori');
  for (const output of results.slice(5)) expect((output as string[]).join('\n')).not.toContain('職業：');
});

function protectedRecords(data: Backup) { return { ...data, session: null }; }

for (const registered of [false, true]) {
  for (const route of [
    { name: 'MAIN', steps: ['1'], parent: 'ＰＣ－ＶＡＮ' },
    { name: 'old MAIN', steps: ['X'], parent: 'ＰＣ－ＶＡＮ' },
    { name: 'SIG', steps: ['13', '2', 'MAIL'], parent: '大自然' },
  ]) test(`${route.name} ${registered ? 'registered' : 'anonymous'} profile preserves selected mailbox, literal output and composition`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch); await mockWorker(page, 'ok'); await start(page, registered ? '手紙の客' : undefined);
    const data = await snapshot(page), first = data.members.find((m) => m.id === 'fictional-ai:hoshimori')!;
    first.handle = '<b>星  の人</b>';
    data.members.find((m) => m.id === 'fictional-ai:kusabue')!.handle = '🌌'.repeat(1000);
    const profiles = data.settings.find((s) => s.id === 'ai-residents')!.value as unknown as { profiles: { occupation: string; interests: string[] }[] };
    profiles.profiles[0]!.occupation = '<i>校正</i>'; profiles.profiles[0]!.interests = ['<庭>', '星  空'];
    if (registered) {
      const human = data.members.find((m) => m.actor === 'human')!;
      data.mail = [{ id: 'private-profile-test', number: 1, senderId: human.id, recipientId: first.id,
        subject: '非公開の便り', body: 'PRIVATE-MAIL', origin: 'local-human', createdAt: epoch.toISOString() }];
      data.readStates.push({ memberId: human.id, forumId: data.forums[0]!.id, lastReadNumber: 0 });
    }
    await restore(page, data);
    for (const step of route.steps) await command(page, step, 'コマンド=');
    await command(page, 'SENT', '送信済み');
    const before = await snapshot(page);
    expect(await command(page, 'MEMBERS', 'PROFILE')).toContain(`hoshimori / (${identityToken(first)})`);
    for (const identity of ['hoshimori', identityToken(first), '<b>星  の人</b>']) {
      const out = await command(page, `  pRoFiLe ${identity}  `, '職業：<i>校正</i>'); expect(out).toContain('興味：<庭>、星  空'); expect(out).not.toContain('PRIVATE-MAIL');
    }
    await command(page, 'PROFILE kusabue', '🌌'.repeat(79) + '…');
    await command(page, 'PROFILE', '使い方：PROFILE');
    await command(page, 'PROFILE INET#nobody@example.invalid', '利用できません');
    await expect(page.locator('.output b, .output i, .output 庭')).toHaveCount(0);
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    if (registered && route.name === 'MAIN') {
      const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
      const log = await readFile((await (await downloading).path())!, 'utf8');
      expect(log).toContain('職業：<i>校正</i>'); expect(log).toContain('興味：<庭>、星  空'); expect(log).not.toContain('PRIVATE-MAIL');
    }
    expect(await command(page, 'LIST', '送信済み')).toContain('メール一覧');
    await command(page, 'BACK', 'コマンド='); await command(page, 'BACK', route.parent);
    expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
    for (const step of ['MAIN', ...route.steps]) await command(page, step, 'コマンド=');
    await command(page, 'WRITE hoshimori', registered ? '件名=' : '登録しますか');
    if (registered) {
      await command(page, 'PROFILE hoshimori', '本文を1行ずつ'); await command(page, 'PROFILE hoshimori', '本文=');
      expect(await command(page, '.END', '送信しますか')).toContain('件名：PROFILE hoshimori'); await command(page, 'N', '中止');
    } else { await command(page, 'PROFILE hoshimori', 'Y / N'); await command(page, 'N', '登録を中止'); }
    await noOtherUi(page);
  });
  for (const context of ['daisizen', 'wakaba'] as const) test(`${context} ${registered ? 'registered' : 'anonymous'} directory and room lookup preserve attendance and continued reading/speech`, async ({ page }) => {
    await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch); await mockWorker(page, 'ok'); await start(page, registered ? '会話の客' : undefined);
    await directory(page, context); await command(page, 'WHO', '参加者');
    const before = await snapshot(page); await command(page, 'PROFILE hoshimori', '職業：印刷所の校正係');
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
    await command(page, 'LIST', '部屋一覧'); await command(page, 'JOIN 1', '発言='); await command(page, '/WHO', '参加者');
    const joined = await snapshot(page), member = joined.members.find((m) => m.id === 'fictional-ai:hoshimori')!;
    for (const identity of ['hoshimori', identityToken(member), member.handle]) await command(page, `/PROFILE ${identity}`, '職業：印刷所の校正係');
    await command(page, '/PROFILE', '使い方：/PROFILE'); await command(page, '/PROFILE missing', '利用できません');
    expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(joined));
    for (const line of ['PROFILE hoshimori', '//PROFILE hoshimori']) await command(page, line, registered ? `<会話の客> ${line.startsWith('//') ? line.slice(1) : line}` : '発言にはハンドル');
    await command(page, '/LIST', '日時 JST'); await command(page, '/LEAVE', '部屋一覧');
    await command(page, 'BACK', context === 'wakaba' ? '通信が初めて' : '大自然');
    expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
    await noOtherUi(page);
  });
}

test('restored absent residents remain unavailable and About explains the four-field reconstruction', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch); await start(page);
  const data = await snapshot(page); data.members = []; data.posts = []; data.readStates = []; data.mail = []; data.settings = [];
  await restore(page, data); await command(page, '1', '電子メール'); const before = await snapshot(page);
  await command(page, 'PROFILE hoshimori', '利用できません'); await command(page, 'MEMBERS', 'PROFILE');
  expect(protectedRecords(await snapshot(page))).toEqual(protectedRecords(before));
  const text = about(fixture()).join('\n');
  for (const term of ['Issue #115', '4公開項目', 'カテゴリーD', '匿名閲覧', '正確な操作は低確度', 'resident-profile-lookup-issue-115']) expect(text).toContain(term);
});
