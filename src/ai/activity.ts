import type { AiActivity, AiBatch, AiRun, Backup, Post } from '../storage/schema';
import { WORLD_SETTING } from '../storage/schema';
import { models, personas, personaMemberId, residentProfiles } from './personas';
import { localConversation } from '../storage/community';
import { chooseMail } from './mail';
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

export function routineFactor(profile: ResidentProfile, at: number): number {
  const local = new Date(at + profile.utcOffsetMinutes * 60_000);
  const hours = [0, 6].includes(local.getUTCDay()) ? profile.weekendHours : profile.weekdayHours;
  // Work and sleep strongly reduce visits but permit occasional exceptions.
  return hours.includes(local.getUTCHours()) ? 1 : .04;
}
/** Eligibility is pure metadata; it neither loads nor invokes a model. */
export function availableResident(profile: ResidentProfile, at: number, seed: string): boolean {
  const day = Math.floor((at + profile.utcOffsetMinutes * 60_000) / (24 * HOUR));
  return profile.frequency > 0 && routineFactor(profile, at) === 1 &&
    random(`${seed}:${profile.id}:away:${Math.floor(day / 3)}`) >= (profile.absence ?? .12) &&
    random(`${seed}:${profile.id}:attention:${Math.floor(at / 300_000)}`) < Math.min(1, profile.participation * profile.frequency);
}
export function activityAllowance(state: AiActivity, at: number) {
  if (!state.allowance || at - Date.parse(state.allowance.windowAt) >= 6 * HOUR)
    state.allowance = { windowAt: new Date(at).toISOString(), attempts: 0, responses: 0, committed: 0 };
  return state.allowance;
}
export function canAttempt(state: AiActivity, run: AiRun, at: number): boolean {
  const allowance = activityAllowance(state, at);
  return !!state.maxPosts && !!state.consent && (run.userResponse ? allowance.responses < 6 : allowance.attempts < MAX_SESSION_POSTS && allowance.committed < state.maxPosts);
}

/** At most two pending replies, sixteen recent human candidates, one answer per
 * parent. A separate six-attempt allowance cannot be spent by organic chatter. */
function attendHumanPosts(content: Backup, state: AiActivity, at: number): void {
  if (!state.consent || !state.maxPosts || activityAllowance(state, at).responses >= 6) return;
  const people = new Map(content.members.map((m) => [m.id, m]));
  const forums = new Map(content.forums.map((f) => [f.id, f]));
  const sigs = new Map(content.sigs.map((s) => [s.id, s.keyword.toUpperCase()]));
  const answered = new Set(content.posts.filter((p) => p.replyToPostId && people.get(p.authorId)?.actor === 'ai' && localConversation(p)).map((p) => p.replyToPostId));
  const byId = new Map(content.posts.map((p) => [p.id, p]));
  const recent = content.posts.filter((p) => Date.parse(p.createdAt) > at - 6 * HOUR && p.simulation);
  const authorCounts = new Map<string, number>();
  const humanCounts = new Map<string, number>();
  for (const p of recent) {
    authorCounts.set(p.authorId, (authorCounts.get(p.authorId) ?? 0) + 1);
    const human = p.replyToPostId ? byId.get(p.replyToPostId)?.authorId : undefined;
    if (human && Date.parse(p.createdAt) > at - HOUR) humanCounts.set(human, (humanCounts.get(human) ?? 0) + 1);
  }
  const pending = state.batch?.runs.filter((r) => r.status !== 'committed') ?? [];
  const handled = new Set(state.attention ?? []);
  const parents = content.posts.filter((p) => p.origin === 'local-human' && people.get(p.authorId)?.actor === 'human' &&
    p.id.length <= 128 && Date.parse(p.createdAt) <= at && Date.parse(p.createdAt) > at - 30 * 60_000)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 16);
  const roster = residentProfiles(content);
  const offset = roster.length > 128 ? Math.floor(at / 300_000) * 127 % roster.length : 0;
  const profiles = Array.from({ length: Math.min(128, roster.length) }, (_, i) => roster[(offset + i) % roster.length]!).filter((p) => people.get(personaMemberId(p.id))?.actor === 'ai' && availableResident(p, at, state.seed!));
  let slots = Math.max(0, Math.min(2 - pending.filter((r) => r.userResponse).length, 12 - pending.length));
  for (const parent of parents) {
    if (!slots || handled.has(parent.id) || answered.has(parent.id) || pending.some((r) => r.replyToPostId === parent.id) ||
      at - Date.parse(parent.createdAt) < 60_000 + random(`${state.seed}:${parent.id}:notice`) * 60_000) continue;
    // Three public replies/hour to one human is enough to leave room for others.
    if ((humanCounts.get(parent.authorId) ?? 0) >= 3) continue;
    const forum = forums.get(parent.forumId);
    if (!forum || forum.id.length > 128) continue;
    const board = `${sigs.get(forum.sigId)}:${forum.boardNo}`;
    const previousPost = parent.replyToPostId ? byId.get(parent.replyToPostId) : undefined;
    const publicParent = previousPost && previousPost.forumId === parent.forumId && localConversation(previousPost) ? previousPost : undefined;
    const context = `${parent.title} ${parent.body.slice(0, 1200)} ${publicParent?.body.slice(0, 400) ?? ''}`;
    const ranked = profiles.map((p) => {
      const interest = p.interests.filter((i) => context.includes(i)).length;
      const preferred = p.preferredBoards.includes(board) || p.preferredBoards.includes(forum.id);
      const previousCount = authorCounts.get(personaMemberId(p.id)) ?? 0;
      const direct = publicParent?.authorId === personaMemberId(p.id);
      const relationship = p.affinities[publicParent?.authorId.replace('fictional-ai:', '') ?? ''] ?? 0;
      return { p, score: (interest * 3 + (preferred ? 2 : 0) + relationship * 2 + (direct ? 3 : 0)) - previousCount * 2 +
        random(`${state.seed}:${parent.id}:${p.id}:fit`), eligible: (interest > 0 || preferred || direct) && previousCount < 2 &&
        !pending.some((r) => r.personaId === p.id) };
    }).filter((row) => row.eligible).sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id)).slice(0, 8);
    const selected = ranked.find(({ p }) => random(`${state.seed}:${parent.id}:${p.id}:respond`) < p.reply * (1 - p.inactivity));
    if (!selected) continue;
    const timestamp = new Date(at).toISOString();
    const batch = state.batch ?? { id: `attention:${timestamp}`, from: new Date(at - 1).toISOString(), to: timestamp, modelId: state.modelId, runs: [] };
    batch.runs = batch.runs.filter((r) => r.status !== 'committed');
    batch.to = timestamp;
    batch.runs.unshift({ id: `${batch.id}:reply:${parent.id}`, personaId: selected.p.id, forumId: parent.forumId,
      replyToPostId: parent.id, simulatedAt: timestamp, status: 'pending', userResponse: true });
    state.batch = batch; pending.push(batch.runs[0]!); handled.add(parent.id); humanCounts.set(parent.authorId, (humanCounts.get(parent.authorId) ?? 0) + 1); slots--;
  }
  state.attention = [...handled].slice(-64);
}

