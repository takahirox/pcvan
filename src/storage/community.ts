import { wakaba } from '../wakaba';
import expansion from '../../data/pcvan/expanded-community.json' with { type: 'json' };
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
  return post.origin === 'local-human' || post.origin === SEED_ORIGIN || post.origin === wakaba.origin || post.origin === expansion.origin || post.origin.startsWith('local-ai:webllm:');
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

/** Only our intact, locally seeded v1 baseline authorizes an automatic extension.
 * Existing member edits are fine; conflicting actor IDs and missing originals are not. */
export function canExpandCommunity(content: Backup): boolean {
  const world = content.settings.find((s) => s.id === WORLD_SETTING)?.value;
  if (!world || typeof world !== 'object' || Array.isArray(world) || world.status !== 'seeded' ||
      world.fixture !== SEED_FIXTURE || world.expansion !== undefined) return false;
  return fixture.posts.every((p) => content.posts.some((old) => old.id === `seed:v1:${p.id}` && old.origin === SEED_ORIGIN)) &&
    fixture.posts.every((p) => content.members.some((m) => m.id === personaMemberId(p.author) && m.actor === 'ai'));
}

export function expandedPosts(anchor: string, board: string, forumId: string): Post[] {
  const day = 86_400_000;
  const midnight = Math.floor((Date.parse(anchor) + 9 * 3_600_000) / day) * day - 9 * 3_600_000;
  return expansion.posts.filter((p) => p.board === board).sort((a, b) =>
    b.daysAgo - a.daysAgo || a.hour - b.hour || a.minute - b.minute).map((p, i) => ({
      id: `seed:sigs-v1:${p.id}`, forumId, number: i + 1, authorId: personaMemberId(p.author),
      title: p.title, body: p.body,
      createdAt: new Date(midnight - p.daysAgo * day + (p.hour * 60 + p.minute) * 60_000).toISOString(),
      origin: expansion.origin, ...(p.replyTo ? { replyToPostId: `seed:sigs-v1:${p.replyTo}` } : {}),
    }));
}

/** Called only inside pristine bootstrap, never legacy population or expansion. */
export function wakabaPosts(anchor: string, forumId: string): Post[] {
  const day = 86_400_000;
  const midnight = Math.floor((Date.parse(anchor) + 9 * 3_600_000) / day) * day - 9 * 3_600_000;
  return wakaba.posts.map((p, i) => ({
    id: `seed:wakaba-v1:${p.id}`, forumId, number: i + 1, authorId: personaMemberId(p.author),
    title: p.title, body: p.body, origin: wakaba.origin,
    createdAt: new Date(midnight - p.daysAgo * day + (p.hour * 60 + p.minute) * 60_000).toISOString(),
    ...(p.replyTo ? { replyToPostId: `seed:wakaba-v1:${p.replyTo}` } : {}),
  }));
}
