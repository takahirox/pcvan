import { expect, test } from '@playwright/test';
import { scheduleInstant, scheduleTime, SCHEDULE_HORIZON } from '../src/calendar';
import { scheduledMail } from '../src/storage/schema';
import type { LocalRepository } from '../src/storage/repository';
import { backup, command, restore, snapshot, start, enterForum, post } from './terminal-helpers';
import { consent, lifestyles } from './autonomy-helpers';
import { mockPendingWorker, mockWorker } from './ai-helpers';

declare global { interface Window { scheduledRepo: LocalRepository } }
const epoch = '2026-10-23T01:02:03.000Z';
const due = '2026-10-23T01:04:00.000Z';

test('real JST input validates calendar dates, exact limits and midnight/year rollover', () => {
  expect(scheduleInstant('2026-10-23 10:04', epoch)).toBe(due);
  expect(scheduleInstant('2026-10-24 00:00', epoch)).toBe('2026-10-23T15:00:00.000Z');
  const later = '2026-12-31T14:59:00.000Z';
  expect(scheduleInstant('2027-01-01 00:00', later)).toBe('2026-12-31T15:00:00.000Z');
  for (const input of ['2026-02-30 10:00', '2026-10-23 24:00', '2026-13-01 00:00', '2026-10-23T10:04',
    '2026-10-23 10:02', '2026-11-23 10:03', '2026-10-23 10:04:00']) expect(() => scheduleInstant(input, epoch)).toThrow();
  const minute = '2026-10-23T01:02:00.000Z';
  const limit = new Date(Date.parse(minute) + SCHEDULE_HORIZON).toISOString();
  expect(scheduleInstant(scheduleTime(limit), minute)).toBe(limit);
  expect(() => scheduleInstant(scheduleTime(new Date(Date.parse(limit) + 60_000).toISOString()), minute)).toThrow();
});

