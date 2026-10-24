import index from '../data/pcvan/archie-index.json' with { type: 'json' };

const searchHelp = 'PROG <filename fragment>: 同梱索引のファイル名だけを文字どおりの部分一致で検索（英字の大小を区別しません）。前後の空白だけを除き、途中の空白は保持。正規表現・論理式も文字として扱います。例: PROG river';
const controls = 'PROG: 検索・置換 / HELP・LIST: 現在の表示 / BACK: 一つ戻る / MAIN: MAIN';
const prompt = 'コマンド=';

/** Authored location examples, not remote files. One in-memory visit; no world IO. */
export class ArchieVisit {
  private query: string | undefined;

  reset(): void { this.query = undefined; }

  /** null returns from the query view to navigation's actual Internet parent. */
  submit(line: string): readonly string[] | null {
    const input = line.trim(), command = input.toUpperCase();
    if (command === 'BACK') {
      if (this.query === undefined) return null;
      this.reset(); return this.render();
    }
    if (command === 'HELP' || command === 'LIST') return this.render();
    if (!input || /^PROG(?:\s|$)/i.test(input)) {
      // Parse the original line so spelling, punctuation and internal spaces survive.
      const query = /^PROG[^\S\r\n]+([^\r\n]+)$/i.exec(input)?.[1]?.trim();
      if (!query) return ['ファイル名の検索語を指定してください。PROG <filename fragment>（1行）', searchHelp, prompt];
      this.query = query; return this.render();
    }
    return ['このArchie画面では使えないコマンド・番号です。HELP で現在の表示を確認してください。', searchHelp, controls, prompt];
  }

  render(): readonly string[] {
    const matches = this.query === undefined ? []
      : index.filter((row) => row.filename.toLowerCase().includes(this.query!.toLowerCase()));
    return [
      this.query === undefined ? 'Archie / ファイル名検索' : 'Archie / 検索結果',
      ...(this.query === undefined ? [] : [
        `検索語: ${this.query}`, `一致する場所：${matches.length}件`,
        ...(matches.length ? [] : ['一致するファイルの場所はありません。']),
        ...matches.flatMap((row) => [
          `ファイル名: ${row.filename}`, `ホスト: ${row.host}`, `ディレクトリ: ${row.directory}`,
          `サイズ: ${row.size} bytes / 更新日: ${row.modified}`,
        ]),
      ]),
      searchHelp,
      '同梱の創作ローカル索引例（操作は再構成）。場所の案内のみ。選択・取得・FTPへの接続はありません。来歴: ABOUT',
      controls, prompt,
    ];
  }
}
