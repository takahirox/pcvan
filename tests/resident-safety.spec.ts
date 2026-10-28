import { expect, test } from '@playwright/test';
import { activityFixture } from './backup-fixture';
import { personas, personaMemberId } from '../src/ai/personas';
import { emptyActivity, scheduleActivity } from '../src/ai/activity';
import { emptyOlt, appendOlt, iso, observeOlt, validateOltMembers } from '../src/olt-state';
import { planOltTurn, commitOltText } from '../src/ai/olt';
import { validateActivity } from '../src/storage/schema';
import { mockWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { start, command } from './terminal-helpers';
import { epoch, residents, room, advance, speech, state } from './olt-helpers';

const at = epoch.getTime();
test('100 independent readers produce only the two willing authors and bounded durable reading memory', () => {
  const data = activityFixture();
  data.members.push(...personas.slice(10).map((p) => ({ id: personaMemberId(p.id), handle: p.handle, actor: 'ai' as const })));
  const profiles = personas.map((p, i) => ({ ...p, frequency: 1, participation: 1, absence: 0,
    inactivity: 0, reading: 1, reply: i < 2 ? 1 : 0, newThread: 0, preferredBoards: ['forum'],
    weekdayHours: Array.from({ length: 24 }, (_, n) => n), weekendHours: Array.from({ length: 24 }, (_, n) => n) }));
  data.settings.push({ id: 'ai-residents', value: { version: 2, profiles } as never });
  data.posts = [{ ...data.posts[0]!, createdAt: iso(at - 3_600_000) }];
  const previous = { ...emptyActivity(iso(at - 1)), consent: true,
    nextDue: Object.fromEntries(profiles.map((p) => [p.id, iso(at)])) };
  const plan = scheduleActivity(data, previous, iso(at));
  expect(plan.batch!.runs.map((r) => r.personaId).sort()).toEqual(profiles.slice(0, 2).map((p) => p.id).sort());
  expect(Object.keys(plan.observations!)).toHaveLength(100);
  expect(Object.values(plan.observations!).every((seen) => seen.includes('forum:first') && seen.length <= 96)).toBe(true);
  validateActivity(plan);
  expect(() => validateActivity({ ...plan, observations: { unknown: [] } })).toThrow();
  expect(() => validateActivity({ ...plan, observations: { hoshimori: Array.from({ length: 97 }, (_, i) => `event:${i}`) } })).toThrow();
});

test('restore validation rejects an unknown observer without changing the candidate or clearing the current world', async ({ page }) => {
  const data = activityFixture(), rooms = emptyOlt(iso(at));
  rooms.rooms[0]!.observations = { 'fictional-ai:unknown': { number: 0, topicAt: iso(at) } };
  const before = JSON.stringify(rooms);
  expect(() => validateOltMembers(rooms, data.members)).toThrow();
  expect(JSON.stringify(rooms)).toBe(before);
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async ({ data, rooms }) => {
    const rp = '/src/storage/repository.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const repo = await openRepository('observer-import-safety');
    await repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true });
    const before = await repo.exportJson();
    const candidate = { ...data, settings: [...data.settings, { id: 'olt-rooms', value: rooms as never }] };
    let rejected = false;
    try { await repo.replaceFromJson(JSON.stringify(candidate), { confirmReplace: true }); } catch { rejected = true; }
    const intact = await repo.exportJson() === before; repo.close(); return { rejected, intact };
  }, { data, rooms });
  expect(result).toEqual({ rejected: true, intact: true });
});

test('one stalled OLT completion times out and another resident recovers without a second human submission', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'once-slow'); await start(page, '待つ客'); await residents(page); await consent(page); await room(page);
  await command(page, 'こんにちは', '<待つ客>');
  await advance(page, 20);
  await expect.poll(async () => (await speech(page)).length).toBeGreaterThan(0);
  await expect(page.locator('.output')).toContainText((await speech(page))[0]!.text);
  const saved = (await state(page))!;
  expect(saved.attempts).toBeLessThanOrEqual(5);
  expect(saved.rooms[1]!.lines.filter((l) => l.kind === 'say' && l.origin === 'local-human')).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).journeyWorker.loads)).toBe(2);
});


test('residents can begin and answer a fresh topic after a completed exchange without new human speech', () => {
  const data = activityFixture();
  const profiles = personas.slice(0, 10).map((p) => ({ ...p, reply: 1, newThread: 1, inactivity: 0 }));
  data.settings.push({ id: 'ai-residents', value: { version: 1, profiles } as never },
    { id: 'ai-activity', value: { ...emptyActivity(iso(at)), consent: true } as never });
  const saved = emptyOlt(iso(at - 600_000)), room = saved.rooms[0]!;
  room.residents = profiles.slice(0, 2).map((p) => ({ memberId: personaMemberId(p.id), joinedAt: iso(at - 600_000), until: iso(at + 3_600_000) }));
  room.visitors = [{ clientId: 'listener', memberId: 'human', until: iso(at + 3_600_000) }];
  for (let i = 0; i < 3; i++) appendOlt(room, 'fictional-ai:hoshimori', 'say', `前の話題${i}`, 'local-ai:webllm:test', at - 120_000);
  room.observations = Object.fromEntries(room.residents.map((p) => [p.memberId, { number: 3, topicAt: iso(at + 3_600_000) }]));
  const topic = { id: 'new-topic', authorId: 'fictional-ai:hoshimori', modelId: 'test', context: '', until: iso(at + 30_000) };
  commitOltText(room, topic, JSON.stringify({ kind: 'olt', roomId: room.id, personaId: 'hoshimori',
    text: '庭の朝顔に種ができました。皆さんは何を育てていますか。' }), at, data);
  const reply = planOltTurn(saved, room, data, at + 9000, 'peer-reply')!;
  expect(reply.authorId).toBe('fictional-ai:kusabue');
  expect(reply.targetNumber).toBe(4);
  expect(room.lines.some((l) => l.origin === 'local-human')).toBe(false);
});


test('an expired reservation from a lost tab releases its sole resident for current speech', () => {
  const data = activityFixture();
  const profiles = personas.slice(0, 10).map((p, i) => ({ ...p, frequency: i === 0 ? 1 : 0,
    participation: 0, reply: 1, inactivity: 0 }));
  data.settings.push({ id: 'ai-residents', value: { version: 1, profiles } as never },
    { id: 'ai-activity', value: { ...emptyActivity(iso(at)), consent: true } as never });
  const saved = emptyOlt(iso(at)), room = saved.rooms[0]!;
  room.residents = [{ memberId: 'fictional-ai:hoshimori', joinedAt: iso(at - 60_000), until: iso(at + 600_000) }];
  room.visitors = [{ clientId: 'listener', memberId: 'human', until: iso(at + 600_000) }];
  room.pending = { id: 'lost-tab', authorId: 'fictional-ai:hoshimori', modelId: 'test', context: '', until: iso(at - 1) };
  observeOlt(saved, data, at);
  expect(room.pending).toBeNull();
  appendOlt(room, 'human', 'say', 'こんにちは', 'local-human', at);
  expect(planOltTurn(saved, room, data, at + 9000, 'current')!.authorId).toBe('fictional-ai:hoshimori');
});