test.describe('scheduled repository', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch));
    await page.goto('http://127.0.0.1:14374');
    await page.evaluate(async () => {
      const path = '/src/storage/repository.ts';
      window.scheduledRepo = await (await import(path)).openRepository('scheduled-world');
      await window.scheduledRepo.openActivity();
      await window.scheduledRepo.createHumanMember('差出人');
    });
  });

  test('pending isolation, concurrent submission, exact boundary release and global numbering', async ({ page }) => {
    const result = await page.evaluate(async ({ due, epoch }) => {
      const repo = window.scheduledRepo, before = await repo.exportBackup();
      await repo.configureActivity(0, (await repo.openActivity()).modelId);
      const senderId = before.members.find((m) => m.actor === 'human')!.id;
      const draft = { id: 'P-first', senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: '  秘密の題  ', body: '  一行目\n\n　ｶﾅ  ', dueAt: due };
      const path = '/src/storage/repository.ts';
      const other = await (await import(path)).openRepository('scheduled-world') as LocalRepository;
      const retries = await Promise.all([repo.scheduleHumanMail(draft), other.scheduleHumanMail(draft)]);
      await repo.scheduleHumanMail({ ...draft, id: 'P-second' });
      const pending = await repo.exportBackup();
      const early = await repo.reconcileScheduledMail('2026-10-23T01:03:59.999Z');
      const immediate = await other.createHumanMail({ id: 'ordinary', senderId, recipient: 'kusabue', subject: '今', body: '即時' });
      const releases = await Promise.all([repo.reconcileScheduledMail(due), other.reconcileScheduledMail(due)]);
      const repeated = await repo.reconcileScheduledMail('2026-11-30T00:00:00.000Z');
      const saved = await repo.exportBackup(); other.close();
      return { retries, pending, early, immediate, releases, repeated, saved, epoch };
    }, { due, epoch });
    expect(result.retries[0]).toEqual(result.retries[1]);
    expect(result.pending.mail).toEqual([]); expect(scheduledMail(result.pending).letters).toHaveLength(2);
    expect(result.early).toEqual([]); expect(result.immediate.number).toBe(1);
    expect(result.releases.flat().map((m) => m.number)).toEqual([2, 3]); expect(result.repeated).toEqual([]);
    expect(result.saved.mail!.filter((m) => m.delivery).map((m) => m.id)).toEqual(['scheduled:P-first', 'scheduled:P-second']);
    expect(result.saved.mail![1]).toMatchObject({ createdAt: due, delivery: { submittedAt: epoch, availableAt: due }, body: '  一行目\n\n　ｶﾅ  ' });
    expect(result.saved.mail!.every((m) => !m.recipientConfirmation && !m.readAt)).toBe(true);
  });

  test('cancellation serializes with release and submission retries retain terminal tombstones', async ({ page }) => {
    const result = await page.evaluate(async ({ due, epoch }) => {
      const repo = window.scheduledRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
      const draft = { id: 'P-cancel', senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: '取消', body: '取消の本文', dueAt: due };
      await repo.scheduleHumanMail(draft);
      const path = '/src/storage/repository.ts', other = await (await import(path)).openRepository('scheduled-world') as LocalRepository;
      const cancelled = await other.cancelScheduledMail(senderId, draft.id, '2026-10-23T01:03:59.999Z');
      const retry = await repo.scheduleHumanMail(draft); const released = await repo.reconcileScheduledMail(due);
      await repo.scheduleHumanMail({ ...draft, id: 'P-boundary' });
      const boundary = await Promise.all([repo.cancelScheduledMail(senderId, 'P-boundary', due), other.reconcileScheduledMail(due)]);
      const after = await other.cancelScheduledMail(senderId, 'P-boundary', due);
      let collision = false;
      try { await repo.scheduleHumanMail({ ...draft, body: 'changed' }); } catch { collision = true; }
      return { cancelled, retry, released, boundary, after, collision };
    }, { due, epoch });
    expect(result.cancelled).toBe(true); expect(result.retry.status).toBe('cancelled'); expect(result.released).toEqual([]);
    expect(result.boundary[0]).toBe(false); expect(result.boundary[1]).toHaveLength(1); expect(result.after).toBe(false); expect(result.collision).toBe(true);
  });

  test('a cancellation waiting for the storage lock checks the clock inside its transaction', async ({ page }) => {
    await page.evaluate(async ({ due }) => {
      const repo = window.scheduledRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
      await repo.scheduleHumanMail({ id: 'P-delayed', senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: '題', body: '本文', dueAt: due });
      const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('scheduled-world'); r.onsuccess = () => resolve(r.result); });
      const tx = db.transaction('settings', 'readwrite'); let held = true;
      const hold = () => { const r = tx.objectStore('settings').get('scheduled-mail'); r.onsuccess = () => { if (held) hold(); }; }; hold();
      tx.oncomplete = () => db.close();
      Object.assign(window, { delayedSchedule: { release: () => { held = false; }, cancellation: repo.cancelScheduledMail(senderId, 'P-delayed') } });
    }, { due });
    await page.clock.setFixedTime(new Date(due));
    const result = await page.evaluate(async () => {
      const waiting = (window as unknown as { delayedSchedule: { release(): void; cancellation: Promise<boolean> } }).delayedSchedule;
      waiting.release(); const cancelled = await waiting.cancellation;
      return { cancelled, released: await window.scheduledRepo.reconcileScheduledMail() };
    });
    expect(result.cancelled).toBe(false); expect(result.released).toHaveLength(1);
  });

  test('quota failure rolls back all releases and number allocation, then late wake releases once in due order', async ({ page }) => {
    const result = await page.evaluate(async ({ due, epoch }) => {
      const repo = window.scheduledRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
      for (const [id, dueAt] of [['P-z', due], ['P-a', '2026-10-23T01:03:00.000Z']])
        await repo.scheduleHumanMail({ id: id!, senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: id!, body: '本文', dueAt: dueAt! });
      const native = IDBObjectStore.prototype.put; let allocations = 0, code;
      IDBObjectStore.prototype.put = function(value, key) {
        if (this.name === 'session' && key === 'mail-next-number' && ++allocations === 2) throw new DOMException('quota', 'QuotaExceededError');
        return key === undefined ? native.call(this, value) : native.call(this, value, key);
      };
      try { await repo.reconcileScheduledMail(due); } catch (e) { code = (e as { code: string }).code; }
      finally { IDBObjectStore.prototype.put = native; }
      const failed = await repo.exportBackup();
      const late = await repo.reconcileScheduledMail('2026-12-01T00:00:00.000Z');
      return { code, failed, late, again: await repo.reconcileScheduledMail('2026-12-01T00:00:00.000Z') };
    }, { due, epoch });
    expect(result.code).toBe('quota'); expect(result.failed.mail).toEqual([]);
    expect(scheduledMail(result.failed).letters.every((l) => l.status === 'pending')).toBe(true);
    expect(result.late.map((m) => [m.number, m.id])).toEqual([[1, 'scheduled:P-a'], [2, 'scheduled:P-z']]);
    expect(result.late[1]).toMatchObject({ createdAt: '2026-12-01T00:00:00.000Z', delivery: { availableAt: due } });
    expect(result.again).toEqual([]);
  });

  test('strict backup/direct-write validation, actors, references, lifecycle and deliberately empty legacy backup', async ({ page }) => {
    const result = await page.evaluate(async ({ due, epoch }) => {
      const repo = window.scheduledRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
      const draft = { id: 'P-validate', senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: '題', body: '本文', dueAt: due };
      await repo.scheduleHumanMail(draft);
      const sp = '/src/storage/schema.ts', { validateBackup, scheduledMail } = await import(sp) as typeof import('../src/storage/schema');
      const pending = await repo.exportBackup(); const rejected: boolean[] = [];
      for (const patch of [{ dueAt: epoch }, { dueAt: '2026-10-23T01:04:01.000Z' }, { dueAt: '2027-01-01T00:00:00.000Z' },
        { submittedAt: 'bad' }, { senderId: 'fictional-ai:hoshimori' }, { recipientId: senderId }, { recipientId: 'unknown' },
        { subject: '\u001b[2J' }, { recipientLabel: '\u001b[2J' }, { status: 'released' }, { status: 'cancelled', cancelledAt: due },
        { status: 'pending', releasedAt: due }, { extra: true }]) {
        const bad = structuredClone(pending); Object.assign(scheduledMail(bad).letters[0]!, patch);
        try { validateBackup(bad); rejected.push(false); } catch { rejected.push(true); }
      }
      const alias = structuredClone(pending);
      scheduledMail(alias).letters.push({ ...scheduledMail(alias).letters[0]!, id: 'P-VALIDATE' });
      try { validateBackup(alias); rejected.push(false); } catch { rejected.push(true); }
      let writes = 0;
      for (const action of [() => repo.put('settings', pending.settings.find((s) => s.id === 'scheduled-mail')!),
        () => repo.delete('settings', 'scheduled-mail'),
        () => repo.createHumanMail({ id: `scheduled:${draft.id}`, senderId, recipient: draft.recipientId, subject: draft.subject, body: draft.body }),
        () => repo.delete('members', draft.recipientId),
        () => repo.put('members', { id: draft.recipientId, handle: 'renamed', actor: 'human' })]) {
        try { await action(); } catch { writes++; }
      }
      await repo.reconcileScheduledMail(due); const released = await repo.exportBackup();
      for (const change of ['missing-queue', 'wrong-time', 'wrong-text', 'missing-mail']) {
        const bad = structuredClone(released);
        if (change === 'missing-queue') bad.settings = bad.settings.filter((s) => s.id !== 'scheduled-mail');
        if (change === 'wrong-time') bad.mail![0]!.delivery!.availableAt = epoch;
        if (change === 'wrong-text') bad.mail![0]!.body = 'changed';
        if (change === 'missing-mail') bad.mail = [];
        try { validateBackup(bad); rejected.push(false); } catch { rejected.push(true); }
      }
      const legacy = structuredClone(released); legacy.settings = legacy.settings.filter((s) => s.id !== 'scheduled-mail');
      delete legacy.mail![0]!.delivery; validateBackup(legacy);
      const empty = { format: 'pcvan-local', version: 1, members: [], sigs: [], forums: [], posts: [], readStates: [], settings: [], session: null };
      validateBackup(empty); await repo.replaceFromJson(JSON.stringify(empty), { confirmReplace: true }); await repo.openActivity();
      return { rejected, writes, empty: await repo.exportBackup() };
    }, { due, epoch });
    expect(result.rejected).toEqual(Array(18).fill(true)); expect(result.writes).toBe(5);
    expect(result.empty.members).toEqual([]); expect(scheduledMail(result.empty).letters).toEqual([]);
  });

  test('saved due instants survive restore; identical replacement fences stale submit, cancel and reconciliation handles', async ({ page }) => {
    const result = await page.evaluate(async ({ due, epoch }) => {
      const repo = window.scheduledRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
      const draft = { id: 'P-restore', senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: '復元', body: '本文', dueAt: due };
      await repo.scheduleHumanMail(draft);
      // A backup approved under the old fictional calendar keeps the absolute due instant.
      const legacy = await repo.exportBackup();
      legacy.settings.find((s) => s.id === 'historical-calendar')!.value = { version: 1, sourceAnchor: '2024-11-20T01:00:00.000Z' };
      const json = JSON.stringify(legacy);
      const rp = '/src/storage/repository.ts'; const old = await (await import(rp)).openRepository('scheduled-world') as LocalRepository;
      await repo.replaceFromJson(json, { confirmReplace: true });
      const codes: string[] = [];
      for (const action of [() => old.scheduleHumanMail(draft), () => old.cancelScheduledMail(senderId, draft.id), () => old.reconcileScheduledMail(due)]) {
        try { await action(); } catch (e) { codes.push((e as { code: string }).code); }
      }
      await repo.replaceFromJson(json, { confirmReplace: true });
      const restored = await repo.exportBackup();
      const late = await repo.reconcileScheduledMail('2026-12-01T00:00:00.000Z');
      const completed = await repo.exportJson(); await repo.replaceFromJson(completed, { confirmReplace: true });
      return { codes, restored, late, again: await repo.reconcileScheduledMail('2026-12-01T00:00:00.000Z') };
    }, { due, epoch });
    expect(result.restored.settings.find((s) => s.id === 'historical-calendar')!.value).toEqual({ version: 1, sourceAnchor: '2024-11-20T01:00:00.000Z' });
    expect(result.codes).toEqual(['stale', 'stale', 'stale']);
    expect(scheduledMail(result.restored).letters[0]!.dueAt).toBe(due); expect(result.late).toHaveLength(1); expect(result.again).toEqual([]);
  });

  test('mocked prompts respect delivery availability and commits reject a future scheduled parent', async ({ page }) => {
    const result = await page.evaluate(async ({ due, epoch }) => {
      const repo = window.scheduledRepo, senderId = (await repo.list('members')).find((m) => m.actor === 'human')!.id;
      const ordinary = await repo.createHumanMail({ id: 'ordinary', senderId, recipient: 'hoshimori', subject: '先の手紙', body: '先の本文' });
      const draft = { id: 'P-context', senderId, recipientId: 'fictional-ai:hoshimori', recipientLabel: '星守', subject: 'FUTURE_SECRET', body: 'FUTURE_SECRET', dueAt: due };
      await repo.scheduleHumanMail(draft);
      const mp = '/src/ai/mail.ts', gp = '/src/ai/generation.ts', ap = '/src/ai/activity-runner.ts', pp = '/src/ai/personas.ts';
      const { buildMailPrompt, chooseMail } = await import(mp) as typeof import('../src/ai/mail');
      const { buildPrompt } = await import(gp) as typeof import('../src/ai/generation');
      const { residentProfiles } = await import(pp) as typeof import('../src/ai/personas');
      const { runActivityBatch } = await import(ap) as typeof import('../src/ai/activity-runner');
      const target = { humanId: senderId, replyToMailId: ordinary.id };
      const pending = await repo.exportBackup();
      const before = JSON.stringify(buildMailPrompt(pending, 'hoshimori', target));
      const forumId = pending.forums[0]!.id;
      const publicBefore = JSON.stringify(buildPrompt(pending, { personaId: 'hoshimori', forumId }));
      await repo.reconcileScheduledMail('2026-10-24T00:00:00.000Z');
      const released = await repo.exportBackup(), state = await repo.openActivity();
      const prompts: string[] = [];
      for (const simulatedAt of ['2026-10-23T01:03:59.999Z', '2026-10-23T01:24:00.000Z']) {
        const batch = { id: 'catchup', from: epoch, to: '2026-10-24T00:00:00.000Z', modelId: state.modelId,
          runs: [{ id: 'catchup:one', personaId: 'hoshimori', simulatedAt, status: 'pending' as const, mail: target }] };
        const activity = { ...state, maxPosts: 4, consent: true, batch }, content = { ...released, settings: [...released.settings.filter((s) => s.id !== 'ai-activity'), { id: 'ai-activity', value: activity as never }] };
        const actions = { setAiRunStatus: async () => ({ ...activity, batch: { ...batch, runs: [{ ...batch.runs[0]!, status: 'running' as const }] } }), commitAiRun: async () => undefined };
        await runActivityBatch(actions as never, async () => content, activity,
          { generate: async (prompt: { user: string }) => { prompts.push(prompt.user); return '{}'; } } as never,
          new AbortController().signal, { attempts: 0, committed: 0 }, () => {});
      }
      const profile = { ...residentProfiles(released)[0]!, reply: 1 };
      const at = Date.parse(due) + 20 * 60_000;
      let chosen;
      for (let n = 0; n < 100; n++) { chosen = chooseMail(released, profile, at, `seed${n}`, []); if (chosen?.replyToMailId === 'scheduled:P-context') break; }
      const codes: string[] = [];
      for (const [id, simulatedAt] of [['reply:too-early', '2026-10-23T01:03:59.999Z'], ['reply:on-time', '2026-10-23T01:24:00.000Z']]) {
        const batch = { id: 'reply', from: epoch, to: '2026-10-24T00:00:00.000Z', modelId: state.modelId,
          runs: [{ id, personaId: 'hoshimori', simulatedAt, status: 'running', mail: { humanId: senderId, replyToMailId: 'scheduled:P-context' } }] };
        await repo.put('settings', { id: 'ai-activity', value: { ...state, maxPosts: 4, consent: true, batch } as never });
        try { await repo.commitAiRun(id!, JSON.stringify({ personaId: 'hoshimori', recipientId: senderId, replyToMailId: 'reply-target', subject: '返信', body: 'お便りありがとうございます。' })); codes.push('saved'); }
        catch (e) { codes.push((e as { code: string }).code); }
      }
      return { before, publicBefore, prompts, chosen, codes, saved: await repo.exportBackup() };
    }, { due, epoch });
    expect(result.before + result.publicBefore).not.toContain('FUTURE_SECRET');
    expect(result.prompts[0]).not.toContain('FUTURE_SECRET'); expect(result.prompts[1]).toContain('FUTURE_SECRET');
    expect(result.prompts.join('')).not.toContain('P-context'); expect(result.prompts.join('')).not.toContain('scheduled-mail');
    expect(result.chosen?.replyToMailId).toBe('scheduled:P-context'); expect(result.codes).toEqual(['validation', 'saved']);
    expect(result.saved.mail!.find((m) => m.id === 'scheduled:P-context')!.recipientConfirmation?.replyMailId).toBe('reply:on-time');
  });
});

