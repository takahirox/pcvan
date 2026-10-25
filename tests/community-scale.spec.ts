import { expect, test } from '@playwright/test';
import { personas, originalPersonas, personaMemberId, type ResidentSettings } from '../src/ai/personas';
import { emptyActivity, scheduleActivity, HOUR } from '../src/ai/activity';
import { emptyOlt, observeOlt, appendOlt, iso, MAX_PRESENT } from '../src/olt-state';
import { planOltTurn, buildOltPrompt } from '../src/ai/olt';
import { validateBackup, validateResidents, type Backup } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';

function world(count = 100, seed = 'week'): Backup {
  const data = backupFixture();
  data.members.push(...personas.slice(0, count).map((p) => ({ id: personaMemberId(p.id), handle: p.handle, actor: 'ai' as const })));
  data.sigs[0]!.keyword = 'DAISIZEN';
  data.settings.push({ id: 'ai-residents', value: { version: 2, profiles: structuredClone(personas.slice(0, count)) } as never });
  data.settings.push({ id: 'ai-activity', value: { ...emptyActivity('2026-10-18T15:00:00.000Z', seed), consent: true } as never });
  return data;
}

test('100 authored identities preserve the originals and have varied lives, habits and sparse meaningful ties', () => {
  expect(personas).toHaveLength(100);
  expect(personas.slice(0, 10)).toEqual(originalPersonas);
  for (const key of ['id', 'handle', 'occupation', 'profile', 'routine'] as const)
    expect(new Set(personas.map((p) => p[key])).size).toBe(100);
  expect(personas.filter((p) => p.weekdayHours.length === 0).length).toBeGreaterThanOrEqual(8);
  expect(personas.filter((p) => p.weekendHours.length === 0).length).toBeGreaterThanOrEqual(2);
  expect(personas.filter((p) => (p.sessionMinutes ?? 14) >= 120).length).toBeLessThanOrEqual(5);
  expect(new Set(personas.map((p) => [p.reading, p.newThread, p.reply, p.absence].join(':'))).size).toBeGreaterThanOrEqual(8);
  for (const p of personas) {
    expect(Object.keys(p.affinities).length).toBeLessThanOrEqual(3);
    for (const friend of Object.keys(p.affinities)) expect(personas.some((q) => q.id === friend && q.id !== p.id)).toBe(true);
  }
  validateResidents({ version: 2, profiles: personas });
  validateResidents({ version: 1, profiles: originalPersonas });
  validateBackup(world());
});

test('seeded full JST week has broad hourly encounters, quiet rooms, changing people and repeatable visits', () => {
  const start = Date.parse('2026-10-18T15:00:00Z'); // Monday midnight JST
  const perHour = Array.from({ length: 24 }, () => ({ busy: 0, visits: 0 }));
  const days: number[] = [], all = new Set<string>(), night = new Set<string>(), noon = new Set<string>();
  let encounters = 0, quiet = 0, total = 0, max = 0;
  for (let seed = 0; seed < 8; seed++) {
    const data = world(100, `week-${seed}`);
    for (let day = 0; day < 7; day++) for (let hour = 0; hour < 24; hour++) {
      const at = start + (day * 24 + hour) * HOUR + 4 * 60_000;
      const state = emptyOlt(iso(at)); observeOlt(state, data, at);
      const before = JSON.stringify(state); observeOlt(state, data, at); expect(JSON.stringify(state)).toBe(before);
      const present = state.rooms.flatMap((r) => r.residents.map((p) => p.memberId));
      expect(new Set(present).size).toBe(present.length); max = Math.max(max, present.length);
      for (const id of present) { all.add(id); if (hour < 5) night.add(id); if (hour >= 10 && hour < 15) noon.add(id); }
      days[day] = (days[day] ?? 0) + present.length;
      for (const room of state.rooms) {
        total++; perHour[hour]!.visits++;
        if (room.residents.length) { encounters++; perHour[hour]!.busy++; } else quiet++;
      }
      observeOlt(state, data, at + 60_000);
      expect(state.rooms.flatMap((r) => r.residents).length).toBeLessThanOrEqual(MAX_PRESENT);
    }
  }
  const rates = perHour.map((h) => h.busy / h.visits);
  console.log('PRESENCE', JSON.stringify({ encounterRate: encounters / total, minHourly: Math.min(...rates), quiet, max,
    distinct: all.size, nightOnly: [...night].filter((id) => !noon.has(id)).length, days, rates }));
  expect(encounters / total).toBeGreaterThan(.7);
  expect(Math.min(...rates)).toBeGreaterThan(.45);
  expect(quiet).toBeGreaterThan(0); expect(max).toBeLessThanOrEqual(32);
  expect(all.size).toBeGreaterThan(85);
  expect([...night].filter((id) => !noon.has(id)).length).toBeGreaterThan(12);
  expect(Math.abs(days[0]! / 5 - days[6]! / 5)).toBeGreaterThan(5);
});

