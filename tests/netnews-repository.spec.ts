import { expect, test } from '@playwright/test';
import type { NetNewsState } from '../src/storage/schema';

const now = '2026-10-24T02:00:00.000Z';
test('NetNews atomic allocation, concurrent/idempotent drafts, group identities, reference chains and failed-save retry', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts', np = '/src/netnews.ts', ap = '/src/ai/generation.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { netNewsGroups, netNewsState, netNewsGroup } = await import(np) as typeof import('../src/netnews');
    const { buildPrompt } = await import(ap) as typeof import('../src/ai/generation');
    const repo = await openRepository('netnews-transactions'), other = await openRepository('netnews-transactions');
    await repo.openActivity(now); const human = await repo.createHumanMember('記録係');
    const before = await repo.exportBackup(), group = netNewsGroups[0]!, secondGroup = netNewsGroups[1]!;
    const draft = { id: 'draft-1', group: group.name, authorId: human.id, title: '  日本語　<b>題</b>  ', body: '  本文  \n\n　末尾  ' };
    const first = await Promise.all([repo.createNetNewsArticle(draft, now), other.createNetNewsArticle(draft, now)]);
    const concurrent = await Promise.all([repo.createNetNewsArticle({ ...draft, id: 'draft-2', parentMessageId: first[0]!.messageId }, now),
      other.createNetNewsArticle({ ...draft, id: 'draft-3' }, now)]);
    const second = await other.createNetNewsArticle({ ...draft, id: 'second', group: secondGroup.name, parentMessageId: secondGroup.articles[0]!.messageId }, now);
    const bundled = await repo.createNetNewsArticle({ ...draft, id: 'bundled', parentMessageId: group.articles[1]!.messageId }, now);
    const child = await repo.createNetNewsArticle({ ...draft, id: 'child', title: '別の件名', parentMessageId: bundled.messageId }, now);
    const grandchild = await repo.createNetNewsArticle({ ...draft, id: 'grandchild', parentMessageId: child.messageId }, now);
    const failures: string[] = [];
    for (const change of [{ id: 'draft-1', title: 'conflicting retry' }, { group: 'unknown' }, { authorId: 'missing' },
      { authorId: 'fictional-ai:kusabue' }, { title: ' ' }, { title: 'x'.repeat(201) }, { title: 'a\nb' },
      { body: ' ' }, { body: 'x'.repeat(20001) }, { body: '\u001b[2J' }, { parentMessageId: '' },
      { parentMessageId: 'missing' }, { parentMessageId: second.messageId }, { parentMessageId: secondGroup.articles[0]!.messageId }]) {
      try { await repo.createNetNewsArticle({ ...draft, id: 'invalid', ...change }, now); failures.push('saved'); }
      catch (e) { failures.push((e as { code: string }).code); }
    }
    try { await repo.createNetNewsArticle({ ...draft, id: 'past', parentMessageId: child.messageId }, '2026-10-23T02:00:00.000Z'); }
    catch (e) { failures.push((e as { code: string }).code); }
    try { await repo.delete('members', human.id); failures.push('deleted'); } catch (e) { failures.push((e as { code: string }).code); }
    try { await repo.put('members', { ...human, actor: 'ai' }); failures.push('changed'); } catch (e) { failures.push((e as { code: string }).code); }
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'settings' && value.id === 'netnews-local') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.createNetNewsArticle({ ...draft, id: 'retry' }, now); }
    catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.put = native; }
    const failed = netNewsState(await repo.exportBackup()), retry = await repo.createNetNewsArticle({ ...draft, id: 'retry', body: '編集して再試行' }, now);
    const after = await repo.exportBackup(), display = netNewsGroup(after, 0);
    const target = { personaId: 'kusabue', forumId: before.forums[0]!.id };
    const contextBefore = buildPrompt(before, target), contextAfter = buildPrompt(after, target);
    repo.close(); other.close();
    return { before, after, first, concurrent, second, bundled, child, grandchild, failures, failed, retry, display, contextBefore, contextAfter };
  }, now);
  expect(result.first[0]).toEqual(result.first[1]); expect(result.first[0]!.number).toBe(4);
  expect(result.concurrent.map((a) => a.number).sort()).toEqual([5, 6]); expect(result.second.number).toBe(4);
  expect(result.second.messageId).not.toBe(result.first[0]!.messageId);
  expect(result.second.references).toEqual(['<usage.1@netnews.example.invalid>']);
  expect(result.concurrent.find((a) => a.id === 'draft-2')!.references).toEqual([result.first[0]!.messageId]);
  expect(result.first[0]!.references).toEqual([]);
  expect(result.bundled.references).toEqual(['<questions.1@netnews.example.invalid>', '<questions.2@netnews.example.invalid>']);
  expect(result.child.references).toEqual([...result.bundled.references, result.bundled.messageId]);
  expect(result.grandchild.references).toEqual([...result.child.references, result.child.messageId]);
  expect(result.failures).toEqual([...Array(17).fill('validation'), 'quota']);
  expect(result.retry.number).toBe(result.failed.nextNumbers['fj.questions.fj']);
  expect(result.retry.createdAt).toBe(now); expect(result.retry.body).toBe('編集して再試行');
  for (const key of ['members', 'posts', 'sigs', 'forums', 'mail', 'readStates'] as const) expect(result.after[key]).toEqual(result.before[key]);
  expect(result.after.settings.filter((s) => s.id !== 'netnews-local')).toEqual(result.before.settings);
  expect(result.contextAfter).toEqual(result.contextBefore);
  expect(result.display.articles[3]!.from).toMatch(/^記録係 <syn-[a-z0-9]+@members.example.invalid>$/);
  expect(result.display.articles[3]!.date).toBe('Sat, 24 Oct 2026 11:00:00 +0900');
});

