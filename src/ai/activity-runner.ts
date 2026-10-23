import type { LocalRepository } from '../storage/repository';
import type { AiActivity, AiRun, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, MAX_SESSION_POSTS } from './activity';
import { buildMailPrompt } from './mail';
import { buildPrompt } from './generation';
import type { LocalLlmAdapter } from './generation';
import { residentProfiles } from './personas';

export type ActivityActions = Pick<LocalRepository, 'openActivity' | 'configureActivity' | 'authorizeModel' | 'configureResident' | 'setAiRunStatus' | 'commitAiRun'>;

/** One pass only. Failure stops the batch; an explicit retry or reopening can resume it. */
export async function runActivityBatch(actions: ActivityActions, read: () => Promise<Backup>,
  state: AiActivity, engine: LocalLlmAdapter, signal: AbortSignal,
  budget: { attempts: number; committed: number }, report: (state: AiActivity) => void): Promise<void> {
  const batch = state.batch;
  if (!state.maxPosts || !batch) return;
  let current: AiRun | undefined;
  try {
    for (const planned of batch.runs) {
      signal.throwIfAborted();
      if (budget.attempts >= MAX_SESSION_POSTS || budget.committed >= state.maxPosts) break;
      const snapshot = await read();
      signal.throwIfAborted();
      const latest = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      if (!latest?.maxPosts || latest.batch?.id !== batch.id) break;
      if (budget.committed >= latest.maxPosts) break;
      current = latest.batch.runs.find((row) => row.id === planned.id);
      if (!current || current.status === 'committed') { current = undefined; continue; }
      if (!residentProfiles(snapshot).some((profile) => profile.id === current!.personaId && profile.frequency > 0)) {
        current = undefined; continue;
      }
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
        mail: (snapshot.mail ?? []).filter((m) => Date.parse(m.simulation?.simulatedAt ?? m.createdAt) <= Date.parse(current!.simulatedAt)) };
      budget.attempts++;
      const raw = await engine.generate(current.mail ? buildMailPrompt(context, current.personaId, current.mail) : buildPrompt(context, request), signal);
      signal.throwIfAborted();
      const post = await actions.commitAiRun(current.id, raw, signal);
      if (post) budget.committed++;
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
