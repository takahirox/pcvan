import { expect, test } from '@playwright/test';
import type { LocalRepository } from '../src/storage/repository';
import type { Page } from '@playwright/test';
import type { AiActivity, Mail } from '../src/storage/schema';

declare global { interface Window { mailRepo: LocalRepository } }
const epoch = '2026-10-21T00:00:00.000Z';

async function prepareConfirmation(page: Page) {
  return page.evaluate(async (epoch) => {
    const repo = window.mailRepo, content = await repo.exportBackup();
    const humanId = content.members.find((m) => m.actor === 'human')!.id;
    const draft = { senderId: humanId, recipient: 'hoshimori', subject: '  星の手紙  ', body: '  一行目\n\n　ｶﾅ  ' };
    const parent = await repo.createHumanMail({ ...draft, id: 'selected-parent' });
    const context = await repo.createHumanMail({ ...draft, id: 'context-letter', body: '文脈だけの手紙' });
    const activity = await repo.openActivity();
    const run = { id: 'confirm-batch:one', personaId: 'hoshimori', simulatedAt: epoch, status: 'running' as const,
      mail: { humanId, replyToMailId: parent.id } };
    await repo.put('settings', { id: 'ai-activity', value: { ...activity, consent: true, batch: {
      id: 'confirm-batch', from: epoch, to: '2026-10-21T01:00:00.000Z', modelId: activity.modelId, runs: [run],
    } } as never });
    const raw = JSON.stringify({ personaId: run.personaId, recipientId: humanId, replyToMailId: 'reply-target',
      subject: 'Re: 星の手紙', body: '星のお便りをありがとう。' });
    return { parent, context, run, raw };
  }, epoch);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(epoch) });
  await page.goto('http://127.0.0.1:14374');
  await page.evaluate(async () => {
    const path = '/src/storage/repository.ts';
    const { openRepository } = await import(path);
    window.mailRepo = await openRepository('mail-world');
    await window.mailRepo.openActivity();
    await window.mailRepo.createHumanMember('便りの主');
  });
});

test('atomic addresses, sender/parent validation, concurrent numbering, idempotent retries and quota rollback preserve forums', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, before = await repo.exportBackup();
    const senderId = before.members.find((m) => m.actor === 'human')!.id;
    const draft = { id: 'letter-1', senderId, recipient: 'hoshimori', subject: '星の便り', body: '日本語\n二行目' };
    const path = '/src/storage/repository.ts';
    const other = await (await import(path)).openRepository('mail-world') as LocalRepository;
    const first = await Promise.all([repo.createHumanMail(draft), other.createHumanMail(draft)]);
    const concurrent = await Promise.all([repo.createHumanMail({ ...draft, id: 'letter-2', recipient: '草笛' }),
      other.createHumanMail({ ...draft, id: 'letter-3', recipient: 'fictional-ai:hoshimori' })]);
    const failures: string[] = [];
    for (const change of [{ id: 'letter-1', body: 'collision' }, { recipient: senderId }, { senderId: 'fictional-ai:hoshimori' },
      { recipient: 'nobody@example.com' }, { subject: ' ' }, { body: '\u001b[2J' }, { replyToMailId: first[0]!.id }, { replyToMailId: '' }, { replyToMailId: false }]) {
      try { await repo.createHumanMail({ ...draft, id: 'invalid', ...change } as never); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'session' && key === 'mail-next-number') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.createHumanMail({ ...draft, id: 'quota' }); } catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.put = native; }
    const afterFailure = await repo.list('mail');
    const next = await repo.createHumanMail({ ...draft, id: 'letter-4' });
    await repo.delete('mail', next.id);
    const afterDelete = await repo.createHumanMail({ ...draft, id: 'letter-5' });
    other.close();
    return { before, after: await repo.exportBackup(), first, concurrent, failures, afterFailure, next, afterDelete };
  });
  expect(result.first[0]).toEqual(result.first[1]);
  expect(result.first[0]!.number).toBe(1);
  expect(result.concurrent.map((m) => m.number).sort()).toEqual([2, 3]);
  expect(result.failures).toEqual([...Array(9).fill('validation'), 'quota']);
  expect(result.afterFailure).toHaveLength(3);
  expect(result.next.number).toBe(4); expect(result.afterDelete.number).toBe(5);
  expect(result.after.posts).toEqual(result.before.posts);
  expect(result.after.forums).toEqual(result.before.forums);
});

test('mail backup strictness, individual recipient read markers, replies, import and stale/reset fences', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, content = await repo.exportBackup();
    const humanId = content.members.find((m) => m.actor === 'human')!.id;
    const sent = await repo.createHumanMail({ id: 'human-letter', senderId: humanId, recipient: 'hoshimori', subject: '便り', body: '星を見ました。' });
    const activity = await repo.openActivity();
    const run = { id: 'mail-batch:one', personaId: 'hoshimori', simulatedAt: '2026-10-21T01:00:00.000Z', status: 'running', mail: { humanId, replyToMailId: sent.id } };
    await repo.put('settings', { id: 'ai-activity', value: { ...activity, consent: true, batch: { id: 'mail-batch', from: '2026-10-21T00:00:00.000Z', to: '2026-10-21T02:00:00.000Z', modelId: activity.modelId, runs: [run] } } as never });
    const raw = JSON.stringify({ personaId: 'hoshimori', recipientId: humanId, replyToMailId: 'reply-target', subject: 'Re: 便り', body: 'お便りありがとう。' });
    const path = '/src/storage/repository.ts';
    const other = await (await import(path)).openRepository('mail-world') as LocalRepository;
    const deliveries = await Promise.all([repo.commitAiRun(run.id, raw), other.commitAiRun(run.id, raw)]);
    await Promise.all([repo.markMailRead(humanId, run.id), other.markMailRead(humanId, run.id)]);
    const stranger = await repo.createHumanMember('別の利用者');
    let unauthorized = '';
    try { await repo.markMailRead(stranger.id, run.id); } catch (e) { unauthorized = (e as { code: string }).code; }
    const reply = await repo.createHumanMail({ id: 'human-reply', senderId: humanId, recipient: 'hoshimori', subject: 'ありがとう', body: 'また書きます。', replyToMailId: run.id });
    const good = await repo.exportBackup(), received = good.mail!.find((m) => m.id === run.id)!, invalid: unknown[] = [null, {}, { ...good.mail![0], unknown: true },
      { ...sent, senderId: 'missing' }, { ...sent, recipientId: stranger.id }, { ...sent, subject: '' },
      { ...sent, subject: 'bad\nsubject' }, { ...sent, number: 0 }, { ...sent, createdAt: 'yesterday' },
      { ...sent, readAt: '2026-10-21T00:00:00.000Z' }, { ...sent, replyToMailId: reply.id },
      { ...received, simulation: { runId: 'wrong', simulatedAt: run.simulatedAt, fictional: true } }];
    const failures: string[] = [];
    for (const bad of invalid) {
      try { await repo.replaceFromJson(JSON.stringify({ ...good, mail: [bad] }), { confirmReplace: true }); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    const preserved = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(good), { confirmReplace: true });
    const restored = await repo.exportBackup();
    let stale = '';
    try { await other.createHumanMail({ id: 'stale', senderId: humanId, recipient: 'hoshimori', subject: '古い', body: '古い下書き' }); }
    catch (e) { stale = (e as { code: string }).code; }
    other.close();
    await repo.resetWorld({ confirmReset: true });
    return { deliveries, unauthorized, failures, good, preserved, restored, stale, reset: await repo.exportBackup() };
  });
  expect(result.deliveries[0]).toEqual(result.deliveries[1]);
  expect(result.unauthorized).toBe('validation');
  expect(result.good.mail).toHaveLength(3); expect(result.good.mail!.find((m) => m.id === 'mail-batch:one')!.readAt).toBeTruthy();
  expect(result.failures).toEqual(Array(12).fill('validation'));
  expect(result.preserved).toEqual(result.good); expect(result.restored).toEqual(result.good);
  expect(result.stale).toBe('stale'); expect(result.reset.mail).toEqual([]); expect(result.reset.posts).toHaveLength(82);
});

