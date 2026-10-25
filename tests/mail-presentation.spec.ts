import { expect, test } from '@playwright/test';
import { renderMail, renderMailList } from '../src/mail';
import { identityToken } from '../src/member-presentation';
import { renderPost } from '../src/forums';
import { validateBackup } from '../src/storage/schema';
import type { Mail, Member } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';
import { serviceDate } from '../src/calendar';

test('sent status means unknown until confirmation and formats the durable commitment instant without changing content', () => {
  const members: Member[] = [{ id: 'human', handle: '手紙の主', actor: 'human' },
    { id: 'fictional-ai:hoshimori', handle: '星守', actor: 'ai' }];
  const calendar = { version: 1 as const, sourceAnchor: '2026-10-21T00:00:00.000Z' };
  const parent: Mail = { id: 'parent', number: 1, senderId: 'human', recipientId: members[1]!.id,
    subject: '  星の便り  ', body: '  日本語\n\n　ｶﾅ  ', createdAt: calendar.sourceAnchor, origin: 'local-human' };
  const confirmed: Mail = { ...parent, recipientConfirmation: { at: '2026-10-22T02:03:04.000Z',
    replyMailId: 'reply', provenance: 'local-resident-reply-v1' } };
  for (const row of [parent, confirmed]) {
    const before = structuredClone(row);
    const list = renderMailList([row], members, 'human', 'SENT', calendar).join('\n');
    const detail = renderMail(row, members, [row], calendar);
    expect(list).toContain(row.recipientConfirmation ? '[既読確認あり]' : '[既読確認なし]');
    expect(detail).toContain(row.recipientConfirmation
      ? `既読確認：${serviceDate(row.recipientConfirmation.at, calendar)} (JST)` : '既読確認：確認なし');
    expect(detail).toContain(`件名：${parent.subject}`); expect(detail).toContain(parent.body);
    expect([...detail, list].join('\n')).not.toMatch(/未読|local-resident|replyMailId|2026-10-/);
    expect(row).toEqual(before);
  }
  const incoming: Mail = { ...parent, id: 'reply', number: 2, senderId: members[1]!.id, recipientId: 'human', replyToMailId: 'parent' };
  expect(renderMail(incoming, members, [parent, incoming], calendar).join('\n')).not.toContain('既読確認');
  expect(renderMailList([incoming], members, 'human', 'INBOX', calendar).join('\n')).toContain('[未読]');
});

