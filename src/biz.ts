import type { ReadingItem } from './service-collections';

// Original, undated late-1996 examples. No archived reporting or newspaper bylines.
// Application content only: neither articles nor visit-local sets enter storage.
export const bizArticles: readonly ReadingItem[] = [
  {
    title: 'パソコン通信で商店の在庫を照会',
    body: '小さな商店が、電話回線とパソコンを使った在庫照会を試している。\n閉店後に商品の番号と数量をまとめ、翌朝の仕入れに役立てる仕組みだ。\n通信中は電話を使えないため、送信する時間を決めて運用する。\n画面の <未確認> は数量を再点検する印で、自動発注は行わない。',
  },
  {
    title: '商店街の案内をCD-ROMに',
    body: '商店街の地図や店の紹介をCD-ROMにまとめる勉強会が開かれた。\nパソコンで写真と文章を読み、地図から店を探す見本を参加者が作った。\n内容の更新には盤の作り直しが必要になる。営業時間など変わりやすい情報は、店頭の紙の案内でも確かめてもらう。',
  },
  {
    title: '工場の省エネルギー、照明から点検',
    body: '町工場の共同勉強会では、照明と空気圧縮機の使い方を見直した。\n休憩中に止められる設備を調べ、作業の安全を確かめてから試す。\n省エネルギーの効果は、操業時間と生産量を添えて帳面に記録する。\n一日だけの数字で判断せず、同じ条件の日を比べることにした。',
  },
  {
    title: '図書館で通信の入門講座',
    body: '図書館の入門講座では、モデムの接続とパソコン通信の基本を紹介した。\n参加者は電話料金と接続時間をノートに控え、短い文章を送る練習をした。\nインターネットとの違いも質問に上がり、まず目的と接続先を確かめることを学んだ。\n利用を終えたら回線が切れているか、画面と機器の表示を確認する。',
  },
];

export interface BizSet { keyword: string; articles: readonly ReadingItem[] }
export const bizSetLimit = 20;
export const bizHelp = 'FIND パソコン / SHOW P1 /1 / SHOW P3 /1 1';
export const bizKeywordHelp = 'FIND は空白なしの語を1つ指定してください。題名・本文の部分一致（英字は大小同一）。論理式・集合演算・日付等の条件は使えません。';

export function renderDatabaseDirectory(): string[] {
  return ['データベース', 'データベース一覧：1件', '1 日経テレコン BiZ', '1: BiZへ / LIST: 一覧'];
}

export function renderBizSearch(sets: readonly BizSet[], zeroKeyword?: string): string[] {
  return ['日経テレコン BiZ / 検索', '日付なしの創作例文4件（新聞記事の転載ではありません）。',
    ...sets.map((set, index) => `/${index + 1} 検索語：${set.keyword} / ${set.articles.length}件`),
    ...(zeroKeyword === undefined ? [] : [`検索語：${zeroKeyword} / 0件（集合は作りません）`]),
    bizHelp, bizKeywordHelp, 'BACK: データベース一覧'];
}

export function renderBizTitles(set: BizSet, number: number): string[] {
  return ['日経テレコン BiZ / 見出し', `/${number} 検索語：${set.keyword} / ${set.articles.length}件`,
    ...set.articles.map((item, index) => `${index + 1} ${item.title}`),
    `SHOW P3 /${number} 1: 本文 / BACK: 検索結果`, bizHelp];
}

export function renderBizArticle(set: BizSet, number: number, item: number): string[] {
  const article = set.articles[item - 1]!;
  return ['日経テレコン BiZ / 本文', `/${number} / ${item} ${article.title}`,
    ...article.body.split('\n'), 'BACK: この集合の見出し', bizHelp];
}