test('v1 database upgrade and pre-mail backup import retain original posts and read states', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo;
    const backup = await repo.exportBackup(); delete backup.mail;
    repo.close();
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('old-mail-world', 1);
      r.onupgradeneeded = () => {
        // Materialize the original v1 stores/indexes, without a mail store.
        const db = r.result;
        db.createObjectStore('members', { keyPath: 'id' }); db.createObjectStore('sigs', { keyPath: 'id' });
        db.createObjectStore('forums', { keyPath: 'id' }).createIndex('sigId', 'sigId');
        const posts = db.createObjectStore('posts', { keyPath: 'id' });
        posts.createIndex('forumNumber', ['forumId', 'number'], { unique: true }); posts.createIndex('authorId', 'authorId'); posts.createIndex('replyToPostId', 'replyToPostId');
        const reads = db.createObjectStore('readStates', { keyPath: ['memberId', 'forumId'] }); reads.createIndex('memberId', 'memberId'); reads.createIndex('forumId', 'forumId');
        db.createObjectStore('settings', { keyPath: 'id' }); db.createObjectStore('session');
      }; r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['members', 'sigs', 'forums', 'posts', 'readStates', 'settings'], 'readwrite');
      for (const store of ['members', 'sigs', 'forums', 'posts', 'readStates', 'settings'] as const) for (const row of backup[store]) tx.objectStore(store).add(row);
      tx.oncomplete = () => resolve();
    }); db.close();
    const path = '/src/storage/repository.ts';
    const migrated = await (await import(path)).openRepository('old-mail-world') as LocalRepository;
    const upgraded = await migrated.exportBackup();
    await migrated.replaceFromJson(JSON.stringify(backup), { confirmReplace: true });
    const imported = await migrated.exportBackup(); migrated.close();
    return { backup, upgraded, imported };
  });
  expect(result.upgraded.mail).toEqual([]); expect(result.imported.mail).toEqual([]);
  expect(result.upgraded.posts).toEqual(result.backup.posts);
  expect(result.imported.posts).toEqual(result.backup.posts);
  expect(result.imported.readStates).toEqual(result.backup.readStates);
});

test('stable addresses resolve handle collisions and generic member edits cannot invalidate existing mail', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, content = await repo.exportBackup();
    const human = content.members.find((m) => m.actor === 'human')!;
    const draft = { id: 'resolve-one', senderId: human.id, recipient: 'hoshimori', subject: '宛先', body: '星守さんへ' };
    await repo.put('members', { id: 'fictional-ai:kusabue', handle: 'hoshimori', actor: 'ai' });
    const addressed = await repo.createHumanMail(draft);
    let actorChange = '';
    try { await repo.put('members', { ...human, actor: 'ai' }); } catch (e) { actorChange = (e as { code: string }).code; }
    await repo.put('members', { id: 'fictional-ai:hoshimori', handle: '同名', actor: 'ai' });
    await repo.put('members', { id: 'fictional-ai:kusabue', handle: '同名', actor: 'ai' });
    let ambiguous = '';
    try { await repo.createHumanMail({ ...draft, id: 'ambiguous', recipient: '同名' }); } catch (e) { ambiguous = (e as { code: string }).code; }
    const exact = await repo.createHumanMail({ ...draft, id: 'resolve-two', recipient: 'fictional-ai:hoshimori' });
    const before = await repo.exportBackup(), failures: string[] = [];
    for (const value of [{ ...draft, id: 'bad', recipient: 1 }, { ...draft, id: 'bad', extra: true }]) {
      try { await repo.createHumanMail(value as never); failures.push('saved'); } catch (e) { failures.push((e as { code: string }).code); }
    }
    return { addressed, exact, actorChange, ambiguous, failures, before, after: await repo.exportBackup() };
  });
  expect(result.addressed.recipientId).toBe('fictional-ai:hoshimori'); expect(result.exact.recipientId).toBe('fictional-ai:hoshimori');
  expect(result.actorChange).toBe('validation'); expect(result.ambiguous).toBe('validation');
  expect(result.failures).toEqual(['validation', 'validation']); expect(result.after).toEqual(result.before);
});

test('only a new explicit reply confirms its parent atomically; concurrent retries and legacy duplicates never refresh or infer evidence', async ({ page }) => {
  const prepared = await prepareConfirmation(page);
  await page.clock.setFixedTime(new Date('2026-10-21T02:03:04.000Z'));
  const saved = await page.evaluate(async ({ run, raw }) => {
    const repo = window.mailRepo, before = await repo.exportBackup();
    const mp = '/src/ai/mail.ts', rp = '/src/storage/repository.ts';
    const { buildMailPrompt } = await import(mp) as typeof import('../src/ai/mail');
    const prompt = buildMailPrompt(before, run.personaId, run.mail);
    const planned = await repo.exportBackup();
    const other = await (await import(rp)).openRepository('mail-world') as LocalRepository;
    const replies = await Promise.all([repo.commitAiRun(run.id, raw), other.commitAiRun(run.id, raw)]);
    other.close();
    const after = await repo.exportBackup();
    const deletionErrors = [];
    for (const id of [run.id, run.mail.replyToMailId]) {
      try { await repo.delete('mail', id); deletionErrors.push('deleted'); }
      catch (e) { deletionErrors.push((e as { code: string }).code); }
    }
    return { before, planned, prompt, replies, after, deletionErrors };
  }, prepared);
  expect(saved.planned).toEqual(saved.before);
  expect(JSON.parse(saved.prompt.user).mail).toHaveLength(2);
  expect(saved.replies[0]).toEqual(saved.replies[1]);
  const confirmed = saved.after.mail!.find((m) => m.id === prepared.parent.id)!;
  expect(confirmed).toEqual({ ...prepared.parent, recipientConfirmation: {
    at: '2026-10-21T02:03:04.000Z', replyMailId: prepared.run.id, provenance: 'local-resident-reply-v1',
  } });
  expect(saved.after.mail!.find((m) => m.id === prepared.context.id)).toEqual(prepared.context);
  expect(saved.after.mail!.find((m) => m.id === prepared.run.id)).toMatchObject({ number: 3,
    createdAt: confirmed.recipientConfirmation!.at, simulation: { simulatedAt: epoch } });
  expect(saved.deletionErrors).toEqual(['validation', 'validation']);
  expect({ ...saved.after, mail: saved.before.mail, settings: saved.before.settings }).toEqual(saved.before);
  expect(saved.after.settings.filter((s) => s.id !== 'ai-activity')).toEqual(saved.before.settings.filter((s) => s.id !== 'ai-activity'));
  const expectedActivity = structuredClone(saved.before.settings.find((s) => s.id === 'ai-activity')!.value) as unknown as AiActivity;
  expectedActivity.batch!.runs[0]!.status = 'committed';
  expectedActivity.allowance = { windowAt: '2026-10-21T02:03:04.000Z', attempts: 0, committed: 1, responses: 0 };
  expect(saved.after.settings.find((s) => s.id === 'ai-activity')!.value).toEqual(expectedActivity);

  await page.clock.setFixedTime(new Date('2026-10-22T08:00:00.000Z'));
  const retried = await page.evaluate(async ({ run, raw }) => {
    const repo = window.mailRepo;
    await repo.commitAiRun(run.id, raw);
    const addDuplicateRun = async () => {
      const activity = (await repo.get('settings', 'ai-activity'))!.value as unknown as AiActivity;
      activity.batch!.runs.push({ ...run, id: 'confirm-batch:duplicate' });
      await repo.put('settings', { id: 'ai-activity', value: activity as never });
      return repo.commitAiRun('confirm-batch:duplicate', JSON.stringify({ ...JSON.parse(raw), body: '別の生成結果です。' }));
    };
    const duplicate = await addDuplicateRun(), current = await repo.exportBackup();
    const legacy = structuredClone(current);
    for (const row of legacy.mail!) delete row.recipientConfirmation;
    // Old reply pairs import unchanged; even a duplicate-parent attempt cannot backfill.
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    const legacyBefore = await repo.exportBackup();
    const oldActivity = legacy.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
    oldActivity.batch!.runs = [run];
    await repo.put('settings', { id: 'ai-activity', value: oldActivity as never });
    const legacyDuplicate = await addDuplicateRun();
    const legacyAfter = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(current), { confirmReplace: true });
    repo.close();
    const rp = '/src/storage/repository.ts';
    window.mailRepo = await (await import(rp)).openRepository('mail-world');
    return { duplicate, current, legacyDuplicate, legacyBefore, legacyAfter, reopened: await window.mailRepo.exportBackup() };
  }, prepared);
  expect(retried.duplicate).toBeUndefined(); expect(retried.legacyDuplicate).toBeUndefined();
  expect(retried.current.mail).toEqual(saved.after.mail);
  expect(retried.legacyAfter.mail).toEqual(retried.legacyBefore.mail);
  expect(retried.legacyAfter.mail!.every((m) => !m.recipientConfirmation)).toBe(true);
  expect(retried.reopened).toEqual(retried.current);
});

