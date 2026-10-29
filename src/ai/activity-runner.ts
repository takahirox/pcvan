import type { LocalRepository } from '../storage/repository';
import { mailAvailableAt } from '../storage/schema';
import type { AiActivity, AiRun, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, canAttempt } from './activity';
import { buildMailPrompt } from './mail';
import { buildPrompt } from './generation';
import type { GenerationPrompt, LocalLlmAdapter } from './generation';
import { residentProfiles, personaMemberId } from './personas';

export type ActivityActions = Pick<LocalRepository, 'openActivity' | 'configureActivity' | 'authorizeModel' | 'configureResident' | 'setAiRunStatus' | 'commitAiRun'>;

/** One bounded queue pass. Rejected text affects only its author; worker failure yields remaining work. */
export async function runActivityBatch(actions: ActivityActions, read: () => Promise<Backup>,
  state: AiActivity, engine: LocalLlmAdapter, signal: AbortSignal,
  budget: { attempts: number; committed: number }, report: (state: AiActivity) => void,
  shouldYield: () => boolean = () => false): Promise<void> {
  const batch = state.batch;
  if (!state.maxPosts || !batch) return;
  let current: AiRun | undefined;
  try {
    for (const planned of batch.runs) {
      signal.throwIfAborted();
      if (shouldYield()) break;
      const snapshot = await read();
      signal.throwIfAborted();
      const latest = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      if (!latest?.maxPosts || latest.batch?.id !== batch.id) break;
      current = latest.batch.runs.find((row) => row.id === planned.id);
      if (!current || !['pending', 'running'].includes(current.status) || !canAttempt(latest, current, Date.now())) { current = undefined; continue; }
      if (!snapshot.members.some((m) => m.id === personaMemberId(current!.personaId) && m.actor === 'ai')) { current = undefined; continue; }
      if (!residentProfiles(snapshot).some((profile) => profile.id === current!.personaId && profile.frequency > 0)) {
        current = undefined; continue;
      }
      // Yield before claiming another run; an in-flight generation/commit finishes
      // normally, and unclaimed runs retain their persisted status and allowance.
      if (shouldYield()) break;
      const started = await actions.setAiRunStatus(current.id, 'running');
      report(started);
      current = started.batch?.runs.find((run) => run.id === planned.id && run.status === 'running');
      if (!current) {
        current = undefined; continue;
      }
      signal.throwIfAborted();
      const request = { personaId: current.personaId, forumId: current.forumId!,
        ...(current.replyToPostId === undefined ? {} : { replyToPostId: current.replyToPostId }) };
      const context = { ...snapshot, posts: snapshot.posts.filter((post) =>
        Date.parse(post.simulation?.simulatedAt ?? post.createdAt) <= Date.parse(current!.simulatedAt)),
        mail: (snapshot.mail ?? []).filter((m) => Date.parse(mailAvailableAt(m)) <= Date.parse(current!.simulatedAt)) };
      let prompt: GenerationPrompt;
      try { prompt = current.mail ? buildMailPrompt(context, current.personaId, current.mail) : buildPrompt(context, request); }
      catch {
        report(await actions.setAiRunStatus(current.id, 'failed'));
        current = undefined; continue; // A deleted parent is local to this decision.
      }
      budget.attempts++;
      const deadline = new AbortController();
      const timeout = setTimeout(() => deadline.abort(), 45_000);
      let raw: string;
      try { raw = await engine.generate(prompt, AbortSignal.any([signal, deadline.signal])); }
      finally { clearTimeout(timeout); }
      signal.throwIfAborted();
      try {
        const post = await actions.commitAiRun(current.id, raw, signal);
        if (post) budget.committed++;
      } catch (error) {
        signal.throwIfAborted();
        // Invalid text or a failed atomic save must not discard other decisions.
        report(await actions.setAiRunStatus(current.id, 'failed'));
      }
      current = undefined;
      const updated = await read();
      report(updated.settings.find((row) => row.id === ACTIVITY_SETTING)!.value as unknown as AiActivity);
    }
  } catch (error) {
    if (current) {
      // Restore/disable may have removed this run. Committed runs cannot be downgraded.
      try { report(await actions.setAiRunStatus(current.id, signal.aborted ? 'pending' : 'failed')); } catch { /* Recover on reopen. */ }
    }
    throw error;
  }
}
