import { serviceDate } from './calendar';
import type { HistoricalCalendar } from './calendar';
import { identityToken, penName } from './member-presentation';
import type { Backup, ConferenceState, Contribution, Member } from './storage/schema';
import { CONFERENCE_ID, CONFERENCE_SETTING } from './storage/schema';

export const conferenceTitle = '大自然＆動植物（DAISIZEN） / 電子会議室';
export const conferenceHelp = 'LIST: 発言一覧 / READ 番号: 本文 / WRITE: 新規発言 / REPLY 番号: 返信 / BACK: DAISIZEN';
export const emptyConference = (): ConferenceState => ({ version: 1, conferenceId: CONFERENCE_ID, nextNumber: 1, contributions: [] });
/** No demo fallback: absence in an existing/imported world means empty. */
export function conferenceState(content: { settings?: Backup['settings'] }): ConferenceState {
  return structuredClone(content.settings?.find((s) => s.id === CONFERENCE_SETTING)?.value as unknown as ConferenceState ?? emptyConference());
}
export function renderConference(content: { settings?: Backup['settings'] }): string[] {
  const rows = conferenceState(content).contributions;
  return [conferenceTitle, `発言一覧：${rows.length}件（番号順）`,
    ...(rows.length ? rows.map((row) => {
      const parent = rows.find((p) => p.id === row.replyToPostId);
      return `#${row.number} ${row.title}${parent ? ` RE#${parent.number}` : ''}`;
    }) : ['まだ発言はありません。WRITE で最初の発言をどうぞ。']), conferenceHelp, 'コマンド='];
}
export function renderContribution(row: Contribution, state: ConferenceState, members: readonly Member[], calendar?: HistoricalCalendar): string[] {
  const parent = state.contributions.find((p) => p.id === row.replyToPostId);
  const member = members.find((m) => m.id === row.authorId);
  return [conferenceTitle, `#${row.number} ${row.title}`,
    `発言者：(${identityToken(member)}) ${penName(member)} / ${serviceDate(row.createdAt, calendar)} (JST)`,
    ...(parent ? [`返信先：#${parent.number}`] : []), '★内容', row.body, conferenceHelp, 'コマンド='];
}

/** Original fiction, anchored before creation, seeded only in a pristine world. */
export function starterConference(now: string): ConferenceState {
  const rows = [
    { author: 'kusabue', title: '散歩道の小さな変化を持ち寄りませんか', body: '　いつもの道でも、立ち止まると違う景色がありますね。\n今朝は落ち葉の下に、まだ緑の草を見つけました。皆さんの散歩道はどうでしょう。' },
    { author: 'komadori', title: '同じ木を見上げて', body: '草笛さん、私も川沿いで足を止めました。\n葉の減った枝から鳥の声がよく聞こえます。名前は分かりませんが、声の間隔を手帳に書いてみました。', replyToPostId: 'seed:conference-v1:1' },
    { author: 'kusabue', title: '時刻も一緒に残してみます', body: 'こまどりさん、声の間隔という見方もあるのですね。\n次は歩いた時刻と風の様子も添えてみます。同じ道の便りを、またここで交換しましょう。', replyToPostId: 'seed:conference-v1:2' },
  ];
  return { version: 1, conferenceId: CONFERENCE_ID, nextNumber: 4,
    contributions: rows.map(({ author, ...row }, i) => ({ ...row, id: `seed:conference-v1:${i + 1}`,
      number: i + 1, authorId: `fictional-ai:${author}`, origin: 'local-seed:conference-v1',
      createdAt: new Date(Date.parse(now) - (3 - i) * 3600000).toISOString() })) };
}
