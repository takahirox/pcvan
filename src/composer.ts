import { validOslText, safeOslText, validOslFilename } from './storage/schema';
import { additionalSigs } from './communities';
import type { Post } from './storage/schema';
import type { ForumDestination } from './storage/repository';

export interface ComposeDraft { authorId: string; title: string; body: string; filename?: string; purpose?: string; replyToPostId?: string; dueAt?: string }
export interface ComposerActions<T = ForumDestination> {
  print(...lines: string[]): void;
  save(destination: T, draft: ComposeDraft): Promise<{ pendingReference: string; status: string } | Pick<Post, 'number'> | { copies: { number: number; recipient: string }[] }>;
}

export interface ComposeSchedule {
  prompt(): string[];
  parse(line: string): string;
  valid(dueAt: string): boolean;
  label(dueAt: string): string;
}
/** A draft owns the terminal until an explicit send or cancellation. */
export class TerminalComposer<T extends { keyword: string; name: string; localMail?: boolean; recipients?: string[] } = ForumDestination> {
  private dueAt: string | undefined;
  private stage: 'time' | 'filename' | 'title' | 'purpose' | 'body' | 'review' | 'edit' = 'title';
  private filename = '';
  private purpose = '';
  private title = '';
  private lines: string[] = [];
  private done = false;
  private invalidated = false;
  private saving = false;
  constructor(private target: T, private authorId: string,
    private parent: Pick<Post, 'id' | 'number'> | undefined, private actions: ComposerActions<T>, private kind: 'post' | 'mail' | 'article' | 'file' = 'post', initialTitle = '',
    private file?: { category: string; author: string }, private schedule?: ComposeSchedule) {
    if (file) { this.stage = 'filename'; actions.print('OSL テキスト登録。このブラウザー内だけに保存します。', 'ファイル名='); return; }
    if (initialTitle) { this.title = initialTitle; this.stage = 'body'; }
    if (kind === 'mail' && target.localMail) actions.print('このブラウザー内だけに保存します。メールサーバーへ送信しません。');
    if (kind === 'article') actions.print('公開記事（私信ではありません）。このブラウザー内だけに保存し、Usenetへ配信しません。');
    actions.print(parent ? `${kind === 'article' ? '公開フォローアップ先' : '返信先'}：#${parent.number}` : (kind === 'mail' ? '新規メール' : kind === 'article' ? '新規記事' : '新規発言'), `${additionalSigs.find((sig) => sig.keyword === target.keyword)?.name ?? target.keyword} / ${target.name}`, ...(schedule ? [] : [initialTitle ? `件名：${initialTitle}` : `${this.titleLabel}=`]));
    if (target.recipients) actions.print(...target.recipients.map((name) => `宛先：${name}`));
    if (schedule) { this.stage = 'time'; actions.print(...schedule.prompt()); }
    else if (initialTitle) this.help();
  }
  private get titleLabel() { return this.kind === 'post' || this.file ? 'タイトル' : '件名'; }
  get isFile() { return !!this.file; }
  invalidate() { this.invalidated = true; this.done = true; }
  get active() { return !this.done; }
  private preview() {
    this.stage = 'review';
    this.actions.print(...(this.file ? [`分類：${this.file.category}`, `ファイル名：${this.filename}`, `用途：${this.purpose}`, `著者：${this.file.author}`, `サイズ：${new TextEncoder().encode(this.lines.join('\n')).byteLength} bytes（UTF-8）`] : []), ...(this.kind === 'article' ? [`Newsgroups: ${this.target.name}`, ...(this.parent ? [`公開フォローアップ先：#${this.parent.number}`, `親 Message-ID: ${this.parent.id}`] : [])] : []), ...(this.kind === 'mail' ? (this.target.recipients ?? [this.target.name]).map((name) => `宛先：${name}`) : []), ...(this.schedule && this.dueAt ? [`配達予定：${this.schedule.label(this.dueAt)} (JST)`] : []), `${this.titleLabel}：${this.title}`, `本文：${this.lines.length}行`,
      ...this.lines.map((line, index) => `${index + 1}: ${line}`), this.kind === 'mail' ? (this.schedule ? '予約として保存しますか？ (Y/N/EDIT)=' : this.target.localMail ? 'このブラウザー内に保存しますか？ メールサーバーへ送信しません。 (Y/N/EDIT)=' : '送信しますか？ (Y/N/EDIT)=') : this.file ? 'このブラウザー内に登録しますか？ (Y/N/EDIT)=' : '投稿しますか？ (Y/N/EDIT)=');
  }
  help() {
    this.actions.print(...(this.kind === 'article' ? [`NetNews / ${this.target.name}${this.parent ? ` / 公開フォローアップ先：#${this.parent.number}` : ' / 新規記事'}`] : []), '下書きは保持されています。.CANCEL / CANCEL: 明示的に破棄。BACK / MAIN: 移動せず保持。',
      this.stage === 'time' ? this.schedule!.prompt().join('\n') : this.stage === 'filename' ? 'ファイル名は64文字以内。英数字で開始し、英数字・_・- と末尾 .TXT / .CSV（大小不問）。パス・空白不可。'
      : this.stage === 'purpose' ? '用途を入力（1〜200文字）。'
      : this.stage === 'title' ? `${this.titleLabel}を入力（1〜200文字）。`
      : this.stage === 'body' ? '本文を1行ずつ入力（全体1〜20000文字）。空行も保存。.END: 確認 / .TEXT 文字: 命令もそのまま本文へ。'
      : this.stage === 'edit' ? `${this.schedule ? 'TIME: 配達日時を変更 / ' : ''}${this.file ? 'FILENAME 名前 / PURPOSE 用途 / ' : ''}TITLE 文字 / LINE 番号 文字 / DELETE 番号 / APPEND / REVIEW。空の LINE 番号 は空行に置換。`
      : 'Y: 保存 / N: 破棄 / EDIT: 編集 / HELP: 案内');
  }
  async submit(line: string) {
    if (this.done || this.saving) return;
    const command = line.trim().toUpperCase();
    if (['CANCEL', '.CANCEL'].includes(command)) {
      this.done = true; this.actions.print(this.file ? 'OSL 登録を中止しました。コマンド=' : this.kind === 'mail' ? 'メールを中止しました。コマンド=' : this.kind === 'article' ? '記事を中止しました。コマンド=' : '投稿を中止しました。コマンド='); return;
    }
    if (['HELP', 'BACK', 'MAIN'].includes(command)) { this.help(); return; }
    if (this.stage === 'time') {
      try {
        this.dueAt = this.schedule!.parse(line);
        if (this.title) this.preview();
        else { this.stage = 'title'; this.actions.print(`${this.titleLabel}=`); }
      } catch (error) { this.actions.print(String(error), ...this.schedule!.prompt()); }
      return;
    }
    if (this.stage === 'filename' || this.stage === 'purpose') {
      const filename = this.stage === 'filename';
      if (filename ? !validOslFilename(line) : !validOslText(line)) { this.actions.print(filename ? 'ファイル名が無効です。HELP: 規則 / ファイル名=' : '用途は安全な文字で1〜200文字です。用途='); return; }
      if (filename) { this.filename = line; this.stage = 'title'; this.actions.print('タイトル='); }
      else { this.purpose = line; this.stage = 'body'; this.help(); }
      return;
    }
    if (this.stage === 'title') {
      if (!line.trim() || line.length > 200 || (this.file && !validOslText(line))) { this.actions.print(`${this.titleLabel}は空白だけにせず、200文字以内で入力してください。${this.titleLabel}=`); return; }
      this.title = line; this.stage = this.file ? 'purpose' : 'body'; if (this.file) this.actions.print('用途='); else this.help(); return;
    }
    if (this.stage === 'body') {
      if (command === '.END') {
        if (!this.lines.join('\n').trim()) { this.actions.print('本文は空白だけでは投稿できません。入力は保持されています。本文='); return; }
        this.preview(); return;
      }
      const bodyLine = /^\.TEXT(?: |$)/i.test(line) ? line.replace(/^\.TEXT ?/i, '') : line;
      if (this.file && !safeOslText(bodyLine)) { this.actions.print('制御文字は保存できません。この行は追加していません。本文='); return; }
      if ([...this.lines, bodyLine].join('\n').length > 20000) {
        this.actions.print('本文は20000文字以内です。この行は追加していません。.END で確認し EDIT で修正できます。'); return;
      }
      this.lines.push(bodyLine); this.actions.print('本文='); return;
    }
    if (this.stage === 'review') {
      if (command === 'N') { this.done = true; this.actions.print(this.file ? 'OSL 登録を中止しました。コマンド=' : this.kind === 'mail' ? 'メールを中止しました。コマンド=' : this.kind === 'article' ? '記事を中止しました。コマンド=' : '投稿を中止しました。コマンド='); return; }
      if (command === 'EDIT') { this.stage = 'edit'; this.help(); return; }
      if (command !== 'Y') { this.actions.print('Y / N / EDIT を入力してください。下書きは保持されています。'); return; }
      if (this.schedule && (!this.dueAt || !this.schedule.valid(this.dueAt))) {
        this.stage = 'time'; this.actions.print('配達予定を過ぎたか範囲外です。下書きは保持されています。新しい日時を選び、再確認してください。', ...this.schedule.prompt()); return;
      }
      this.saving = true;
      try {
        const post = await this.actions.save(this.target, { authorId: this.authorId, title: this.title,
          body: this.lines.join('\n'), ...(this.dueAt ? { dueAt: this.dueAt } : {}), ...(this.file ? { filename: this.filename, purpose: this.purpose } : {}), ...(this.parent ? { replyToPostId: this.parent.id } : {}) });
        if (this.done) return;
        // Never leave a sendable draft after the transaction commits.
        this.done = true;
        if ('pendingReference' in post) {
          const status = ({ pending: '配達待ち', cancelled: '取消済み', released: '配達済み' } as Record<string, string>)[post.status] ?? post.status;
          this.actions.print(`予約 ${post.pendingReference} を保存しました。状態：${status}。PENDING / READ-PENDING ${post.pendingReference} で確認できます。`, 'コマンド='); return;
        }
        if ('copies' in post) {
          this.actions.print(...post.copies.map((copy) => `メール #${copy.number} → ${copy.recipient} を保存しました。SENT / READ ${copy.number} で確認できます。`), 'コマンド=');
          return;
        }
        this.actions.print(this.file ? `OSL #${post.number} をこのブラウザー内に登録しました。LIST / READ ${post.number} で確認できます。` : this.kind === 'mail' ? (this.target.localMail ? `メール #${post.number} をこのブラウザー内に保存しました。メールサーバーへ送信していません。SENT / READ ${post.number} で確認できます。` : `メール #${post.number} を送信しました。SENT / READ ${post.number} で確認できます。`) : this.kind === 'article' ? `記事 #${post.number} を登録しました。LIST / READ ${post.number} で確認できます。` : `発言 #${post.number} を登録しました。LIST / READ ${post.number} で確認できます。`, 'コマンド=');
      } catch (error) {
        if (this.invalidated) return;
        if (this.done) throw error;
        if (this.schedule && this.dueAt && !this.schedule.valid(this.dueAt)) {
          this.stage = 'time'; this.actions.print('配達予定を過ぎました。下書きは保持されています。新しい日時を選んでください。', ...this.schedule.prompt()); return;
        }
        this.actions.print(`${this.file ? 'OSL 登録' : this.kind === 'mail' ? 'メール' : this.kind === 'article' ? '記事' : '投稿'}を保存できませんでした。入力は残っています。${String(error)}`, 'Y: 再試行 / EDIT: 編集 / N: 中止');
      } finally { this.saving = false; }
      return;
    }
    if (this.schedule && command === 'TIME') { this.stage = 'time'; this.actions.print(...this.schedule.prompt()); return; }
    const metadata = /^(FILENAME|PURPOSE) (.*)$/i.exec(line);
    if (this.file && metadata) {
      const filename = metadata[1]!.toUpperCase() === 'FILENAME', value = metadata[2]!;
      if (filename ? !validOslFilename(value) : !validOslText(value)) this.actions.print('値が無効です。変更していません。HELP: 規則');
      else { if (filename) this.filename = value; else this.purpose = value; this.actions.print('登録情報を変更しました。REVIEW で確認。'); }
      return;
    }
    const title = /^TITLE (.*)$/i.exec(line);
    const replace = /^LINE ([1-9]\d*)(?: (.*))?$/i.exec(line);
    const remove = /^DELETE ([1-9]\d*)$/i.exec(line);
    if (title) {
      if (!title[1]!.trim() || title[1]!.length > 200 || (this.file && !validOslText(title[1]!))) this.actions.print(`${this.titleLabel}は1〜200文字です。変更していません。`);
      else { this.title = title[1]!; this.actions.print(`${this.titleLabel}を変更しました。`); }
    } else if (replace || remove) {
      const index = Number((replace ?? remove)![1]) - 1;
      if (index >= this.lines.length) { this.actions.print('その行はありません。変更していません。'); return; }
      const next = [...this.lines];
      if (replace) next[index] = replace[2] ?? ''; else next.splice(index, 1);
      if (this.file && !safeOslText(next.join('\n'))) this.actions.print('制御文字は保存できません。変更していません。');
      else if (next.join('\n').length > 20000) this.actions.print('本文は20000文字以内です。変更していません。');
      else { this.lines = next; this.actions.print('本文を変更しました。REVIEW で確認。'); }
    } else if (command === 'APPEND') { this.stage = 'body'; this.help(); }
    else if (command === 'REVIEW') {
      if (!this.lines.join('\n').trim()) this.actions.print('本文が空白だけです。LINE / APPEND で修正してください。');
      else this.preview();
    } else this.help();
  }
}
