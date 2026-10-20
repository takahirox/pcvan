import type { Backup } from '../src/storage/schema';

// Synthetic data, including allocation gaps and fields with no historical interpretation.
export function backupFixture(): Backup {
  return {
    format: 'pcvan-local', version: 1,
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