test('backwards operational clocks clamp confirmation to parent creation, never to catch-up time', async ({ page }) => {
  const prepared = await prepareConfirmation(page);
  await page.clock.setFixedTime(new Date('2026-10-20T23:00:00.000Z'));
  const data = await page.evaluate(async ({ run, raw }) => {
    await window.mailRepo.commitAiRun(run.id, raw); return window.mailRepo.exportBackup();
  }, prepared);
  expect(data.mail!.find((m) => m.id === prepared.parent.id)!.recipientConfirmation!.at).toBe(prepared.parent.createdAt);
  expect(data.mail!.find((m) => m.id === prepared.run.id)!.createdAt).toBe('2026-10-20T23:00:00.000Z');
});

test('confirmation imports reject malformed, dangling and mismatched evidence without replacing any world records', async ({ page }) => {
  const prepared = await prepareConfirmation(page);
  const result = await page.evaluate(async ({ run, raw, parent, context }) => {
    const repo = window.mailRepo;
    await repo.commitAiRun(run.id, raw);
    const good = await repo.exportBackup(), confirmed = good.mail!.find((m) => m.id === parent.id)!;
    const evidence = confirmed.recipientConfirmation!;
    const invalid = [null, {}, { ...evidence, unknown: true }, { ...evidence, at: 'yesterday' },
      { ...evidence, at: '2026-10-20T23:59:59.000Z' }, { ...evidence, provenance: 'observed-by-model' },
      { ...evidence, replyMailId: '' }, { ...evidence, replyMailId: 'missing' },
      { ...evidence, replyMailId: parent.id }, { ...evidence, replyMailId: context.id }];
    const cases = invalid.map((recipientConfirmation) => ({ ...good, mail: good.mail!.map((m) => m.id === parent.id ? { ...m, recipientConfirmation } : m) }));
    cases.push({ ...good, mail: good.mail!.map((m) => m.id === run.id ? { ...m, recipientConfirmation: evidence } : m) });
    cases.push({ ...good, mail: good.mail!.map((m) => m.id === run.id ? { ...m, replyToMailId: context.id } : m) });
    cases.push({ ...good, mail: good.mail!.map((m) => m.id === run.id ? { ...m, createdAt: '2026-10-22T00:00:00.000Z' } : m) });
    const failures = [];
    for (const bad of cases) {
      try { await repo.replaceFromJson(JSON.stringify(bad), { confirmReplace: true }); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
      if (JSON.stringify(await repo.exportBackup()) !== JSON.stringify(good)) throw new Error('Invalid import changed world');
    }
    // A different valid resident cannot supply the same-correspondent evidence.
    const mismatch = structuredClone(good); mismatch.mail!.find((m) => m.id === run.id)!.senderId = 'fictional-ai:kusabue';
    try { await repo.replaceFromJson(JSON.stringify(mismatch), { confirmReplace: true }); failures.push('saved'); }
    catch (e) { failures.push((e as { code: string }).code); }
    return { good, after: await repo.exportBackup(), failures };
  }, prepared);
  expect(result.failures).toEqual(Array(14).fill('validation')); expect(result.after).toEqual(result.good);
});

for (const mode of ['recipient', 'parent', 'persona', 'output', 'cancelled', 'failed', 'pending', 'consent', 'pause', 'quota', 'abort', 'pre-abort', 'restore', 'reset'] as const) {
  test(`resident confirmation stays absent after ${mode}, including rollback after the parent write`, async ({ page }) => {
    const prepared = await prepareConfirmation(page);
    const result = await page.evaluate(async ({ mode, prepared }) => {
      const repo = window.mailRepo, { run, raw, parent } = prepared;
      const activity = (await repo.get('settings', 'ai-activity'))!.value as unknown as AiActivity;
      if (['cancelled', 'failed', 'pending'].includes(mode)) activity.batch!.runs[0]!.status = mode as 'cancelled' | 'failed' | 'pending';
      if (mode === 'consent') activity.consent = false;
      await repo.put('settings', { id: 'ai-activity', value: activity as never });
      if (mode === 'pause') {
        const setting = (await repo.get('settings', 'ai-residents'))!;
        const residents = setting.value as unknown as import('../src/ai/personas').ResidentSettings;
        residents.profiles.find((p) => p.id === run.personaId)!.frequency = 0;
        await repo.put('settings', setting);
      }
      const rp = '/src/storage/repository.ts';
      const stale = await (await import(rp)).openRepository('mail-world') as LocalRepository;
      if (mode === 'restore') await repo.replaceFromJson(JSON.stringify(await repo.exportBackup()), { confirmReplace: true });
      if (mode === 'reset') await repo.resetWorld({ confirmReset: true });
      const before = await repo.exportBackup(), controller = new AbortController();
      let attempted = false, failure = '';
      const native = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === 'mail' && (value as Mail).recipientConfirmation) {
          attempted = true;
          const request = key === undefined ? native.call(this, value) : native.call(this, value, key);
          if (mode === 'abort') request.addEventListener('success', () => controller.abort(), { once: true });
          return request;
        }
        if (mode === 'quota' && attempted && this.name === 'settings') throw new DOMException('quota', 'QuotaExceededError');
        return key === undefined ? native.call(this, value) : native.call(this, value, key);
      };
      const output = JSON.parse(raw);
      if (mode === 'recipient') output.recipientId = 'another-human';
      if (mode === 'parent') output.replyToMailId = prepared.context.id;
      if (mode === 'persona') output.personaId = 'kusabue';
      if (mode === 'output') output.body = '<b>invalid</b>';
      if (mode === 'pre-abort') controller.abort();
      try { await (['restore', 'reset'].includes(mode) ? stale : repo).commitAiRun(run.id, JSON.stringify(output), controller.signal); }
      catch (e) { failure = (e as { code?: string; name: string }).code ?? (e as Error).name; }
      finally { IDBObjectStore.prototype.put = native; stale.close(); }
      const after = await repo.exportBackup();
      // Failed allocation must be reusable; no partially saved reply or parent survives.
      const next = mode === 'quota' || mode === 'abort' ? await repo.createHumanMail({ id: 'after-failure', senderId: parent.senderId,
        recipient: 'hoshimori', subject: '次の手紙', body: '番号を消費していません。' }) : undefined;
      return { before, after, failure, attempted, next };
    }, { mode, prepared });
    if (mode === 'pause') {
      const activity = result.before.settings.find((s) => s.id === 'ai-activity')!.value as unknown as AiActivity;
      activity.batch!.runs = []; // Existing reconciliation withdraws paused work.
    }
    expect(result.after).toEqual(result.before);
    expect(result.after.mail!.every((m) => !m.recipientConfirmation)).toBe(true);
    expect(result.attempted).toBe(mode === 'quota' || mode === 'abort');
    if (result.next) expect(result.next.number).toBe(3);
    if (mode === 'quota') expect(result.failure).toBe('quota');
    if (mode === 'restore' || mode === 'reset') expect(result.failure).toBe('stale');
  });
}