for (const [index, route] of [['1'], ['X'], ['13', '2', 'MAIL']].entries()) {
  test.describe(`production scheduling route ${route.join('/')}`, () => {
    test.use({ timezoneId: ['Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati'][index] });
    test('review/edit, pending, reload, confirmed cancellation and due release preserve contextual returns', async ({ page }) => {
      await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch)); await mockWorker(page, 'ok'); await start(page, '予約する人');
      for (const step of route) await command(page, step, 'コマンド=');
      expect(await command(page, 'HELP', 'コマンド=')).toContain('WRITE-AT');
      const begin = await command(page, 'WRITE-AT hoshimori', '配達日時='); expect(begin).toContain('2026-10-23 10:02');
      await command(page, '2026-02-30 10:04', '実在する日時');
      await command(page, '2026-10-23 10:02', '30日以内');
      await command(page, '2026-11-23 10:04', '30日以内');
      expect(scheduledMail(await snapshot(page)).letters).toEqual([]);
      await command(page, '2026-10-23 10:04', '件名='); await command(page, '  日本語の予約  ', '本文');
      await command(page, '  最初  ', '本文='); await command(page, '', '本文='); await command(page, '.TEXT MAIN', '本文=');
      expect(await command(page, '.END', '予約として保存しますか')).toContain('配達予定：2026-10-23 10:04');
      await command(page, 'EDIT', 'LINE 番号'); await command(page, 'LINE 1   編集  ', '本文を変更'); await command(page, 'REVIEW', '予約として保存しますか');
      await command(page, '', 'Y / N / EDIT'); expect(scheduledMail(await snapshot(page)).letters).toEqual([]);
      await command(page, 'Y', '予約 P-'); await command(page, 'PENDING', '配達待ち：1件');
      const saved = await snapshot(page), letter = scheduledMail(saved).letters[0]!;
      expect(saved.mail).toEqual([]); expect(letter).toMatchObject({ dueAt: due, subject: '  日本語の予約  ', body: '  編集  \n\nMAIN' });
      expect(saved.session!.commandHistory).not.toContain('WRITE-AT hoshimori'); expect(saved.session!.commandHistory).not.toContain('2026-10-23 10:04');
      expect(saved.session!.commandHistory).not.toContain('  日本語の予約  ');
      expect(await command(page, `READ-PENDING ${letter.id}`, '★内容')).toContain('  編集  \n\nMAIN');
      const exported = await backup(page); await page.reload(); await page.locator('#command').press('Escape');
      await command(page, 'MAIN', 'MAIN'); for (const step of route) await command(page, step, 'コマンド=');
      await command(page, 'PENDING', '配達待ち：1件'); await command(page, `CANCEL-PENDING ${letter.id}`, '(Y/N)=');
      await command(page, 'N', '取消しを中止'); await command(page, `CANCEL-PENDING ${letter.id}`, '(Y/N)='); await command(page, 'Y', 'を取り消しました');
      await command(page, 'PENDING', '配達待ち：0件');
      await restore(page, exported); await command(page, 'MAIN', 'MAIN'); for (const step of route) await command(page, step, 'コマンド=');
      await page.clock.setFixedTime(new Date(due)); await command(page, 'SENT', 'メール一覧：1件');
      expect(await command(page, 'READ 1', '★内容')).toContain('配達予定：2026年10月23日 10:04:00');
      await command(page, 'PENDING', '配達待ち：0件'); await command(page, 'BACK', index === 0 ? '電子メール' : index === 1 ? '旧電子メール' : '大自然');
      if (index < 2) await command(page, 'BACK', 'MAIN');
      const final = await snapshot(page); expect(final.mail).toHaveLength(1); expect(final.mail![0]!.recipientConfirmation).toBeUndefined();
      expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
    });
  });
}