for (const hour of [3, 8, 13, 22]) test(`present interested OLT resident gets a turn within seconds at ${hour}:00 JST`, () => {
  const at = Date.parse('2026-10-20T15:00:00Z') + hour * HOUR;
  const data = world(), profiles = (data.settings.find((s) => s.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles as typeof personas;
  const p = { ...profiles[0]!, weekdayHours: [hour], weekendHours: [hour], inactivity: 0, reply: 1 };
  (profiles as ResidentSettings['profiles'])[0] = p;
  const state = emptyOlt(iso(at)), room = state.rooms[1]!;
  room.visitors.push({ clientId: 'human', memberId: 'human', until: iso(at + 45_000) });
  room.residents.push({ memberId: personaMemberId(p.id), joinedAt: iso(at), until: iso(at + 120_000) });
  appendOlt(room, 'human', 'say', '星の観察はどう始めればいいですか', 'local-human', at);
  // An arrival must not swallow an unanswered human utterance.
  appendOlt(room, personaMemberId(profiles[1]!.id), 'enter', '', 'local-presence', at + 1000);
  expect(planOltTurn(state, room, data, at + 7000, 'early')).toBeUndefined();
  const turn = planOltTurn(state, room, data, at + 9000, 'reply')!;
  expect(turn.authorId).toBe(personaMemberId(p.id)); expect(state.attempts).toBe(1);
  expect(buildOltPrompt(data, room, turn).user.length).toBeLessThan(6000);
  expect(turn.context.length).toBeLessThan(256);
  expect(planOltTurn(state, room, data, at + 10_000, 'duplicate')).toBeUndefined();
});

test('forum attention is topical, bounded, deterministic and separate from sleeping, quiet or exhausted residents', () => {
  const at = Date.parse('2026-10-21T03:00:00Z'), from = iso(at), now = iso(at + 120_000);
  const data = world(), profiles = structuredClone(personas);
  // One fitting daytime reader, one unrelated person, one sleeping specialist.
  for (const p of profiles) p.frequency = 0;
  Object.assign(profiles[1]!, { frequency: 1, absence: 0, participation: 1, reply: 1, inactivity: 0, weekdayHours: [12] });
  Object.assign(profiles[2]!, { frequency: 1, absence: 0, participation: 1, reply: 1, inactivity: 0, weekdayHours: [0], interests: ['庭'] });
  Object.assign(profiles[8]!, { frequency: 1, absence: 0, participation: 1, reply: 1, inactivity: 0, weekdayHours: [12] });
  (data.settings.find((s) => s.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles = profiles;
  const parent = { ...data.posts[0]!, id: 'fresh', title: '庭の草木', body: '庭の草木を観察しています', createdAt: from, number: 7 };
  data.posts = [parent];
  const state = { ...emptyActivity(from, 'attention'), consent: true,
    allowance: { windowAt: from, attempts: 12, responses: 0, committed: 4 } };
  const plan = scheduleActivity(data, state, now);
  expect(scheduleActivity(data, state, iso(at + 30_000)).batch).toBeNull();
  expect(plan).toEqual(scheduleActivity(data, state, now));
  expect(plan.batch!.runs).toHaveLength(1);
  expect(plan.batch!.runs[0]).toMatchObject({ userResponse: true, personaId: 'kusabue', replyToPostId: parent.id });
  expect(scheduleActivity(data, { ...state, allowance: { ...state.allowance, responses: 6 } }, now).batch).toBeNull();
  profiles[1]!.weekdayHours = [0];
  expect(scheduleActivity(data, state, now).batch).toBeNull();
  profiles[1]!.weekdayHours = [12]; profiles[1]!.reply = 0;
  expect(scheduleActivity(data, state, now).batch).toBeNull();
  profiles[1]!.reply = 1;
  const off = scheduleActivity(data, { ...state, consent: false }, now);
  expect(off.batch).toBeNull();
  expect(scheduleActivity(data, plan, iso(at + 15 * 60_000)).batch).toBeNull();
});

test('human attention commits once across connections, survives JSON/reload, and retains its own exhausted allowance', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T03:02:00Z'));
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const rp = '/src/storage/repository.ts', pp = '/src/ai/personas.ts', ap = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { residentProfiles } = await import(pp) as typeof import('../src/ai/personas');
    const { runActivityBatch } = await import(ap) as typeof import('../src/ai/activity-runner');
    let repo = await openRepository('attention-atomic'); await repo.openActivity();
    const human = await repo.createHumanMember('庭を見る人');
    const model = (await repo.openActivity()).modelId;
    const profiles = structuredClone(residentProfiles(await repo.exportBackup()));
    for (const p of profiles) p.frequency = 0;
    Object.assign(profiles[1]!, { frequency: 1, participation: 1, absence: 0, reply: 1, inactivity: 0, weekdayHours: [12] });
    await repo.put('settings', { id: 'ai-residents', value: { version: 2, profiles } as never });
    await repo.authorizeModel(model);
    const post = await repo.createPost({ forumId: 'resident-forum:DAISIZEN:1', authorId: human.id,
      title: '庭の草木', body: '庭の観察を教えてください。', origin: 'local-human' });
    const backdated = await repo.exportBackup();
    backdated.posts.find((p) => p.id === post.id)!.createdAt = '2026-10-21T03:00:00.000Z';
    await repo.replaceFromJson(JSON.stringify(backdated), { confirmReplace: true });
    const other = await openRepository('attention-atomic');
    const plans = await Promise.all([repo.openActivity(), other.openActivity()]);
    const run = plans[0].batch!.runs.find((r) => r.userResponse)!;
    let calls = 0;
    const engine = { async load() {}, dispose() {}, async generate(prompt: { user: string }) {
      calls++; const p = JSON.parse(prompt.user);
      return JSON.stringify({ personaId: p.personaId, forumId: p.forumId, replyToPostId: p.replyToPostId,
        title: '葉の様子', body: '葉の色と土の湿り気を一緒に見てみるとよさそうです。' });
    } };
    await Promise.all([repo, other].map((connection) => navigator.locks.request('attention-test-shared-worker', { ifAvailable: true }, async (lock) => {
      if (lock) await runActivityBatch(connection, () => connection.exportBackup(), plans[0], engine,
        new AbortController().signal, { attempts: 12, committed: 4 }, () => {});
    })));
    const saved = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(saved), { confirmReplace: true }); other.close(); repo.close();
    repo = await openRepository('attention-atomic');
    const reloaded = await repo.openActivity();
    // A new post must not replenish the persisted response allowance.
    const state = { ...reloaded, allowance: { ...reloaded.allowance!, responses: 6 } };
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    const capped = await repo.openActivity();
    const after = await repo.exportBackup(); repo.close();
    return { plans, run, calls, saved, reloaded, capped, after };
  });
  expect(result.plans[0].batch).toEqual(result.plans[1].batch);
  expect(result.run.personaId).toBe('kusabue'); expect(result.calls).toBe(1);
  expect(result.saved.posts.filter((p) => p.simulation)).toHaveLength(1);
  expect(result.saved.posts.find((p) => p.id === result.run.id)!.replyToPostId).toBe(result.run.replyToPostId);
  expect(result.reloaded.allowance!.responses).toBe(1); expect(result.capped.allowance!.responses).toBe(6);
  expect(result.after.posts).toEqual(result.saved.posts);
});

