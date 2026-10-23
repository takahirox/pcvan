import type { ReadingItem } from './service-collections';

// Original, undated fiction set in late 1996, not recovered wire reports.
// Bundled application content only; never persisted in the local world.
export const newsBriefs: readonly ReadingItem[] = [
  {
    title: '星波町、駅前に共同駐輪場',
    body: '星波町は、駅前の町有地に自転車三百台を収容する共同駐輪場を開設した。\n朝の通勤時間帯に歩道へ自転車が集中していたため、商店会と協議して整備した。\n利用は無料。係員が朝夕に巡回し、町は一か月間の利用状況を調べたうえで案内板の増設を検討する。',
  },
  {
    title: '穂凪村の選果場、冬の出荷始まる',
    body: '穂凪村の共同選果場で、冬の贈答用のリンゴの出荷が始まった。\n農家二十戸が持ち寄った果実を大きさ別に分け、作業員が箱詰めを進めている。\n組合によると、夏の少雨で実はやや小ぶりだが、収穫量は例年並みの見通し。近隣の市場を中心に出荷する。',
  },
  {
    title: '月代市の図書館、蔵書照会を試行',
    body: '月代市立図書館は、電話回線とパソコンを使って自宅から蔵書を照会する試験を始めた。\n募集に応じた市民三十人が、モデムを通して書名や著者名を入力し、貸し出し状況を確かめる。予約は窓口で受け付ける。\n試験画面の <照会中> という表示が長く続く場合があり、担当者は回線の混雑と応答時間を調べている。\n市は試験結果をまとめ、来年度の利用拡大を検討する。',
  },
];

export function renderNewsDirectory(): string[] {
  return ['ニュース / 提供元一覧', '1 時事通信ニュース', '1: 見出しへ / LIST: 提供元一覧'];
}

export function renderNewsHeadlines(): string[] {
  return ['時事通信ニュース / 見出し', `見出し一覧：${newsBriefs.length}件`,
    ...newsBriefs.map((item, index) => `#${index + 1} ${item.title}`),
    'READ 番号: 本文 / LIST: 見出し一覧', 'BACK: 提供元一覧'];
}

export function renderNewsBrief(index: number): string[] {
  const item = newsBriefs[index]!;
  return ['時事通信ニュース / 本文', `#${index + 1} ${item.title}`,
    ...item.body.split('\n'), 'LIST / BACK: 見出し一覧に戻る'];
}
