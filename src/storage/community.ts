import { bulletin } from '../bulletin';
import { expandedBoards, quietBoards, additionalSigs } from '../communities';
import evidence from '../../data/pcvan/sig-evidence.json' with { type: 'json' };
import starters from '../../data/pcvan/forum-starters.json' with { type: 'json' };
import { wakaba } from '../wakaba';
import expansion from '../../data/pcvan/expanded-community.json' with { type: 'json' };
import fixture from '../../data/pcvan/fictional-community.json' with { type: 'json' };
import { personaMemberId, residentProfiles } from '../ai/personas';
import type { Backup, Forum, Post, Sig } from './schema';
import { WORLD_SETTING } from './schema';

export const SEED_ORIGIN = 'local-seed:fictional';
export const SEED_FIXTURE = 'fictional-community-v1';
export const communityBoards = [
  { keyword: 'MITI', boardNo: 9 }, { keyword: 'DAISIZEN', boardNo: 1 },
] as const;

/** Seeds are eligible conversation, but never claims of model inference. */
export function localConversation(post: Post): boolean {
  return post.origin === 'local-human' || post.origin === SEED_ORIGIN || post.origin === bulletin.origin || post.origin === wakaba.origin || post.origin === expansion.origin || post.origin === starters.origin || post.origin.startsWith('local-ai:webllm:');
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

/** Pristine bootstrap or explicitly confirmed recovery; never automatic legacy expansion. */
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

/** Pristine bootstrap or explicitly confirmed recovery; never automatic legacy expansion. */
export function bulletinPosts(anchor: string, forumId: string): Post[] {
  const day = 86_400_000;
  const midnight = Math.floor((Date.parse(anchor) + 9 * 3_600_000) / day) * day - 9 * 3_600_000;
  return bulletin.posts.map((p, i) => ({
    id: `seed:bulletin-v1:${p.id}`, forumId, number: i + 1, authorId: personaMemberId(p.author),
    title: p.title, body: p.body, origin: bulletin.origin,
    createdAt: new Date(midnight - p.daysAgo * day + (p.hour * 60 + p.minute) * 60_000).toISOString(),
    ...(p.replyTo ? { replyToPostId: `seed:bulletin-v1:${p.replyTo}` } : {}),
  }));
}

export function quietPosts(anchor: string, board: string, forumId: string): Post[] {
  const day = 86_400_000;
  const midnight = Math.floor((Date.parse(anchor) + 9 * 3_600_000) / day) * day - 9 * 3_600_000;
  return starters.posts.filter((p) => p.board === board).sort((a, b) =>
    b.daysAgo - a.daysAgo || a.hour - b.hour || a.minute - b.minute).map((p, i) => ({
      id: `seed:forums-v1:${p.id}`, forumId, number: i + 1, authorId: personaMemberId(p.author),
      title: p.title, body: p.body, origin: starters.origin,
      createdAt: new Date(midnight - p.daysAgo * day + (p.hour * 60 + p.minute) * 60_000).toISOString(),
      ...(p.replyTo ? { replyToPostId: `seed:forums-v1:${p.replyTo}` } : {}),
    }));
}

/** Complete catalog of public LIST/READ/WRITE/REPLY destinations, not service collections. */
export const starterBoards = [
  { keyword: 'MITI', boardNo: 9, name: evidence.miti.steps[2]!.destination },
  { keyword: 'DAISIZEN', boardNo: 1, name: evidence.daisizen.forums[0]!.label },
  ...expandedBoards, ...quietBoards,
  { keyword: wakaba.keyword, boardNo: wakaba.boardNo, name: wakaba.name },
  { keyword: bulletin.keyword, boardNo: bulletin.boardNo, name: bulletin.name },
];

export interface StarterAddition { sig: Sig; forum: Forum; posts: Post[] }

/** Pure preview shared by Settings and the transaction. Never guesses custom mappings,
 * replaces members, touches populated boards or reuses colliding seed IDs. Deliberate
 * empty/default imports qualify only for this explicitly confirmed recovery action. */
export function starterAdditions(content: Backup, anchor: string): StarterAddition[] {
  const additions: StarterAddition[] = [];
  for (const board of starterBoards) {
    const key = `${board.keyword}:${board.boardNo}`;
    const matches = content.sigs.filter((s) => s.keyword.toUpperCase() === board.keyword);
    if (matches.length > 1) continue;
    const sig = matches[0] ?? { id: `resident-sig:${board.keyword}`, keyword: board.keyword,
      title: board.keyword === wakaba.keyword ? 'わかばマーク' : board.keyword === bulletin.keyword ? '一般掲示板'
        : additionalSigs.find((s) => s.keyword === board.keyword)?.name ?? board.keyword };
    if (!matches.length && content.sigs.some((s) => s.id === sig.id)) continue;
    const forums = content.forums.filter((f) => f.sigId === sig.id && f.boardNo === board.boardNo);
    if (forums.length > 1) continue;
    const old = forums[0];
    // A same-number board under a custom ID/name is not a known default board.
    if (old && (old.id !== `resident-forum:${key}` || old.name !== board.name ||
      content.posts.some((p) => p.forumId === old.id))) continue;
    const forum = old ? { ...old } : { id: `resident-forum:${key}`, sigId: sig.id,
      boardNo: board.boardNo, name: board.name, nextPostNumber: 1 };
    if (!old && content.forums.some((f) => f.id === forum.id)) continue;
    let posts: Post[];
    if (communityBoards.some((b) => `${b.keyword}:${b.boardNo}` === key)) {
      // communityPosts expects both original destinations; filter before remapping numbers.
      posts = communityPosts(anchor, Object.fromEntries(communityBoards.map((b) =>
        [`${b.keyword}:${b.boardNo}`, { id: `${b.keyword}:${b.boardNo}`, nextPostNumber: 1 }])))
        .filter((p) => p.forumId === key).map((p) => ({ ...p, forumId: forum.id }));
    } else if (board.keyword === wakaba.keyword) posts = wakabaPosts(anchor, forum.id);
    else if (board.keyword === bulletin.keyword) posts = bulletinPosts(anchor, forum.id);
    else if (quietBoards.some((b) => `${b.keyword}:${b.boardNo}` === key)) posts = quietPosts(anchor, key, forum.id);
    else posts = expandedPosts(anchor, key, forum.id);
    if (!posts.length || posts.some((p) => content.posts.some((old) => old.id === p.id) ||
      !content.members.some((m) => m.id === p.authorId && m.actor === 'ai')) ||
      forum.nextPostNumber > Number.MAX_SAFE_INTEGER - posts.length) continue;
    posts = posts.map((p, i) => ({ ...p, number: forum.nextPostNumber + i }));
    additions.push({ sig, forum, posts });
  }
  return additions;
}