test('expiry retains draft and requires new time/review; active release preserves IME and terminal output ownership', async ({ page }) => {
  await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch)); await mockWorker(page, 'ok'); await start(page, '期限の確認');
  await command(page, '1', 'コマンド=');
  for (const address of ['INET#reader@example.invalid', 'nobody', '期限の確認']) {
    await command(page, `WRITE-AT ${address}`, '日時指定は既存のローカル住人'); await command(page, '.CANCEL', 'メールを中止');
  }
  await command(page, 'WRITE-AT', '宛先='); await command(page, 'hoshimori', '配達日時=');
  await command(page, '2026-10-23 10:04', '件名='); await command(page, '期限', '本文'); await command(page, '保つ本文', '本文='); await command(page, '.END', '予約として保存しますか');
  await page.clock.setFixedTime(new Date(due)); await command(page, 'Y', '新しい日時を選び');
  expect(scheduledMail(await snapshot(page)).letters).toEqual([]);
  expect(await command(page, '2026-10-23 10:05', '予約として保存しますか')).toContain('保つ本文'); await command(page, 'Y', '予約 P-');
  await command(page, 'WRITE kusabue', '件名='); await page.locator('#command').fill('変換している題');
  await page.locator('#command').dispatchEvent('compositionstart'); await page.locator('#command').press('Enter');
  const output = await page.locator('.output').textContent();
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    Object.assign(window, { restoreSchedulePut: () => { IDBObjectStore.prototype.put = native; } });
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === 'session' && key === 'mail-next-number') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
  });
  await page.clock.setFixedTime(new Date('2026-10-23T01:05:00.000Z')); await page.clock.fastForward(60_000);
  expect((await snapshot(page)).mail).toEqual([]); expect(await page.locator('.output').textContent()).toBe(output);
  await page.evaluate(() => { (window as unknown as { restoreSchedulePut(): void }).restoreSchedulePut(); window.dispatchEvent(new Event('focus')); });
  await expect.poll(async () => (await snapshot(page)).mail!.length).toBe(1);
  expect(await page.locator('.output').textContent()).toBe(output); await expect(page.locator('#command')).toHaveValue('変換している題');
  await page.locator('#command').dispatchEvent('compositionend'); await command(page, '.CANCEL', 'メールを中止');
  await command(page, 'SENT', 'メール一覧：1件');
});

