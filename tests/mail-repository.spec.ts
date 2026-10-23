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
    const raw = JSON.stringify({ personaId: run.personaId, recipientId: humanId, replyToMailId: parent.id,
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
    const raw = JSON.stringify({ personaId: 'hoshimori', recipientId: humanId, replyToMailId: sent.id, subject: 'Re: 便り', body: 'お便りありがとう。' });
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
  expect(result.stale).toBe('stale'); expect(result.reset.mail).toEqual([]); expect(result.reset.posts).toHaveLength(66);
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
