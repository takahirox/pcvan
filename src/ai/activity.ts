import type { AiActivity, AiBatch, Backup } from '../storage/schema';
import { models, personas } from './personas';

export const ACTIVITY_SETTING = 'ai-activity';
export const MAX_SESSION_POSTS = 12;
export const HOUR = 60 * 60 * 1000;

export function emptyActivity(now: string): AiActivity {
  return { version: 1, maxPosts: 0, modelId: models[0].id, lastActivityAt: now, batch: null };
}

/** One fictional post per elapsed hour, with a hard bound and no catch-up queue. */
export function planActivity(content: Backup, state: AiActivity, now: string): AiBatch | null {
  const from = Date.parse(state.lastActivityAt);
  const to = Date.parse(now);
  const count = Math.min(state.maxPosts, MAX_SESSION_POSTS, Math.max(0, Math.floor((to - from) / HOUR)));
  const forums = content.forums.filter((forum) => forum.id.length <= 128 &&
    content.sigs.some((sig) => sig.id === forum.sigId)).sort((a, b) => a.id.localeCompare(b.id));
  if (!count || !forums.length) return null;
  const id = `activity:${state.lastActivityAt}:${now}`;
  const offset = Math.abs(Math.floor(from / HOUR));
  return {
    id, from: state.lastActivityAt, to: now, modelId: state.modelId,
    runs: Array.from({ length: count }, (_, index) => {
      const forum = forums[(offset + index) % forums.length]!;
      const simulatedAt = new Date(from + Math.floor((to - from) * (index + 1) / (count + 1))).toISOString();
      const parents = content.posts.filter((post) => post.forumId === forum.id && post.id.length <= 128 &&
        Date.parse(post.simulation?.simulatedAt ?? post.createdAt) <= Date.parse(simulatedAt) &&
        (post.origin === 'local-human' || post.origin.startsWith('local-ai:webllm:')))
        .sort((a, b) => b.number - a.number).slice(0, 4);
      const parent = index % 2 === 1 ? parents[index % Math.max(1, parents.length)] : undefined;
      return { id: `${id}:${index}`, personaId: personas[(offset + index) % personas.length]!.id,
        forumId: forum.id, ...(parent ? { replyToPostId: parent.id } : {}), simulatedAt, status: 'pending' };
    }),
  };
}
