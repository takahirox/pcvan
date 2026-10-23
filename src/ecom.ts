// Category D reconstruction: original copy and controls, never postal transport.
export const ecomLimits = { name: 200, address: 1000, body: 20000 } as const;
type Stage = 'name' | 'address' | 'body' | 'review' | 'edit';
interface Letter { name: string; address: string; body: string }
interface Draft { name: string; address: string; lines: string[]; stage: Stage }
const menu = ['ECOM / 電子郵便', '1: サービス案内 / 2: 申込み / E: 退出',
  'RECEIPT: 今回の訪問の最新模擬受付票 / BACK: 戻る / MAIN: MAIN / HELP: 案内',
  'ローカル模擬体験です。郵便の差出し・課金・配達はありません。コマンド='];
const guidance = ['ECOM / サービス案内',
  '歴史上のECOMは、コンピューターで入力した手紙を印刷し、紙の郵便として届けるサービスでした。',
  'ここでは架空の宛先1件を使う模擬体験だけです。登録・資格情報・支払いは不要です。',
  '架空例：宛名「空想 花子」／住所「〒123 空想県こもれび町1-2 架空荘」',
  '宛名1〜200文字、住所1〜1000文字（各1行）、本文1〜20000文字。空白だけは不可。',
  '1宛先・入力順・文字数・編集・確認・受付票は再構成です。7桁の郵便番号は必須ではありません。',
  '下書き・最新受付票は今回のECOM訪問のメモリー内だけ。退出・切断・再読込・初期化・復元で消えます。',
  '画面の履歴と任意に保存した端末ログには表示した文章が含まれます。JSON・入力履歴・AIの文脈には保存しません。',
  '2: 申込み / RECEIPT: 最新模擬受付票 / BACK: ECOMメニュー / E: 退出 / MAIN: MAIN'];
// Command-shaped text can always be supplied through the existing .TEXT escape.
const navigation = /^(?:J(?: |$)|MAIN$|BACK$|E$|Q$|RECONNECT$|HELP$|SETTINGS$|CONFIG$|ABOUT$|HANDLE$|LOG$|BACKUP$|IMPORT$|RESET$|WRITE(?: |$)|COMPOSE(?: |$)|REPLY(?: |$)|READ(?: |$)|DOWNLOAD(?: |$)|LIST$|INBOX$|SENT$|MEMBERS$|JOIN(?: |$)|OPEN(?: |$)|SEARCH(?: |$)|FIND(?: |$)|SHOW(?: |$)|RECEIPT$|STOP$)/;

