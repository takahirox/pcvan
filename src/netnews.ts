import { calendarSetting, serviceDate } from './calendar';
import { identityToken, penName } from './member-presentation';
import { NETNEWS_SETTING } from './storage/schema';
import type { Backup, NetNewsState } from './storage/schema';

// Original fiction with authored, fixed dates; not recovered articles or a
// verified PC-VAN carriage directory. Bundled only, outside the local world.
export interface NetNewsArticle {
  readonly number: number;
  readonly subject: string;
  readonly from: string;
  readonly date: string;
  readonly messageId: string;
  readonly references?: string;
  readonly body: string;
}

export interface NetNewsGroup {
  readonly name: string;
  readonly articles: readonly NetNewsArticle[];
}

export interface NetNewsSearch {
  readonly field: 'Subject' | 'From';
  readonly query: string;
}

export const netNewsGroups: readonly NetNewsGroup[] = [
  {
    name: 'fj.questions.fj',
    articles: [
      {
        number: 1,
        subject: 'NetNews  はじめの質問',
        from: '風枝 澄 <sumi@letters.example.invalid>',
        date: 'Mon, 04 Nov 1996 19:10:00 +0900',
        messageId: '<questions.1@netnews.example.invalid>',
        body: '初めて記事を読んでいます。グループ名の点はどのような区切りでしょうか。\n折り紙の話題を探す前に、一覧の見方を覚えたいと思います。\n手元のメモでは、まだ名前を一続きに書いていました。',
      },
      {
        number: 2,
        subject: 'Re: NetNews  はじめの質問',
        from: '風枝 航 <wataru@letters.example.invalid>',
        date: 'Tue, 05 Nov 1996 08:25:00 +0900',
        messageId: '<questions.2@netnews.example.invalid>',
        references: '<questions.1@netnews.example.invalid>',
        body: '点は名前の階層を区切っています。まず大きな分類を見て、その下の名前をたどると探しやすいです。\n似た名前でも扱う話題が違うことがあるので、案内の記事も読んでみてください。\n私は気になった名前を紙に控えてから、いくつか読み比べています。',
      },
      {
        number: 3,
        subject: '記事の控えと読み返し',
        from: '水穂 灯 <akari@notes.example.invalid>',
        date: 'Wed, 06 Nov 1996 20:40:00 +0900',
        messageId: '<questions.3@netnews.example.invalid>',
        body: '後で読み返したい記事は、題名だけでなくグループ名と差出人も控えるようにしました。\n自分の端末の <保存箱> に入れる前に、どこで読んだものかを一行添えています。\n同じ題名の返事が並んだときにも見分けやすくなりました。',
      },
    ],
  },
  {
    name: 'fj.news.usage',
    articles: [
      {
        number: 1,
        subject: '引用の範囲について質問',
        from: '紙浦 梢 <kozue@letters.example.invalid>',
        date: 'Mon, 04 Nov 1996 21:05:00 +0900',
        messageId: '<usage.1@netnews.example.invalid>',
        body: '返事を書くとき、元の記事をどのくらい残すと読みやすいでしょうか。\n短い質問への返事でも全文を付けてしまい、同じ文章が長く続いてしまいました。\n皆さんが気を付けていることを教えてください。',
      },
      {
        number: 2,
        subject: 'Re: 引用の範囲について質問',
        from: '紙浦 泉 <izumi@letters.example.invalid>',
        date: 'Tue, 05 Nov 1996 18:15:00 +0900',
        messageId: '<usage.2@netnews.example.invalid>',
        references: '<usage.1@netnews.example.invalid>',
        body: 'どの部分への返事か分かる範囲を残し、その直後に自分の説明を書くようにしています。\n省いたために意味が変わらないか、送る前に読み直すことも大切だと思います。\n署名まで繰り返さずに済むと、次に読む人にも追いやすくなります。',
      },
      {
        number: 3,
        subject: 'Subject と From を控える工夫',
        from: '灯坂 文 <aya@notes.example.invalid>',
        date: 'Thu, 07 Nov 1996 07:30:00 +0900',
        messageId: '<usage.3@netnews.example.invalid>',
        body: '読みかけの話題をノートにまとめています。Subject と From を別々の欄にすると便利でした。\n題名だけが似ている別の話題もあるので、Newsgroups も一緒に書いています。\n検索するときは、覚えている語がどの欄にあったかを考えてから探しています。',
      },
    ],
  },
];