test('Internet addresses share strict controller/write/import validation and never resolve to resident handles', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, before = await repo.exportBackup(), senderId = before.members.find((m) => m.actor === 'human')!.id;
    const cp = '/src/commands.ts', sp = '/src/storage/schema.ts';
    const { TerminalCommands } = await import(cp) as typeof import('../src/commands');
    const { validateRecord, resolveMailDestination } = await import(sp) as typeof import('../src/storage/schema');
    const accepted = ['Observer.Name+Notes_1@Letters.Example.invalid', 'a-b@a.b.example', `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`];
    const invalid = ['', 'a', '@host.example', 'a@', 'a@@host.example', 'a@localhost', '.a@host.example', 'a.@host.example', 'a..b@host.example',
      'a@.host.example', 'a@host..example', 'a@-host.example', 'a@host-.example', 'a@host.e', 'a@host.123', 'a@host.example.',
      'a@host.example,b@host.example', 'a@host.example;b@host.example', 'Name <a@host.example>', '"a"@host.example', 'a(comment)@host.example',
      '日本@host.example', 'a@日本.example', 'a@[127.0.0.1]', 'a b@host.example', ' a@host.example', 'a@host.example ',
      'a\t@host.example', 'a@host.example\n', 'a@host.example\r', 'a@host.example\0', 'a\u001b@host.example', 'a\u200b@host.example',
      `${'a'.repeat(65)}@host.example`, `a@${'b'.repeat(64)}.example`, `${accepted[2]}x`];
    // Prefixes have priority even over matching resident handles, including invalid forms.
    await repo.put('members', { id: 'fictional-ai:hoshimori', handle: 'INET#a', actor: 'ai' });
    const content = await repo.exportBackup();
    const checks = [];
    for (const [valid, addresses] of [[true, accepted], [false, invalid]] as const) for (const address of addresses) {
      const destination = `INET#${address}`, draft = { id: `address-${checks.length}`, senderId, recipient: destination, subject: '検証', body: '本文' };
      let write = true, record = true;
      try { await repo.createHumanMail(draft); } catch { write = false; }
      try { validateRecord('mail', { id: draft.id, number: 1, senderId, internetAddress: address, subject: draft.subject, body: draft.body,
        origin: 'local-human', createdAt: '2026-10-21T00:00:00.000Z' }); } catch { record = false; }
      const controller = [];
      for (const mode of ['WRITE', 'COMPOSE', 'prompt']) {
        const printed: string[] = [];
        const commands = new TerminalCommands({ read: async () => content, print: (...lines: string[]) => printed.push(...lines),
          mailbox: () => ({ box: 'INBOX', title: 'メール' }), ai: {} } as never);
        if (mode === 'prompt') { await commands.submit('WRITE'); await commands.submit(destination); }
        else await commands.submit(`${mode} ${destination}`);
        controller.push(printed.includes('件名='));
      }
      checks.push({ valid, write, record, controller });
    }
    const letters = await repo.list('mail');
    return { checks, accepted, letters, destination: resolveMailDestination(content.members, 'inet#Case@Letters.example.invalid') };
  });
  for (const check of result.checks) {
    expect(check.write).toBe(check.valid); expect(check.record).toBe(check.valid);
    expect(check.controller).toEqual(Array(3).fill(check.valid));
  }
  expect(result.letters.map((m) => m.internetAddress)).toEqual(result.accepted);
  expect(result.letters.every((m) => !Object.hasOwn(m, 'recipientId'))).toBe(true);
  expect(result.destination).toEqual({ internetAddress: 'Case@Letters.example.invalid' });
});

test('mixed Internet/resident saves allocate atomically, retry identically, reject forged imports and round-trip without member creation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, before = await repo.exportBackup(), senderId = before.members.find((m) => m.actor === 'human')!.id;
    const draft = { id: 'external-1', senderId, recipient: 'INET#Observer+Case@Letters.Example.invalid', subject: '  外への便り  ', body: '  日本語\n\n　ｶﾅ  ' };
    const rp = '/src/storage/repository.ts';
    const other = await (await import(rp)).openRepository('mail-world') as LocalRepository;
    const first = await Promise.all([repo.createHumanMail(draft), other.createHumanMail(draft)]);
    const concurrent = await Promise.all([repo.createHumanMail({ ...draft, id: 'local', recipient: 'hoshimori' }),
      other.createHumanMail({ ...draft, id: 'external-2', recipient: 'INET#second@letters.example.invalid' })]);
    const failures = [];
    for (const change of [{ body: 'different' }, { recipient: 'INET#observer+Case@Letters.Example.invalid' }, { recipient: 'hoshimori' },
      { senderId: 'missing' }, { senderId: 'fictional-ai:hoshimori' }, { replyToMailId: 'local' }, { recipientId: 'fictional-ai:hoshimori' }, { simulation: {} }]) {
      try { await repo.createHumanMail({ ...draft, ...change } as never); failures.push('saved'); } catch (e) { failures.push((e as { code: string }).code); }
    }
    const preQuota = await repo.exportBackup(), native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'session' && key === 'mail-next-number') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.createHumanMail({ ...draft, id: 'retry' }); } catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.put = native; }
    const afterQuota = await repo.exportBackup(), next = await repo.createHumanMail({ ...draft, id: 'retry' });
    await repo.delete('mail', next.id);
    const afterDelete = await repo.createHumanMail({ ...draft, id: 'after-delete' });
    const good = await repo.exportBackup(), external = first[0]!;
    const variants: unknown[] = [
      { ...external, recipientId: 'fictional-ai:hoshimori' }, { ...external, recipientId: senderId },
      { ...external, internetAddress: undefined }, { ...external, internetAddress: '' }, { ...external, internetAddress: null },
      { ...external, internetAddress: 'INET#a@host.example' }, { ...external, internetAddress: 'a@host.example\n' },
      { ...external, internetAddress: 'a@host.example,b@host.example' }, { ...external, senderId: 'missing' },
      { ...external, senderId: 'fictional-ai:hoshimori' }, { ...external, origin: 'local-ai:webllm:fixture' },
      { ...external, readAt: external.createdAt }, { ...external, replyToMailId: 'local' },
      { ...external, simulation: { runId: external.id, simulatedAt: external.createdAt, fictional: true } },
      { ...external, recipientConfirmation: { at: external.createdAt, replyMailId: 'local', provenance: 'local-resident-reply-v1' } },
    ];
    const imports = [];
    for (const bad of variants) {
      try { await repo.replaceFromJson(JSON.stringify({ ...good, mail: good.mail!.map((m) => m.id === external.id ? bad : m) }), { confirmReplace: true }); imports.push('saved'); }
      catch (e) { imports.push((e as { code: string }).code); }
      if (JSON.stringify(await repo.exportBackup()) !== JSON.stringify(good)) throw new Error('Invalid import changed world');
    }
    let readFailure = '', actorFailure = '';
    try { await repo.markMailRead(senderId, external.id); } catch (e) { readFailure = (e as { code: string }).code; }
    try { await repo.put('members', { ...before.members.find((m) => m.id === senderId)!, actor: 'ai' }); } catch (e) { actorFailure = (e as { code: string }).code; }
    await repo.replaceFromJson(JSON.stringify(good), { confirmReplace: true });
    const restored = await repo.exportBackup(); repo.close();
    window.mailRepo = await (await import(rp)).openRepository('mail-world');
    const reopened = await window.mailRepo.exportBackup();
    const afterRestore = await window.mailRepo.createHumanMail({ ...draft, id: 'after-restore' });
    other.close();
    return { before, first, concurrent, failures, preQuota, afterQuota, next, afterDelete, good, imports, readFailure, actorFailure, restored, reopened, afterRestore };
  });
  expect(result.first[0]).toEqual(result.first[1]); expect(result.first[0]!.number).toBe(1);
  expect(result.concurrent.map((m) => m.number).sort()).toEqual([2, 3]);
  expect(result.failures).toEqual([...Array(8).fill('validation'), 'quota']);
  expect(result.preQuota).toEqual(result.afterQuota); expect(result.next.number).toBe(4); expect(result.afterDelete.number).toBe(5);
  expect(result.imports).toEqual(Array(15).fill('validation'));
  expect(result.readFailure).toBe('validation'); expect(result.actorFailure).toBe('validation');
  expect(result.good.members).toEqual(result.before.members); expect(result.good.posts).toEqual(result.before.posts);
  expect(result.good.forums).toEqual(result.before.forums); expect(result.good.readStates).toEqual(result.before.readStates);
  expect(result.restored).toEqual(result.good); expect(result.reopened).toEqual(result.good); expect(result.afterRestore.number).toBe(6);
});

