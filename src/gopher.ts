import documents from '../data/pcvan/gopher-documents.json' with { type: 'json' };

type Menu = 'root' | 'reading';
type Entry = { kind: 'directory'; menu: Menu; title: string } |
  { kind: 'text'; document: number; title: string } | { kind: 'search'; title: string };
type View = { kind: 'directory'; menu: Menu } | { kind: 'search' } |
  { kind: 'results'; query: string } | { kind: 'text'; document: number };

const menus: Record<Menu, { title: string; entries: readonly Entry[] }> = {
  root: { title: 'ルート', entries: [
    { kind: 'directory', menu: 'reading', title: '紙野の読み物' },
    { kind: 'text', document: 0, title: documents[0]!.title },
    { kind: 'search', title: '同梱文書を検索' },
  ] },
  reading: { title: '紙野の読み物', entries: [
    ...documents.map((doc, document): Entry => ({ kind: 'text', document, title: doc.title })),
    { kind: 'search', title: '同梱文書を検索' },
  ] },
};
const labels = { directory: 'ディレクトリ', text: '文書', search: '検索' };
const searchHelp = 'SEARCH <query>: 同梱文書の題名・本文を文字どおりの部分一致で検索（英字の大小を区別しません）。前後の空白だけを除き、途中の空白は保持。正規表現・論理式も文字として扱います。';
const controls = '番号: 表示中の項目を選択 / LIST: 元の一覧・再表示 / BACK: 一つ戻る / MAIN: MAIN / HELP: 現在の表示';
const prompt = 'コマンド=';

/** One browser-local visit. Frames retain the actual entry path and exact query.
 * Nothing here reads/writes the world or implements Gopher wire transport. */
export class GopherVisit {
  private readonly path: View[] = [{ kind: 'directory', menu: 'root' }];

  reset(): void { this.path.splice(0, this.path.length, { kind: 'directory', menu: 'root' }); }

  private results(query: string): Entry[] {
    const folded = query.toLowerCase();
    return documents.flatMap((doc, document) =>
      (doc.title.toLowerCase().includes(folded) || doc.body.toLowerCase().includes(folded))
        ? [{ kind: 'text' as const, document, title: doc.title }] : []);
  }

  private entries(view: View): readonly Entry[] {
    return view.kind === 'directory' ? menus[view.menu].entries
      : view.kind === 'results' ? this.results(view.query) : [];
  }

  /** null means BACK at the root, returning to navigation's Internet parent. */
  submit(line: string): readonly string[] | null {
    const input = line.trim(), command = input.toUpperCase();
    const view = this.path.at(-1)!;
    if (command === 'BACK') {
      if (this.path.length === 1) return null;
      this.path.pop(); return this.render();
    }
    if (command === 'LIST' || command === 'HELP') {
      if (command === 'LIST' && view.kind === 'text') this.path.pop();
      return this.render();
    }
    if ((view.kind === 'search' || view.kind === 'results') && /^SEARCH(?:\s|$)/i.test(input)) {
      // Parse the original input: folding normal commands would collapse spaces.
      const query = /^SEARCH[^\S\r\n]+([^\r\n]+)$/i.exec(input)?.[1]?.trim();
      if (!query) return ['検索語を指定してください。SEARCH <query>（1行）', searchHelp, prompt];
      const results: View = { kind: 'results', query };
      if (view.kind === 'results') this.path[this.path.length - 1] = results;
      else this.path.push(results);
      return this.render();
    }
    if (/^[1-9]\d*$/.test(command)) {
      const number = Number(command);
      const entry = Number.isSafeInteger(number) ? this.entries(view)[number - 1] : undefined;
      if (entry) {
        this.path.push(entry.kind === 'directory' ? { kind: 'directory', menu: entry.menu }
          : entry.kind === 'text' ? { kind: 'text', document: entry.document } : { kind: 'search' });
        return this.render();
      }
    }
    return ['このGopher画面では使えないコマンド・番号です。HELP で現在の表示を確認してください。',
      ...(view.kind === 'search' || view.kind === 'results' ? [searchHelp] : []), controls, prompt];
  }

  render(): readonly string[] {
    const view = this.path.at(-1)!;
    const content = view.kind === 'text'
      ? [`Gopher / 文書 / ${documents[view.document]!.title}`, '', documents[view.document]!.body,
        'BACK / LIST: この文書を開いたディレクトリ・検索結果へ']
      : view.kind === 'search' ? ['Gopher / 検索', searchHelp]
      : [view.kind === 'directory' ? `Gopher / ${menus[view.menu].title}` : 'Gopher / 検索結果',
        ...(view.kind === 'results' ? [`検索語: ${view.query}`, `検索結果：${this.entries(view).length}件`,
          ...(this.entries(view).length ? [] : ['一致する文書はありません。']), searchHelp] : []),
        ...this.entries(view).map((entry, i) => `${i + 1} [${labels[entry.kind]}] ${entry.title}`)];
    return [...content, '同梱の創作ローカル例（操作は再構成）。来歴: ABOUT', controls, prompt];
  }
}
