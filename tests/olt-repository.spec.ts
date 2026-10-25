import { expect, test } from '@playwright/test';
import type { LocalRepository } from '../src/storage/repository';

declare global { interface Window { oltRepo: LocalRepository } }
const now = '2026-10-21T13:04:00.000Z';
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(now) }); await page.goto('http://127.0.0.1:14374');
  await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    window.oltRepo = await (await import(path)).openRepository('olt-world');
    await window.oltRepo.openActivity(); await window.oltRepo.createHumanMember('話す人');
  });
});

test('bounded monotonic lines, same-identity leases, atomic failure, strict restore, legacy import and epoch fencing', async ({ page }) => {
  const result = await page.evaluate(async (now) => {
    const repo = window.oltRepo;
    const path = '/src/olt-state.ts', rp = '/src/storage/repository.ts';
    const { oltState, validateOlt } = await import(path) as typeof import('../src/olt-state');
    const other = await (await import(rp)).openRepository('olt-world') as LocalRepository;
    const original = await repo.exportBackup(), human = original.members.find((m) => m.actor === 'human')!;
    await Promise.all([repo.observeRoom('tab-a', 'night', human.id, now), other.observeRoom('tab-b', 'night', human.id, now)]);
    const joined = oltState(await repo.exportBackup());
    await repo.observeRoom('tab-b', undefined, undefined, now);
    const left = oltState(await repo.exportBackup());
    for (let i = 0; i < 220; i++) await repo.speakRoom('night', 'tab-a', `発言 ${i}`, now);
    const before = await repo.exportBackup();
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings' && value.id === 'olt-rooms') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    let quota = '';
    try { await repo.speakRoom('night', 'tab-a', '失敗した発言', now); } catch (e) { quota = (e as { code: string }).code; }
    finally { IDBObjectStore.prototype.put = native; }
    const preserved = await repo.exportBackup();
    const invalid: unknown[] = [];
    const goodState = oltState(before);
    for (const change of [
      (s: typeof goodState) => { s.version = 9 as never; },
      (s: typeof goodState) => { s.rooms[0]!.id = 'night'; },
      (s: typeof goodState) => { s.attempts = 25; },
      (s: typeof goodState) => { s.rooms[1]!.lines[0]!.authorId = 'missing'; },
      (s: typeof goodState) => { s.rooms[1]!.lines[0]!.origin = 'local-ai:webllm:fake'; },
      (s: typeof goodState) => { s.rooms[1]!.lines[0]!.id = 'wrong'; },
      (s: typeof goodState) => { s.rooms[1]!.lines[0]!.text = '\u001b[2J'; },
      (s: typeof goodState) => { s.rooms[1]!.lines[0]!.createdAt = 'yesterday'; },
      (s: typeof goodState) => { s.rooms[1]!.visitors[0]!.memberId = 'fictional-ai:hoshimori'; },
      (s: typeof goodState) => { s.rooms[1]!.lines.push(s.rooms[1]!.lines[0]!); },
    ]) {
      const backup = structuredClone(before), state = oltState(backup); change(state);
      backup.settings.find((s) => s.id === 'olt-rooms')!.value = state as never;
      try { await repo.replaceFromJson(JSON.stringify(backup), { confirmReplace: true }); invalid.push(false); } catch { invalid.push(true); }
    }
    let referenced = false;
    try { await repo.delete('members', human.id); } catch { referenced = true; }
    await repo.replaceFromJson(JSON.stringify(before), { confirmReplace: true });
    const restored = await repo.exportBackup();
    let stale = '';
    try { await other.speakRoom('night', 'tab-b', 'stale', now); } catch (e) { stale = (e as { code: string }).code; }
    other.close();
    const legacy = structuredClone(original); delete legacy.mail;
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    await repo.observeRoom('new-tab', 'lounge', human.id, now);
    const migrated = await repo.exportBackup(); validateOlt(oltState(migrated));
    await repo.resetWorld({ confirmReset: true });
    return { joined, left, before, quota, preserved, invalid, referenced, restored, stale, migrated, reset: await repo.exportBackup() };
  }, now);
  expect(result.joined.rooms[1]!.visitors).toHaveLength(2); expect(result.joined.rooms[1]!.lines.filter((l) => l.kind === 'enter')).toHaveLength(1);
  expect(result.left.rooms[1]!.lines.some((l) => l.kind === 'leave')).toBe(false);
  const retained = result.before.settings.find((s) => s.id === 'olt-rooms')!.value as unknown as import('../src/olt-state').OltState;
  expect(retained.rooms[1]!.lines).toHaveLength(200); expect(retained.rooms[1]!.nextNumber).toBe(222);
  expect(retained.rooms[1]!.lines.at(-1)!.id).toBe('olt:night:221');
  expect(result.quota).toBe('quota'); expect(result.preserved).toEqual(result.before);
  expect(result.invalid).toEqual(Array(10).fill(true)); expect(result.referenced).toBe(true);
  expect(result.restored).toEqual(result.before); expect(result.stale).toBe('stale');
  expect(result.migrated.posts).toEqual(result.before.posts); expect(result.migrated.mail).toEqual([]);
  expect(result.reset.settings.some((s) => s.id === 'olt-rooms')).toBe(false);
});