interface PlanningIndex { forums: Backup['forums']; boards: Map<string, string>; posts: Map<string, Post[]>; mailContent: Backup }
function planningIndex(content: Backup): PlanningIndex {
  const sigs = new Map(content.sigs.map((s) => [s.id, s.keyword.toUpperCase()]));
  const forums = content.forums.filter((f) => f.id.length <= 128 && sigs.has(f.sigId));
  const posts = new Map<string, Post[]>();
  for (const p of content.posts) {
    if (!localConversation(p)) continue;
    const list = posts.get(p.forumId) ?? []; list.push(p); posts.set(p.forumId, list);
  }
  // Bound subsequent per-person consideration; the archive is indexed once.
  for (const [id, list] of posts) posts.set(id, list.sort((a, b) => b.number - a.number).slice(0, 128));
  return { forums, boards: new Map(forums.map((f) => [f.id, `${sigs.get(f.sigId)}:${f.boardNo}`])), posts,
    mailContent: { ...content, posts: [...posts.values()].flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 512), mail: content.mail?.slice(-256) } };
}
function chooseAction(index: PlanningIndex, profile: ResidentProfile, at: number, seed: string, planned: readonly AiRun[], mailLimit: number): Omit<AiRun, 'id' | 'status' | 'simulatedAt'> | null {
  const draw = (key: string) => random(`${seed}:${profile.id}:${at}:${key}`);
  const localDay = Math.floor((at + profile.utcOffsetMinutes * 60_000) / (24 * HOUR));
  // Occasional three-day absences are independent of the number of page visits.
  if (!profile.frequency || random(`${seed}:${profile.id}:away:${Math.floor(localDay / 3)}`) < (profile.absence ?? .12) ||
      draw('visit') >= profile.participation * routineFactor(profile, at)) return null;
  if (planned.filter((r) => r.mail).length < mailLimit) {
    const mail = chooseMail(index.mailContent, profile, at, seed, planned);
    if (mail) return { personaId: profile.id, mail };
  }
  const total = profile.reading + profile.newThread + profile.reply + profile.inactivity;
  const action = draw('action') * total;
  if (!total || action < profile.reading + profile.inactivity) return null;
  const forums = index.forums;
  const preferred = forums.filter((f) => profile.preferredBoards.includes(f.id) || profile.preferredBoards.includes(index.boards.get(f.id)!));
  const pool = preferred.length && draw('explore') > .1 ? preferred : forums;
  if (!pool.length) return null;
  pool.sort((a, b) => a.id.localeCompare(b.id));
  const forum = pool[Math.floor(draw('board') * pool.length)]!;
  const ownId = personaMemberId(profile.id);
  const memory = (index.posts.get(forum.id) ?? []).filter((p) => p.authorId === ownId && localConversation(p) &&
    Date.parse(p.simulation?.simulatedAt ?? p.createdAt) <= at).sort((a, b) => b.number - a.number).slice(0, 8);
  const parents = (index.posts.get(forum.id) ?? []).filter((p) => p.id.length <= 128 && localConversation(p) &&
    p.authorId !== ownId && Date.parse(p.simulation?.simulatedAt ?? p.createdAt) <= at - 20 * 60_000 &&
    !memory.some((m) => m.replyToPostId === p.id)).sort((a, b) => b.number - a.number).slice(0, 8);
  const score = (p: Post) => 1 + (profile.affinities[p.authorId.replace('fictional-ai:', '')] ?? 0) * 2 +
    profile.interests.filter((interest) => `${p.title} ${p.body}`.includes(interest)).length * 2 +
    (memory.some((m) => m.id === p.replyToPostId) ? 3 : 0) + draw(p.id);
  parents.sort((a, b) => score(b) - score(a));
  const isReply = action >= profile.reading + profile.inactivity + profile.newThread;
  const parent = isReply ? parents[0] : undefined;
  if (isReply && !parent) return null;
  return { personaId: profile.id, forumId: forum.id, ...(parent ? { replyToPostId: parent.id } : {}) };
}

