import { expect, test } from '@playwright/test';
import { activityFixture } from './backup-fixture';
import { originalPersonas, personaMemberId } from '../src/ai/personas';
import { emptyActivity, scheduleActivity } from '../src/ai/activity';
import { observeResident } from '../src/ai/observation';
import { appendOlt, emptyOlt, iso, observeOlt, validateOlt } from '../src/olt-state';
import { planOltTurn, commitOltText } from '../src/ai/olt';
import { chooseMail, buildMailPrompt } from '../src/ai/mail';
import { validateActivity } from '../src/storage/schema';

const at = Date.parse('2026-10-21T13:04:00Z');
function world() {
  const data = activityFixture();
  const profiles = structuredClone(originalPersonas).map((p, i) => ({ ...p, frequency: i < 3 ? 1 : 0,
    participation: 1, absence: 0, reply: i === 2 ? 0 : 1, reading: 1, newThread: 0, inactivity: 0,
    preferredBoards: ['forum'], interests: ['観察'], affinities: {},
    weekdayHours: Array.from({ length: 24 }, (_, n) => n), weekendHours: Array.from({ length: 24 }, (_, n) => n) }));
  const activity = { ...emptyActivity(iso(at), 'observed'), consent: true,
    nextDue: Object.fromEntries(profiles.map((p) => [p.id, iso(at)])) };
  data.settings.push({ id: 'ai-residents', value: { version: 1, profiles } as never },
    { id: 'ai-activity', value: activity as never });
  data.posts = [{ ...data.posts[0]!, title: '庭の観察', body: '今日の庭で何を見つけましたか。', createdAt: iso(at) }];
  return { data, profiles, activity };
}

test('a single room event is observed independently: two writers, one listener, bounded queue and no global expiry', () => {
  const { data, profiles } = world();
  const state = emptyOlt(iso(at)), room = state.rooms[0]!;
  room.residents = profiles.slice(0, 3).map((p) => ({ memberId: personaMemberId(p.id), joinedAt: iso(at), until: iso(at + 900_000) }));
  room.visitors = [{ clientId: 'human', memberId: 'human', until: iso(at + 900_000) }];
  const greeting = appendOlt(room, 'human', 'say', 'こんにちは', 'local-human', at);
  const first = planOltTurn(state, room, data, at + 9000, 'first')!;
  expect(first.targetNumber).toBe(greeting.number);
  expect(room.decisions).toHaveLength(1);
  const remaining = room.decisions![0]!;
  expect(remaining.authorId).not.toBe(first.authorId);
  expect(remaining.targetNumber).toBe(greeting.number);
  expect([first.authorId, remaining.authorId]).not.toContain(personaMemberId(profiles[2]!.id));
  commitOltText(room, first, JSON.stringify({ kind: 'olt', roomId: room.id,
    personaId: first.authorId.replace('fictional-ai:', ''), text: 'こんにちは。庭の朝顔に種ができていました。' }), at + 10_000, data);
  room.pending = null;
  const second = planOltTurn(state, room, data, at + 75_000, 'second')!;
  expect(second.authorId).toBe(remaining.authorId);
  expect(second.targetNumber).toBe(greeting.number);
  expect(state.attempts).toBe(2);
  expect(room.handledNumber).toBe(0); // Import field cannot swallow another person's observation.
  validateOlt(state);
  const resumed = structuredClone(state);
  observeOlt(resumed, data, at + 300_000);
  expect(resumed.rooms[0]!.pending).toBeNull();
  expect(resumed.rooms[0]!.decisions).toEqual([]);
});

for (const actor of ['human', 'resident'] as const) test(`forum reading notices one ${actor} topic through the same policy, without a universal delay`, () => {
  const { data, profiles, activity } = world();
  const post = data.posts[0]!;
  if (actor === 'resident') { post.authorId = 'fictional-ai:komadori'; post.origin = 'local-ai:webllm:test'; }
  // Choose reproducible individual readers who are ready in the first three minutes.
  let seed = '';
  for (let i = 0; i < 1000; i++) {
    seed = `read-${i}`;
    if (profiles.slice(0, 2).every((p) => observeResident(p, { id: post.id, service: 'forum', authorId: post.authorId,
      text: post.body, at, interested: true }, seed).readyAt <= at + 180_000)) break;
  }
  activity.seed = seed;
  const planned = scheduleActivity(data, activity, iso(at + 180_000));
  expect(planned).toEqual(scheduleActivity(data, activity, iso(at + 180_000)));
  expect(planned.batch!.runs.map((r) => r.personaId).sort()).toEqual(profiles.slice(0, 2).map((p) => p.id).sort());
  expect(planned.batch!.runs.every((r) => r.replyToPostId === post.id && !r.userResponse)).toBe(true);
  expect(planned.observations![profiles[2]!.id]).toContain(`forum:${post.id}`);
  validateActivity(planned);
  const read = structuredClone(planned);
  read.batch!.runs.forEach((r) => { r.status = 'committed'; });
  const revisited = scheduleActivity(data, read, iso(at + 3_600_000));
  expect(revisited.batch!.runs.every((r) => r.status === 'committed')).toBe(true);
  // A later contribution is new information for the same readers.
  data.posts.push({ ...post, id: 'follow-up', number: 8, replyToPostId: post.id, createdAt: iso(at + 3_600_000) });
  read.nextDue = Object.fromEntries(profiles.map((p) => [p.id, iso(at + 3_600_000)]));
  const later = scheduleActivity(data, read, iso(at + 2 * 3_600_000));
  expect(later.batch!.runs.some((r) => r.replyToPostId === 'follow-up')).toBe(true);
  expect(Object.values(later.observations!).every((events) => events.length <= 96)).toBe(true);
});

