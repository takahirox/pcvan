import type { AiActivity, AiBatch, AiRun, Backup, Post } from '../storage/schema';
import { models, personas, personaMemberId, residentProfiles } from './personas';
import type { ResidentProfile } from './personas';

export const ACTIVITY_SETTING = 'ai-activity';
export const MAX_SESSION_POSTS = 12;
export const HOUR = 60 * 60 * 1000;
export const CATCH_UP_HOURS = 72;

/** Stateless seeded draws: no dependence on tab, model output, or iteration timing. */
export function random(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
export function initialDue(now: string, seed: string): Record<string, string> {
  return Object.fromEntries(personas.map((p) => [p.id,
    new Date(Date.parse(now) + (10 + random(`${seed}:${p.id}:first`) * 80) * 60_000).toISOString()]));
}
export function emptyActivity(now: string, seed = 'pcvan'): AiActivity {
  return { version: 2, maxPosts: 4, modelId: models[0].id, lastActivityAt: now, batch: null,
    consent: false, seed, nextDue: initialDue(now, seed), truncated: false, bootstrap: false };
}
/** Legacy opt-in included download authorization. Retain pending batches and explicit zero. */
export function migrateActivity(state: AiActivity): AiActivity {
  return state.version === 2 ? structuredClone(state) : { ...emptyActivity(state.lastActivityAt),
    ...state, version: 2, consent: state.maxPosts > 0 };
}

export function routineFactor(profile: ResidentProfile, at: number): number {
  const local = new Date(at + profile.utcOffsetMinutes * 60_000);
  const hours = [0, 6].includes(local.getUTCDay()) ? profile.weekendHours : profile.weekdayHours;
  // Work and sleep strongly reduce visits but permit occasional exceptions.
  return hours.includes(local.getUTCHours()) ? 1 : .04;
}
function localPost(post: Post): boolean {
  return post.origin === 'local-human' || post.origin.startsWith('local-ai:webllm:');
}
function chooseAction(content: Backup, profile: ResidentProfile, at: number, seed: string): Omit<AiRun, 'id' | 'status' | 'simulatedAt'> | null {
  const draw = (key: string) => random(`${seed}:${profile.id}:${at}:${key}`);
  const localDay = Math.floor((at + profile.utcOffsetMinutes * 60_000) / (24 * HOUR));
  // Occasional three-day absences are independent of the number of page visits.
  if (!profile.frequency || random(`${seed}:${profile.id}:away:${Math.floor(localDay / 3)}`) < .12 ||
      draw('visit') >= profile.participation * routineFactor(profile, at)) return null;
  const total = profile.reading + profile.newThread + profile.reply + profile.inactivity;
  const action = draw('action') * total;
  if (!total || action < profile.reading + profile.inactivity) return null;
  const forums = content.forums.filter((f) => f.id.length <= 128 && content.sigs.some((s) => s.id === f.sigId));
  const preferred = forums.filter((f) => profile.preferredBoards.includes(f.id) || profile.preferredBoards.includes(
    `${content.sigs.find((s) => s.id === f.sigId)!.keyword.toUpperCase()}:${f.boardNo}`));
  const pool = preferred.length && draw('explore') > .1 ? preferred : forums;
  if (!pool.length) return null;
  pool.sort((a, b) => a.id.localeCompare(b.id));
  const forum = pool[Math.floor(draw('board') * pool.length)]!;
  const ownId = personaMemberId(profile.id);
  const memory = content.posts.filter((p) => p.forumId === forum.id && p.authorId === ownId && localPost(p) &&
    Date.parse(p.simulation?.simulatedAt ?? p.createdAt) <= at).sort((a, b) => b.number - a.number).slice(0, 8);
  const parents = content.posts.filter((p) => p.forumId === forum.id && p.id.length <= 128 && localPost(p) &&
    p.authorId !== ownId && Date.parse(p.simulation?.simulatedAt ?? p.createdAt) <= at - 20 * 60_000 &&
    !memory.some((m) => m.replyToPostId === p.id)).sort((a, b) => b.number - a.number).slice(0, 8);
  const score = (p: Post) => 1 + (profile.affinities[p.authorId.replace('fictional-ai:', '')] ?? 0) * 2 +
    profile.interests.filter((interest) => `${p.title} ${p.body}`.includes(interest)).length * 2 +
    (memory.some((m) => m.id === p.replyToPostId) ? 3 : 0) + draw(p.id);
  parents.sort((a, b) => score(b) - score(a));
  const parent = action >= profile.reading + profile.inactivity + profile.newThread ? parents[0] : undefined;
  return { personaId: profile.id, forumId: forum.id, ...(parent ? { replyToPostId: parent.id } : {}) };
}

/** Bounded chronological simulation. Returned state and plan must be saved together. */
export function scheduleActivity(content: Backup, previous: AiActivity, now: string): AiActivity {
  const state = migrateActivity(previous);
  const to = Math.max(Date.parse(now), Date.parse(state.lastActivityAt));
  const timestamp = new Date(to).toISOString();
  if (!state.maxPosts || !state.consent) {
    state.nextDue = initialDue(timestamp, state.seed!);
    return { ...state, lastActivityAt: timestamp };
  }
  if (state.batch?.runs.some((run) => run.status !== 'committed')) return state;
  const floor = to - CATCH_UP_HOURS * HOUR;
  const profiles = residentProfiles(content);
  const opportunities: { profile: ResidentProfile; at: number }[] = [];
  let truncated = Date.parse(state.lastActivityAt) < floor;
  for (const profile of profiles) {
    let due = Date.parse(state.nextDue![profile.id]!);
    if (due < floor) due = Math.floor(floor + random(`${state.seed}:${profile.id}:${floor}:resume`) * HOUR);
    // <= 73 opportunities per resident; no queue grows with weeks of absence.
    for (let count = 0; due <= to && count < 74; count++) {
      opportunities.push({ profile, at: due });
      const gap = (1 + random(`${state.seed}:${profile.id}:${due}:gap`) * 5) * HOUR / Math.max(.2, profile.frequency);
      due += Math.floor(Math.max(HOUR, gap));
    }
    if (due <= to) { truncated = true; due = to + HOUR; }
    state.nextDue![profile.id] = new Date(due).toISOString();
  }
  opportunities.sort((a, b) => a.at - b.at || a.profile.id.localeCompare(b.profile.id));
  const id = `residents:${state.lastActivityAt}:${timestamp}`;
  const runs: AiRun[] = [];
  for (const { profile, at } of opportunities) {
    const action = chooseAction(content, profile, at, state.seed!);
    if (!action) continue;
    if (runs.length >= Math.min(state.maxPosts, MAX_SESSION_POSTS)) { truncated = true; continue; }
    runs.push({ ...action, id: `${id}:${profile.id}:${Math.floor(at)}`, simulatedAt: new Date(at).toISOString(), status: 'pending' });
  }
  // Catch-up can start after the old watermark; clock reversal never creates a batch.
  const from = new Date(Math.min(Date.parse(state.lastActivityAt), ...runs.map((r) => Date.parse(r.simulatedAt)))).toISOString();
  return { ...state, lastActivityAt: timestamp, truncated,
    batch: runs.length && Date.parse(from) < to ? { id, from, to: timestamp, modelId: state.modelId, runs } : null };
}
export function planActivity(content: Backup, state: AiActivity, now: string): AiBatch | null {
  return scheduleActivity(content, state, now).batch;
}