test('opt-in Internet samples and replies are atomic, isolated, idempotent and survive JSON/reopen', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, before = await repo.exportBackup();
    const human = before.members.find((m) => m.actor === 'human')!;
    const rp = '/src/storage/repository.ts', mp = '/src/ai/mail.ts';
    const other = await (await import(rp)).openRepository('mail-world') as LocalRepository;
    const first = await Promise.all([repo.loadInternetSample(human.id), other.loadInternetSample(human.id)]);
    const second = await repo.createHumanMember('別の読者');
    const another = await other.loadInternetSample(second.id);
    let isolation = '';
    try { await repo.markMailRead(second.id, first[0]!.id); } catch (e) { isolation = (e as { code: string }).code; }
    await repo.markMailRead(human.id, first[0]!.id);
    const draft = { id: 'external-reply', senderId: human.id, recipient: `INET#${first[0]!.senderInternetAddress}`,
      subject: 'Re: 秋の夜の散歩', body: '  日本語\n\nY\n　ｶﾅ  ', replyToMailId: first[0]!.id };
    const replies = await Promise.all([repo.createHumanMail(draft), other.createHumanMail(draft)]);
    let collision = '';
    try { await repo.createHumanMail({ ...draft, body: 'changed' }); } catch (e) { collision = (e as { code: string }).code; }
    const good = await repo.exportBackup();
    const { pairMail, buildMailPrompt } = await import(mp) as typeof import('../src/ai/mail');
    const pair = pairMail(good, 'fictional-ai:hoshimori', human.id);
    const targets = [];
    for (const letter of [first[0]!, replies[0]!]) {
      try { buildMailPrompt(good, 'hoshimori', { humanId: human.id, replyToMailId: letter.id }); targets.push('accepted'); }
      catch { targets.push('rejected'); }
    }
    await repo.replaceFromJson(await repo.exportJson(), { confirmReplace: true });
    const restored = await repo.exportBackup(); repo.close(); other.close();
    window.mailRepo = await (await import(rp)).openRepository('mail-world');
    const reopened = await window.mailRepo.exportBackup();
    const again = await window.mailRepo.loadInternetSample(human.id);
    return { before, first, another, isolation, replies, collision, good, restored, reopened, again, pair, targets };
  });
  expect(result.before.mail).toEqual([]);
  expect(result.first[0]).toEqual(result.first[1]); expect(result.first[0]!.number).toBe(1);
  expect(result.first[0]).toMatchObject({ senderInternetAddress: 'observer@letters.example.invalid', origin: 'local-sample:internet-letter-v1' });
  expect(Object.hasOwn(result.first[0]!, 'senderId')).toBe(false);
  expect(result.another.number).toBe(2); expect(result.isolation).toBe('validation');
  expect(result.replies[0]).toEqual(result.replies[1]); expect(result.replies[0]!.number).toBe(3);
  expect(result.collision).toBe('validation'); expect(result.pair).toEqual([]); expect(result.targets).toEqual(['rejected', 'rejected']);
  expect(result.good.settings.filter((s) => s.id !== 'active-human-member')).toEqual(result.before.settings.filter((s) => s.id !== 'active-human-member'));
  for (const key of ['posts', 'forums', 'sigs', 'readStates'] as const) expect(result.good[key]).toEqual(result.before[key]);
  expect(result.good.mail!.every((m) => !m.simulation && !m.recipientConfirmation)).toBe(true);
  expect(result.good.mail!.filter((m) => m.readAt).map((m) => m.id)).toEqual([result.first[0]!.id]);
  expect(result.restored).toEqual(result.good); expect(result.reopened).toEqual(result.good);
  expect(result.again).toEqual(result.good.mail!.find((m) => m.id === result.first[0]!.id));
});

test('incoming Internet schema and reply relationships reject forged imports and writes without changing the world', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, content = await repo.exportBackup(), human = content.members.find((m) => m.actor === 'human')!;
    const sample = await repo.loadInternetSample(human.id), second = await repo.createHumanMember('別人');
    const another = await repo.loadInternetSample(second.id);
    const local = await repo.createHumanMail({ id: 'resident-parent', senderId: human.id, recipient: 'hoshimori', subject: '内', body: '内' });
    const draft = { id: 'reply', senderId: human.id, recipient: `INET#${sample.senderInternetAddress}`, subject: 'Re: 秋', body: '返事', replyToMailId: sample.id };
    const reply = await repo.createHumanMail(draft), good = await repo.exportBackup();
    const variants: unknown[] = [
      { ...sample, senderId: human.id }, { ...sample, internetAddress: sample.senderInternetAddress },
      { ...sample, senderInternetAddress: undefined }, { ...sample, senderInternetAddress: '' }, { ...sample, senderInternetAddress: null },
      { ...sample, senderInternetAddress: 'a@host.example\n' }, { ...sample, senderInternetAddress: 'a'.repeat(255) },
      { ...sample, senderInternetAddress: 'a@host.example,b@host.example' }, { ...sample, senderInternetAddress: '日本@host.example' },
      { ...sample, recipientId: 'missing' }, { ...sample, recipientId: undefined }, { ...sample, recipientId: 'fictional-ai:hoshimori' },
      { ...sample, origin: 'local-human' }, { ...sample, origin: 'local-ai:webllm:fixture' }, { ...sample, unknown: true },
      { ...sample, replyToMailId: local.id }, { ...sample, body: '\u001b[2J' }, { ...sample, subject: 'two\nlines' },
      { ...sample, body: 'a'.repeat(20001) }, { ...sample, subject: 'a'.repeat(201) },
      { ...sample, simulation: { runId: sample.id, simulatedAt: sample.createdAt, fictional: true } },
      { ...sample, recipientConfirmation: { at: sample.createdAt, replyMailId: reply.id, provenance: 'local-resident-reply-v1' } },
    ];
    const cases = variants.map((bad) => ({ ...good, mail: good.mail!.map((m) => m.id === sample.id ? bad : m) }));
    for (const change of [{ replyToMailId: 'missing' }, { replyToMailId: another.id }, { replyToMailId: local.id },
      { replyToMailId: reply.id }, { number: sample.number }, { internetAddress: 'other@letters.example.invalid' },
      { senderId: second.id }, { createdAt: '2026-10-20T00:00:00.000Z' }]) {
      cases.push({ ...good, mail: good.mail!.map((m) => m.id === reply.id ? { ...m, ...change } : m) });
    }
    cases.push({ ...good, mail: [...good.mail!, { ...sample, id: 'duplicate-sample', number: 99 }] });
    const failures = [];
    for (const bad of cases) {
      try { await repo.replaceFromJson(JSON.stringify(bad), { confirmReplace: true }); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
      if (JSON.stringify(await repo.exportBackup()) !== JSON.stringify(good)) throw new Error('Rejected import changed world');
    }
    const writes = [];
    for (const change of [{ replyToMailId: 'missing' }, { replyToMailId: another.id }, { replyToMailId: local.id },
      { replyToMailId: reply.id }, { recipient: 'INET#other@letters.example.invalid' }, { senderId: second.id }, { recipient: 'hoshimori' }]) {
      try { await repo.createHumanMail({ ...draft, id: 'bad', ...change }); writes.push('saved'); }
      catch (e) { writes.push((e as { code: string }).code); }
    }
    for (const recipient of ['missing', 'fictional-ai:hoshimori']) {
      try { await repo.loadInternetSample(recipient); writes.push('saved'); } catch (e) { writes.push((e as { code: string }).code); }
    }
    let deletion = '', actor = '';
    try { await repo.delete('mail', sample.id); } catch (e) { deletion = (e as { code: string }).code; }
    try { await repo.put('members', { ...human, actor: 'ai' }); } catch (e) { actor = (e as { code: string }).code; }
    return { failures, writes, deletion, actor, good, after: await repo.exportBackup() };
  });
  expect(result.failures).toEqual(Array(31).fill('validation')); expect(result.writes).toEqual(Array(9).fill('validation'));
  expect(result.deletion).toBe('validation'); expect(result.actor).toBe('validation'); expect(result.after).toEqual(result.good);
});

for (const operation of ['sample', 'reply'] as const) {
  test(`Internet ${operation} quota/abort rollback keeps numbering and reset/restore fences reject stale actions`, async ({ page }) => {
    const result = await page.evaluate(async (operation) => {
      const repo = window.mailRepo, human = (await repo.list('members')).find((m) => m.actor === 'human')!;
      const parent = operation === 'reply' ? await repo.loadInternetSample(human.id) : undefined;
      const save = () => parent ? repo.createHumanMail({ id: 'reply', senderId: human.id, recipient: `INET#${parent.senderInternetAddress}`,
        subject: 'Re: 秋', body: '返事', replyToMailId: parent.id }) : repo.loadInternetSample(human.id);
      const before = await repo.exportBackup(), native = IDBObjectStore.prototype.put, failures = [];
      for (const mode of ['quota', 'abort']) {
        IDBObjectStore.prototype.put = function (value, key) {
          if (this.name === 'session' && key === 'mail-next-number') {
            if (mode === 'quota') throw new DOMException('quota', 'QuotaExceededError');
            this.transaction.abort();
          }
          return key === undefined ? native.call(this, value) : native.call(this, value, key);
        };
        try { await save(); failures.push('saved'); } catch (e) { failures.push((e as { code: string }).code); }
        finally { IDBObjectStore.prototype.put = native; }
        if (JSON.stringify(await repo.exportBackup()) !== JSON.stringify(before)) throw new Error('Failed save changed world');
      }
      const next = await save(), rp = '/src/storage/repository.ts';
      const stale = await (await import(rp)).openRepository('mail-world') as LocalRepository;
      const good = await repo.exportBackup();
      // Replacement deliberately retains the same JSON world; the private generation still fences it.
      await repo.replaceFromJson(JSON.stringify(good), { confirmReplace: true });
      let staleRestore = '', staleReset = '';
      try { await stale.loadInternetSample(human.id); } catch (e) { staleRestore = (e as { code: string }).code; }
      const stale2 = await (await import(rp)).openRepository('mail-world') as LocalRepository;
      await repo.resetWorld({ confirmReset: true });
      try { await stale2.loadInternetSample(human.id); } catch (e) { staleReset = (e as { code: string }).code; }
      const reset = await repo.exportBackup();
      // Old backups without mail restore empty and remain empty on reopening.
      const legacy = { ...good }; delete legacy.mail;
      await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
      repo.close(); stale.close(); stale2.close();
      window.mailRepo = await (await import(rp)).openRepository('mail-world');
      return { failures, before, next, staleRestore, staleReset, reset, legacy: await window.mailRepo.exportBackup() };
    }, operation);
    expect(result.failures[0]).toBe('quota'); expect(result.failures[1]).not.toBe('saved');
    expect(result.next.number).toBe(result.before.mail!.length + 1);
    expect(result.staleRestore).toBe('stale'); expect(result.staleReset).toBe('stale');
    expect(result.reset.mail).toEqual([]); expect(result.legacy.mail).toEqual([]);
  });
}