for (const roomId of ['night', 'wakaba'] as const) {
  const roomIndex = roomId === 'night' ? 1 : 2;

  test(`transactional turn reservations, persistent independent budget, privacy, duplicate commit and withdrawn consent (${roomId})`, async ({ page }) => {
    const result = await page.evaluate(async ({ now, roomId, roomIndex }) => {
      const repo = window.oltRepo, rp = '/src/storage/repository.ts', op = '/src/olt-state.ts', ap = '/src/ai/olt.ts';
      const { oltState, iso } = await import(op) as typeof import('../src/olt-state');
      const { buildOltPrompt } = await import(ap) as typeof import('../src/ai/olt');
      const other = await (await import(rp)).openRepository('olt-world') as LocalRepository;
      const initial = await repo.exportBackup(), human = initial.members.find((m) => m.actor === 'human')!;
      await repo.createHumanMail({ id: 'private-1', senderId: human.id, recipient: 'hoshimori', subject: 'TOP_SECRET', body: 'PRIVATE_CORRESPONDENCE' });
      let ai = await repo.authorizeModel((await repo.openActivity()).modelId);
      const profiles = initial.settings.find((r) => r.id === 'ai-residents')!;
      const residents = (profiles.value as unknown as import('../src/ai/personas').ResidentSettings).profiles;
      residents.forEach((r) => { r.reply = 1; r.inactivity = 0; r.participation = 0; r.weekdayHours = [22]; });
      await repo.put('settings', profiles);
      const at = Date.parse(now);
      await repo.observeRoom('human-tab', roomId, human.id, now);
      await repo.speakRoom(roomId, 'human-tab', '星の話', now);
      let state = oltState(await repo.exportBackup());
      state.rooms[roomIndex]!.residents = [{ memberId: 'fictional-ai:hoshimori', joinedAt: now, until: iso(at + 60_000) }];
      await repo.put('settings', { id: 'olt-rooms', value: state as never });
      const claims = await Promise.all([repo.claimRoomTurn(roomId, iso(at + 10_000)), other.claimRoomTurn(roomId, iso(at + 10_000))]);
      const turn = claims.find(Boolean)!;
      const snapshot = await repo.exportBackup(); state = oltState(snapshot);
      const prompt = buildOltPrompt(snapshot, state.rooms[roomIndex]!, turn);
      const raw = JSON.stringify({ kind: 'olt', roomId, personaId: 'hoshimori', text: '星の光がきれいですね。' });
      await Promise.all([repo.finishRoomTurn(roomId, turn.id, raw, undefined, iso(at + 11_000)), other.finishRoomTurn(roomId, turn.id, raw, undefined, iso(at + 11_000))]);
      const committed = oltState(await repo.exportBackup());
      // Replay cannot append a second line. Cancellation also consumes an attempt.
      await repo.finishRoomTurn(roomId, turn.id, raw, undefined, iso(at + 12_000));
      state = oltState(await repo.exportBackup()); state.attempts = 24;
      state.rooms[roomIndex]!.handledNumber = 0; state.rooms[roomIndex]!.nextTurnAt = now;
      await repo.put('settings', { id: 'olt-rooms', value: state as never });
      const capped = await repo.claimRoomTurn(roomId, iso(at + 20_000));
      await repo.speakRoom(roomId, 'human-tab', '別の星', iso(at + 20_000));
      state = oltState(await repo.exportBackup()); state.attempts = 0;
      await repo.put('settings', { id: 'olt-rooms', value: state as never });
      const withdrawn = await repo.claimRoomTurn(roomId, iso(at + 30_000));
      ai = await repo.configureActivity(0, ai.modelId, iso(at + 30_000));
      if (withdrawn) await repo.finishRoomTurn(roomId, withdrawn.id, raw, undefined, iso(at + 31_000));
      // A model change separately withdraws consent while a turn is reserved.
      await repo.configureActivity(5, ai.modelId, iso(at + 32_000));
      await repo.observeRoom('human-tab', roomId, human.id, iso(at + 32_000));
      await repo.speakRoom(roomId, 'human-tab', '同意変更前の質問', iso(at + 32_000));
      const pending = await repo.claimRoomTurn(roomId, iso(at + 42_000));
      const pp = '/src/ai/personas.ts'; const { models } = await import(pp) as typeof import('../src/ai/personas');
      const changed = await repo.configureActivity(5, models.find((m) => m.id !== ai.modelId)!.id, iso(at + 42_000));
      if (pending) await repo.finishRoomTurn(roomId, pending.id, raw, undefined, iso(at + 43_000));
      const after = await repo.exportBackup(); other.close();
      return { claims, prompt, committed, capped, withdrawn, pending, changed, after, initial, ai };
    }, { now, roomId, roomIndex });
    expect(result.claims.filter(Boolean)).toHaveLength(1);
    expect(result.prompt.user).not.toMatch(/TOP_SECRET|PRIVATE_CORRESPONDENCE|private-1/);
    expect(JSON.parse(result.prompt.user).recentSpeech).toHaveLength(1);
    expect(result.committed.rooms[roomIndex]!.lines.filter((l) => l.origin.startsWith('local-ai:'))).toHaveLength(1);
    expect(result.capped).toBeUndefined(); expect(result.withdrawn).toBeTruthy();
    expect(result.pending).toBeTruthy(); expect(result.changed.consent).toBe(false);
    const after = result.after.settings.find((s) => s.id === 'olt-rooms')!.value as unknown as import('../src/olt-state').OltState;
    expect(after.rooms[roomIndex]!.lines.filter((l) => l.origin.startsWith('local-ai:'))).toHaveLength(1);
    expect(result.after.posts).toEqual(result.initial.posts);
    expect(result.ai.batch).toBeNull();
  });
}
test('legacy ten-resident evening routines retain quiet visits and repeatable attendance', async ({ page }) => {
  const result = await page.evaluate(async (now) => {
    const op = '/src/olt-state.ts';
    const { emptyOlt, observeOlt } = await import(op) as typeof import('../src/olt-state');
    const repo = window.oltRepo, content = await repo.exportBackup();
    await repo.authorizeModel((await repo.openActivity()).modelId);
    const data = await repo.exportBackup(), activity = data.settings.find((s) => s.id === 'ai-activity')!;
    const roster = data.settings.find((s) => s.id === 'ai-residents')!;
    (roster.value as any).profiles = (roster.value as any).profiles.slice(0, 10);
    (roster.value as any).version = 1;
    const counts: number[] = [], duplicates: boolean[] = [], offHours: number[] = [];
    for (let i = 0; i < 100; i++) {
      (activity.value as unknown as import('../src/storage/schema').AiActivity).seed = `evening-${i}`;
      const state = emptyOlt(now); observeOlt(state, data, Date.parse(now));
      const before = JSON.stringify(state); observeOlt(state, data, Date.parse(now));
      duplicates.push(before === JSON.stringify(state)); counts.push(state.rooms.flatMap((r) => r.residents).length);
      const noon = '2026-10-21T03:04:00.000Z'; const day = emptyOlt(noon); observeOlt(day, data, Date.parse(noon));
      offHours.push(day.rooms.flatMap((r) => r.residents).length);
    }
    return { counts, duplicates, offHours, content };
  }, now);
  expect(result.counts.some((n) => n === 0)).toBe(true);
  expect(result.counts.filter((n) => n >= 2).length).toBeGreaterThan(20);
  expect(result.counts.every((n) => n < 10)).toBe(true);
  expect(result.duplicates.every(Boolean)).toBe(true);
  expect(result.offHours.every((n) => n <= 1)).toBe(true);
});