test('addressed correspondence can be prompt, silent or later, stays private, and can continue within a day', () => {
  const { data, profiles } = world();
  const resident = 'fictional-ai:hoshimori';
  const letter = { id: 'first-letter', number: 1, senderId: 'human', recipientId: resident,
    subject: '観察', body: '庭で見つけたものを教えてください。', origin: 'local-human', createdAt: iso(at) };
  data.mail = [letter, { ...letter, id: 'secret', number: 2, recipientId: 'fictional-ai:kusabue', body: 'OTHER_PRIVATE_MAIL' }];
  let seed = '';
  for (let i = 0; i < 1000; i++) {
    seed = `letter-${i}`;
    if (observeResident(profiles[0]!, { id: letter.id, service: 'mail', authorId: 'human', text: letter.body,
      at, addressed: true }, seed).readyAt < at + 60_000) break;
  }
  const promptReply = chooseMail(data, profiles[0]!, at + 60_000, seed, [])!;
  expect(promptReply).toEqual({ humanId: 'human', replyToMailId: letter.id });
  expect(buildMailPrompt(data, profiles[0]!.id, promptReply).user).not.toContain('OTHER_PRIVATE_MAIL');
  expect(chooseMail(data, { ...profiles[0]!, reply: 0 }, at + 24 * 3_600_000, seed, [])).toBeNull();
  expect(chooseMail(data, profiles[0]!, at - 1, seed, [])).toBeNull();
  data.mail.push({ ...letter, id: 'reply', number: 3, senderId: resident, recipientId: 'human',
    replyToMailId: letter.id, origin: 'local-ai:webllm:test', createdAt: iso(at + 60_000) });
  data.mail.push({ ...letter, id: 'second-letter', number: 4, createdAt: iso(at + 120_000) });
  expect(chooseMail(data, profiles[0]!, at + 2 * 3_600_000, seed, [])).toEqual({ humanId: 'human', replyToMailId: 'second-letter' });
  data.mail.push({ ...letter, id: 'later', number: 5, createdAt: iso(at + 24 * 3_600_000) });
  expect(chooseMail(data, profiles[0]!, at + 2 * 3_600_000, seed, [])!.replyToMailId).toBe('second-letter');
});

test('one rejected author does not block another, with persisted attempts, private context and atomic duplicate commits', async ({ page }) => {
  await page.clock.setFixedTime(new Date(at)); await page.goto('http://127.0.0.1:14374');
  const { data, activity } = world();
  activity.maxPosts = 2;
  const result = await page.evaluate(async ({ data, activity, now }) => {
    const rp = '/src/storage/repository.ts', bp = '/src/ai/activity-runner.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { runActivityBatch } = await import(bp) as typeof import('../src/ai/activity-runner');
    const repo = await openRepository('independent-queue');
    await repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true });
    const batch = { id: 'queue', from: new Date(Date.parse(now) - 1).toISOString(), to: now, modelId: activity.modelId,
      runs: ['hoshimori', 'kusabue'].map((personaId) => ({ id: `queue:${personaId}`, personaId, forumId: 'forum',
        replyToPostId: 'first', simulatedAt: now, status: 'pending' as const })) };
    const state = { ...activity, batch };
    await repo.put('settings', { id: 'ai-activity', value: state as never });
    let calls = 0; const prompts: string[] = [];
    const engine = { async load() {}, dispose() {}, async generate(prompt: { user: string }) {
      calls++; prompts.push(prompt.user); const request = JSON.parse(prompt.user);
      return calls === 1 ? '{}' : JSON.stringify({ personaId: request.personaId, forumId: request.forumId,
        replyToPostId: request.replyToPostId, title: '観察の続き', body: '土の湿り気を確かめてみました。' });
    } };
    const budget = { attempts: 0, committed: 0 };
    await runActivityBatch(repo, () => repo.exportBackup(), state, engine, new AbortController().signal, budget, () => {});
    const saved = await repo.exportBackup();
    const other = await openRepository('independent-queue');
    const post = saved.posts.find((p) => p.simulation)!;
    const duplicate = await other.commitAiRun(post.id, '{}');
    await repo.replaceFromJson(JSON.stringify(saved), { confirmReplace: true });
    const restored = await repo.exportBackup(); repo.close(); other.close();
    return { calls, prompts, budget, saved, duplicate, restored };
  }, { data, activity, now: iso(at) });
  expect(result.calls).toBe(2);
  expect(result.saved.posts.filter((p) => p.simulation)).toHaveLength(1);
  const saved = result.saved.settings.find((s) => s.id === 'ai-activity')!.value as unknown as typeof activity;
  expect(saved.batch!.runs.map((r) => r.status)).toEqual(['failed', 'committed']);
  expect(saved.allowance).toMatchObject({ attempts: 2, committed: 1 });
  expect(result.duplicate!.id).toBe(saved.batch!.runs[1]!.id);
  expect(result.restored.posts).toEqual(result.saved.posts);
});
