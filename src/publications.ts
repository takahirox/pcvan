import type { ReadingItem } from './service-collections';

// Original, undated fiction, not an authentic PC-VAN Journal publication.
// Bundled application content only; never persisted in the local world.
export const publicationTitle = '架空文芸誌「灯窓」';
export const publicationInstallments: readonly ReadingItem[] = [
  {
    title: '窓辺の信号 第一回 白い封筒',
    body: '閉店間際の時計店で、見習いは古い柱時計の裏に白い封筒を見つけた。\n中には川沿いの家を描いた地図と、「窓の灯りを見てから、ぜんまいを巻くこと」とだけ書かれた紙があった。\n店主は地図を見ると、奥から小さな時計を持ってきた。針は六時で止まっていた。\n「橋の向こうの修理屋さんへ届けるはずだったんだ。足を悪くしてから、ずいぶん待たせてしまった」\n見習いは時計を布に包んだ。店の端末に <連絡待ち> と記したまま、二人は川の方を眺めた。\n向こう岸の窓に、一つだけ灯りがともった。',
  },
  {
    title: '窓辺の信号 第二回 同じ時刻',
    body: '灯りを確かめて、見習いは橋を渡った。地図の家では、白髪の修理屋が窓辺で手を振っていた。\n「その時計は、あの店の開店祝いに作ったんだよ。もう一度音を聞きたくてね」\n布をほどくと、修理屋はぜんまいを静かに巻いた。小さな鐘が六つ鳴り、川向こうから柱時計の低い音が重なった。\n二つの時計を合わせるために、昔から窓の灯りを合図にしていたのだという。\n帰った見習いが端末の文字を「連絡済み」に直すと、店主は翌日の配達帳を開いた。\nその最初の行には、橋の向こうで一緒にお茶を飲む約束が書かれた。',
  },
];

export function renderPublicationDirectory(): string[] {
  return ['電子出版 / 刊行物一覧', `1 ${publicationTitle}`, '1: 目次へ / LIST: 刊行物一覧'];
}

export function renderPublicationContents(): string[] {
  return [`${publicationTitle} / 目次`, `連載一覧：${publicationInstallments.length}件`,
    ...publicationInstallments.map((item, index) => `#${index + 1} ${item.title}`),
    'READ 番号: 本文 / LIST: 目次', 'BACK: 刊行物一覧'];
}

export function renderPublicationInstallment(index: number): string[] {
  const item = publicationInstallments[index]!;
  return [`${publicationTitle} / 本文`, `#${index + 1} ${item.title}`,
    ...item.body.split('\n'), 'LIST / BACK: 目次に戻る'];
}
