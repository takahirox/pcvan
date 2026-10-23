import { expect, test } from '@playwright/test';
import { renderMail, renderMailList } from '../src/mail';
import { identityToken } from '../src/member-presentation';
import { renderPost } from '../src/forums';
import { validateBackup } from '../src/storage/schema';
import type { Mail, Member } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';

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
      expect(list[1]).toContain(`#3 ${literal} / ${label} / 26年10月20日 10:02:03`);
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
