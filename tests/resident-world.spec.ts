import { expect, test } from '@playwright/test';
import { personas, personaMemberId } from '../src/ai/personas';
import { emptyActivity, initialDue, scheduleActivity, availableResident } from '../src/ai/activity';
import { appendOlt, emptyOlt, iso, observeOlt, validateOlt } from '../src/olt-state';
import { observeResident } from '../src/ai/observation';
import { commitOltText, observeRoomResidents, planOltTurn } from '../src/ai/olt';
import { activityFixture } from './backup-fixture';
import { mockWorker } from './ai-helpers';
import { consent } from './autonomy-helpers';
import { start, command, snapshot } from './terminal-helpers';
import { advance, speech, state, epoch, room } from './olt-helpers';

function world(seed: string, at: number) {
  const data = activityFixture();
  data.members = data.members.filter((m) => m.actor !== 'ai').concat(personas.map((p) => ({ id: personaMemberId(p.id), handle: p.handle, actor: 'ai' as const })));
  const activity = { ...emptyActivity(iso(at), seed), consent: true, maxPosts: 12 };
  data.settings.push({ id: 'ai-residents', value: { version: 2, profiles: structuredClone(personas) } as never },
    { id: 'ai-activity', value: activity as never });
  return { data, activity };
}

for (const hour of [0, 9, 15, 22]) test(`ordinary roster: one hour at ${hour} JST, independent attendance, conversations and bounded quiet`, () => {
  const at = Date.parse(`2026-10-21T${String((hour + 15) % 24).padStart(2, '0')}:04:00Z`);
  const { data } = world(`ordinary-${hour}`, at), rooms = emptyOlt(iso(at));
  const writers = new Set<string>(), arrivalTimes = new Set<string>();
  let quietTicks = 0, maxQueue = 0, replies = 0;
  for (let step = 0; step < 3600; step++) {
    const now = at + step * 1000;
    observeOlt(rooms, data, now);
    for (const room of rooms.rooms) observeRoomResidents(room, data, now);
    let wrote = false;
    for (const room of rooms.rooms) {
      room.residents.forEach((r) => arrivalTimes.add(r.joinedAt));
      maxQueue = Math.max(maxQueue, room.decisions?.length ?? 0);
      const turn = planOltTurn(rooms, room, data, now, `turn-${step}-${room.id}`);
      if (!turn) continue;
      writers.add(turn.authorId); replies += Number(turn.targetNumber !== undefined);
      // Plumbing only: intentionally distinct output; no language-quality claim.
      commitOltText(room, turn, JSON.stringify({kind:'olt',personaId:turn.authorId.replace('fictional-ai:',''),roomId:room.id,
        text:`記録${step}`}), now, data);
      room.pending = null; wrote = true;
    }
    if (!wrote) quietTicks++;
    validateOlt(rooms);
  }
  console.log('ORDINARY_WORLD', { hour, writers: writers.size, replies, attempts: rooms.attempts, quietTicks, arrivalTimes: arrivalTimes.size, maxQueue });
  expect(writers.size).toBeGreaterThan(2); expect(replies).toBeGreaterThan(0);
  expect(arrivalTimes.size).toBeGreaterThan(10); expect(maxQueue).toBeLessThanOrEqual(8);
  expect(quietTicks).toBeGreaterThan(3000); expect(rooms.attempts).toBeLessThan(120);
  expect(rooms.rooms.every((r) => r.visitors.length === 0)).toBe(true);
});