test('mail parties share forum tokens, refresh safe names and preserve literal content and source records', () => {
  const data = backupFixture();
  data.members.push({ id: 'DEMO0001', handle: '同名', actor: 'human' }, { id: '会員🌌', handle: '同名', actor: 'human' });
  const ids = [...data.members.map((m) => m.id), 'missing', 'fictional-ai:missing', '<b>key</b>', '01234567-89ab-cdef-0123-456789abcdef'];
  data.members.forEach((m) => { m.handle = '  同名  '; });
  const literal = '  <b>文字</b> fictional-ai:missing SYN-123  ';
  const letter: Mail = { id: 'letter', number: 3, senderId: 'ai', recipientId: 'human', subject: literal,
    body: `${literal}\n\n　ｶﾅ  `, createdAt: '2026-10-21T00:00:00.000Z', origin: 'local-ai:webllm:test',
    simulation: { runId: 'letter', simulatedAt: '2026-10-20T01:02:03.000Z', fictional: true } };
  const tokens = new Set<string>();
  for (const id of ids) {
    const member = data.members.find((m) => m.id === id);
    const token = identityToken(member), label = `(${token}) ${member ? '同名' : '名無し'}`;
    if (member) {
      tokens.add(token);
      expect(renderPost({ ...data.posts[0]!, authorId: id }, '照合', undefined, data.members)[1]).toContain(`(${token})`);
    }
    for (const box of ['INBOX', 'SENT'] as const) {
      const row = { ...letter, ...(box === 'INBOX' ? { senderId: id } : { senderId: 'human', recipientId: id }) };
      const before = structuredClone({ data, row });
      const list = renderMailList([row], data.members, 'human', box);
      expect(list[1]).toContain(`#3 ${literal} / ${label} / 2026年10月20日 10:02:03`);
      if (box === 'INBOX') expect(list[1]).toContain('[未読]');
      const detail = renderMail(row, data.members, [row]);
      expect(detail[box === 'INBOX' ? 1 : 2]).toBe(`${box === 'INBOX' ? '差出人' : '宛先'}：${label}`);
      expect(detail).toContain(`件名：${literal}`); expect(detail).toContain(row.body);
      expect({ data, row }).toEqual(before);
      data.members.reverse();
      expect(renderMailList([row], data.members, 'human', box)).toEqual(list);
      expect(renderMail(row, data.members, [row])).toEqual(detail);
    }
  }
  expect(tokens.size).toBe(data.members.length);
  for (const handle of ['', '　 \t', '\u200b', 'first\nsecond', 'fictional-ai:resident', '01234567-89ab-cdef-0123-456789abcdef', 'human']) {
    data.members.find((m) => m.id === 'human')!.handle = handle;
    const before = structuredClone(data);
    expect(renderMail(letter, data.members, [letter])[2]).toBe('宛先：(SYN-7MFTMGGA7CMOM) 名無し');
    expect(data).toEqual(before);
  }
  data.members.find((m) => m.id === 'human')!.handle = '  <i>新名</i>  ';
  data.members.find((m) => m.id === 'ai')!.handle = '住人の新名';
  expect(renderMail(letter, data.members, [letter]).slice(1, 3)).toEqual([
    '差出人：(SYN-1L35INK4123BB) 住人の新名', '宛先：(SYN-7MFTMGGA7CMOM) <i>新名</i>',
  ]);
  expect(renderMail(letter, [], [letter]).slice(1, 3)).toEqual(['差出人：(不明) 名無し', '宛先：(不明) 名無し']);
  expect(renderMail({ ...letter, senderId: 'DEMO0001' }, [], [letter])[1]).toBe('差出人：(不明) 名無し');
  // Defensive rendering must not weaken import reference validation.
  expect(() => validateBackup({ ...backupFixture(), mail: [{ ...letter, senderId: 'missing' }] })).toThrow();
});

test('directory uses current member names and new/reply drafts pin the resolved ID and label through edits and save retry', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const results = await page.evaluate(async (fixture) => {
    const path = '/src/commands.ts';
    const { TerminalCommands } = await import(path);
    const results = [];
    for (const reply of [false, true]) {
      const data = structuredClone(fixture);
      const resident: Member = { id: 'fictional-ai:hoshimori', handle: '同名', actor: 'ai' };
      const other: Member = { id: 'fictional-ai:kusabue', handle: '同名', actor: 'ai' };
      data.members.push(resident, other);
      const received: Mail = { id: 'incoming', number: 1, senderId: resident.id, recipientId: 'human', subject: '便り', body: '本文',
        origin: 'local-ai:webllm:test', createdAt: '2026-10-21T00:00:00.000Z',
        simulation: { runId: 'incoming', simulatedAt: '2026-10-21T00:00:00.000Z', fictional: true } };
      data.mail = [received];
      let printed: string[] = [];
      const saved: Record<string, unknown>[] = [];
      const commands = new TerminalCommands({ read: async () => data, print: (...lines: string[]) => printed.push(...lines),
        repository: async () => ({ createHumanMail: async (draft: Record<string, unknown>) => {
          saved.push(structuredClone(draft)); if (saved.length === 1) throw new Error('quota'); return { number: 2 };
        } }), navigate: () => {}, mailbox: () => ({ box: 'INBOX', title: 'メール' }), ai: {},
      });
      await commands.submit('MEMBERS'); const directory = [...printed]; printed = [];
      await commands.submit(reply ? 'REPLY 1' : 'WRITE hoshimori'); const opening = [...printed]; printed = [];
      // Change names/order after resolution; the composer owns the selected identity.
      resident.handle = '住人の新名'; other.handle = 'hoshimori'; data.members.reverse();
      data.members.find((m) => m.id === 'human')!.handle = '人間の新名';
      if (!reply) await commands.submit('  件名  ');
      await commands.submit('  本文  '); await commands.submit('.END'); const review = [...printed]; printed = [];
      await commands.submit('Y'); const failure = [...printed]; printed = [];
      await commands.submit('EDIT'); await commands.submit('LINE 1   修正  ');
      printed = []; await commands.submit('REVIEW'); const editedReview = [...printed]; printed = [];
      await commands.submit('Y'); await commands.submit('Y'); const sent = [...printed]; printed = [];
      const original = JSON.stringify(data);
      await commands.submit('MEMBERS'); const renamedDirectory = [...printed]; printed = [];
      other.handle = other.id;
      await commands.submit('MEMBERS'); const safeDirectory = [...printed];
      other.handle = 'hoshimori';
      results.push({ reply, directory, opening, review, failure, editedReview, saved, sent, renamedDirectory, safeDirectory,
        unchanged: JSON.stringify(data) === original });
    }
    return results;
  }, backupFixture());
  const token = (id: string) => identityToken({ id: `fictional-ai:${id}`, handle: '同名', actor: 'ai' });
  const label = `(${token('hoshimori')}) 同名`;
  for (const result of results) {
    expect(result.directory).toContain(`hoshimori / ${label}`);
    expect(result.directory).toContain(`kusabue / (${token('kusabue')}) 同名`);
    expect(result.directory.join('\n')).not.toContain('星守'); // Profile still carries its original name.
    expect(result.opening).toContain(`MAIL / ${label}`);
    expect(result.review).toContain(`宛先：${label}`);
    expect(result.failure.join('\n')).toContain('入力は残っています');
    expect(result.editedReview).toContain(`宛先：${label}`);
    expect(result.saved).toHaveLength(2);
    expect(result.saved[1]).toEqual({ ...result.saved[0], body: '  修正  ' });
    expect(result.saved[1]).toMatchObject({ senderId: 'human', recipient: 'fictional-ai:hoshimori',
      subject: result.reply ? 'Re: 便り' : '  件名  ', ...(result.reply ? { replyToMailId: 'incoming' } : {}) });
    expect(result.sent.join('\n')).toContain('メール #2 を送信しました');
    expect(result.renamedDirectory).toContain(`hoshimori / (${token('hoshimori')}) 住人の新名`);
    expect(result.safeDirectory).toContain(`kusabue / (${token('kusabue')}) 名無し`);
    expect(result.unchanged).toBe(true);
  }
});