test('a removed v2 member stays absent from planning and OLT even with an active saved profile', () => {
  const data = world(), at = Date.parse('2026-10-21T03:00:00Z');
  const profiles = (data.settings.find((s) => s.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles;
  for (const p of profiles) p.frequency = 0;
  Object.assign(profiles.find((p) => p.id === 'ginka')!, { frequency: 3, participation: 1, absence: 0,
    weekdayHours: Array.from({ length: 24 }, (_, i) => i), weekendHours: Array.from({ length: 24 }, (_, i) => i),
    reading: 0, inactivity: 0, reply: 0, newThread: 1 });
  data.members = data.members.filter((m) => m.id !== 'fictional-ai:ginka');
  const state = { ...emptyActivity(iso(at), 'removed'), consent: true };
  expect(scheduleActivity(data, state, iso(at + 72 * HOUR)).batch).toBeNull();
  const olt = emptyOlt(iso(at)); observeOlt(olt, data, at);
  expect(olt.rooms.flatMap((r) => r.residents)).toEqual([]);
  validateBackup(data);
});

test('spontaneous OLT turns leave reserved capacity for human speech and consent still gates speech', () => {
  const data = world(), at = Date.parse('2026-10-21T13:00:00Z');
  const profiles = (data.settings.find((s) => s.id === 'ai-residents')!.value as unknown as ResidentSettings).profiles;
  Object.assign(profiles[0]!, { reply: 1, inactivity: 0 });
  const state = emptyOlt(iso(at)), room = state.rooms[1]!;
  state.attempts = 16; state.organicAttempts = 16;
  room.visitors = [{ clientId: 'a', memberId: 'human', until: iso(at + 45_000) }];
  room.residents = [{ memberId: 'fictional-ai:hoshimori', joinedAt: iso(at), until: iso(at + 120_000) }];
  appendOlt(room, 'human', 'enter', '', 'local-presence', at);
  expect(planOltTurn(state, room, data, at + 12_000, 'spontaneous')).toBeUndefined();
  appendOlt(room, 'human', 'say', '星の観察', 'local-human', at + 12_000);
  const ai = data.settings.find((s) => s.id === 'ai-activity')!;
  (ai.value as unknown as import('../src/storage/schema').AiActivity).consent = false;
  expect(planOltTurn(state, room, data, at + 21_000, 'no-consent')).toBeUndefined();
  (ai.value as unknown as import('../src/storage/schema').AiActivity).consent = true;
  expect(planOltTurn(state, room, data, at + 21_000, 'human')!.authorId).toBe('fictional-ai:hoshimori');
  expect(state.attempts).toBe(17); expect(state.organicAttempts).toBe(16);
});

test('individual visit boundaries, absence and live event times stay staggered over multiple seeded days', () => {
  const start = Date.parse('2026-10-18T15:00:00Z');
  for (const seed of ['timeline-a', 'timeline-b', 'timeline-c']) {
    const data = world(100, seed), state = emptyOlt(iso(start));
    // Metadata presence needs no model consent or speech allowance.
    (data.settings.find((s) => s.id === 'ai-activity')!.value as unknown as import('../src/storage/schema').AiActivity).consent = false;
    const visits = new Map<string, { id: string; start: number; end: number }>();
    const events = new Map<string, { at: number; kind: string; id: string }>();
    const days = new Map<string, Set<number>>();
    let validLeases = true;
    for (let elapsed = 0; elapsed <= 48 * HOUR; elapsed += 60_000) {
      const at = start + elapsed;
      observeOlt(state, data, at);
      for (const room of state.rooms) {
        for (const p of room.residents) {
          const visit = { id: p.memberId, start: Date.parse(p.joinedAt), end: Date.parse(p.until) };
          visits.set(`${p.memberId}:${p.joinedAt}`, visit);
          validLeases &&= visit.start <= at && visit.end > at;
          const seen = days.get(p.memberId) ?? new Set<number>(); seen.add(Math.floor((at - start) / HOUR / 24)); days.set(p.memberId, seen);
        }
        for (const l of room.lines) events.set(l.id, { at: Date.parse(l.createdAt), kind: l.kind, id: l.authorId });
      }
    }
    expect(validLeases).toBe(true);
    expect(visits.size).toBeGreaterThan(200);
    expect(new Set([...visits.values()].map((v) => v.end - v.start)).size).toBeGreaterThan(150);
    expect([...visits.values()].every((v) => v.start % 60_000 !== 0 && v.end % 60_000 !== 0)).toBe(true);
    expect([...visits.values()].some((v) => v.end - v.start > HOUR)).toBe(true);
    expect([...visits.values()].some((v) => v.end - v.start < 10 * 60_000)).toBe(true);
    expect([...days.values()].some((d) => d.size === 1)).toBe(true);
    const byBoundary = new Map<number, number>();
    const boundaries = new Set([...visits.values()].flatMap((v) => [`${v.id}:enter:${v.start}`, `${v.id}:leave:${v.end}`]));
    let honestEvents = true;
    for (const e of events.values()) {
      byBoundary.set(e.at, (byBoundary.get(e.at) ?? 0) + 1);
      // Every printed event uses the actual lease boundary, never the sweep time.
      honestEvents &&= boundaries.has(`${e.id}:${e.kind}:${e.at}`);
    }
    expect(honestEvents).toBe(true);
    expect(Math.max(...byBoundary.values())).toBe(1);
    const before = JSON.stringify(state); observeOlt(state, data, start + 48 * HOUR);
    expect(JSON.stringify(state)).toBe(before);
    const lines = state.rooms.map((r) => r.lines);
    observeOlt(state, data, start + 96 * HOUR);
    expect(state.rooms.map((r) => r.lines)).toEqual(lines); // no historical crowd on wake
    const resumed = JSON.stringify(state); observeOlt(state, data, start + HOUR);
    expect(JSON.stringify(state)).toBe(resumed); // clock reversal never replays
  }
});