test('scheduled composer retries a failed save but consumes a committed draft when output fails', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (due) => {
    const path = '/src/composer.ts'; const { TerminalComposer } = await import(path) as typeof import('../src/composer');
    let saves = 0, failOutput = false; const outputs: string[] = [];
    const composer = new TerminalComposer({ keyword: 'MAIL', name: '住人' }, 'human', undefined, {
      print: (...lines) => { if (failOutput) throw new Error('output'); outputs.push(...lines); },
      save: async () => { if (++saves === 1) throw new Error('quota'); failOutput = true; return { pendingReference: 'P-retry', status: 'pending' }; },
    }, 'mail', '', undefined, { prompt: () => ['配達日時='], parse: () => due, valid: () => true, label: () => '2026-10-23 10:04' });
    for (const line of ['time', '題', '本文', '.END', 'Y']) await composer.submit(line);
    const retryable = composer.active;
    try { await composer.submit('Y'); } catch { /* The save committed before output failed. */ }
    await composer.submit('Y'); return { retryable, active: composer.active, saves, outputs };
  }, due);
  expect(result.retryable).toBe(true); expect(result.active).toBe(false); expect(result.saves).toBe(2);
  expect(result.outputs.join('\n')).toContain('入力は残っています');
});


test('inline registration, pinned recipient after rename, rapid queued review and retry preserve identity and private recall', async ({ page }) => {
  await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch)); await start(page);
  await command(page, 'X', '旧電子メール'); await command(page, 'WRITE-AT hoshimori', '登録しますか');
  await command(page, 'Y', 'ハンドル名='); await command(page, '新しい差出人', '配達日時=');
  const initial = await snapshot(page), resident = initial.members.find((m) => m.id === 'fictional-ai:hoshimori')!;
  await command(page, '2026-10-23 10:04', '件名=');
  await page.evaluate(async (resident) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('pcvan-local'); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve) => { const tx = db.transaction('members', 'readwrite');
      tx.objectStore('members').put({ ...resident, handle: '新しい住人名' }); tx.oncomplete = () => resolve(); }); db.close();
    const native = IDBObjectStore.prototype.put;
    Object.assign(window, { restoreSchedulePut: () => { IDBObjectStore.prototype.put = native; } });
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === 'settings' && value.id === 'scheduled-mail') throw new DOMException('quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
  }, resident);
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#command')!;
    for (const line of ['連続する題', '  連続する本文  ', '', '.TEXT Y', '.END', 'Y']) { input.value = line; input.form!.requestSubmit(); }
  });
  await expect(page.locator('.output')).toContainText('入力は残っています');
  expect(scheduledMail(await snapshot(page)).letters).toEqual([]);
  await page.evaluate(() => (window as unknown as { restoreSchedulePut(): void }).restoreSchedulePut());
  await command(page, 'Y', '予約 P-'); await command(page, 'Y'); await command(page, 'PENDING', '配達待ち：1件');
  const data = await snapshot(page), letter = scheduledMail(data).letters[0]!;
  expect(letter.recipientId).toBe(resident.id); expect(letter.recipientLabel).toContain(resident.handle);
  expect(letter.recipientLabel).not.toContain('新しい住人名'); expect(letter.body).toBe('  連続する本文  \n\nY');
  expect(data.mail).toEqual([]); expect(data.session!.commandHistory).not.toContain('連続する題');
  await command(page, 'HANDLE', 'ハンドル設定'); await command(page, 'NEW', 'ハンドル名='); await command(page, '別の差出人', '登録');
  await command(page, 'BACK', '設定 / SETTINGS'); await command(page, 'BACK', '旧電子メール'); await command(page, 'PENDING', '配達待ち：0件');
  await command(page, `READ-PENDING ${letter.id}`, 'その参照の配達待ちはありません');
});