/** All postal text belongs to one visit, with no repository or asynchronous work. */
export class EcomVisit {
  private draft: Draft | undefined;
  private receipt: Letter | undefined;
  private guidance = false;
  get drafting() { return !!this.draft; }
  invalidate() { this.draft = undefined; this.receipt = undefined; this.guidance = false; }
  render(): readonly string[] { return this.draft ? this.help() : this.guidance ? guidance : menu; }
  private help(): string[] {
    const stage = this.draft!.stage;
    return ['下書きは保持されています。HELP・移動命令は送信も破棄もしません。.CANCEL / CANCEL: 明示的に破棄。',
      stage === 'name' ? '宛名を1〜200文字で入力。架空例：空想 花子。宛名='
        : stage === 'address' ? '住所を1〜1000文字で入力。架空例：〒123 空想県こもれび町1-2 架空荘。住所='
        : stage === 'body' ? '本文を1行ずつ入力（全体1〜20000文字）。空行も保持。.END: 確認 / .TEXT 文字: 命令もそのまま入力。本文='
        : stage === 'edit' ? 'NAME 文字 / ADDRESS 文字 / LINE 番号 文字 / DELETE 番号 / APPEND / REVIEW。空のLINEは空行に置換。'
        : 'Y: この確認済み内容を模擬受付 / EDIT: 全項目を編集 / N・CANCEL: 破棄。空入力は承認しません。',
      '操作・文字数は再構成。.TEXT 文字 は宛名・住所・本文の入力で使えます。'];
  }
  private fields(letter: Letter): string[] {
    return [`宛名：${letter.name}`, `住所：${letter.address}`, '本文：', letter.body];
  }
  private review(): string[] {
    const draft = this.draft!;
    if (!draft.lines.join('\n').trim()) return ['本文は空白だけにできません。下書きは保持されています。',
      draft.stage === 'body' ? '本文を続けて入力してください。本文=' : 'LINE / APPEND で修正してください。'];
    draft.stage = 'review';
    return ['ECOM / 申込み内容の確認', ...this.fields({ ...draft, body: draft.lines.join('\n') }),
      '郵便の差出し・課金・配達はありません。この内容を模擬受付しますか？ (Y/N/EDIT)='];
  }
  private valid(value: string, field: 'name' | 'address'): boolean {
    return !!value.trim() && value.length <= ecomLimits[field] && !/[\r\n]/.test(value);
  }
  submit(line: string): readonly string[] | 'back' | 'main' | 'disconnect' {
    const command = line.trim().toUpperCase();
    if (!this.draft) {
      if (command === 'E' || (command === 'BACK' && !this.guidance)) return 'back';
      if (command === 'MAIN') return 'main';
      if (command === 'Q') return 'disconnect';
      if (command === 'BACK') { this.guidance = false; return menu; }
      if (command === 'HELP') return this.render();
      if (command === '1') { this.guidance = true; return guidance; }
      if (command === '2') {
        this.draft = { name: '', address: '', lines: [], stage: 'name' };
        return ['ECOM / 申込み（架空の宛先を使ってください）', ...this.help()];
      }
      if (command === 'RECEIPT') return this.receipt
        ? ['ECOM / 最新模擬受付票', ...this.fields(this.receipt), '今回の訪問中だけの模擬受付です。郵便の差出し・課金・配達はありません。', 'コマンド=']
        : ['今回の訪問には模擬受付票がありません。コマンド='];
      return ['この画面では使えないコマンドです。1 / 2 / E / RECEIPT / BACK / MAIN / HELP。'];
    }
    if (['CANCEL', '.CANCEL', ...(this.draft.stage === 'review' ? ['N'] : [])].includes(command)) {
      this.draft = undefined; this.guidance = false;
      return ['ECOMの申込みを中止しました。', ...menu];
    }
    if (navigation.test(command)) return this.help();
    const draft = this.draft;
    if (draft.stage === 'name' || draft.stage === 'address') {
      const value = line.replace(/^\.TEXT(?: |$)/i, '');
      const field = draft.stage;
      if (!this.valid(value, field)) return [`${field === 'name' ? '宛名は1〜200' : '住所は1〜1000'}文字の1行で入力してください。空白だけは不可。入力は変更していません。`, ...this.help()];
      draft[field] = value; draft.stage = field === 'name' ? 'address' : 'body';
      return this.help();
    }
    if (draft.stage === 'body') {
      if (command === '.END') return this.review();
      const value = line.replace(/^\.TEXT(?: |$)/i, '');
      if ([...draft.lines, value].join('\n').length > ecomLimits.body) return ['本文は20000文字以内です。この行は追加していません。本文='];
      draft.lines.push(value); return ['本文='];
    }
    if (draft.stage === 'review') {
      if (command === 'EDIT') { draft.stage = 'edit'; return this.help(); }
      if (command !== 'Y') return ['Y / N / EDIT を入力してください。下書きは保持されています。'];
      // Consume the reviewed version synchronously, before any caller can await.
      this.draft = undefined;
      this.receipt = { name: draft.name, address: draft.address, body: draft.lines.join('\n') };
      this.guidance = false;
      return ['ECOMの模擬受付が完了しました。郵便の差出し・課金・配達はありません。', 'RECEIPT で最新模擬受付票を確認できます。', ...menu];
    }
    const field = /^(NAME|ADDRESS) ([\s\S]*)$/i.exec(line);
    const replace = /^LINE ([1-9]\d*)(?: ([\s\S]*))?$/i.exec(line);
    const remove = /^DELETE ([1-9]\d*)$/i.exec(line);
    if (field) {
      const key = field[1]!.toLowerCase() as 'name' | 'address';
      if (!this.valid(field[2]!, key)) return [`${key === 'name' ? '宛名は1〜200' : '住所は1〜1000'}文字の1行です。空白だけは不可。変更していません。`];
      draft[key] = field[2]!; return ['変更しました。REVIEW で全内容を確認してください。'];
    }
    if (replace || remove) {
      const index = Number((replace ?? remove)![1]) - 1;
      if (!Number.isSafeInteger(index) || index >= draft.lines.length) return ['その行はありません。変更していません。'];
      const next = [...draft.lines];
      if (replace) next[index] = replace[2] ?? ''; else next.splice(index, 1);
      if (next.join('\n').length > ecomLimits.body) return ['本文は20000文字以内です。変更していません。'];
      draft.lines = next; return ['本文を変更しました。REVIEW で全内容を確認してください。'];
    }
    if (command === 'APPEND') { draft.stage = 'body'; return this.help(); }
    if (command === 'REVIEW') return this.review();
    return this.help();
  }
}
