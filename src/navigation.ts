import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import type { TerminalController } from './controller';

const { miti } = sigEvidence;

export type Screen = 'main' | 'communication' | 'miti' | 'miti-forums' | 'miti-materials' | 'disconnected';

// Layout is reconstructed. The fixture's CJK labels occupy two terminal cells
// per character; ASCII occupies one. Padding never changes the label itself.
function padColumn(text: string, width: number): string {
  const cells = Array.from(text).reduce((sum, character) => sum + (character.charCodeAt(0) <= 0x7e ? 1 : 2), 0);
  return text + ' '.repeat(Math.max(2, width - cells));
}

function entryText(entry: { selector: string; label: string }): string {
  return `${entry.selector.padStart(2)} ${entry.label}`;
}

function renderMain(): string[] {
  const numbered = mainMenu.entries.filter((entry) => /^\d+$/.test(entry.selector));
  const half = Math.ceil(numbered.length / 2);
  const left = numbered.slice(0, half);
  const right = numbered.slice(half);
  const rows = left.map((entry, index) => {
    const other = right[index];
    return other ? padColumn(entryText(entry), 44) + entryText(other) : entryText(entry);
  });
  return [
    'MAIN（1996年頃・回顧転記／暫定）',
    `出典 [${mainMenu.evidence_category} / ${mainMenu.status}]: ${mainMenu.source_url}`,
    '1997年全期間のメニューとしては未確認です。2列配置は再構成です。',
    ...rows,
    ...mainMenu.entries.filter((entry) => !/^\d+$/.test(entry.selector)).map(entryText),
    `${miti.steps[0]!.input}: ${miti.steps[0]!.destination}へ（1996年の経路記述で確認）`,
    'HELP: この画面を再表示（創作の操作補助）。英字の大小文字・余分な空白の許容も創作です。',
    mainMenu.prompt.text,
  ];
}

const returnHelp = 'MAIN: MAIN に戻る / HELP: この画面を再表示（いずれも創作の操作補助）';
const demoPrompt = '再構成画面の入力=';

/** Each instance is one simulated connection; no browser routes or shared state. */
export class PcvanController implements TerminalController {
  readonly welcome = renderMain();
  private currentScreen: Screen = 'main';

  get screen(): Screen {
    return this.currentScreen;
  }

  submit(line: string): readonly string[] {
    const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
    switch (this.currentScreen) {
      case 'main': {
        if (command === 'HELP') return renderMain();
        if (command === miti.steps[0]!.input) return this.enter('miti');
        const entry = mainMenu.entries.find((item) => item.selector === command);
        if (entry?.selector === 'Q') return [entryText(entry), ...this.enter('disconnected')];
        if (entry?.selector === '13') return [entryText(entry), ...this.enter('communication')];
        if (entry) return [`${entryText(entry)}：未実装です。MAIN に留まります。`, mainMenu.prompt.text];
        return [
          command.startsWith('J ')
            ? '移動先が見つかりません。この画面で対応するジャンプは J MITI です。'
            : 'この画面では使えないコマンドです。1–21 / X / Q / J MITI / HELP を入力してください。',
          mainMenu.prompt.text,
        ];
      }
      case 'communication':
        // This selector is a visibly reconstructed bridge, not historical data.
        if (command === '1') return this.enter('miti');
        return this.handleReconstructed(command, '1 / MAIN / HELP');
      case 'miti':
        if (command === miti.steps[1]!.input) return this.enter('miti-forums');
        return this.handleReconstructed(command, `${miti.steps[1]!.input} / MAIN / HELP`);
      case 'miti-forums':
        if (command === miti.steps[2]!.input) return this.enter('miti-materials');
        return this.handleReconstructed(command, `${miti.steps[2]!.input} / MAIN / HELP`);
      case 'miti-materials':
        return this.handleReconstructed(command, 'MAIN / HELP');
      case 'disconnected':
        if (command === 'RECONNECT') return this.enter('main');
        return ['接続は終了しています。RECONNECT で再接続してください（創作の操作補助）。'];
    }
  }

  private handleReconstructed(command: string, allowed: string): readonly string[] {
    if (command === 'MAIN') return this.enter('main');
    if (command === 'HELP') return this.render();
    return [`この画面では使えないコマンドです。${allowed} を入力してください。`, demoPrompt];
  }

  private enter(screen: Screen): readonly string[] {
    this.currentScreen = screen;
    return this.render();
  }

  private render(): readonly string[] {
    switch (this.currentScreen) {
      case 'main': return renderMain();
      case 'disconnected': return [
        'シミュレーション接続を終了しました。',
        'RECONNECT で MAIN から再接続できます（創作の操作補助）。',
      ];
      case 'communication': return [
        'コミュニケーション（再構成の仮設ブリッジ [D / reconstructed]）',
        'この時代の実際のサブメニュー項目・プロンプトは未確認です。',
        `1 ${miti.name}（MITI）へ：デモ用の創作経路。史実の番号ではありません。`,
        returnHelp,
        demoPrompt,
      ];
      default: {
        const step = this.currentScreen === 'miti' ? 0 : this.currentScreen === 'miti-forums' ? 1 : 2;
        const evidence = miti.steps[step]!;
        const next = miti.steps[step + 1];
        return [
          `MITI / ${evidence.destination}`,
          `経路の出典 [${miti.evidence_category} / ${evidence.status}]: ${evidence.source_url}`,
          '1996年の経路記述のみ確認済み。画面・配置・プロンプトは再構成 [D / reconstructed]。',
          ...(next ? [`${next.input} ${next.destination}`] : ['資料室の内容は未実装です。']),
          '完全な SIG メニューではありません。Q など他の史実コマンドの動作は未確認です。',
          returnHelp,
          demoPrompt,
        ];
      }
    }
  }
}
