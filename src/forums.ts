import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import demoPosts from '../data/pcvan/demo-posts.json' with { type: 'json' };
import type { Backup, Post } from './storage/schema';
import { ACTIVE_MEMBER_SETTING } from './storage/repository';

export type ForumContent = Pick<Backup, 'sigs' | 'forums' | 'posts'> & Partial<Pick<Backup, 'readStates'>>;
export const emptyContent = (): ForumContent => ({ sigs: [], forums: [], posts: [] });

export function activeHuman(content: Backup): string | undefined {
  const humans = content.members.filter((member) => member.actor === 'human');
  const selected = content.settings.find((setting) => setting.id === ACTIVE_MEMBER_SETTING)?.value;
  return humans.find((member) => member.id === selected)?.id ?? humans[0]?.id;
}

export function replyReference(post: Post, posts: readonly Post[]): Post | undefined {
  return posts.find((parent) => parent.id === post.replyToPostId && parent.forumId === post.forumId);
}

// IDs, dates, titles and bodies are original fiction. Historical evidence is
// confined to the SIG/board directory, never the demonstration's contents.
export function forumPosts(content: ForumContent, keyword: 'MITI' | 'DAISIZEN', boardNo: number) {
  const sigs = content.sigs.filter((sig) => sig.keyword.toUpperCase() === keyword);
  const forums = content.forums.filter((forum) => sigs.some((sig) => sig.id === forum.sigId) && forum.boardNo === boardNo);
  // A stored SIG takes precedence even if its board is missing or empty. Do not
  // resurrect demo messages after a restore or mask ambiguous local mappings.
  if (sigs.length) return {
    source: 'local' as const,
    available: sigs.length === 1 && forums.length === 1,
    posts: forums.length === 1 && sigs.length === 1
      ? content.posts.filter((post) => post.forumId === forums[0]!.id).sort((a, b) => a.number - b.number)
      : [],
  };
  return {
    source: 'demo' as const,
    available: true,
    posts: demoPosts.posts.filter((post) => post.forumId === `${keyword}:${boardNo}`).sort((a, b) => a.number - b.number),
  };
}

export function forumName(keyword: 'MITI' | 'DAISIZEN', boardNo: number): string {
  return keyword === 'MITI' ? evidence.miti.steps[2]!.destination
    : evidence.daisizen.forums.find((forum) => forum.number === boardNo)!.label;
}

/** UTC keeps the stored date stable across browsers; spacing is reconstructed. */
export function renderPost(post: Post, name: string, lineCount?: number): string[] {
  const date = new Date(post.createdAt).toISOString();
  const stamp = `${date.slice(2, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}  ${date.slice(11, 16)}`;
  return [
    `#${post.number}${post.displaySecondNumber === undefined ? '' : `/${post.displaySecondNumber}`}　${name}`,
    `★タイトル (${post.authorId})  ${stamp}${lineCount === undefined ? '' : `  ( ${lineCount})`}`,
    post.title,
    '★内容',
    post.body,
  ];
}
