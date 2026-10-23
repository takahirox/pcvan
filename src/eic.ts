import type { ReadingItem } from './service-collections';

// Original, undated examples, not archived EIC NET articles or announcements.
// Bundled application content only; never part of the persisted local world.
export const eicReadings: readonly ReadingItem[] = [
  {
    title: '環境の資料を探すときに',
    body: '調べたいことを、場所と問いに分けて書いてみましょう。\n「近所の川」だけでなく「川の水質を調べた資料はあるか」とすると、探す手がかりができます。\n図書館の目録や自治体の資料案内では、発行元、調査した地域、調査年を確かめます。\n同じ題名でも、測り方や対象が違えば数字をそのまま比べることはできません。\n見つけた資料名と問い合わせ先を控え、分からない点は質問として残しておきましょう。',
  },
  {
    title: '身近な自然の観察ノート',
    body: 'いつもの道で一本の木を選び、少し離れた同じ場所から眺めてみましょう。\nノートには日時、場所、天気、見えたものを短く書きます。葉の色や鳥の動きも手がかりです。\n名前が分からなければ <未確認> と記し、形や大きさを言葉や絵で残します。\n見た事実と「たぶんこうだろう」という考えを別の行にすると、あとで読み返しやすくなります。\n次の観察では前の記録と比べます。採集や餌付けをせず、静かに見守るだけでも変化は見つかります。',
  },
];

export function renderEnvironmentalGateway(): string[] {
  return ['公共情報と政治', '環境情報ゲートウェイ',
    '1 EICネット（別ネットワーク）',
    '1: EICネットへ / LIST: 接続先一覧'];
}

export function renderEicList(): string[] {
  return ['EICネット / 環境情報', `記事一覧：${eicReadings.length}件`,
    ...eicReadings.map((item, index) => `#${index + 1} ${item.title}`),
    'READ 番号: 閲覧 / LIST: 記事一覧', 'BACK: 環境情報ゲートウェイ'];
}

export function renderEicItem(index: number): string[] {
  const item = eicReadings[index]!;
  return ['EICネット / 環境情報', `#${index + 1} ${item.title}`,
    ...item.body.split('\n'), 'LIST / BACK: 記事一覧に戻る'];
}