test('sample IDs reject collisions, mixed sample/resident allocation stays monotonic and stale confirmation rolls back', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, human = (await repo.list('members')).find((m) => m.actor === 'human')!;
    const draft = { id: `internet-sample-v1:${human.id}`, senderId: human.id, recipient: 'hoshimori', subject: '衝突', body: '元の手紙' };
    await repo.createHumanMail(draft);
    const before = await repo.exportBackup(); let collision = '';
    try { await repo.loadInternetSample(human.id); } catch (e) { collision = (e as { code: string }).code; }
    const after = await repo.exportBackup(); await repo.delete('mail', draft.id);
    const rp = '/src/storage/repository.ts', other = await (await import(rp)).openRepository('mail-world') as LocalRepository;
    const mixed = await Promise.all([repo.loadInternetSample(human.id), other.createHumanMail({ ...draft, id: 'mixed-resident' })]);
    const beforeStale = await repo.exportBackup(); let stale = '';
    try { await repo.loadInternetSample(human.id, 'old-world-context'); } catch (e) { stale = (e as { code: string }).code; }
    other.close(); return { collision, before, after, mixed, stale, beforeStale, afterStale: await repo.exportBackup() };
  });
  expect(result.collision).toBe('validation'); expect(result.after).toEqual(result.before);
  expect(result.mixed.map((m) => m.number).sort()).toEqual([2, 3]);
  expect(result.stale).toBe('stale'); expect(result.afterStale).toEqual(result.beforeStale);
});

test('multi-mail complete-set retries, collisions, mixed concurrent numbering and rollback use one transaction', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, before = await repo.exportBackup();
    const senderId = before.members.find((m) => m.actor === 'human')!.id;
    const recipientIds = ['fictional-ai:hoshimori', 'fictional-ai:kusabue'];
    const draft = { id: 'multi', senderId, recipientIds, subject: '  招待  ', body: '  日本語\n\n　ｶﾅ  ' };
    const path = '/src/storage/repository.ts';
    const other = await (await import(path)).openRepository('mail-world') as LocalRepository;
    const first = await Promise.all([repo.createHumanMultiMail(draft), other.createHumanMultiMail(draft)]);
    const failures: string[] = [];
    for (const change of [{ body: 'collision' }, { subject: 'changed' }, { recipientIds: [...recipientIds].reverse() },
      { recipientIds: [recipientIds[0]!, 'fictional-ai:hankote'] }, { recipientIds: [recipientIds[0]!] },
      { recipientIds: [recipientIds[0]!, recipientIds[0]!] }, { recipientIds: ['hoshimori', recipientIds[1]!] },
      { recipientIds: [senderId, recipientIds[1]!] }, { recipientIds: ['INET#one@letters.example.invalid', recipientIds[1]!] },
      { recipientIds: ['missing', recipientIds[1]!] }, { senderId: recipientIds[0]! }, { subject: ' ' }, { body: '\u001b[2J' }, { extra: true }]) {
      try { await repo.createHumanMultiMail({ ...draft, ...change } as never); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    const [multi, local, internet] = await Promise.all([
      other.createHumanMultiMail({ ...draft, id: 'second' }),
      repo.createHumanMail({ id: 'ordinary', senderId, recipient: 'hoshimori', subject: '普通', body: '一通' }),
      repo.createHumanMail({ id: 'internet', senderId, recipient: 'INET#one@letters.example.invalid', subject: '外', body: '保存のみ' }),
    ]);
    // Throw after the first mail.add has succeeded, during the second copy's allocation.
    const native = IDBObjectStore.prototype.put;
    let allocations = 0;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'session' && key === 'mail-next-number' && ++allocations === 2) throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    let quota = '';
    try { await repo.createHumanMultiMail({ ...draft, id: 'retry' }); }
    catch (e) { quota = (e as { code: string }).code; }
    finally { IDBObjectStore.prototype.put = native; }
    const afterFailure = await repo.list('mail');
    const retry = await repo.createHumanMultiMail({ ...draft, id: 'retry' });
    // An imported/partially deleted set must fail closed, never fill in only missing copies.
    await repo.delete('mail', retry[1]!.id);
    let incomplete = '';
    try { await repo.createHumanMultiMail({ ...draft, id: 'retry' }); } catch (e) { incomplete = (e as { code: string }).code; }
    other.close();
    return { first, failures, numbers: [...multi, local, internet].map((m) => m.number).sort((a, b) => a - b),
      quota, allocations, afterFailure, retry, incomplete, before, after: await repo.exportBackup() };
  });
  expect(result.first[0]).toEqual(result.first[1]);
  expect(result.first[0]!.map((m) => m.number)).toEqual([1, 2]);
  expect(result.failures).toEqual(Array(14).fill('validation'));
  expect(result.numbers).toEqual([3, 4, 5, 6]);
  expect(result.quota).toBe('quota'); expect(result.allocations).toBe(2);
  expect(result.afterFailure).toHaveLength(6);
  expect(result.retry.map((m) => m.number)).toEqual([7, 8]); expect(result.incomplete).toBe('validation');
  for (const key of ['members', 'sigs', 'forums', 'posts', 'readStates', 'settings'] as const) expect(result.after[key]).toEqual(result.before[key]);
});

test('multi-mail JSON, legacy and empty restore, pinned eligibility and identical-world generation fences', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, before = await repo.exportBackup();
    const senderId = before.members.find((m) => m.actor === 'human')!.id;
    const draft = { id: 'multi', senderId, recipientIds: ['fictional-ai:hoshimori', 'fictional-ai:kusabue'], subject: '便り', body: '一緒に星を見ませんか。' };
    await repo.createHumanMultiMail(draft);
    const saved = await repo.exportBackup(), path = '/src/storage/repository.ts';
    const other = await (await import(path)).openRepository('mail-world') as LocalRepository;
    await repo.replaceFromJson(JSON.stringify(saved), { confirmReplace: true });
    const restored = await repo.exportBackup(); let stale = '';
    try { await other.createHumanMultiMail({ ...draft, id: 'stale' }); } catch (e) { stale = (e as { code: string }).code; }
    other.close();
    const retry = await repo.createHumanMultiMail(draft);
    const { mail: _mail, ...legacy } = before;
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    const legacyMail = await repo.list('mail');
    await repo.replaceFromJson(JSON.stringify({ ...before, mail: [] }), { confirmReplace: true });
    const emptyMail = await repo.list('mail');
    // Simulate a removed roster entry outside guarded repository APIs.
    const db = await new Promise<IDBDatabase>((resolve) => { const req = indexedDB.open('mail-world'); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>((resolve) => { const tx = db.transaction('members', 'readwrite'); tx.objectStore('members').delete(draft.recipientIds[1]!); tx.oncomplete = () => resolve(); });
    db.close();
    let removed = '';
    try { await repo.createHumanMultiMail(draft); } catch (e) { removed = (e as { code: string }).code; }
    return { saved, restored, retry, stale, legacyMail, emptyMail, removed, final: await repo.list('mail') };
  });
  expect(result.restored).toEqual(result.saved); expect(result.retry).toEqual(result.saved.mail);
  expect(result.stale).toBe('stale'); expect(result.legacyMail).toEqual([]); expect(result.emptyMail).toEqual([]);
  expect(result.removed).toBe('validation'); expect(result.final).toEqual([]);
});