for (const roomId of ['night', 'wakaba'] as const) {
  const roomIndex = roomId === 'night' ? 1 : 2;

  test(`OLT prompts bound public context and malformed, impersonated or repeated model output never appends (${roomId})`, async ({ page }) => {
    const result = await page.evaluate(async ({ now, roomId, roomIndex }) => {
      const op = '/src/olt-state.ts', ap = '/src/ai/olt.ts';
      const { emptyOlt, appendOlt } = await import(op) as typeof import('../src/olt-state');
      const { buildOltPrompt, commitOltText } = await import(ap) as typeof import('../src/ai/olt');
      const content = await window.oltRepo.exportBackup(), state = emptyOlt(now), room = state.rooms[roomIndex]!;
      const human = content.members.find((m) => m.actor === 'human')!;
      room.residents.push({ memberId: 'fictional-ai:hoshimori', joinedAt: now, until: '2026-10-21T13:10:00.000Z' });
      for (let i = 0; i < 20; i++) appendOlt(room, human.id, 'say', `${i}${'星'.repeat(399)}`, 'local-human', Date.parse(now));
      const turn = { id: 'turn', authorId: 'fictional-ai:hoshimori', modelId: 'test-model', context: '', until: '2026-10-21T13:10:00.000Z' };
      const prompt = buildOltPrompt(content, room, turn);
      const good = { kind: 'olt', personaId: 'hoshimori', roomId, text: '星を見つけたんですね。' };
      const invalid = ['{}', JSON.stringify({ ...good, personaId: ['hoshimori'] }), JSON.stringify({ ...good, personaId: 'kusabue' }),
        JSON.stringify({ ...good, roomId: 'lounge' }), JSON.stringify({ ...good, text: '\u001b[2J' }),
        JSON.stringify({ ...good, text: '<b>hello</b>' }), JSON.stringify({ ...good, text: '星'.repeat(401) }),
        JSON.stringify({ ...good, text: 'line\nbreak' }), JSON.stringify({ ...good, unknown: true }),
        JSON.stringify({ ...good, text: room.lines.at(-1)!.text })];
      const before = room.lines.length;
      const failures = invalid.map((raw) => { try { commitOltText(room, turn, raw, Date.parse(now)); return false; } catch { return true; } });
      const after = room.lines.length;
      commitOltText(room, turn, JSON.stringify(good), Date.parse(now));
      return { prompt, failures, before, after, final: room.lines.at(-1)! };
    }, { now, roomId, roomIndex });
    const prompt = JSON.parse(result.prompt.user);
    expect(prompt.recentSpeech).toHaveLength(12); expect(prompt.recentSpeech.every((l: { text: string }) => l.text.length <= 160)).toBe(true);
    expect(prompt.publicMemory.length).toBeLessThanOrEqual(3);
    expect(result.failures).toEqual(Array(10).fill(true)); expect(result.after).toBe(result.before);
    expect(result.final).toMatchObject({ authorId: 'fictional-ai:hoshimori', kind: 'say', origin: 'local-ai:webllm:test-model' });
  });
}
test('world reconciliation is atomic across tabs, keeps honest event order and rolls back rejected Japanese output', async ({ page }) => {
  const result = await page.evaluate(async (now) => {
    const repo = window.oltRepo, rp = '/src/storage/repository.ts', op = '/src/olt-state.ts';
    const { oltState, iso } = await import(op) as typeof import('../src/olt-state');
    const other = await (await import(rp)).openRepository('olt-world') as LocalRepository;
    const at = Date.parse(now);
    const first = await Promise.all([repo.reconcileOlt(now), other.reconcileOlt(now)]);
    const content = await repo.exportBackup(), row = content.settings.find((s) => s.id === 'ai-residents')!;
    const profiles = (row.value as unknown as import('../src/ai/personas').ResidentSettings).profiles;
    profiles.forEach((p) => { p.participation = 0; p.reply = 1; p.inactivity = 0; });
    await repo.put('settings', row);
    const state = oltState(content), room = state.rooms[1]!;
    state.rooms.forEach((r) => { r.residents = []; });
    room.residents = [{ memberId: 'fictional-ai:hoshimori', joinedAt: now, until: iso(at + 30_000) },
      { memberId: 'fictional-ai:kusabue', joinedAt: now, until: iso(at + 7000) }];
    await repo.put('settings', { id: 'olt-rooms', value: state as never });
    await repo.authorizeModel((await repo.openActivity()).modelId);
    const human = content.members.find((m) => m.actor === 'human')!;
    await repo.observeRoom('human', 'night', human.id, now);
    await repo.speakRoom('night', 'human', 'こんにちは、初めてのOLTでドキドキしています', now);
    const turn = await repo.claimRoomTurn('night', iso(at + 10_000));
    const before = await repo.exportBackup();
    let rejected = false;
    try { await repo.finishRoomTurn('night', turn!.id, JSON.stringify({ kind: 'olt', roomId: 'night', personaId: 'hoshimori',
      text: 'こんにちは星守さん、初めてのOLTでドキドキワクワクしています。' }), undefined, iso(at + 11_000)); } catch { rejected = true; }
    const unchanged = JSON.stringify(before) === JSON.stringify(await repo.exportBackup());
    await repo.finishRoomTurn('night', turn!.id);
    const departures = await Promise.all([repo.reconcileOlt(iso(at + 31_000)), other.reconcileOlt(iso(at + 31_000))]);
    const saved = await repo.exportBackup();
    const native = IDBObjectStore.prototype.put;
    let quota = '';
    try {
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === 'settings' && value.id === 'olt-rooms') throw new DOMException('quota', 'QuotaExceededError');
        return key === undefined ? native.call(this, value) : native.call(this, value, key);
      };
      try { await repo.reconcileOlt(iso(at + 40_000)); } catch (e) { quota = (e as { code: string }).code; }
    } finally { IDBObjectStore.prototype.put = native; }
    const preserved = JSON.stringify(saved) === JSON.stringify(await repo.exportBackup());
    other.close();
    return { first, rejected, unchanged, departures, saved, quota, preserved };
  }, now);
  expect(result.first[0]).toEqual(result.first[1]);
  expect(result.first[0]!.rooms.flatMap((r) => r.lines)).toEqual([]);
  expect(result.rejected).toBe(true); expect(result.unchanged).toBe(true);
  expect(result.departures[0]).toEqual(result.departures[1]);
  const room = result.departures[0]!.rooms[1]!;
  expect(room.lines.filter((l) => l.kind === 'leave').map((l) => l.createdAt)).toEqual(['2026-10-21T13:04:07.000Z', '2026-10-21T13:04:30.000Z']);
  expect(room.lines.some((l) => l.origin.startsWith('local-ai:'))).toBe(false);
  expect(new Set(room.lines.map((l) => l.id)).size).toBe(room.lines.length);
  expect(result.departures[0]!.attempts).toBe(1);
  expect(result.quota).toBe('quota'); expect(result.preserved).toBe(true);
});

