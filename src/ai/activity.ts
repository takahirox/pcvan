import type { AiActivity, AiBatch, AiRun, Backup, Post } from '../storage/schema';
import { WORLD_SETTING } from '../storage/schema';
import { models, personas, personaMemberId, residentProfiles } from './personas';
import { localConversation } from '../storage/community';
import { chooseMail, mailPlanningIndex } from './mail';
import type { ResidentProfile } from './personas';

export const ACTIVITY_SETTING = 'ai-activity';
export const MAX_SESSION_POSTS = 12;
export const HOUR = 60 * 60 * 1000;

export { random } from './observation';
import { random, observeResident } from './observation';
export function initialDue(now: string, seed: string, profiles: readonly ResidentProfile[] = personas): Record<string, string> {
  return Object.fromEntries(profiles.map((p) => [p.id,
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

export { routineFactor } from './life';
import { residentSession } from './life';
export function availableResident(profile: ResidentProfile, at: number, seed: string): boolean {
  return residentSession(profile, at, seed).online;
}
export function activityAllowance(state: AiActivity, at: number) {
  if (!state.allowance || at - Date.parse(state.allowance.windowAt) >= 6 * HOUR)
    state.allowance = { windowAt: new Date(at).toISOString(), attempts: 0, responses: 0, committed: 0 };
  return state.allowance;
}
export function canAttempt(state: AiActivity, run: AiRun, at: number): boolean {
  const allowance = activityAllowance(state, at);
  return !!run && !!state.maxPosts && !!state.consent && allowance.attempts < MAX_SESSION_POSTS && allowance.committed < state.maxPosts;
}

interface PlanningIndex { forums: Backup['forums']; boards: Map<string, string>; posts: Map<string, Post[]>; mailContent: Backup; mail: ReturnType<typeof mailPlanningIndex> }
function planningIndex(content: Backup): PlanningIndex {
  const sigs = new Map(content.sigs.map((s) => [s.id, s.keyword.toUpperCase()]));
  const forums = content.forums.filter((f) => f.id.length <= 128 && sigs.has(f.sigId));
  const posts = new Map<string, Post[]>();
  for (const p of content.posts) {
    if (!localConversation(p) || !forums.some((f) => f.id === p.forumId)) continue;
    const list = posts.get(p.forumId) ?? []; list.push(p); posts.set(p.forumId, list);
  }
  // Bound subsequent per-person consideration; the archive is indexed once.
  for (const [id, list] of posts) posts.set(id, list.sort((a, b) => b.number - a.number).slice(0, 128));
  return { forums, boards: new Map(forums.map((f) => [f.id, `${sigs.get(f.sigId)}:${f.boardNo}`])), posts,
    mailContent: { ...content, posts: [...posts.values()].flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 512) },
    mail: mailPlanningIndex(content) };
}
/** Each resident reads the same public world and only their own correspondence.
 * Memory records reading, including deliberate silence. Pending writings retain
 * their decision until execution; a worker never chooses the personality. */
function observeVisit(index: PlanningIndex, profile: ResidentProfile, at: number, seed: string,
  planned: readonly AiRun[], seen: string[]): Omit<AiRun, 'id' | 'status' | 'simulatedAt'> | null {
  const ownId = personaMemberId(profile.id);
  const mail = chooseMail(index.mailContent, profile, at, seed, planned, index.mail, seen);
  if (mail && !seen.includes(`mail:${mail.replyToMailId ?? mail.publicPostId}`)) {
    seen.push(`mail:${mail.replyToMailId ?? mail.publicPostId}`);
    return { personaId: profile.id, mail };
  }
  const forums = index.forums.filter((f) => profile.preferredBoards.includes(f.id) || profile.preferredBoards.includes(index.boards.get(f.id)!));
  const posts = [...index.posts.values()].flat().filter((post) => forums.some((f) => f.id === post.forumId) ||
    profile.interests.some((word) => `${post.title} ${post.body.slice(0, 1200)}`.includes(word)) ||
    (profile.affinities[post.authorId.replace('fictional-ai:', '')] ?? 0) > .5 ||
    (index.posts.get(post.forumId) ?? []).some((p) => p.id === post.replyToPostId && p.authorId === ownId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, 64);
  let writing: Omit<AiRun, 'id' | 'status' | 'simulatedAt'> | null = null;
  for (const post of posts) {
    if (post.id.length > 128 || post.authorId === ownId || Date.parse(post.createdAt) > at || seen.includes(`forum:${post.id}`)) continue;
    const direct = posts.some((p) => p.id === post.replyToPostId && p.authorId === ownId);
    const decision = observeResident(profile, { id: post.id, service: 'forum', authorId: post.authorId,
      text: `${post.title} ${post.body.slice(0, 1200)}`, at: Date.parse(post.createdAt),
      interested: forums.some((f) => f.id === post.forumId), addressed: direct }, seed);
    if (decision.write && decision.readyAt > at) continue;
    // Reading alone is durable and never requires inference. A resident can
    // return when another participant adds new information to this thread.
    const replied = (index.posts.get(post.forumId) ?? []).some((p) => p.authorId === ownId && p.replyToPostId === post.id) ||
      planned.some((r) => r.personaId === profile.id && r.replyToPostId === post.id);
    if (decision.write && !replied && !writing) writing = { personaId: profile.id, forumId: post.forumId, replyToPostId: post.id };
    if (!decision.write || replied || writing?.replyToPostId === post.id) seen.push(`forum:${post.id}`);
  }
  if (writing) return writing;
  const topicBoards = forums.length ? forums : index.forums;
  const lastTopic = [...seen].reverse().find((id) => id.startsWith('topic:'));
  const topicDue = !lastTopic || at - Number(lastTopic.slice(6)) >= 30 * 60_000 / Math.max(.05, profile.newThread * profile.frequency);
  if (topicDue && topicBoards.length && profile.newThread > 0 && profile.inactivity < .7) {
    seen.push(`topic:${at}`);
    const forum = topicBoards[Math.floor(random(`${seed}:${profile.id}:${at}:board`) * topicBoards.length)]!;
    return { personaId: profile.id, forumId: forum.id };
  }
  return null;
}

/** Reconcile one current visit per due resident. Never simulate closed-tab speech. */
export function scheduleActivity(content: Backup, previous: AiActivity, now: string): AiActivity {
  const state = migrateActivity(previous);
  const to = Math.max(Date.parse(now), Date.parse(state.lastActivityAt));
  if (Date.parse(now) < Date.parse(state.lastActivityAt)) return state;
  const timestamp = new Date(to).toISOString();
  const profiles = residentProfiles(content).slice(0, 128);
  const members = new Set(content.members.filter((m) => m.actor === 'ai').map((m) => m.id));
  state.nextDue = Object.fromEntries(profiles.map((p) => [p.id, state.nextDue?.[p.id] ?? initialDue(timestamp, state.seed!, [p])[p.id]!]));
  state.observations ??= {};
  // Old human-attention state is accepted on import, but never used or extended.
  delete state.attention;
  if (state.batch) {
    state.batch.runs = state.batch.runs.filter((r) => r.status === 'committed' ||
      members.has(personaMemberId(r.personaId)) && profiles.some((p) => p.id === r.personaId && p.frequency > 0));
    if (!state.batch.runs.length) state.batch = null;
  }
  const runs = (state.batch?.runs ?? []).filter((r) => ['pending', 'running', 'failed'].includes(r.status))
    .filter((r) => members.has(personaMemberId(r.personaId)) && profiles.some((p) => p.id === r.personaId && p.frequency > 0));
  if (!state.maxPosts || !state.consent) {
    return { ...state, lastActivityAt: timestamp };
  }
  const index = planningIndex(content);
  const id = runs.length ? state.batch!.id : `residents:${timestamp}`;
  for (const profile of [...profiles].sort((a, b) => state.nextDue![a.id]!.localeCompare(state.nextDue![b.id]!))) {
    if (!members.has(personaMemberId(profile.id)) || Date.parse(state.nextDue[profile.id]!) > to) continue;
    const previousDue = state.nextDue[profile.id]!;
    const gap = (2 + random(`${state.seed}:${profile.id}:${to}:visit`) * 18) * 60_000 / Math.max(.2, profile.frequency * (1 + profile.reading));
    state.nextDue[profile.id] = new Date(to + gap).toISOString();
    if (!availableResident(profile, to, state.seed!)) continue;
    if (runs.some((r) => r.personaId === profile.id)) continue;
    const seen = state.observations[profile.id] ?? [];
    const beforeReading = [...seen];
    const action = observeVisit(index, profile, to, state.seed!, runs, seen);
    state.observations[profile.id] = [...new Set(seen)].slice(-96);
    if (action && runs.filter((r) => r.status !== 'failed').length >= Math.min(12, state.maxPosts)) {
      state.nextDue[profile.id] = previousDue;
      state.observations[profile.id] = beforeReading;
      continue;
    }
    if (action) {
      // Keep failures visible and retryable without consuming writing capacity.
      // Only the oldest failure yields when the bounded batch itself is full.
      if (runs.length >= 12) runs.splice(runs.findIndex((r) => r.status === 'failed'), 1);
      runs.push({ ...action, id: `${id}:${profile.id}:${to}`, simulatedAt: timestamp, status: 'pending' });
    }
  }
  state.observations = Object.fromEntries(profiles.map((p) => [p.id, state.observations![p.id] ?? []]));
  return { ...state, lastActivityAt: timestamp, truncated: to - Date.parse(previous.lastActivityAt) > HOUR,
    batch: runs.length ? { id, from: new Date(Math.min(to - 1, ...runs.map((r) => Date.parse(r.simulatedAt)))).toISOString(), to: timestamp,
      modelId: state.modelId, runs } : state.batch };
}
export function planActivity(content: Backup, state: AiActivity, now: string): AiBatch | null {
  return scheduleActivity(content, state, now).batch;
}

/** Configuration identity for stale setup actions; scheduling watermarks may advance. */
export function setupContext(content: Backup): string {
  const state = content.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
  return JSON.stringify([content.settings.find((row) => row.id === WORLD_SETTING)?.value,
    state?.seed, state?.maxPosts, state?.modelId, state?.consent]);
}
