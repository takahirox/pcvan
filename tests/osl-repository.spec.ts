import { expect, test } from '@playwright/test';
import type { OslState } from '../src/storage/schema';

const now = '2026-10-24T02:00:00.000Z';

test('OSL atomically allocates category numbers, rejects collisions, deduplicates retries and protects authors and other records', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts', sp = '/src/service-collections.ts', gp = '/src/ai/generation.ts';
    const { openRepository, oslState } = await import(rp) as typeof import('../src/storage/repository');
    const { categoryItems } = await import(sp) as typeof import('../src/service-collections');
    const { buildPrompt } = await import(gp) as typeof import('../src/ai/generation');
    const repo = await openRepository('osl-transactions'), other = await openRepository('osl-transactions');
    await repo.openActivity(now); const author = await repo.createHumanMember('記録係');
    const before = await repo.exportBackup();
    const draft = { id: 'first', category: 1 as const, authorId: author.id, filename: 'ORIGINAL.txt',
      title: '  日本語 <b>題</b>  ', purpose: '  観察の記録  ', body: '  日本語　ｶﾅ <b>文字</b>  \n\nMAIN\n.END\n' };
    const first = await Promise.all([repo.createOslEntry(draft, now), other.createOslEntry(draft, now)]);
    const parallel = await Promise.all([repo.createOslEntry({ ...draft, id: 'second', filename: 'SECOND.TXT' }, now),
      other.createOslEntry({ ...draft, id: 'third', filename: 'THIRD.TXT' }, now)]);
    const collision = await Promise.allSettled([repo.createOslEntry({ ...draft, id: 'collision-a', filename: 'SAME.TXT' }, now),
      other.createOslEntry({ ...draft, id: 'collision-b', filename: 'same.txt' }, now)]);
    const secondCategory = await repo.createOslEntry({ ...draft, id: 'category-2', category: 2 }, now);
    const failures: string[] = [];
    for (const change of [{ id: draft.id, body: 'changed retry' }, { category: 3 }, { authorId: 'missing' }, { authorId: 'fictional-ai:kusabue' },
      { filename: 'noteinfo.txt' }, { filename: 'original.TXT' }, { filename: '../PATH.TXT' }, { filename: 'A/B.TXT' },
      { filename: 'A.EXE' }, { filename: 'A'.repeat(61) + '.TXT' }, { filename: 'A B.TXT' }, { filename: '日本語.TXT' },
      { title: ' ' }, { title: 'x'.repeat(201) }, { title: 'a\nb' }, { purpose: '' }, { purpose: 'x'.repeat(201) },
      { purpose: '\u001b[2J' }, { body: ' ' }, { body: 'x'.repeat(20001) }, { body: '\u0000' }, { body: '\u202e文字' },
      { createdAt: 'bad' }]) {
      try { await repo.createOslEntry({ ...draft, id: 'invalid', ...change } as typeof draft, now); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    for (const operation of [() => repo.delete('members', author.id), () => repo.put('members', { ...author, actor: 'ai' })]) {
      try { await operation(); failures.push('changed'); } catch (e) { failures.push((e as { code: string }).code); }
    }
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings' && value.id === 'osl-local') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.createOslEntry({ ...draft, id: 'retry', filename: 'RETRY.TXT' }, now); }
    catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.put = native; }
    const failed = oslState(await repo.exportBackup());
    const retry = await repo.createOslEntry({ ...draft, id: 'retry', filename: 'RETRY.TXT', body: '編集して再試行' }, now);
    const after = await repo.exportBackup();
    const context = { personaId: 'kusabue', forumId: before.forums[0]!.id };
    const prompts = [buildPrompt(before, context), buildPrompt(after, context)];
    repo.close(); other.close();
    return { before, after, first, parallel, collision: collision.map((r) => r.status), secondCategory, failures, failed, retry,
      catalog: categoryItems('OSL', 1, after), prompts };
  }, now);
  expect(result.first[0]).toEqual(result.first[1]); expect(result.first[0]!.number).toBe(2);
  expect(result.parallel.map((r) => r.number).sort()).toEqual([3, 4]);
  expect(result.collision.sort()).toEqual(['fulfilled', 'rejected']); expect(result.secondCategory.number).toBe(2);
  expect(result.failures).toEqual([...Array(25).fill('validation'), 'quota']);
  expect(result.retry.number).toBe(result.failed.nextNumbers['1']); expect(result.retry.createdAt).toBe(now);
  expect(result.retry.body).toBe('編集して再試行');
  for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'session'] as const) expect(result.after[key]).toEqual(result.before[key]);
  expect(result.after.settings.filter((s) => s.id !== 'osl-local')).toEqual(result.before.settings);
  expect(result.prompts[1]).toEqual(result.prompts[0]);
  expect(result.catalog[1]!.body).toBe('  日本語　ｶﾅ <b>文字</b>  \n\nMAIN\n.END\n');
  expect(result.catalog[1]!.author).toMatch(/^記録係 \(SYN-[A-Z0-9]+\)$/);
  expect(result.catalog[1]!.date).toBe('2026年10月24日 11:00:00');
});