test('committed external save consumes its pinned draft even when refresh fails', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (data) => {
    const cp = '/src/commands.ts';
    const { TerminalCommands } = await import(cp);
    const printed: string[] = [], saved: Record<string, unknown>[] = [];
    const commands = new TerminalCommands({ read: async () => { if (saved.length) throw new Error('refresh'); return data; },
      print: (...lines: string[]) => printed.push(...lines), mailbox: () => ({ box: 'INBOX', title: 'メール' }),
      repository: async () => ({ createHumanMail: async (draft: Record<string, unknown>) => { saved.push(draft); return { number: 1 }; } }), ai: {},
    });
    await commands.submit('WRITE INET#Case@Letters.example.invalid');
    data.members.push({ id: 'fictional-ai:hoshimori', handle: 'INET#Case@Letters.example.invalid', actor: 'ai' });
    await commands.submit('件名'); await commands.submit('本文'); await commands.submit('.END');
    await commands.submit('EDIT'); await commands.submit('LINE 1 修正本文'); await commands.submit('REVIEW');
    await commands.submit('Y');
    // No second save is available after commit, even if a later command cannot refresh.
    try { await commands.submit('Y'); } catch { /* read remains unavailable */ }
    return { saved, printed };
  }, backupFixture());
  expect(result.saved).toHaveLength(1);
  expect(result.saved[0]).toMatchObject({ recipient: 'INET#Case@Letters.example.invalid', body: '修正本文' });
  expect(result.printed.join('\n')).toContain('メール #1 をこのブラウザー内に保存しました');
  expect(result.printed.join('\n')).not.toContain('保存できませんでした');
});