test('multi-mail copies keep pair prompts and explicit-parent confirmations independent', async ({ page }) => {
  const result = await page.evaluate(async (epoch) => {
    const repo = window.mailRepo, content = await repo.exportBackup();
    const humanId = content.members.find((m) => m.actor === 'human')!.id;
    const parents = await repo.createHumanMultiMail({ id: 'invitation', senderId: humanId,
      recipientIds: ['fictional-ai:hoshimori', 'fictional-ai:kusabue'], subject: '観望会', body: '週末、一緒に星を見ませんか。' });
    await repo.createHumanMail({ id: 'private-other', senderId: humanId, recipient: 'kusabue', subject: '秘密の草笛', body: '草笛だけへの私信' });
    const mp = '/src/ai/mail.ts', { buildMailPrompt, pairMail } = await import(mp);
    const prompts = [], stages = [];
    for (const [index, personaId] of ['hoshimori', 'kusabue'].entries()) {
      const parent = parents[index]!, target = { humanId, replyToMailId: parent.id };
      const before = await repo.exportBackup();
      prompts.push(buildMailPrompt(before, personaId, target));
      const activity = await repo.openActivity();
      const batchId = `batch:${personaId}`;
      const run = { id: `${batchId}:one`, personaId, simulatedAt: epoch, status: 'running' as const, mail: target };
      await repo.put('settings', { id: 'ai-activity', value: { ...activity, consent: true, batch: {
        id: batchId, from: epoch, to: '2026-10-21T01:00:00.000Z', modelId: activity.modelId, runs: [run],
      } } as never });
      const raw = JSON.stringify({ personaId, recipientId: humanId, replyToMailId: JSON.parse(prompts[index]!.user).replyToMailId,
        subject: 'Re: 観望会', body: `${personaId}からの返事です。楽しみです。` });
      const saved = await repo.commitAiRun(run.id, raw);
      const after = await repo.exportBackup();
      stages.push({ saved, confirmations: parents.map((p) => after.mail!.find((m) => m.id === p.id)!.recipientConfirmation),
        pairIds: pairMail(after, parent.recipientId!, humanId).map((m) => m.id) });
    }
    return { prompts, parents, stages, after: await repo.exportBackup() };
  }, epoch);
  expect(result.prompts[0]!.user).toContain('週末、一緒に星を見ませんか。');
  expect(JSON.stringify(result.prompts[0])).not.toMatch(/草笛だけへの私信|秘密の草笛|kusabue|recipientIds|copies/);
  for (const prompt of result.prompts) {
    // Inspect the full model input, including schema enums, for either copy's
    // batch prefix, shared retry identity and ordinal-bearing storage ID.
    expect(JSON.stringify(prompt)).not.toMatch(/local-multi|invitation|recipientIds|copies/);
    for (const parent of result.parents) expect(JSON.stringify(prompt)).not.toContain(parent.id);
    expect(JSON.parse(prompt.user).replyToMailId).toBe('reply-target');
    expect(JSON.parse(prompt.schema).properties.replyToMailId.enum).toEqual(['reply-target']);
  }
  expect(result.stages[0]!.confirmations[0]).toBeTruthy(); expect(result.stages[0]!.confirmations[1]).toBeUndefined();
  expect(result.stages[1]!.confirmations.every(Boolean)).toBe(true);
  for (let i = 0; i < 2; i++) {
    expect(result.stages[i]!.pairIds).toContain(result.parents[i]!.id);
    expect(result.stages[i]!.pairIds).not.toContain(result.parents[1 - i]!.id);
    expect(result.stages[i]!.saved).toMatchObject({ replyToMailId: result.parents[i]!.id, recipientId: result.parents[i]!.senderId });
  }
});

for (const failure of ['validation', 'abort'] as const) {
  test(`multi-mail ${failure} after an earlier copy write rolls back the set and allocator`, async ({ page }) => {
    const result = await page.evaluate(async (failure) => {
      const repo = window.mailRepo, before = await repo.exportBackup();
      const draft = { id: 'rollback', senderId: before.members.find((m) => m.actor === 'human')!.id,
        recipientIds: ['fictional-ai:hoshimori', 'fictional-ai:kusabue'], subject: '一括', body: '本文' };
      const path = '/src/storage/repository.ts', { RepositoryError } = await import(path);
      const native = IDBObjectStore.prototype.add; let copies = 0, code = '';
      IDBObjectStore.prototype.add = function (value, key) {
        if (this.name === 'mail' && ++copies === 2) {
          if (failure === 'validation') throw new RepositoryError('validation', 'Injected validation failure after first insert.');
          this.transaction.abort();
        }
        return key === undefined ? native.call(this, value) : native.call(this, value, key);
      };
      try { await repo.createHumanMultiMail(draft); } catch (e) { code = (e as { code: string }).code; }
      finally { IDBObjectStore.prototype.add = native; }
      const after = await repo.exportBackup(), retry = await repo.createHumanMultiMail(draft);
      return { before, after, retry, copies, code };
    }, failure);
    expect(result.after).toEqual(result.before); expect(result.copies).toBe(2);
    expect(result.code).toBe(failure === 'validation' ? 'validation' : 'storage');
    expect(result.retry.map((m) => m.number)).toEqual([1, 2]);
  });
}

test('native files: canonical bytes, complete retry identity, rollback and mixed scheduled/text/file numbering', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
    const fp = '/src/storage/mail-file.ts', { encodeMailBytes, decodeMailFile } = await import(fp);
    const bytes = Uint8Array.from({ length: 262144 }, (_, i) => i % 256);
    const draft = { id: 'file', senderId, recipientId: 'fictional-ai:hoshimori', subject: 'private-file-subject',
      file: { encoding: 'base64' as const, filename: 'original.bin', size: bytes.length, data: encodeMailBytes(bytes) } };
    const rp = '/src/storage/repository.ts', other = await (await import(rp)).openRepository('mail-world') as LocalRepository;
    const copies = await Promise.all([repo.createHumanFileMail(draft), other.createHumanFileMail(draft)]);
    const collisions = [];
    for (const change of [{ subject: 'changed' }, { recipientId: 'fictional-ai:kusabue' },
      { file: { ...draft.file, filename: 'other.bin' } }, { file: { ...draft.file, data: encodeMailBytes(new Uint8Array(bytes.length)) } }]) {
      try { await repo.createHumanFileMail({ ...draft, ...change }); collisions.push('saved'); } catch (e) { collisions.push((e as { code: string }).code); }
    }
    try { await repo.createHumanMail({ id: draft.id, senderId, recipient: 'hoshimori', subject: draft.subject, body: 'different kind' }); collisions.push('saved'); }
    catch (e) { collisions.push((e as { code: string }).code); }
    const before = await repo.exportBackup(), failures = [];
    const native = IDBObjectStore.prototype.put;
    for (const mode of ['quota', 'abort']) {
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === 'session' && key === 'mail-next-number') {
          if (mode === 'quota') throw new DOMException('quota', 'QuotaExceededError');
          this.transaction.abort();
        }
        return key === undefined ? native.call(this, value) : native.call(this, value, key);
      };
      try { await repo.createHumanFileMail({ ...draft, id: 'retry' }); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
      finally { IDBObjectStore.prototype.put = native; }
      if (JSON.stringify(await repo.exportBackup()) !== JSON.stringify(before)) throw new Error('Failure changed world or bytes');
    }
    const retry = await repo.createHumanFileMail({ ...draft, id: 'retry' });
    const cp = '/src/calendar.ts', { calendarSetting, scheduleTime, scheduleInstant } = await import(cp);
    const now = new Date().toISOString(), calendar = calendarSetting(before)!;
    const dueAt = scheduleInstant(scheduleTime(new Date(Date.now() + 3600000).toISOString(), calendar), calendar, now);
    await repo.scheduleHumanMail({ id: 'P-fileconcurrent', senderId, recipientId: draft.recipientId, recipientLabel: '星守', subject: '予約', body: '本文', dueAt }, now);
    const [file, text, scheduled] = await Promise.all([
      repo.createHumanFileMail({ ...draft, id: 'concurrent-file' }),
      other.createHumanMail({ id: 'text', senderId, recipient: 'hoshimori', subject: 'text', body: 'body' }),
      other.reconcileScheduledMail(dueAt),
    ]);
    const good = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(good), { confirmReplace: true });
    const restored = await repo.exportBackup();
    const exact = encodeMailBytes(decodeMailFile(restored.mail!.find((m) => m.id === draft.id)!.file)) === draft.file.data;
    let stale = ''; try { await other.createHumanFileMail({ ...draft, id: 'stale' }); } catch (e) { stale = (e as { code: string }).code; }
    other.close();
    return { copiesEqual: JSON.stringify(copies[0]) === JSON.stringify(copies[1]), collisions, failures, retry: retry.number,
      numbers: [file, text, ...scheduled].map((m) => m.number).sort((a, b) => a - b), exact, roundtrip: JSON.stringify(good) === JSON.stringify(restored), stale };
  });
  expect(result).toMatchObject({ copiesEqual: true, collisions: Array(5).fill('validation'), failures: ['quota', 'storage'],
    retry: 2, numbers: [3, 4, 5], exact: true, roundtrip: true, stale: 'stale' });
});