/** Bounded chronological simulation. Returned state and plan must be saved together. */
export function scheduleActivity(content: Backup, previous: AiActivity, now: string): AiActivity {
  const state = migrateActivity(previous);
  if (state.batch) state.batch.runs = state.batch.runs.filter((r) => !r.userResponse || r.status === 'committed' ||
    Date.parse(now) - Date.parse(r.simulatedAt) <= 10 * 60_000);
  const to = Math.max(Date.parse(now), Date.parse(state.lastActivityAt));
  const timestamp = new Date(to).toISOString();
  const savedRoster = content.settings.find((s) => s.id === 'ai-residents')?.value as unknown as { version: number } | undefined;
  const existingMembers = new Set(content.members.filter((m) => m.actor === 'ai').map((m) => m.id));
  const profiles = residentProfiles(content);
  state.nextDue = Object.fromEntries(profiles.map((p) => [p.id, state.nextDue?.[p.id] ?? initialDue(timestamp, state.seed!, [p])[p.id]!]));
  if (!state.maxPosts || !state.consent) {
    state.nextDue = initialDue(timestamp, state.seed!, residentProfiles(content));
    return { ...state, lastActivityAt: timestamp };
  }
  attendHumanPosts(content, state, to);
  if (state.batch?.runs.some((run) => run.status !== 'committed')) return state;
  const floor = to - CATCH_UP_HOURS * HOUR;
  const opportunities: { profile: ResidentProfile; at: number }[] = [];
  let truncated = Date.parse(state.lastActivityAt) < floor;
  const offset = profiles.length > 128 ? Math.floor(to / (24 * HOUR)) * 127 % profiles.length : 0;
  const candidates = Array.from({ length: Math.min(128, profiles.length) }, (_, i) => profiles[(offset + i) % profiles.length]!);
  for (const profile of candidates) {
    if (savedRoster?.version === 2 && !existingMembers.has(personaMemberId(profile.id))) continue;
    let due = Date.parse(state.nextDue![profile.id] ?? initialDue(timestamp, state.seed!, [profile])[profile.id]!);
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
  // Reserve public capacity across timer ticks, not just within this batch.
  // Catch-up letters spend today's allowance when saved, regardless of simulated age.
  const recentMail = (content.mail ?? []).filter((mail) => mail.simulation &&
    Date.parse(mail.createdAt) > to - 6 * HOUR).length;
  const mailLimit = Math.max(0, Math.min(2, Math.max(1, Math.floor(state.maxPosts / 2))) - recentMail);
  const index = planningIndex(content);
  for (const { profile, at } of opportunities.slice(0, 2048)) {
    if (runs.length >= Math.min(state.maxPosts, MAX_SESSION_POSTS - 2)) { truncated = true; break; }
    const action = chooseAction(index, profile, at, state.seed!, runs, mailLimit);
    if (!action) continue;
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

/** Configuration identity for stale setup actions; scheduling watermarks may advance. */
export function setupContext(content: Backup): string {
  const state = content.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
  return JSON.stringify([content.settings.find((row) => row.id === WORLD_SETTING)?.value,
    state?.seed, state?.maxPosts, state?.modelId, state?.consent]);
}