test('incoming external sender has its own address, sample label, recipient and date without a synthetic sender', () => {
  const members: Member[] = [{ id: 'human', handle: '秋の読者', actor: 'human' }];
  const calendar = { version: 1 as const, sourceAnchor: '2026-10-21T00:00:00.000Z' };
  const letter: Mail = { id: 'sample', number: 1, senderInternetAddress: 'observer@letters.example.invalid', recipientId: 'human',
    subject: '  秋の夜  ', body: '  本文\n\n　ｶﾅ  ', createdAt: calendar.sourceAnchor, origin: 'local-sample:internet-letter-v1' };
  const before = structuredClone(letter);
  const list = renderMailList([letter], members, 'human', 'INBOX', calendar).join('\n');
  expect(list).toContain('observer@letters.example.invalid'); expect(list).toContain('宛先：(SYN-'); expect(list).toContain('秋の読者');
  expect(list).toContain('[未読]'); expect(list).toContain('創作サンプル'); expect(list).toContain('2026年10月21日 09:00:00');
  const detail = renderMail(letter, members, [letter], calendar);
  expect(detail[1]).toBe('差出人：observer@letters.example.invalid'); expect(detail[2]).toContain('秋の読者');
  expect(detail).toContain(`件名：${letter.subject}`); expect(detail).toContain(letter.body);
  expect(detail.join('\n')).toContain('実際のネットワーク受信ではありません');
  expect(detail.join('\n')).not.toMatch(/不明|既読確認/); expect(letter).toEqual(before);
  expect(renderMailList([letter], members, 'other', 'INBOX', calendar)[0]).toBe('メール一覧：0件');
});

test('multi selection pins safe identities, rejects duplicate aliases/ambiguity and retains all labels through edit and retry', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (data) => {
    const path = '/src/commands.ts', { TerminalCommands } = await import(path);
    const residents: Member[] = [
      { id: 'fictional-ai:hoshimori', handle: '同名', actor: 'ai' },
      { id: 'fictional-ai:kusabue', handle: '同名', actor: 'ai' },
    ];
    data.members.push(...residents);
    let printed: string[] = []; const saved: Record<string, unknown>[] = [], navigation: string[] = [];
    const commands = new TerminalCommands({ read: async () => data, print: (...lines: string[]) => printed.push(...lines),
      repository: async () => ({ createHumanMultiMail: async (draft: Record<string, unknown>) => {
        saved.push(structuredClone(draft)); if (saved.length === 1) throw new Error('quota'); return [{ number: 4 }, { number: 5 }];
      } }), navigate: (line: string) => navigation.push(line), mailbox: () => ({ box: 'INBOX', title: 'メール' }), ai: {},
    });
    await commands.submit('WRITE-MULTI'); const ownsSelection = !commands.recordsHistory && !commands.applicationOutput('ai');
    await commands.submit('同名'); const ambiguity = [...printed]; printed = [];
    await commands.submit('hoshimori');
    residents[0]!.handle = '改名'; residents[1]!.handle = 'hoshimori'; data.members.reverse();
    await commands.submit('fictional-ai:hoshimori'); const duplicate = [...printed]; printed = [];
    await commands.submit('kusabue'); await commands.submit('MAIN');
    await commands.submit('.END'); const opening = [...printed]; printed = [];
    residents[1]!.handle = '二人目の改名';
    await commands.submit('件名'); await commands.submit('本文'); await commands.submit('.END'); const review = [...printed]; printed = [];
    await commands.submit('Y'); await commands.submit('EDIT'); await commands.submit('LINE 1 修正');
    printed = []; await commands.submit('REVIEW'); const edited = [...printed]; printed = [];
    await Promise.all([commands.submit('Y'), commands.submit('Y')]); const success = [...printed];
    return { ownsSelection, ambiguity, duplicate, opening, review, edited, success, saved, navigation, historyAfter: commands.recordsHistory };
  }, backupFixture());
  const label1 = `(${identityToken({ id: 'fictional-ai:hoshimori' } as Member)}) 同名`;
  const label2 = `(${identityToken({ id: 'fictional-ai:kusabue' } as Member)}) hoshimori`;
  expect(result.ownsSelection).toBe(true); expect(result.historyAfter).toBe(true);
  expect(result.ambiguity.join('\n')).toContain('選択は保持'); expect(result.duplicate.join('\n')).toContain('その住人は選択済み');
  for (const output of [result.opening, result.review, result.edited]) {
    expect(output).toContain(`宛先：${label1}`); expect(output).toContain(`宛先：${label2}`);
    expect(output.join('\n')).not.toContain('二人目の改名');
  }
  expect(result.navigation).toEqual([]); expect(result.saved).toHaveLength(2);
  expect(result.saved[1]).toEqual({ ...result.saved[0], body: '修正' });
  expect(result.saved[1]).toMatchObject({ senderId: 'human', recipientIds: ['fictional-ai:hoshimori', 'fictional-ai:kusabue'] });
  expect(result.success.join('\n')).toContain(`メール #4 → ${label1}`); expect(result.success.join('\n')).toContain(`メール #5 → ${label2}`);
});

