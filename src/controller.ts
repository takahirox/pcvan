export interface TerminalController {
  readonly welcome: readonly string[];
  submit(line: string): readonly string[];
}

const help = [
  'help         コマンド一覧',
  'demo         文字表示のサンプル',
  'echo <文字>  入力した文字を表示',
];

// All copy here is synthetic, not a transcription of a historical service.
export const demoController: TerminalController = {
  welcome: [
    'pcvan / 日本語テキスト端末デモ',
    'これは創作デモです。史実の PC-VAN 画面を再現したものではありません。',
    'この画面だけで動作します。help を入力して Enter を押してください。',
  ],
  submit(line) {
    const command = line.trim().split(/\s+/, 1)[0]?.toLowerCase();
    switch (command) {
      case 'help':
        return help;
      case 'demo':
        return ['文字表示サンプル（創作）\n  日本語：こんにちは。\n  全角：ＡＢＣ　「句読点」、。\n  半角：ABC 123 !?  ｶﾀｶﾅ  ﾊﾝｶｸ'];
      case 'echo':
        // Consume just one separator; preserve remaining spaces and characters.
        return [line.replace(/^\s*echo(?:\s|$)/i, '')];
      default:
        return ['コマンドが見つかりません。help で一覧を表示します。'];
    }
  },
};