test('generation completion reconciles arrivals and departures before speech and cancels a departed speaker', async ({ page }) => {
  const result = await page.evaluate(async (now) => {
    const repo = window.oltRepo, op = '/src/olt-state.ts', ap = '/src/ai/activity.ts';
    const { emptyOlt, oltState, iso } = await import(op) as typeof import('../src/olt-state');
    const { random } = await import(ap) as typeof import('../src/ai/activity');
    await repo.authorizeModel((await repo.openActivity()).modelId);
    const content = await repo.exportBackup(), roster = content.settings.find((s) => s.id === 'ai-residents')!;
    const profiles = (roster.value as unknown as import('../src/ai/personas').ResidentSettings).profiles;
    profiles.forEach((p) => { p.participation = 0; p.reply = 1; p.inactivity = 0; });
    const entrant = profiles.find((p) => p.id === 'kusabue')!;
    Object.assign(profiles.find((p) => p.id === 'hoshimori')!, { interests: ['月', '道具'], affinities: {} });
    Object.assign(profiles.find((p) => p.id === 'hankote')!, { interests: ['電子工作'], affinities: {} });
    Object.assign(entrant, { participation: 1, frequency: 1, absence: 0, sessionMinutes: 60,
      weekdayHours: Array.from({ length: 24 }, (_, i) => i), weekendHours: Array.from({ length: 24 }, (_, i) => i),
      preferredBoards: ['MITI:9'] });
    // Place a real deterministic visit start inside the inference interval.
    const activity = content.settings.find((s) => s.id === 'ai-activity')!;
    let start = 0;
    for (let i = 0; i < 100; i++) {
      const seed = `inference-presence-${i}`, cycle = 65 * 60_000;
      const phase = random(`${seed}:olt:kusabue:phase`) * cycle;
      const slot = Math.ceil((Date.parse(now) + 10_000 - phase) / cycle);
      if (random(`${seed}:olt:kusabue:${slot}:visit`) >= .95 || random(`${seed}:olt:kusabue:${slot}:explore`) <= .15) continue;
      (activity.value as unknown as import('../src/storage/schema').AiActivity).seed = seed;
      start = slot * cycle + phase;
      break;
    }
    if (!start) throw new Error('No deterministic arrival fixture found.');
    // ISO presence timestamps store the visit's whole milliseconds.
    start = Math.floor(start);
    const at = start - 10_000, human = content.members.find((m) => m.actor === 'human')!;
    await repo.put('settings', roster); await repo.put('settings', activity);
    const state = emptyOlt(iso(at)), room = state.rooms[1]!;
    room.residents = [{ memberId: 'fictional-ai:hoshimori', joinedAt: iso(at), until: iso(at + 60_000) },
      { memberId: 'fictional-ai:hankote', joinedAt: iso(at), until: iso(start - 500) }];
    await repo.put('settings', { id: 'olt-rooms', value: state as never });
    await repo.observeRoom('human', 'night', human.id, iso(at));
    await repo.speakRoom('night', 'human', '月を見る道具を教えてください。', iso(at));
    const turn = await repo.claimRoomTurn('night', iso(start - 1000));
    const raw = JSON.stringify({ kind: 'olt', roomId: 'night', personaId: 'hoshimori', text: '双眼鏡なら月の縁も見やすいですよ。' });
    await repo.finishRoomTurn('night', turn!.id, raw, undefined, iso(start + 1000));
    const completed = oltState(await repo.exportBackup());
    const reconciled = await repo.reconcileOlt(iso(start + 2000));
    await repo.speakRoom('night', 'human', '窓辺からでも見えますか。', iso(start + 3000));
    const next = await repo.claimRoomTurn('night', iso(start + 12_000));
    const pending = oltState(await repo.exportBackup());
    pending.rooms[1]!.residents.find((p) => p.memberId === next!.authorId)!.until = iso(start + 13_000);
    await repo.put('settings', { id: 'olt-rooms', value: pending as never });
    await repo.finishRoomTurn('night', next!.id, JSON.stringify({ kind: 'olt', roomId: 'night',
      personaId: next!.authorId.replace('fictional-ai:', ''), text: '窓を開けるとよさそうですね。' }), undefined, iso(start + 14_000));
    return { start, completed, reconciled, cancelled: oltState(await repo.exportBackup()), departed: next!.authorId };
  }, now);
  const lines = result.completed.rooms[1]!.lines.slice(-3);
  expect(lines.map((l) => [l.kind, l.authorId, l.createdAt])).toEqual([
    ['leave', 'fictional-ai:hankote', new Date(result.start - 500).toISOString()],
    ['enter', 'fictional-ai:kusabue', new Date(Math.floor(result.start)).toISOString()],
    ['say', 'fictional-ai:hoshimori', new Date(result.start + 1000).toISOString()],
  ]);
  expect(result.reconciled.rooms[1]!.lines).toEqual(result.completed.rooms[1]!.lines);
  expect(result.cancelled.rooms[1]!.pending).toBeNull();
  expect(result.cancelled.rooms[1]!.lines.filter((l) => l.origin.startsWith('local-ai:'))).toHaveLength(1);
  expect(result.cancelled.rooms[1]!.lines.at(-1)).toMatchObject({ kind: 'leave', authorId: result.departed,
    createdAt: new Date(result.start + 13_000).toISOString() });
});