test('NetNews direct writes and restores validate entire state; quota rollback, roundtrip, legacy absence, reset and stale connections', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (now) => {
    const rp = '/src/storage/repository.ts', np = '/src/netnews.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { netNewsState, netNewsGroup, emptyNetNews } = await import(np) as typeof import('../src/netnews');
    const repo = await openRepository('netnews-backups'); await repo.openActivity(now);
    const human = await repo.createHumanMember('保存係');
    const row = await repo.createNetNewsArticle({ id: 'first', group: 'fj.questions.fj', authorId: human.id,
      title: '保存する題', body: '本文', parentMessageId: '<questions.2@netnews.example.invalid>' }, now);
    await repo.createNetNewsArticle({ id: 'child', group: row.group, authorId: human.id, title: '続き', body: '本文', parentMessageId: row.messageId }, now);
    const original = await repo.exportBackup(), failures: string[] = [];
    for (let i = 0; i < 22; i++) {
      const bad = structuredClone(original), setting = bad.settings.find((s) => s.id === 'netnews-local')!;
      const state = setting.value as unknown as NetNewsState, rows = state.contributions;
      if (i === 0) state.version = 2 as never;
      if (i === 1) state.nextNumbers[row.group] = row.number;
      if (i === 2) rows[1]!.number = row.number;
      if (i === 3) rows[1]!.id = row.id;
      if (i === 4) rows[0]!.parentMessageId = rows[1]!.messageId;
      if (i === 5) rows[1]!.parentMessageId = rows[1]!.messageId;
      if (i === 6) rows[0]!.parentMessageId = '<usage.2@netnews.example.invalid>';
      if (i === 7) rows[0]!.parentMessageId = 'dangling';
      if (i === 8) rows[0]!.authorId = 'missing';
      if (i === 9) rows[0]!.authorId = 'fictional-ai:kusabue';
      if (i === 10) rows[0]!.createdAt = '1996-01-01';
      if (i === 11) rows[1]!.createdAt = '2026-10-23T02:00:00.000Z';
      if (i === 12) rows[0]!.references = [];
      if (i === 13) rows[1]!.references.reverse();
      if (i === 14) rows[0]!.messageId = '<questions.1@netnews.example.invalid>';
      if (i === 15) rows[0]!.group = 'unknown';
      if (i === 16) rows[0]!.origin = 'local-ai' as never;
      if (i === 17) rows[0]!.body = '\u001b';
      if (i === 18) rows[0]!.title = ' ';
      if (i === 19) Object.assign(state, { unknown: [] });
      if (i === 20) delete state.nextNumbers['fj.news.usage'];
      if (i === 21) Object.assign(rows[0]!, { references: ['unrelated'], parentMessageId: undefined });
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
      if (this.name === 'settings' && value.id === 'netnews-local') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    try { await repo.replaceFromJson(JSON.stringify(original), { confirmReplace: true }); }
    catch (e) { failures.push((e as { code: string }).code); }
    finally { IDBObjectStore.prototype.add = native; }
    const afterQuota = await repo.exportBackup(), display = netNewsGroup(original, 0);
    const stale = await openRepository('netnews-backups');
    await repo.replaceFromJson(JSON.stringify(original), { confirmReplace: true }); await repo.openActivity(now);
    const roundtrip = netNewsGroup(await repo.exportBackup(), 0);
    try { await stale.createNetNewsArticle({ id: 'stale', group: row.group, authorId: human.id, title: '題', body: '本文' }, now); }
    catch (e) { failures.push((e as { code: string }).code); } stale.close();
    const legacy = structuredClone(original); legacy.settings = legacy.settings.filter((s) => !['netnews-local', 'daisizen-conference'].includes(s.id));
    legacy.posts = []; legacy.readStates = []; legacy.mail = [];
    await repo.replaceFromJson(JSON.stringify(legacy), { confirmReplace: true }); await repo.openActivity(now);
    const old = await repo.exportBackup(); netNewsGroup(old, 0); netNewsGroup(old, 1);
    const afterRead = await repo.exportBackup();
    await repo.put('settings', { id: 'netnews-local', value: emptyNetNews() as never });
    const explicitEmpty = netNewsGroup(await repo.exportBackup(), 0);
    const priorReset = await openRepository('netnews-backups'); await repo.resetWorld({ confirmReset: true }, now);
    const reset = await repo.exportBackup();
    try { await priorReset.createNetNewsArticle({ id: 'reset-stale', group: row.group, authorId: human.id, title: '題', body: '本文' }, now); }
    catch (e) { failures.push((e as { code: string }).code); } priorReset.close(); repo.close();
    return { original, afterInvalid, afterQuota, failures, display, roundtrip, old, afterRead, explicitEmpty, reset };
  }, now);
  expect(result.failures).toEqual([...Array(44).fill('validation'), 'quota', 'stale', 'stale']);
  expect(result.afterInvalid).toEqual(result.original); expect(result.afterQuota).toEqual(result.original);
  expect(result.roundtrip).toEqual(result.display); expect(result.afterRead).toEqual(result.old);
  expect(result.old.posts).toEqual([]); expect(result.old.settings.some((s) => ['netnews-local', 'daisizen-conference'].includes(s.id))).toBe(false);
  expect(result.explicitEmpty.articles).toHaveLength(3); expect(result.reset.settings.some((s) => s.id === 'netnews-local')).toBe(false);
});

