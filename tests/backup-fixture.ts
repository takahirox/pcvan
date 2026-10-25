import type { Backup } from '../src/storage/schema';
import { ACTIVE_MEMBER_SETTING } from '../src/storage/repository';
import { originalPersonas, personaMemberId } from '../src/ai/personas';

// Synthetic data, including allocation gaps and fields with no historical interpretation.
export function backupFixture(): Backup {
  return {
    format: 'pcvan-local', version: 1, mail: [],
    members: [{ id: 'ai', handle: 'AI', actor: 'ai' }, { id: 'human', handle: '人間', actor: 'human' }],
    sigs: [{ id: 'sig', keyword: 'LOCAL', title: '個人の世界' }],
    forums: [
      { id: 'forum', sigId: 'sig', boardNo: 1, name: '広場', nextPostNumber: 8 },
      { id: 'other', sigId: 'sig', boardNo: 2, name: '別室', nextPostNumber: 2 },
    ],
    posts: [
      { id: 'first', forumId: 'forum', number: 1, authorId: 'human', title: 'こんにちは', body: '  ｶﾅ\n<b>文字</b>　。', createdAt: '2026-10-20T01:02:03.000Z', origin: 'local-human' },
      { id: 'reply', forumId: 'forum', number: 4, displaySecondNumber: 12, authorId: 'ai', title: '返事', body: '応答', replyToPostId: 'first', createdAt: '2026-10-20T01:03:04.567Z', origin: 'imported' },
      { id: 'third', forumId: 'other', number: 1, authorId: 'human', title: '', body: '', createdAt: '2026-10-20T01:04:05.000Z', origin: 'local-human' },
    ],
    readStates: [{ memberId: 'human', forumId: 'forum', lastReadNumber: 4 }],
    session: { lastLoginAt: '2026-10-20T01:00:00.000Z', lastLogoutAt: '2026-10-20T02:00:00.000Z', commandHistory: ['help', 'echo  日本語'] },
    settings: [{ id: 'preferences', value: { nested: ['日本語', true, 42, null], width: 80 } }],
  };
}

/** Scheduling fixtures explicitly include the residents eligible to participate. */
export function activityFixture(): Backup {
  const data = backupFixture();
  data.members.push(...originalPersonas.map((p) => ({ id: personaMemberId(p.id), handle: p.handle, actor: 'ai' as const })));
  return data;
}

/** Gapped unread journey, deliberately unrelated timestamps and storage order. */
export function unreadFixture(): Backup {
  const data = backupFixture();
  data.sigs[0]!.keyword = 'MITI';
  data.forums[0]!.boardNo = 9;
  data.forums[0]!.nextPostNumber = 10;
  data.members.push({ id: 'human2', handle: '別の人', actor: 'human' });
  data.members[0]!.handle = '今の筆名';
  data.posts[0]!.createdAt = '1996-11-23T01:02:03.000Z';
  data.posts[1]!.createdAt = '1996-11-20T01:03:04.567Z';
  data.posts.push({ ...data.posts[0]!, id: 'ninth', number: 9, title: '最後の便り', body: '  <i>最後</i>　ｶﾅ  \n\n末尾  ', createdAt: '1996-11-21T01:00:00.000Z' });
  data.posts.reverse();
  data.readStates = [
    { memberId: 'human', forumId: 'forum', lastReadNumber: 3 },
    { memberId: 'human2', forumId: 'forum', lastReadNumber: 1 },
    { memberId: 'human', forumId: 'other', lastReadNumber: 1 },
  ];
  data.settings.push({ id: ACTIVE_MEMBER_SETTING, value: 'human' });
  data.mail = [{ id: 'protected-mail', number: 1, senderId: 'human', internetAddress: 'protected@example.invalid', subject: '私信', body: '変更しない',
    createdAt: '2026-10-20T01:02:03.000Z', origin: 'local-human' }];
  return data;
}

/** Service-isolation fixtures disable attendance explicitly, independently of AI consent. */
export function quietOltFixture(data: Backup): void {
  (data.settings.find((s) => s.id === 'ai-residents')!.value as unknown as import('../src/ai/personas').ResidentSettings)
    .profiles.forEach((p) => { p.frequency = 0; });
  (data.settings.find((s) => s.id === 'olt-rooms')!.value as unknown as import('../src/olt-state').OltState)
    .rooms.forEach((r) => { r.residents = []; r.pending = null; });
}