test('production MAIN accumulates dialogue with unchanged 100 profiles, JOIN replays it, and greeting reaches independent readers during IME', async ({ page }) => {
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await mockWorker(page, 'ok'); await start(page, '世界を見る客');
  const before = await snapshot(page);
  const profiles = before.settings.find((s) => s.id === 'ai-residents')!.value;
  const activity = before.settings.find((s) => s.id === 'ai-activity')!;
  const fixed = activity.value as unknown as import('../src/storage/schema').AiActivity;
  fixed.seed = 'ordinary-22'; fixed.nextDue = initialDue(epoch.toISOString(), fixed.seed, personas);
  await page.evaluate(async (rows) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r=indexedDB.open('pcvan-local'); r.onsuccess=()=>resolve(r.result); });
    await new Promise<void>((resolve) => { const tx=db.transaction('settings','readwrite'); rows.forEach((r)=>tx.objectStore('settings').put(r)); tx.oncomplete=()=>resolve(); }); db.close();
  }, [activity,{id:'olt-rooms',value:emptyOlt(epoch.toISOString()) as never}]);
  await consent(page);
  // Observe unchanged profiles on MAIN until an actual exchange has a present
  // conversational reader. Historical speakers alone do not establish that.
  const humanId = before.members.find((m) => m.actor === 'human')!.id;
  const chooseRoom = (s: ReturnType<typeof emptyOlt>) => s.rooms.find((r) =>
    new Set(r.lines.filter((l) => l.kind === 'say').map((l) => l.authorId)).size > 1 &&
    r.lines.some((l) => l.replyToNumber !== undefined) && personas.some((p) =>
      r.residents.some((resident) => resident.memberId === personaMemberId(p.id)) &&
      observeResident(p,{id:'greeting',service:'olt',authorId:humanId,text:'こんにちは',at:epoch.getTime()},fixed.seed!).write));
  for (let i = 0; i < 180 && !chooseRoom((await state(page))!); i++) await advance(page, 1);
  const unattended = await state(page);
  expect(unattended!.rooms.every((r) => r.visitors.length === 0)).toBe(true);
  const populated = chooseRoom(unattended!);
  expect(populated).toBeTruthy();
  const worker = await page.evaluate(() => (window as any).journeyWorker);
  expect(worker.prompts.some((p: any) => p.kind === 'olt' && p.replyTo && p.addressee?.actor === 'ai')).toBe(true);
  expect((await snapshot(page)).settings.find((s) => s.id === 'ai-residents')!.value).toEqual(profiles);
  await room(page, populated!.id === 'night' ? 2 : 1, populated!.id === 'wakaba' ? 'wakaba' : 'daisizen');
  for (const line of populated!.lines.filter((l) => l.kind === 'say')) await expect(page.locator('.output')).toContainText(line.text);
  await command(page, 'こんにちは', '<世界を見る客>');
  const input = page.locator('#command'); await input.fill('日本語の書きかけ');
  await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2,5,'backward')); await input.dispatchEvent('compositionstart');
  const initial = (await speech(page)).length;
  await advance(page, 21);
  expect((await speech(page)).length).toBeGreaterThan(initial);
  await expect(input).toHaveValue('日本語の書きかけ'); await expect(input).toBeFocused();
  expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart,el.selectionEnd,el.selectionDirection])).toEqual([2,5,'backward']);
  const prompts = await page.evaluate(() => (window as any).journeyWorker.prompts);
  expect(prompts.some((p: any) => p.kind === 'olt' && p.replyTo?.text === 'こんにちは' && p.addressee?.actor === 'human')).toBe(true);
  await input.dispatchEvent('compositionend');
});

test('forum reading and addressed mail use the same ordinary residents and retain meaningful observations', () => {
  const at = epoch.getTime(); const { data, activity } = world('reading-world', at);
  // One public event and an addressed private event. No profile is changed.
  data.posts = [{...data.posts[0]!, title:'庭の観察',body:'庭の草木を観察しています。',createdAt:iso(at)}];
  const recipient = personas.find((p) => availableResident(p, at + 60_000, activity.seed!) &&
    observeResident(p, {id:'private-letter',service:'mail',authorId:'human',text:'星の観察',at,addressed:true},activity.seed!).write)!;
  activity.nextDue![recipient.id] = iso(at + 60_000);
  data.mail = [{id:'private-letter',number:1,senderId:'human',recipientId:personaMemberId(recipient.id),subject:'星の観察',body:'PRIVATE_TEST_ONLY',createdAt:iso(at),origin:'local-human'}];
  let state = activity, noticedMail = false;
  for(let minute=1; minute<=60; minute++) {
    state = scheduleActivity(data, state, iso(at+minute*60_000));
    noticedMail ||= !!state.batch?.runs.some((r) => r.mail?.replyToMailId === 'private-letter');
    for (const run of state.batch?.runs ?? []) run.status = 'committed';
  }
  expect(Object.values(state.observations ?? {}).some((events)=>events.includes('forum:first'))).toBe(true);
  expect(noticedMail).toBe(true);
  expect(Object.values(state.observations ?? {}).every((events)=>events.length<=96)).toBe(true);
});
