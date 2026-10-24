import { expect, test } from '@playwright/test';
import type { LocalRepository } from '../src/storage/repository';

declare global { interface Window { wakabaOltRepo: LocalRepository } }
const now = '2026-10-21T13:04:00.000Z';
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(now) }); await page.goto('http://127.0.0.1:14374');
  await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    window.wakabaOltRepo = await (await import(path)).openRepository('wakaba-olt-world');
    await window.wakabaOltRepo.openActivity(); await window.wakabaOltRepo.createHumanMember('初めの人');
  });
});

test('legacy normalization preserves every old field, is pure/idempotent and persists atomically across connections and JSON', async ({ page }) => {
  const r = await page.evaluate(async (now) => {
    const path = '/src/olt-state.ts', rp = '/src/storage/repository.ts';
    const { emptyOlt, oltState, appendOlt, oltAuthorization, validateOlt, validateOltMembers } = await import(path) as typeof import('../src/olt-state');
    const repo = window.wakabaOltRepo, fixture = await repo.exportBackup(), human = fixture.members.find((m) => m.actor === 'human')!;
    // Populated protected records make absence of collateral changes meaningful.
    fixture.mail = [
      { id: 'protected-sent', number: 1, senderId: human.id, recipientId: 'fictional-ai:hoshimori', subject: '私信', body: '公開しない本文',
        createdAt: now, origin: 'local-human', recipientConfirmation: { at: now, replyMailId: 'protected-reply', provenance: 'local-resident-reply-v1' } },
      { id: 'protected-reply', number: 2, senderId: 'fictional-ai:hoshimori', recipientId: human.id, subject: '返事', body: '保存済みの私信',
        replyToMailId: 'protected-sent', createdAt: now, readAt: now, origin: 'local-ai:webllm:fixture',
        simulation: { runId: 'protected-reply', simulatedAt: now, fictional: true } },
    ];
    fixture.settings.push({ id: 'protected-unrelated', value: { nested: ['保持', true] } });
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    await repo.markRead(human.id, fixture.posts[0]!.id);
    await repo.createNetNewsArticle({ id: 'protected-news', group: 'fj.questions.fj', authorId: human.id, title: '保存記事', body: 'OLTとは別の記録' }, now);
    const original = await repo.exportBackup();
    const legacy = emptyOlt(now); legacy.rooms.pop(); legacy.attempts = 17;
    appendOlt(legacy.rooms[0]!, human.id, 'say', '以前の自然の会話', 'local-human', Date.parse(now));
    appendOlt(legacy.rooms[1]!, human.id, 'say', '以前の星の会話', 'local-human', Date.parse(now));
    legacy.rooms[0]!.residents.push({ memberId: 'fictional-ai:hoshimori', joinedAt: now, until: '2026-10-21T13:05:00.000Z' });
    legacy.rooms[0]!.pending = { id: 'saved-turn', authorId: 'fictional-ai:hoshimori', modelId: 'test', context: oltAuthorization(original), until: '2026-10-21T13:04:30.000Z' };
    validateOlt(legacy); validateOltMembers(legacy, original.members);
    await repo.put('settings', { id: 'olt-rooms', value: legacy as never });
    const stored = await repo.exportBackup(), normalized = oltState(stored, now), twice = oltState({ settings: [{ id: 'olt-rooms', value: normalized as never }] }, '2099-01-01T00:00:00.000Z');
    const readsUnchanged = JSON.stringify(await repo.exportBackup()) === JSON.stringify(stored);
    await repo.replaceFromJson(JSON.stringify(stored), { confirmReplace: true });
    const restoredLegacy = oltState(await repo.exportBackup(), now);
    // Inactive visits cancel a reservation under normal lifecycle rules. Make
    // that cancellation explicit before comparing deterministic normalization.
    legacy.rooms[0]!.residents = []; legacy.rooms[0]!.pending = null;
    await repo.put('settings', { id: 'olt-rooms', value: legacy as never });
    const before = await repo.exportBackup();
    const other = await (await import(rp)).openRepository('wakaba-olt-world') as LocalRepository;
    await Promise.all([repo.observeRoom('anonymous-a', undefined, undefined, now), other.observeRoom('anonymous-b', undefined, undefined, now)]);
    const upgraded = await repo.exportBackup();
    await other.observeRoom('anonymous-b', undefined, undefined, now); other.close();
    const repeated = await repo.exportBackup();
    await repo.observeRoom('human-visit', 'wakaba', human.id, now);
    await repo.speakRoom('wakaba', 'human-visit', '最初の質問', now);
    await repo.observeRoom('human-visit', undefined, undefined, now);
    const visited = await repo.exportBackup();
    repo.close(); const reloaded = await (await import(rp)).openRepository('wakaba-olt-world') as LocalRepository;
    const reload = await reloaded.exportBackup();
    await reloaded.replaceFromJson(JSON.stringify(reload), { confirmReplace: true });
    const roundtrip = await reloaded.exportBackup();
    // A missing OLT setting creates empty rooms without replenishing community data.
    const missing = structuredClone(original); missing.settings = missing.settings.filter((s) => s.id !== 'olt-rooms');
    await reloaded.replaceFromJson(JSON.stringify(missing), { confirmReplace: true });
    const missingBefore = await reloaded.exportBackup();
    await reloaded.observeRoom('anonymous', 'wakaba', undefined, now);
    const missingAfter = await reloaded.exportBackup(); reloaded.close();
    return { legacy: stored.settings.find((s) => s.id === 'olt-rooms')!.value, normalized, twice, readsUnchanged, restoredLegacy,
      before, upgraded, repeated, visited, reload, roundtrip, missingBefore, missingAfter };
  }, now);
  const legacy = r.legacy as unknown as import('../src/olt-state').OltState;
  expect(r.normalized.rooms.slice(0, 2)).toEqual(legacy.rooms);
  expect(r.normalized).toEqual({ ...legacy, rooms: [...legacy.rooms, expect.objectContaining({ id: 'wakaba', lines: [], nextNumber: 1, pending: null, residents: [], visitors: [] })] });
  expect(r.normalized).toEqual(r.twice); expect(r.readsUnchanged).toBe(true); expect(r.restoredLegacy).toEqual(r.normalized);
  expect(r.repeated).toEqual(r.upgraded); expect(r.reload).toEqual(r.visited); expect(r.roundtrip).toEqual(r.visited);
  const withoutOlt = (b: typeof r.before) => ({ ...b, settings: b.settings.filter((s) => s.id !== 'olt-rooms') });
  expect(withoutOlt(r.visited)).toEqual(withoutOlt(r.before));
  expect(withoutOlt(r.upgraded)).toEqual(withoutOlt(r.before)); expect(withoutOlt(r.missingAfter)).toEqual(withoutOlt(r.missingBefore));
  const upgraded = r.upgraded.settings.find((s) => s.id === 'olt-rooms')!.value as unknown as import('../src/olt-state').OltState;
  expect(upgraded.attempts).toBe(17); expect(upgraded.windowAt).toBe(legacy.windowAt);
  expect(upgraded.rooms.slice(0, 2)).toEqual((r.before.settings.find((s) => s.id === 'olt-rooms')!.value as unknown as import('../src/olt-state').OltState).rooms);
  const fresh = r.missingAfter.settings.find((s) => s.id === 'olt-rooms')!.value as unknown as import('../src/olt-state').OltState;
  expect(fresh.rooms.map((r) => r.id)).toEqual(['lounge', 'night', 'wakaba']); expect(fresh.rooms.every((r) => !r.lines.length && !r.visitors.length)).toBe(true);
});

