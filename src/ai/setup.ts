import { models } from './personas';

/** Shared download disclosure for the dialog and optional typed confirmation. */
export function modelDisclosure(modelId: string): string[] {
  return [models.find((model) => model.id === modelId)?.label ?? modelId,
    '初回読込は数百 MB〜数 GB を配布元（Hugging Face / MLC / GitHub）からダウンロードします。',
    'ブラウザーの保存領域と WebGPU / GPU メモリを使います。保存済みでも追加通信が必要な場合があります。',
    '推論と投稿・メールデータの処理はこの端末内です。外部の推論サービスには送りません。',
    '新しい世界は100人の架空の住人を持ち、掲示板投稿・私信・OLTの発言を少数ずつ生成するローカルシミュレーションです。',
    '自動活動の上限が0より大きい場合、予定された投稿・メールを自動保存します。ABOUT で詳細・出自を確認できます。',
    '同意してモデルを読み込みますか？ (Y/N)='];
}
