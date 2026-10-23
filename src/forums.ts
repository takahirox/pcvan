import { serviceDate } from './calendar';
import type { HistoricalCalendar } from './calendar';
import { expandedBoards } from './communities';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import demoPosts from '../data/pcvan/demo-posts.json' with { type: 'json' };
import type { Backup, Member, Post } from './storage/schema';
import { ACTIVE_MEMBER_SETTING } from './storage/repository';

export type ForumContent = Pick<Backup, 'sigs' | 'forums' | 'posts'> & Partial<Pick<Backup, 'members' | 'readStates' | 'settings' | 'mail'>>;
// Reader copy omits explanatory paragraphs; the original fiction and all evidence
// metadata remain intact in the fixture linked from Settings → About.
const demoReading: Record<string, { title: string; body: string }> = {
  'demo-miti-1': { title: '空想観察ノート', body: '  架空の星を見つけたら、どんな名前を付けますか。' },
  'demo-miti-3': { title: '資料のしおり', body: 'ここには架空の観察メモを置いています。' },
  'demo-daisizen-1': { title: '小さな庭の便り', body: '　空想の庭に、丸い葉が一枚増えました。\n  葉の色：みどり　　風：そよそよ' },
};

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
export function forumPosts(content: ForumContent, keyword: string, boardNo: number) {
  const sigs = content.sigs.filter((sig) => sig.keyword.toUpperCase() === keyword);
  const forums = content.forums.filter((forum) => sigs.some((sig) => sig.id === forum.sigId) && forum.boardNo === boardNo);
  // Repository snapshots include settings, even on an empty restore. Suppress
  // demos there; retain them only for controllers without a loaded repository.
  if (sigs.length || content.settings !== undefined) return {
    source: 'local' as const,
    available: !sigs.length || (sigs.length === 1 && forums.length === 1),
    posts: forums.length === 1 && sigs.length === 1
      ? content.posts.filter((post) => post.forumId === forums[0]!.id).sort((a, b) => a.number - b.number)
      : [],
  };
  return {
    source: 'demo' as const,
    available: true,
    posts: demoPosts.posts.map((post) => ({ ...post, ...demoReading[post.id] })).filter((post) => post.forumId === `${keyword}:${boardNo}`).sort((a, b) => a.number - b.number),
  };
}

export function forumName(keyword: string, boardNo: number): string {
  return keyword === 'MITI' ? evidence.miti.steps[2]!.destination
    : keyword === 'DAISIZEN' ? evidence.daisizen.forums.find((forum) => forum.number === boardNo)!.label
    : expandedBoards.find((board) => board.keyword === keyword && board.boardNo === boardNo)!.name;
}

// Presentation only: versioned FNV-1a/64 over the full UTF-8 member ID. Never
// truncate a record key, assign by array order, or write on a read. This is a
// synthetic label, not authentication or a privacy/security hash.
function identityToken(member: Member): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(`pcvan-forum-v1:${member.id}`)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return `SYN-${hash.toString(32).toUpperCase().padStart(13, '0')}`;
}

function penName(member?: Member): string {
  const handle = member?.handle.trim();
  return handle && handle !== member?.id && !/fictional-ai:|[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu.test(handle)
    ? handle : '名無し';
}

/** Shared fixed-JST calendar; title + one full-width space + current pen name. */
export function renderPost(post: Post, name: string, lineCount?: number, members: readonly Member[] = [], calendar?: HistoricalCalendar): string[] {
  const stamp = serviceDate(post.simulation?.simulatedAt ?? post.createdAt, calendar, 'forum');
  const member = members.find((member) => member.id === post.authorId);
  // Only known synthetic fixtures have a stand-alone DEMO identity. Missing
  // imported authors remain explicitly unknown, never newly invented members.
  const token = member ? identityToken(member)
    : demoPosts.posts.some((demo) => demo.authorId === post.authorId) ? post.authorId : '不明';
  return [
    `#${post.number}${post.displaySecondNumber === undefined ? '' : `/${post.displaySecondNumber}`}　${name}`,
    `★タイトル (${token})  ${stamp}${lineCount === undefined ? '' : `  ( ${lineCount})`}`,
    `${post.title}　${penName(member)}`,
    '★内容',
    post.body,
  ];
}