test('malformed legacy/new imports, invalid references and normalization/import write failure retain the old world', async ({ page }) => {
  const r = await page.evaluate(async (now) => {
    const path = '/src/olt-state.ts'; const { emptyOlt, appendOlt } = await import(path) as typeof import('../src/olt-state');
    const repo = window.wakabaOltRepo, original = await repo.exportBackup(), human = original.members.find((m) => m.actor === 'human')!;
    const state = emptyOlt(now); state.rooms.pop(); state.attempts = 23;
    appendOlt(state.rooms[0]!, human.id, 'say', '保持する会話', 'local-human', Date.parse(now));
    await repo.put('settings', { id: 'olt-rooms', value: state as never }); const before = await repo.exportBackup();
    const invalid: boolean[] = [], preserved: boolean[] = [];
    const shapes = [state, emptyOlt(now)];
    for (const shape of shapes) for (const change of [
      (s: typeof state) => { s.rooms[0]!.id = 'wakaba'; },
      (s: typeof state) => { s.rooms[0]!.id = 'unknown' as never; },
      (s: typeof state) => { s.rooms[0] = structuredClone(s.rooms[1]!); },
      (s: typeof state) => { s.rooms.shift(); },
      (s: typeof state) => { s.rooms[0]!.nextNumber = 0; },
      (s: typeof state) => { s.rooms[0]!.visitors.push({ clientId: 'bad', memberId: 'missing', until: '2026-10-21T13:05:00.000Z' }); },
      (s: typeof state) => { s.rooms[0]!.pending = { id: 'absent', authorId: human.id, modelId: 'test', context: '', until: now }; },
    ]) {
      const bad = structuredClone(shape); change(bad);
      const b = structuredClone(before); b.settings.find((s) => s.id === 'olt-rooms')!.value = bad as never;
      try { await repo.replaceFromJson(JSON.stringify(b), { confirmReplace: true }); invalid.push(false); } catch { invalid.push(true); }
      preserved.push(JSON.stringify(await repo.exportBackup()) === JSON.stringify(before));
    }
    for (const value of [null, false, {}, { ...state, rooms: [] }]) {
      const b = structuredClone(before); b.settings.find((s) => s.id === 'olt-rooms')!.value = value as never;
      try { await repo.replaceFromJson(JSON.stringify(b), { confirmReplace: true }); invalid.push(false); } catch { invalid.push(true); }
    }
    const nativePut = IDBObjectStore.prototype.put, nativeAdd = IDBObjectStore.prototype.add;
    let writeFailed = false, importFailed = false;
    try {
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === 'settings' && value.id === 'olt-rooms') throw new DOMException('quota', 'QuotaExceededError');
        return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
      };
      try { await repo.observeRoom('anonymous', 'wakaba', undefined, now); } catch { writeFailed = true; }
    } finally { IDBObjectStore.prototype.put = nativePut; }
    const afterWrite = await repo.exportBackup();
    try {
      IDBObjectStore.prototype.add = function (value, key) {
        if (this.name === 'settings' && value.id === 'olt-rooms') throw new DOMException('quota', 'QuotaExceededError');
        return key === undefined ? nativeAdd.call(this, value) : nativeAdd.call(this, value, key);
      };
      // The source includes OLT, so failure follows clears and earlier inserts.
      try { await repo.replaceFromJson(JSON.stringify(before), { confirmReplace: true }); } catch { importFailed = true; }
    } finally { IDBObjectStore.prototype.add = nativeAdd; }
    return { invalid, preserved, before, afterWrite, afterImport: await repo.exportBackup(), writeFailed, importFailed };
  }, now);
  expect(r.invalid).toEqual(Array(18).fill(true)); expect(r.preserved.every(Boolean)).toBe(true);
  expect(r.writeFailed).toBe(true); expect(r.importFailed).toBe(true);
  expect(r.afterWrite).toEqual(r.before); expect(r.afterImport).toEqual(r.before);
});