export const netNewsHelp = 'WRITE: 新規記事 / REPLY 番号: 公開フォローアップ / READ 番号: 本文 / SEARCH SUBJECT 文字列 / SEARCH FROM 文字列 / LIST: 全記事一覧';
export const netNewsSearchHelp = '検索は Subject / From のどちらか一方の文字どおりの部分一致（英字の大小は区別しません）。前後の空白を除き、途中の空白はそのまま。正規表現・論理式・本文検索はありません。';

export function netNewsResults(group: NetNewsGroup, search?: NetNewsSearch): readonly NetNewsArticle[] {
  return search ? group.articles.filter((article) =>
    article[search.field === 'Subject' ? 'subject' : 'from'].toLowerCase().includes(search.query.toLowerCase())) : group.articles;
}

export function renderInternetDirectory(): string[] {
  return ['インターネット / サービス一覧', '1 NetNews', '1: グループ一覧 / LIST: サービス一覧'];
}

export function renderNetNewsDirectory(): string[] {
  return ['NetNews / グループ一覧', ...netNewsGroups.map((group, index) => `${index + 1} ${group.name}`),
    '番号: 記事一覧 / LIST: グループ一覧'];
}

export function renderNetNewsList(group: NetNewsGroup, search?: NetNewsSearch): string[] {
  const results = netNewsResults(group, search);
  return [`NetNews / ${group.name} / 記事一覧`,
    ...(search ? [`検索 ${search.field}: ${search.query}`, `検索結果：${results.length}件`] : [`記事一覧：${results.length}件`]),
    ...results.map((article) => `#${article.number} Subject: ${article.subject}\n   From: ${article.from}`),
    ...(results.length ? [] : ['一致する記事はありません。']), netNewsHelp, netNewsSearchHelp];
}

export function renderNetNewsArticle(group: NetNewsGroup, article: NetNewsArticle): string[] {
  return [`NetNews / ${group.name} / 本文 #${article.number}`,
    `Newsgroups: ${group.name}`, `From: ${article.from}`, `Subject: ${article.subject}`,
    `Date: ${article.date}`, `Message-ID: ${article.messageId}`,
    ...(article.references ? [`References: ${article.references}`] : []), '', ...article.body.split('\n'),
    'BACK: 元の記事一覧 / LIST: 全記事一覧', netNewsHelp];
}

export const emptyNetNews = (): NetNewsState => ({ version: 1,
  nextNumbers: Object.fromEntries(netNewsGroups.map((g) => [g.name, 4])), contributions: [] });
/** Pure read: old backups and restored empty worlds acquire no stored examples. */
export function netNewsState(content: { settings?: Backup['settings'] }): NetNewsState {
  return structuredClone(content.settings?.find((s) => s.id === NETNEWS_SETTING)?.value as unknown as NetNewsState ?? emptyNetNews());
}
export function localNetNewsMessageId(group: string, number: number): string {
  return `<local.${group}.${number}@netnews.example.invalid>`;
}
/** Shared stable synthetic identity and safe current pen name; never a real address. */
export function netNewsGroup(content: { settings?: Backup['settings']; members?: Backup['members'] }, index: number): NetNewsGroup {
  const group = netNewsGroups[index]!;
  return { name: group.name, articles: [...group.articles,
    ...netNewsState(content).contributions.filter((a) => a.group === group.name).map((a) => {
      const member = content.members?.find((m) => m.id === a.authorId);
      return { number: a.number, subject: a.title, body: a.body,
        from: `${penName(member)} <${identityToken(member).toLowerCase()}@members.example.invalid>`,
        date: serviceDate(a.createdAt, calendarSetting(content), 'netnews'), messageId: a.messageId,
        ...(a.references.length ? { references: a.references.join(' ') } : {}) };
    })] };
}