test('NetNews command drafts pin group/author/parent across settings changes and consume committed sends despite refresh failure', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const cp = '/src/commands.ts', rp = '/src/storage/repository.ts', np = '/src/netnews.ts';
    const { TerminalCommands } = await import(cp);
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { netNewsGroup, netNewsState } = await import(np) as typeof import('../src/netnews');
    const repo = await openRepository('netnews-command-ownership'); await repo.openActivity('2026-10-24T02:00:00.000Z');
    const first = await repo.createHumanMember('最初'), second = await repo.createHumanMember('次の人');
    await repo.put('settings', { id: 'active-human-member', value: first.id });
    let data = await repo.exportBackup(), index = 0, failRefresh = false, completed = 0;
    const prints: string[] = [];
    const commands = new TerminalCommands({ read: async () => { if (failRefresh) throw new Error('test refresh failure'); data = await repo.exportBackup(); return data; },
      print: (...lines: string[]) => prints.push(...lines), repository: async () => ({ createNetNewsArticle: async (draft: Parameters<typeof repo.createNetNewsArticle>[0]) => {
        const row = await repo.createNetNewsArticle(draft); failRefresh = true; return row;
      } }),
      netNews: () => { const group = netNewsGroup(data, index); return { group: group.name, articles: group.articles }; },
      netNewsSaved: () => { completed++; throw new Error('test render failure'); },
      navigate: () => {}, destination: () => { throw new Error('must not enter forum'); }, ai: {},
    });
    await commands.submit('REPLY 2');
    // Independent Settings/connection changes cannot redirect the owned draft.
    await repo.put('settings', { id: 'active-human-member', value: second.id }); index = 1;
    await commands.submit('本文'); await commands.submit('.END');
    await commands.submit('EDIT'); await commands.submit('TITLE 親を保持'); await commands.submit('REVIEW');
    const historyDuringDraft = commands.recordsHistory;
    await commands.submit('Y'); const historyAfterCommit = commands.recordsHistory;
    const extra = await commands.submit('Y');
    const saved = netNewsState(await repo.exportBackup()); repo.close();
    return { saved, first, second, completed, prints, historyDuringDraft, historyAfterCommit, extra };
  });
  expect(result.saved.contributions).toHaveLength(1);
  expect(result.saved.contributions[0]).toMatchObject({ group: 'fj.questions.fj', authorId: result.first.id,
    title: '親を保持', parentMessageId: '<questions.2@netnews.example.invalid>',
    references: ['<questions.1@netnews.example.invalid>', '<questions.2@netnews.example.invalid>'] });
  expect(result.saved.nextNumbers).toEqual({ 'fj.questions.fj': 5, 'fj.news.usage': 4 });
  expect(result.completed).toBe(1); expect(result.extra).toBe(false);
  expect(result.historyDuringDraft).toBe(false); expect(result.historyAfterCommit).toBe(true);
  expect(result.prints.join('\n')).toContain('記事 #4 を登録しました');
  expect(result.prints.join('\n')).not.toContain('入力は残っています');
});
