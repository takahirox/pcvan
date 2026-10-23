import { expect, test } from '@playwright/test';
import type { LocalRepository } from '../src/storage/repository';

declare global { interface Window { mailRepo: LocalRepository } }
const epoch = '2026-10-21T00:00:00.000Z';

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