for (const operation of ['reset', 'restore'] as const) {
  for (const stage of ['review', 'cancellation'] as const) {
    test(`scheduled ${stage} approvals are fenced by ${operation} across tabs`, async ({ page, context }) => {
      await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch)); await start(page, '古い予約');
      const other = await context.newPage(); await other.clock.install({ time: new Date(epoch) }); await other.clock.setFixedTime(new Date(epoch));
      await other.goto('/'); await other.locator('#command').press('Escape'); await command(other, 'MAIN', 'MAIN'); await command(other, '1', '電子メール');
      await command(other, 'WRITE-AT hoshimori', '配達日時='); await command(other, '2026-10-23 10:04', '件名=');
      await command(other, '古い予約の題', '本文'); await command(other, '保存しない本文', '本文='); await command(other, '.END', '予約として保存しますか');
      if (stage === 'cancellation') {
        await command(other, 'Y', '予約 P-'); const letter = scheduledMail(await snapshot(page)).letters[0]!;
        await command(other, `CANCEL-PENDING ${letter.id}`, '(Y/N)=');
      }
      const saved = await backup(page);
      if (operation === 'reset') {
        await command(page, 'RESET', '初期状態に戻しますか');
        await page.locator('#command').fill('Y');
        await Promise.all([page.waitForEvent('load'), other.waitForEvent('load'), page.locator('#command').press('Enter')]);
      } else await Promise.all([other.waitForEvent('load'), restore(page, saved)]);
      await expect(other.locator('.output')).toContainText('MAIN'); await command(other, 'SKIP');
      await other.evaluate(() => {
        const input = document.querySelector<HTMLInputElement>('#command')!;
        for (const line of ['Y', 'Y', '.END']) { input.value = line; input.form!.requestSubmit(); }
      });
      await command(other, 'MAIN', 'MAIN'); const final = await snapshot(page);
      expect(final.mail).toEqual([]);
      expect(scheduledMail(final).letters.map((l) => l.status)).toEqual(operation === 'restore' && stage === 'cancellation' ? ['pending'] : []);
    });
  }
}