test('multi committed save consumes every copy after refresh or output failure; invalidate discards pending selection reads', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (data) => {
    const path = '/src/commands.ts', { TerminalCommands } = await import(path);
    data.members.push({ id: 'fictional-ai:hoshimori', handle: '星守', actor: 'ai' }, { id: 'fictional-ai:kusabue', handle: '草笛', actor: 'ai' });
    const results = [];
    for (const failOutput of [false, true]) {
      const saved: unknown[] = [], outputs: string[] = [];
      const commands = new TerminalCommands({
        read: async () => { if (saved.length) throw new Error('refresh'); return data; },
        print: (...lines: string[]) => { if (failOutput && lines.some((l) => l.includes('READ 2 で確認'))) throw new Error('render'); outputs.push(...lines); },
        repository: async () => ({ createHumanMultiMail: async (draft: unknown) => { saved.push(draft); return [{ number: 1 }, { number: 2 }]; } }),
        mailbox: () => ({ box: 'SENT', title: 'メール' }), ai: {},
      });
      for (const line of ['WRITE-MULTI', 'hoshimori', 'kusabue', '.END', '件名', '本文', '.END']) await commands.submit(line);
      try { await commands.submit('Y'); } catch { /* post-commit output failure */ }
      try { await commands.submit('Y'); } catch { /* refresh still unavailable */ }
      results.push({ saved, outputs, recordable: commands.recordsHistory });
    }
    let release!: () => void, hold = false;
    const outputs: string[] = [], saved: unknown[] = [];
    const commands = new TerminalCommands({ read: async () => { if (hold) await new Promise<void>((resolve) => { release = resolve; }); return data; },
      print: (...lines: string[]) => outputs.push(...lines), mailbox: () => ({ box: 'SENT', title: 'メール' }), ai: {},
      repository: async () => ({ createHumanMultiMail: async (draft: unknown) => { saved.push(draft); return []; } }),
    });
    await commands.submit('WRITE-MULTI'); hold = true;
    const pending = commands.submit('hoshimori'); commands.invalidate(); release(); await pending;
    hold = false; await commands.submit('.END'); await commands.submit('Y');
    return { results, saved, outputs, recordable: commands.recordsHistory };
  }, backupFixture());
  for (const r of result.results) {
    expect(r.saved).toHaveLength(1); expect(r.recordable).toBe(true); expect(r.outputs.join('\n')).not.toContain('保存できませんでした');
  }
  expect(result.saved).toEqual([]); expect(result.recordable).toBe(true);
  expect(result.outputs.join('\n')).toContain('世界が変更されました');
  expect(result.outputs.join('\n')).not.toContain('選択済み：');
});

test('multi save waiting for a repository cannot write after controller invalidation', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (data) => {
    const path = '/src/commands.ts', { TerminalCommands } = await import(path);
    data.members.push({ id: 'fictional-ai:hoshimori', handle: '星守', actor: 'ai' }, { id: 'fictional-ai:kusabue', handle: '草笛', actor: 'ai' });
    let release!: (value: unknown) => void; const saved: unknown[] = [];
    const commands = new TerminalCommands({ read: async () => data, print: () => {}, mailbox: () => ({ box: 'SENT', title: 'メール' }), ai: {},
      repository: () => new Promise((resolve) => { release = resolve; }),
    });
    for (const line of ['WRITE-MULTI', 'hoshimori', 'kusabue', '.END', '件名', '本文', '.END']) await commands.submit(line);
    const pending = commands.submit('Y'); commands.invalidate();
    release({ createHumanMultiMail: async (draft: unknown) => { saved.push(draft); return []; } }); await pending;
    return { saved, recordable: commands.recordsHistory };
  }, backupFixture());
  expect(result.saved).toEqual([]); expect(result.recordable).toBe(true);
});
