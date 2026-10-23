import { oltState } from './olt-state';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import type { Backup } from './storage/schema';
import { WORLD_SETTING } from './storage/schema';
import { residentProfiles } from './ai/personas';

export const settingsMenu = ['設定 / SETTINGS', '1 表示・速度', '2 ハンドル', '3 モデル・活動・住人',
  '4 JSON バックアップ・復元・初期化', '5 オフライン・容量', '6 セッション時刻', '7 ログ保存', '8 操作案内', '9 詳細・出自',
  '番号 / BACK: 元の画面 / MAIN: MAIN / HELP: この案内'];
export const keyboardHelp = ['PC-VAN 内の閲覧・利用者登録・投稿は端末入力で操作します。',
  '表示・AIモデル・データ保守はヘッダーの「設定 / Options」で操作できます。', 'Enter: 送信 / 日本語変換中の Enter は送信しません。',
  '↑ / ↓: 入力履歴 / PageUp・PageDown: 出力スクロール / Tab: 出力と入力を移動',
  '出力にフォーカスして ← / →: 横スクロール / Esc: 全文表示・接続演出をスキップ',
  'SETTINGS / CONFIG: 設定 / HANDLE: 利用者 / ABOUT: 詳細・出自 / LOG: ログ保存',
  'BACK: 一つ戻る / MAIN: MAIN / HELP: 現在の画面の案内',
  '編集中は BACK / MAIN で移動しません。.CANCEL で明示的に破棄します。',
  'メール: MAIN 1 / X または SIG MAIL → MEMBERS / WRITE 宛先 / INBOX / SENT / READ 番号 / REPLY 番号',
  'OLT: 13 → 2 → OLT → JOIN 番号。入室中は通常の入力が発言。/WHO / /LIST / /HELP / /LEAVE / /MAIN。',
  'WRITE → タイトル → 本文を1行ずつ → .END → EDIT / Y / N',
  '確認中の空入力は承認になりません。Y はその確認だけを承認します。'];
export function about(content: Backup): string[] {
  return ['PC-VAN / 詳細・出自',
    'このブラウザーだけで動くローカルシミュレーションです。実際の多人数ネットワークではありません。',
    'MAIN の項目名と J MITI → 3 → 9 は史料を参考にしています。表示配置・便利コマンド・設定・編集操作は現代の再構成です。',
    'DAISIZEN のアーカイブ構成を参考にした再構成であり、番号による橋渡しは検証済みコマンドではありません。',
    '投稿ヘッダーは保存史料を参考に再構成しています。/ の後の数と行数の規則は未確認です。日時は UTC。書体は現代の等幅フォントです。',
    '10人の住人は架空の人物です。local-seed:fictional の30件・8話題と local-seed:authored-sigs-v1 の36件・10話題は事前に書いた創作です。史料の転載でもモデル生成でもありません。',
    'DOS/Vワールドとグローバル・ビレッジは実在名ですが、対象年代の配置・番号は未確認です。ゲーム談話室・追加掲示板・交流慣行・SIG 一覧の3〜5は再構成です。LOCAL- はアプリ内の識別子で、歴史的ジャンプではありません。',
    'local-ai:webllm: は端末内で生成した人工の投稿、local-human は利用者の投稿です。DEMO は架空の見本です。',
    '初期会話の日時は世界作成日前の約2週間に配置した創作です。生成投稿の simulatedAt は創作の活動時刻、createdAt は保存時刻です。',
    'メールも架空の住人と人間の間だけでブラウザー内に保存・生成します。外部配送はありません。コマンド・宛先・箱の共有は現代の再構成です。',
    'メールはローカル世界内での私信で、暗号化されません。同じ端末・ブラウザープロファイルにアクセスできる人からの隔離はありません。JSON とログにも私信が含まれます。',
    'メールの文脈は相手との最大4通と両者の公開投稿最大4件。ほかの相手の私信は含めません。メール既読は受信者ごとの各通に記録します。',
    'OLT の部屋名・JOIN・/WHO・/LIST・/LEAVE・行表示は現代の再構成です。史料から確定した操作ではありません。',
    'OLT の在室は架空の住人のローカルな生活シミュレーションで、遠隔の接続人数ではありません。local-presence は生成文ではない入退室記録です。',
    'OLT は公開会話最大12行と公開投稿最大3件のみを文脈に使い、私信を渡しません。各部屋200行まで保存、/LIST は直近40行。日時 UTC。',
    'OLT は可視タブでのみ推論し、閉じている間の会話を作りません。生成は別枠で全室1時間24試行、会話は連続3発言まで。0で自動活動を休止すると OLT も休止します。',
    ...oltState(content).rooms.flatMap((r) => r.lines.map((l) => `OLT ${l.id} / ${l.authorId} / kind=${l.kind} / origin=${l.origin} / createdAt=${l.createdAt}`)),
    'モデルの重みは外部から取得しますが、推論・投稿データの処理は端末内です。外部推論・API キーは使いません。',
    '同じ掲示板の直近最大4件のローカル創作を文脈に使用。日本語品質はモデル・機器によります。',
    '新しい世界の自動活動上限は4。モデル同意前は生成しません。約1分ごとに予定確認。閉じている間は動かず、再訪時に最大72時間の一部を再現します。',
    '6時間の生成試行は12回まで。再接続では増えません。住人の生活時間・活動頻度は個別編集できます。',
    '既読は人間の利用者ごとの最大番号です。データはブラウザーの容量・保持ポリシーで消えることがあります。JSON バックアップを外部に保存してください。',
    `初期状態・来歴: ${JSON.stringify(content.settings.find((row) => row.id === WORLD_SETTING)?.value ?? null)}`,
    '史料・不確実性: https://github.com/takahirox/pcvan/blob/main/docs/research/pcvan-1996-1997.md',
    `MAIN: ${mainMenu.source_url}`, `MITI: ${evidence.miti.source_url}`, `DAISIZEN: ${evidence.daisizen.source_url}`,
    '投稿ヘッダー: https://www.rumic.org/forum/rumicworld/rumic2491.html',
    '追加SIGと史料: https://github.com/takahirox/pcvan/blob/main/data/pcvan/expanded-sigs.json',
    '追加創作: https://github.com/takahirox/pcvan/blob/main/data/pcvan/expanded-community.json',
    '初期会話: https://github.com/takahirox/pcvan/blob/main/data/pcvan/fictional-community.json',
    '見本: https://github.com/takahirox/pcvan/blob/main/data/pcvan/demo-posts.json',
    ...residentProfiles(content).map((row) => `${row.handle} / fictional-ai:${row.id} / ${JSON.stringify(row)}`),
    ...(content.mail ?? []).map((m) => `メール #${m.number} / ${m.senderId} → ${m.recipientId} / origin=${m.origin} / createdAt=${m.createdAt} / ${JSON.stringify(m.simulation ?? null)}`),
    ...content.posts.map((post) => `${post.forumId} #${post.number} / ${post.authorId} / actor=${content.members.find((m) => m.id === post.authorId)?.actor} / origin=${post.origin} / createdAt=${post.createdAt} / ${JSON.stringify(post.simulation ?? null)}`),
  ];
}
