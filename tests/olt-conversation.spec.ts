import { expect, test } from '@playwright/test';
import { backupFixture } from './backup-fixture';
import { emptyOlt, appendOlt, iso, validateOlt } from '../src/olt-state';
import { buildOltPrompt, commitOltText, planOltTurn } from '../src/ai/olt';
import { emptyActivity } from '../src/ai/activity';
import { originalPersonas, personaMemberId } from '../src/ai/personas';

const at = Date.parse('2026-10-21T13:04:00Z');
function conversation() {
  const data = backupFixture();
  data.members.push(...originalPersonas.map((p) => ({ id: personaMemberId(p.id), handle: p.handle, actor: 'ai' as const })));
  data.settings.push({ id: 'ai-activity', value: { ...emptyActivity(iso(at)), consent: true } as never });
  const profiles = structuredClone(originalPersonas);
  profiles.forEach((p) => { p.inactivity = 0; p.reply = 1; });
  data.settings.push({ id: 'ai-residents', value: { version: 1, profiles } as never });
  data.members.find((m) => m.id === 'human')!.handle = '月の客';
  data.members.find((m) => m.id === 'fictional-ai:hoshimori')!.handle = '新しい星守';
  const state = emptyOlt(iso(at)), room = state.rooms[1]!;
  room.residents = profiles.slice(0, 2).map((p) => ({ memberId: personaMemberId(p.id), joinedAt: iso(at), until: iso(at + 600_000) }));
  room.visitors = [{ clientId: 'visitor', memberId: 'human', until: iso(at + 45_000) }];
  appendOlt(room, 'human', 'say', 'こんにちは、初めてのOLTでドキドキしています', 'local-human', at);
  return { data, state, room };
}

test('directed prompts keep stable speaker/addressee identities and pending speech through status notices and renames', () => {
  const { data, state, room } = conversation();
  const waiting = structuredClone(room); waiting.residents = [];
  const waitingState = structuredClone(state); waitingState.rooms[1] = waiting;
  expect(planOltTurn(waitingState, waiting, data, at + 9000, 'empty')).toBeUndefined();
  expect(waiting.handledNumber).toBe(0);
  waiting.residents = structuredClone(room.residents);
  appendOlt(waiting, 'fictional-ai:kusabue', 'enter', '', 'local-presence', at + 10_000);
  expect(planOltTurn(waitingState, waiting, data, at + 30_000, 'late')!.targetNumber).toBe(1);
  appendOlt(room, 'fictional-ai:kusabue', 'enter', '', 'local-presence', at + 1000);
  appendOlt(room, 'fictional-ai:hankote', 'leave', '', 'local-presence', at + 2000);
  const turn = planOltTurn(state, room, data, at + 9000, 'human-reply')!;
  expect(turn.targetNumber).toBe(1);
  const prompt = JSON.parse(buildOltPrompt(data, room, turn).user);
  expect(prompt.speaker.id).toBe(turn.authorId); expect(prompt.addressee).toMatchObject({ id: 'human', handle: '月の客', actor: 'human' });
  expect(prompt.speaker.id).not.toBe(prompt.addressee.id);
  expect(prompt.recentSpeech).toEqual([expect.objectContaining({ kind: 'say', speaker: expect.objectContaining({ id: 'human' }) })]);
  expect(prompt.presenceNotices.map((n: { kind: string }) => n.kind)).toEqual(['enter', 'leave']);
  data.members.find((m) => m.id === 'human')!.handle = '月見客';
  expect(JSON.parse(buildOltPrompt(data, room, turn).user).addressee).toMatchObject({ id: 'human', handle: '月見客' });
  commitOltText(room, turn, JSON.stringify({ kind: 'olt', roomId: 'night', personaId: turn.authorId.replace('fictional-ai:', ''),
    text: '月見客さん、ゆっくりどうぞ。今夜は双眼鏡で月の縁を眺めていました。' }), at + 10_000, data);
  room.pending = null;
  const next = planOltTurn(state, room, data, at + 35_000, 'resident-reply')!;
  expect(next.authorId).not.toBe(turn.authorId);
  expect(JSON.parse(buildOltPrompt(data, room, next).user).addressee.id).toBe(turn.authorId);
});

test('Japanese self-address, visitor echoes and nearby rephrase loops are rejected before appending; useful shared terms survive', () => {
  const { data, room } = conversation();
  const turn = { id: 'turn', authorId: 'fictional-ai:hoshimori', modelId: 'test', context: '', until: iso(at + 35_000), targetNumber: 1 };
  const raw = (text: string) => JSON.stringify({ kind: 'olt', roomId: 'night', personaId: 'hoshimori', text });
  const invalid = [
    'こんにちは星守さん、初めてのOLTでドキドキワクワクしています。',
    'こんにちは［新しい星守］、よろしくお願いします。',
    '新しい星守さん、こんにちは。今夜は何を眺めていますか。',
    'こんにちは、初めてのOLTでドキドキワクワクしています。',
    '初めてのOLTで緊張しております。',
    '初めてのOLTでドキドキしていますね。',
  ];
  for (const text of invalid) {
    const before = structuredClone(room);
    expect(() => commitOltText(room, turn, raw(text), at + 10_000, data)).toThrow();
    expect(room).toEqual(before);
  }
  const greetingRoom = structuredClone(room);
  appendOlt(greetingRoom, 'fictional-ai:kusabue', 'say', 'こんばんは。よろしくお願いします。', 'local-ai:webllm:test', at + 1000);
  expect(() => commitOltText(greetingRoom, turn, raw('こんばんは！よろしくお願いします！'), at + 10_000, data)).toThrow();
  appendOlt(room, 'fictional-ai:kusabue', 'say', '今夜は庭の草花を観察しました。小さな芽を見つけると嬉しいですね。', 'local-ai:webllm:test', at + 1000);
  expect(() => commitOltText(room, turn, raw('今夜は庭の草花を観察しています。小さな芽を見つけると嬉しいですね。'), at + 10_000, data)).toThrow();
  expect(() => commitOltText(room, turn, raw('今夜は庭の草花を観察しました。小さな芽を見つけると嬉しいですね。'), at + 10_000, data)).toThrow();
  for (const text of ['そうですね。', '月の客さん、こんにちは。双眼鏡で月の縁を見ていました。',
    '「初めてのOLTでドキドキしています」とのこと、ゆっくり読んでから話しても大丈夫ですよ。',
    '庭の草花は朝露があると写真に撮りやすいですね。何を育てていますか。',
    'こんにちは、新しい星守です。月の観察が好きです。']) {
    const copy = structuredClone(room);
    expect(() => commitOltText(copy, turn, raw(text), at + 10_000, data)).not.toThrow();
  }
});


test('optional persisted corrective retry flag is strictly bounded and legacy turns remain valid', () => {
  const { state, room } = conversation();
  room.pending = { id: 'turn', authorId: room.residents[0]!.memberId, modelId: 'test', context: '', until: iso(at + 30_000), targetNumber: 1 };
  expect(() => validateOlt(state)).not.toThrow();
  room.pending.retry = 1; expect(() => validateOlt(state)).not.toThrow();
  for (const value of [0, 2, -1, '1', null]) {
    room.pending.retry = value as never;
    expect(() => validateOlt(state)).toThrow();
  }
});