test('a delayed older reply cannot displace human speech sent during inference across tabs', async ({ page }) => {
  const result = await page.evaluate(async (now) => {
    const repo = window.oltRepo, rp = '/src/storage/repository.ts', op = '/src/olt-state.ts', ap = '/src/ai/olt.ts';
    const { emptyOlt, oltState, appendOlt, iso } = await import(op) as typeof import('../src/olt-state');
    const { buildOltPrompt } = await import(ap) as typeof import('../src/ai/olt');
    const other = await (await import(rp)).openRepository('olt-world') as LocalRepository;
    await repo.authorizeModel((await repo.openActivity()).modelId);
    const content = await repo.exportBackup(), roster = content.settings.find((s) => s.id === 'ai-residents')!;
    const profiles = (roster.value as unknown as import('../src/ai/personas').ResidentSettings).profiles;
    profiles.forEach((p) => { p.participation = 0; p.reply = 1; p.inactivity = 0; });
    await repo.put('settings', roster);
    const at = Date.parse(now), human = content.members.find((m) => m.actor === 'human')!;
    const state = emptyOlt(now), room = state.rooms[1]!;
    room.residents = profiles.slice(0, 2).map((p) => ({ memberId: `fictional-ai:${p.id}`, joinedAt: now, until: iso(at + 60_000) }));
    room.visitors = [{ clientId: 'human', memberId: human.id, until: iso(at + 60_000) }];
    appendOlt(room, 'fictional-ai:kusabue', 'say', '今夜は月がよく見えますね。', 'local-ai:webllm:test', at);
    await repo.put('settings', { id: 'olt-rooms', value: state as never });
    const older = await repo.claimRoomTurn('night', iso(at + 15_000));
    const greeting = 'こんにちは、初めてのOLTでドキドキしています';
    await other.speakRoom('night', 'human', greeting, iso(at + 16_000));
    await repo.finishRoomTurn('night', older!.id, JSON.stringify({ kind: 'olt', roomId: 'night',
      personaId: older!.authorId.replace('fictional-ai:', ''), text: '双眼鏡で月の縁を眺めていました。' }), undefined, iso(at + 17_000));
    const claims = await Promise.all([repo.claimRoomTurn('night', iso(at + 32_000)), other.claimRoomTurn('night', iso(at + 32_000))]);
    const turn = claims.find(Boolean)!;
    const snapshot = await repo.exportBackup(), saved = oltState(snapshot);
    const prompt = JSON.parse(buildOltPrompt(snapshot, saved.rooms[1]!, turn).user);
    await other.finishRoomTurn('night', turn.id, JSON.stringify({ kind: 'olt', roomId: 'night',
      personaId: turn.authorId.replace('fictional-ai:', ''), text: 'ゆっくりどうぞ。月の模様を話題にすると話しやすいですよ。' }), undefined, iso(at + 33_000));
    other.close();
    return { older, claims, prompt, human, greeting, saved, finished: oltState(await repo.exportBackup()) };
  }, now);
  expect(result.older!.targetNumber).toBe(1);
  expect(result.claims.filter(Boolean)).toHaveLength(1);
  expect(result.claims.find(Boolean)!.targetNumber).toBe(2);
  expect(result.prompt.replyTo).toMatchObject({ number: 2, kind: 'say', text: result.greeting });
  expect(result.prompt.addressee).toMatchObject({ id: result.human.id, handle: result.human.handle, actor: 'human' });
  expect(result.prompt.speaker.id).not.toBe(result.human.id);
  expect(result.saved.rooms[1]!.handledNumber).toBe(2);
  expect(result.finished.rooms[1]!.lines.map((l) => l.kind)).toEqual(['say', 'say', 'say', 'say']);
  expect(result.finished.attempts).toBe(2);
  expect(result.finished.organicAttempts).toBe(1);
});