test('all three rooms share the persistent cap, while Wakaba prompt/output and turn arbitration remain room scoped', async ({ page }) => {
  const r = await page.evaluate(async (now) => {
    const op = '/src/olt-state.ts', ap = '/src/ai/olt.ts', rp = '/src/storage/repository.ts';
    const { oltState, iso, appendOlt } = await import(op) as typeof import('../src/olt-state');
    const { buildOltPrompt, commitOltText } = await import(ap) as typeof import('../src/ai/olt');
    const repo = window.wakabaOltRepo, at = Date.parse(now);
    await repo.authorizeModel((await repo.openActivity()).modelId);
    let content = await repo.exportBackup();
    const row = content.settings.find((s) => s.id === 'ai-residents')!;
    const profiles = (row.value as unknown as import('../src/ai/personas').ResidentSettings).profiles;
    profiles.forEach((p) => Object.assign(p, { participation: 0, frequency: 1, inactivity: 0, reply: 1, weekdayHours: [22], weekendHours: [22] }));
    await repo.put('settings', row);
    const human = content.members.find((m) => m.actor === 'human')!;
    await repo.createHumanMail({ id: 'private', senderId: human.id, recipient: 'hoshimori', subject: 'PRIVATE_SUBJECT', body: 'PRIVATE_MAIL_SENTINEL' });
    for (const id of ['lounge', 'night', 'wakaba'] as const) {
      await repo.observeRoom(`tab-${id}`, id, human.id, now);
      await repo.speakRoom(id, `tab-${id}`, `質問 ${id}`, now);
    }
    let saved = oltState(await repo.exportBackup()); saved.attempts = 23;
    saved.rooms.forEach((room, i) => {
      room.residents = [{ memberId: `fictional-ai:${profiles[i]!.id}`, joinedAt: now, until: iso(at + 120_000) }];
      room.nextTurnAt = now;
    });
    appendOlt(saved.rooms[0]!, human.id, 'say', 'OTHER_OLT_TRANSCRIPT_SENTINEL', 'local-human', at);
    await repo.put('settings', { id: 'olt-rooms', value: saved as never });
    const other = await (await import(rp)).openRepository('wakaba-olt-world') as LocalRepository;
    const claims = await Promise.all([repo.claimRoomTurn('wakaba', iso(at + 10_000)), other.claimRoomTurn('wakaba', iso(at + 10_000))]);
    const turn = claims.find(Boolean)!;
    content = await repo.exportBackup(); const room = oltState(content).rooms.find((r) => r.id === 'wakaba')!;
    const prompt = buildOltPrompt(content, room, turn);
    const good = { kind: 'olt', personaId: turn.authorId.replace('fictional-ai:', ''), roomId: 'wakaba', text: '読むだけでも大丈夫ですよ。' };
    const invalid = [{ ...good, roomId: 'night' }, { ...good, personaId: 'missing' }, { ...good, text: '\u001b[2J' },
      { ...good, text: '<b>文字</b>' }, { ...good, text: room.lines.at(-1)!.text }];
    const failures: boolean[] = [], unchanged: boolean[] = [];
    for (const value of invalid) {
      const before = await repo.exportBackup();
      try { await repo.finishRoomTurn('wakaba', turn.id, JSON.stringify(value), undefined, iso(at + 11_000)); failures.push(false); } catch { failures.push(true); }
      unchanged.push(JSON.stringify(await repo.exportBackup()) === JSON.stringify(before));
    }
    const absent = structuredClone(room); absent.residents = [];
    let absentRejected = false; try { commitOltText(absent, turn, JSON.stringify(good), at); } catch { absentRejected = true; }
    await Promise.all([repo.finishRoomTurn('wakaba', turn.id, JSON.stringify(good), undefined, iso(at + 11_000)), other.finishRoomTurn('wakaba', turn.id, JSON.stringify(good), undefined, iso(at + 11_000))]);
    const capped = await Promise.all((['lounge', 'night', 'wakaba'] as const).map((id) => repo.claimRoomTurn(id, iso(at + 20_000))));
    const after = await repo.exportBackup(); other.close();
    return { claims, prompt, failures, unchanged, absentRejected, capped, state: oltState(after), content, after };
  }, now);
  expect(r.claims.filter(Boolean)).toHaveLength(1); expect(r.capped).toEqual([undefined, undefined, undefined]); expect(r.state.attempts).toBe(24);
  expect(r.prompt.system).toContain('beginner room'); expect(r.prompt.system).toContain('quiet reading'); expect(r.prompt.system).toContain('1996');
  expect(r.prompt.user).not.toMatch(/PRIVATE_SUBJECT|PRIVATE_MAIL_SENTINEL|OTHER_OLT_TRANSCRIPT_SENTINEL/);
  const prompt = JSON.parse(r.prompt.user); expect(prompt.roomId).toBe('wakaba'); expect(prompt.room).toBe('はじめての談話室');
  expect(prompt.recent.length).toBeLessThanOrEqual(12); expect(prompt.publicMemory.length).toBeLessThanOrEqual(3);
  expect(r.failures).toEqual(Array(5).fill(true)); expect(r.unchanged.every(Boolean)).toBe(true); expect(r.absentRejected).toBe(true);
  expect(r.state.rooms.flatMap((r) => r.lines).filter((l) => l.origin.startsWith('local-ai:'))).toHaveLength(1);
  const present = r.state.rooms.flatMap((r) => r.residents.map((p) => p.memberId)); expect(new Set(present).size).toBe(present.length);
  expect(r.after.posts).toEqual(r.content.posts); expect(r.after.mail).toEqual(r.content.mail);
});
