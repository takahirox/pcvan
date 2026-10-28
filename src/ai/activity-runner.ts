import type { LocalRepository } from '../storage/repository';
import { mailAvailableAt } from '../storage/schema';
import type { AiActivity, AiRun, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, MAX_SESSION_POSTS, canAttempt, routineFactor } from './activity';
import { buildMailPrompt } from './mail';
import { buildPrompt } from './generation';
import type { LocalLlmAdapter } from './generation';
import { residentProfiles, personaMemberId } from './personas';

export type ActivityActions = Pick<LocalRepository, 'openActivity' | 'configureActivity' | 'authorizeModel' | 'configureResident' | 'setAiRunStatus' | 'commitAiRun'>;

/** One pass only. Failure stops the batch; an explicit retry or reopening can resume it. */
export async function runActivityBatch(actions: ActivityActions, read: () => Promise<Backup>,
  state: AiActivity, engine: LocalLlmAdapter, signal: AbortSignal,
  budget: { attempts: number; committed: number }, report: (state: AiActivity) => void,
  shouldYield: () => boolean = () => false): Promise<void> {
  const batch = state.batch;
  if (!state.maxPosts || !batch) return;
  let current: AiRun | undefined;
  try {
    for (const planned of [...batch.runs].sort((a, b) => Number(!!b.userResponse) - Number(!!a.userResponse))) {
      signal.throwIfAborted();
      if (shouldYield()) break;
      if (!planned.userResponse && (budget.attempts >= MAX_SESSION_POSTS || budget.committed >= state.maxPosts)) continue;
      const snapshot = await read();
      signal.throwIfAborted();
      const latest = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      if (!latest?.maxPosts || latest.batch?.id !== batch.id) break;
      if (!planned.userResponse && budget.committed >= latest.maxPosts) continue;
      current = latest.batch.runs.find((row) => row.id === planned.id);
      if (!current || current.status === 'committed' || !canAttempt(latest, current, Date.now())) { current = undefined; continue; }
      if (!snapshot.members.some((m) => m.id === personaMemberId(current!.personaId) && m.actor === 'ai')) { current = undefined; continue; }
      if (!residentProfiles(snapshot).some((profile) => profile.id === current!.personaId && profile.frequency > 0 &&
        (!current!.userResponse || (routineFactor(profile, Date.now()) === 1 && Date.now() - Date.parse(current!.simulatedAt) <= 10 * 60_000)))) {
        current = undefined; continue;
      }
      // Yield before claiming another run; an in-flight generation/commit finishes
      // normally, and unclaimed runs retain their persisted status and allowance.
      if (shouldYield()) break;
      const started = await actions.setAiRunStatus(current.id, 'running');
      report(started);
      if (!started.batch?.runs.some((run) => run.id === current!.id && run.status === 'running')) {
        current = undefined; continue;
      }
      signal.throwIfAborted();
      const request = { personaId: current.personaId, forumId: current.forumId!,
        ...(current.replyToPostId === undefined ? {} : { replyToPostId: current.replyToPostId }) };
      const context = { ...snapshot, posts: snapshot.posts.filter((post) =>
        Date.parse(post.simulation?.simulatedAt ?? post.createdAt) <= Date.parse(current!.simulatedAt)),
        mail: (snapshot.mail ?? []).filter((m) => Date.parse(mailAvailableAt(m)) <= Date.parse(current!.simulatedAt)) };
      if (!current.userResponse) budget.attempts++;
      const raw = await engine.generate(current.mail ? buildMailPrompt(context, current.personaId, current.mail) : buildPrompt(context, request), signal);
      signal.throwIfAborted();
      const post = await actions.commitAiRun(current.id, raw, signal);
      if (post && !current.userResponse) budget.committed++;
      current = undefined;
      const updated = await read();
      report(updated.settings.find((row) => row.id === ACTIVITY_SETTING)!.value as unknown as AiActivity);
    }
  } catch (error) {
    if (current) {
      // Restore/disable may have removed this run. Committed runs cannot be downgraded.
      try { report(await actions.setAiRunStatus(current.id, signal.aborted ? 'cancelled' : 'failed')); } catch { /* Recover on reopen. */ }
    }
    throw error;
  }
}