test('native files reject malformed bytes, unsafe names, invalid actors and unsupported combinations before writes or restore', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const repo = window.mailRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
    const draft = { id: 'file', senderId, recipientId: 'fictional-ai:hoshimori', subject: 'file',
      file: { encoding: 'base64' as const, filename: 'original.bin', size: 1, data: '/w==' } };
    const letter = await repo.createHumanFileMail(draft), good = await repo.exportBackup();
    const badFiles: unknown[] = [null, {}, { ...draft.file, encoding: 'utf8' }, { ...draft.file, size: -1 },
      { ...draft.file, size: 1.1 }, { ...draft.file, size: 262145 }, { ...draft.file, size: 0 }, { ...draft.file, size: '1' },
      { ...draft.file, data: '/w' }, { ...draft.file, data: '/x==' }, { ...draft.file, data: '/w==\n' },
      { ...draft.file, data: '☃===' }, { ...draft.file, extra: true }, { ...draft.file, data: 'A'.repeat(349532) },
      ...['../x', '/x.bin', 'C:\\x.bin', '.hidden', 'a..b', 'a.', 'NUL', 'com1.txt', 'a b', '日本.bin', 'a\n.bin', 'a'.repeat(65), ''].map((filename) => ({ ...draft.file, filename }))];
    const failures: string[] = [];
    const rejectRestore = async (mail: unknown, backup = good) => {
      try { await repo.replaceFromJson(JSON.stringify({ ...backup, mail: [mail] }), { confirmReplace: true }); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
      if (JSON.stringify(await repo.exportBackup()) !== JSON.stringify(good)) throw new Error('Invalid backup changed world');
    };
    for (const file of badFiles) {
      try { await repo.createHumanFileMail({ ...draft, id: 'bad', file } as never); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
      await rejectRestore({ ...letter, file });
    }
    for (const change of [{ body: 'mixed' }, { replyToMailId: 'file' }, { readAt: letter.createdAt },
      { recipientConfirmation: { at: letter.createdAt, replyMailId: 'r', provenance: 'local-resident-reply-v1' } },
      { recipientId: 'missing' }, { senderId: 'missing' }, { recipientId: senderId },
      { senderId: letter.recipientId, recipientId: senderId },
      { recipientId: undefined, internetAddress: 'a@letters.example.invalid' },
      { senderId: undefined, senderInternetAddress: 'a@letters.example.invalid', origin: 'local-sample:internet-letter-v1', recipientId: senderId },
      { delivery: { scheduleId: 'P-x', submittedAt: letter.createdAt, availableAt: letter.createdAt } },
      { file: undefined }, { extra: true }]) await rejectRestore({ ...letter, ...change });
    for (const change of [{ recipientId: 'hoshimori' }, { recipientId: 'missing' }, { senderId: 'missing' },
      { senderId: 'fictional-ai:kusabue' }, { subject: '' }, { subject: '\u001bfile' }, { extra: true }, { body: '' }]) {
      try { await repo.createHumanFileMail({ ...draft, id: 'invalid-draft', ...change } as never); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    const parentReply = { ...letter, id: 'resident-reply', number: 2, file: undefined, body: 'reply', subject: 'reply',
      senderId: letter.recipientId, recipientId: senderId, replyToMailId: letter.id, origin: 'local-ai:webllm:fixture',
      simulation: { runId: 'resident-reply', simulatedAt: letter.createdAt, fictional: true } };
    try { await repo.replaceFromJson(JSON.stringify({ ...good, mail: [letter, parentReply] }), { confirmReplace: true }); failures.push('saved'); }
    catch (e) { failures.push((e as { code: string }).code); }
    let read = ''; try { await repo.markMailRead(senderId, letter.id); } catch (e) { read = (e as { code: string }).code; }
    const empty = await repo.createHumanFileMail({ ...draft, id: 'empty', file: { ...draft.file, size: 0, data: '' } });
    await repo.resetWorld({ confirmReset: true }); const reset = await repo.list('mail');
    const legacy = { ...good }; delete legacy.mail;
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    return { failures, read, empty: empty.file, reset, legacy: await repo.list('mail') };
  });
  expect(result.failures.length).toBeGreaterThan(60); expect(new Set(result.failures)).toEqual(new Set(['validation']));
  expect(result.read).toBe('validation'); expect(result.empty).toMatchObject({ size: 0, data: '' });
  expect(result.reset).toEqual([]); expect(result.legacy).toEqual([]);
});

test('native files remain outside prompts and planning; direct, restored and already-planned reply parents fail closed', async ({ page }) => {
  const result = await page.evaluate(async (epoch) => {
    const repo = window.mailRepo, initial = await repo.exportBackup(), humanId = initial.members.find((m) => m.actor === 'human')!.id;
    const file = await repo.createHumanFileMail({ id: 'excluded-file', senderId: humanId, recipientId: 'fictional-ai:hoshimori', subject: 'PRIVATE-FILE-SUBJECT',
      file: { encoding: 'base64', filename: 'PRIVATE-FILE-NAME.bin', size: 1, data: '/w==' } });
    const text = await repo.createHumanMail({ id: 'text-parent', senderId: humanId, recipient: 'hoshimori', subject: 'ordinary', body: 'text only' });
    const mp = '/src/ai/mail.ts', { pairMail, buildMailPrompt, chooseMail } = await import(mp);
    const pp = '/src/ai/personas.ts', { residentProfiles } = await import(pp);
    const gp = '/src/ai/generation.ts', { buildPrompt } = await import(gp);
    const content = await repo.exportBackup(), profile = residentProfiles(content).find((p) => p.id === 'hoshimori')!;
    const prompt = buildMailPrompt(content, 'hoshimori', { humanId, replyToMailId: text.id });
    const forumPrompt = buildPrompt(content, { personaId: 'hoshimori', forumId: content.forums[0]!.id });
    const choices = Array.from({ length: 100 }, (_, i) => chooseMail({ ...content, mail: [file] }, profile, Date.parse(epoch) + 3600000, String(i), []));
    const failures: string[] = [];
    try { buildMailPrompt(content, 'hoshimori', { humanId, replyToMailId: file.id }); failures.push('prompted'); }
    catch (e) { failures.push((e as { code: string }).code); }
    const activity = await repo.openActivity(), run = { id: 'file-batch:one', personaId: 'hoshimori', simulatedAt: epoch, status: 'running' as const, mail: { humanId, replyToMailId: file.id } };
    const value = { ...activity, consent: true, batch: { id: 'file-batch', from: epoch, to: '2026-10-21T01:00:00.000Z', modelId: activity.modelId, runs: [run] } };
    try { await repo.put('settings', { id: 'ai-activity', value: value as never }); failures.push('planned'); } catch (e) { failures.push((e as { code: string }).code); }
    try { await repo.replaceFromJson(JSON.stringify({ ...content, settings: [...content.settings.filter((s) => s.id !== 'ai-activity'), { id: 'ai-activity', value }] }), { confirmReplace: true }); failures.push('restored'); }
    catch (e) { failures.push((e as { code: string }).code); }
    // Simulate an already-planned run from unguarded old code; commitment must revalidate.
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('mail-world'); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>((resolve) => { const tx = db.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ id: 'ai-activity', value }); tx.oncomplete = () => resolve(); }); db.close();
    try { await repo.commitAiRun(run.id, JSON.stringify({ personaId: 'hoshimori', recipientId: humanId, replyToMailId: 'reply-target', subject: 'Re', body: 'reply' })); failures.push('committed'); }
    catch (e) { failures.push((e as { code: string }).code); }
    return { pair: pairMail(content, file.recipientId!, humanId).map((m: Mail) => m.id), prompt, forumPrompt, choices, failures,
      savedFile: (await repo.list('mail')).find((m) => m.id === file.id), count: (await repo.list('mail')).length };
  }, epoch);
  expect(result.pair).toEqual(['text-parent']); expect(JSON.stringify([result.prompt, result.forumPrompt])).not.toMatch(/PRIVATE-FILE|excluded-file|\/w==/);
  expect(result.choices.every((m) => m === null)).toBe(true); expect(result.failures).toEqual(Array(4).fill('validation'));
  expect(result.savedFile).not.toHaveProperty('recipientConfirmation'); expect(result.count).toBe(2);
});