test('a focus resume releases overdue mail beyond the AI window without downloads or external requests', async ({ page }) => {
  const external: string[] = []; page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:14373/')) external.push(r.url()); });
  await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch)); await mockWorker(page, 'ok'); await start(page, '再開する人');
  await command(page, '1', '電子メール'); await command(page, 'WRITE-AT hoshimori', '配達日時=');
  await command(page, '2026-10-23 10:04', '件名='); await command(page, '遅い起床', '本文'); await command(page, '待っていた便り', '本文=');
  await command(page, '.END', '予約として保存しますか'); await command(page, 'Y', '予約 P-');
  await page.clock.setFixedTime(new Date('2026-12-01T00:00:00.000Z')); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(async () => (await snapshot(page)).mail!.length).toBe(1);
  const final = await snapshot(page); expect(final.mail![0]).toMatchObject({ createdAt: '2026-12-01T00:00:00.000Z', delivery: { availableAt: due } });
  expect(final.mail![0]!.recipientConfirmation).toBeUndefined(); expect(external).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { journeyWorker: { loads: number } }).journeyWorker.loads)).toBe(0);
});


test('active delivery continues while a resident generation is waiting indefinitely', async ({ page }) => {
  await page.clock.install({ time: new Date(epoch) }); await page.clock.setFixedTime(new Date(epoch));
  await mockPendingWorker(page, 'generate'); await start(page, '生成を待つ人'); await lifestyles(page);
  await enterForum(page); await post(page, '人間の星', '人間の星について観察しました。');
  await command(page, 'MAIN', 'MAIN'); await command(page, '1', '電子メール');
  await command(page, 'WRITE-AT hoshimori', '配達日時='); await command(page, '2026-10-23 12:04', '件名=');
  await command(page, '独立した配達', '本文'); await command(page, '生成を待たずに届ける本文', '本文=');
  await command(page, '.END', '予約として保存しますか'); await command(page, 'Y', '予約 P-'); await consent(page);
  await page.clock.setFixedTime(new Date('2026-10-23T02:03:03.000Z')); await page.clock.fastForward(61 * 60_000);
  await expect.poll(() => page.evaluate(() => (window as unknown as { pendingWork: string[] }).pendingWork)).toContain('chatCompletionNonStreaming');
  await page.clock.setFixedTime(new Date('2026-10-23T03:04:00.000Z')); await page.clock.fastForward(61 * 60_000);
  await expect.poll(async () => (await snapshot(page)).mail!.length).toBe(1);
  expect((await snapshot(page)).mail![0]).toMatchObject({ subject: '独立した配達', createdAt: '2026-10-23T03:04:00.000Z', delivery: { availableAt: '2026-10-23T03:04:00.000Z' } });
});