test('OSL validates direct settings and atomic restores, preserves legacy/empty state, rolls back quota failures and fences stale worlds', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts';
    const { openRepository, oslState, emptyOsl } = await import(rp) as typeof import('../src/storage/repository');
    const repo = await openRepository('osl-backups'); await repo.openActivity(now);
    const author = await repo.createHumanMember('保存係');
    const draft = { id: 'saved', category: 2 as const, authorId: author.id, filename: 'OBSERVE.CSV', title: '観察', purpose: '観察表', body: '日付,鳥\n10/24,二羽\n' };
    await repo.createOslEntry(draft, now);
    await repo.createOslEntry({ ...draft, id: 'next', filename: 'NEXT.CSV' }, now);
    const original = await repo.exportBackup(), failures: string[] = [];
    for (let i = 0; i < 24; i++) {
      const bad = structuredClone(original), setting = bad.settings.find((s) => s.id === 'osl-local')!;
      const state = setting.value as unknown as OslState, rows = state.entries;
      if (i === 0) state.version = 2 as never;
      if (i === 1) state.nextNumbers['2']++;
      if (i === 2) rows[1]!.number = rows[0]!.number;
      if (i === 3) rows[1]!.id = rows[0]!.id;
      if (i === 4) rows[0]!.category = 3 as never;
      if (i === 5) rows[0]!.authorId = 'missing';
      if (i === 6) rows[0]!.authorId = 'fictional-ai:kusabue';
      if (i === 7) rows[0]!.createdAt = '1996-01-01';
      if (i === 8) rows[0]!.filename = 'haru96.csv';
      if (i === 9) rows[1]!.filename = 'observe.csv';
      if (i === 10) rows[0]!.filename = '../BAD.TXT';
      if (i === 11) rows[0]!.body = '\u001b';
      if (i === 12) rows[0]!.title = ' ';
      if (i === 13) rows[0]!.purpose = 'a\nb';
      if (i === 14) rows[0]!.origin = 'local-ai' as never;
      if (i === 15) Object.assign(state, { unknown: [] });
      if (i === 16) delete (state.nextNumbers as Partial<OslState['nextNumbers']>)['1'];
      if (i === 17) rows[0]!.number = 1;
      if (i === 18) rows[0]!.id = '\u0000';
      if (i === 19) rows[0]!.body = 'x'.repeat(20001);
      if (i === 20) rows[0]!.purpose = 'x'.repeat(201);
      if (i === 21) rows[0]!.body = '\u200b文字';
      if (i === 22) rows[0]!.filename = 'BAD.EXE';
      if (i === 23) rows.reverse();
      for (const operation of ['put', 'restore']) {
        try {
          if (operation === 'put') await repo.put('settings', setting);
          else await repo.replaceFromJson(JSON.stringify(bad), { confirmReplace: true });
          failures.push('saved');
        } catch (e) { failures.push((e as { code: string }).code); }
      }
    }
    const afterInvalid = await repo.exportBackup();
    const native = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'settings' && value.id === 'osl-local') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.replaceFromJson(JSON.stringify(original), { confirmReplace: true }); }
    catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.add = native; }
    const afterQuota = await repo.exportBackup();
    const stale = await openRepository('osl-backups');
    await repo.replaceFromJson(await repo.exportJson(), { confirmReplace: true });
    const roundtrip = await repo.exportBackup();
    try { await stale.createOslEntry({ ...draft, id: 'stale', filename: 'STALE.TXT' }); }
    catch (e) { failures.push((e as { code: string }).code); }
    const legacy = structuredClone(original); legacy.settings = legacy.settings.filter((s) => s.id !== 'osl-local');
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true });
    const absent = await repo.exportBackup();
    await repo.put('settings', { id: 'osl-local', value: emptyOsl() as never });
    await repo.replaceFromJson(await repo.exportJson(), { confirmReplace: true });
    await repo.openActivity(now);
    const empty = oslState(await repo.exportBackup());
    await repo.createOslEntry(draft, now); await repo.resetWorld({ confirmReset: true });
    const reset = oslState(await repo.exportBackup());
    stale.close(); repo.close(); return { original, afterInvalid, afterQuota, roundtrip, absent, empty, reset, failures };
  }, now);
  expect(result.failures).toEqual([...Array(48).fill('validation'), 'quota', 'stale']);
  expect(result.afterInvalid).toEqual(result.original); expect(result.afterQuota).toEqual(result.original);
  expect(result.roundtrip).toEqual(result.original);
  expect(result.absent.settings.some((s) => s.id === 'osl-local')).toBe(false);
  expect(result.empty).toEqual({ version: 1, nextNumbers: { '1': 2, '2': 2 }, entries: [] });
  expect(result.reset).toEqual(result.empty);
});
