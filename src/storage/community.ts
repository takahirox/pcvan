import fixture from '../../data/pcvan/fictional-community.json' with { type: 'json' };
import { personaMemberId, residentProfiles } from '../ai/personas';
import type { Backup, Post } from './schema';
import { WORLD_SETTING } from './schema';

export const SEED_ORIGIN = 'local-seed:fictional';
export const SEED_FIXTURE = 'fictional-community-v1';
export const communityBoards = [
  { keyword: 'MITI', boardNo: 9 }, { keyword: 'DAISIZEN', boardNo: 1 },
] as const;

/** Seeds are eligible conversation, but never claims of model inference. */
export function localConversation(post: Post): boolean {
  return post.origin === 'local-human' || post.origin === SEED_ORIGIN || post.origin.startsWith('local-ai:webllm:');
}

/** Conservatively accept only unambiguous empty legacy worlds; never rewrite directories. */
export function canPopulateCommunity(content: Backup): boolean {
  const world = content.settings.find((s) => s.id === WORLD_SETTING)?.value;
  if (!world || typeof world !== 'object' || Array.isArray(world) || world.status !== 'legacy' || content.posts.length) return false;
  if (residentProfiles(content).some((p) => content.members.some((m) => m.id === personaMemberId(p.id) &&
      (m.actor !== 'ai' || m.handle !== p.handle)))) return false;
  return communityBoards.every(({ keyword, boardNo }) => {
    const sigs = content.sigs.filter((s) => s.keyword.toUpperCase() === keyword);
    if (sigs.length > 1) return false;
    const sig = sigs[0];
    if (!sig && content.sigs.some((s) => s.id === `resident-sig:${keyword}`)) return false;
    const boards = content.forums.filter((f) => sig && f.sigId === sig.id && f.boardNo === boardNo);
    if (boards.length > 1) return false;
    if (!boards.length && content.forums.some((f) => f.id === `resident-forum:${keyword}:${boardNo}`)) return false;
    return !boards[0] || boards[0].nextPostNumber <= Number.MAX_SAFE_INTEGER - fixture.posts.length;
  });
}

export function communityPosts(anchor: string, forums: Record<string, { id: string; nextPostNumber: number }>): Post[] {
  // Freeze the calendar in the residents' default JST. All fixture times precede
  // yesterday's end, so even an early-morning first visit has no future posts.
  const day = 86_400_000;
  const midnight = Math.floor((Date.parse(anchor) + 9 * 3_600_000) / day) * day - 9 * 3_600_000;
  const rows = fixture.posts.map((p) => ({ ...p,
    createdAt: new Date(midnight - p.daysAgo * day + (p.hour * 60 + p.minute) * 60_000).toISOString(),
  })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const numbers = Object.fromEntries(Object.entries(forums).map(([key, forum]) => [key, forum.nextPostNumber]));
  return rows.map((p) => ({
    id: `seed:v1:${p.id}`, forumId: forums[p.board]!.id, number: numbers[p.board]!++,
    authorId: personaMemberId(p.author), title: p.title, body: p.body, createdAt: p.createdAt,
    origin: SEED_ORIGIN, ...(p.replyTo ? { replyToPostId: `seed:v1:${p.replyTo}` } : {}),
  }));
}
