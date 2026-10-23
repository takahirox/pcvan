import { additionalSigs } from './communities';
import type { Post } from './storage/schema';
import type { ForumDestination } from './storage/repository';

export interface ComposeDraft { authorId: string; title: string; body: string; replyToPostId?: string }
export interface ComposerActions<T = ForumDestination> {
  print(...lines: string[]): void;
  save(destination: T, draft: ComposeDraft): Promise<Pick<Post, 'number'>>;
}

/** A draft owns the terminal until an explicit send or cancellation. */
export class TerminalComposer<T extends { keyword: string; name: string } = ForumDestination> {
  private stage: 'title' | 'body' | 'review' | 'edit' = 'title';
  private title = '';
  private lines: string[] = [];
  private done = false;
  constructor(private target: T, private authorId: string,
    private parent: Pick<Post, 'id' | 'number'> | undefined, private actions: ComposerActions<T>, private kind: 'post' | 'mail' | 'article' = 'post', initialTitle = '') {
    if (initialTitle) { this.title = initialTitle; this.stage = 'body'; }
    if (kind === 'article') actions.print('公開記事（私信ではありません）。このブラウザー内だけに保存し、Usenetへ配信しません。');
    actions.print(parent ? `${kind === 'article' ? '公開フォローアップ先' : '返信先'}：#${parent.number}` : (kind === 'mail' ? '新規メール' : kind === 'article' ? '新規記事' : '新規発言'), `${additionalSigs.find((sig) => sig.keyword === target.keyword)?.name ?? target.keyword} / ${target.name}`, initialTitle ? `件名：${initialTitle}` : `${this.titleLabel}=`);
    if (initialTitle) this.help();
  }
  private get titleLabel() { return this.kind !== 'post' ? '件名' : 'タイトル'; }
  get active() { return !this.done; }
  private preview() {
    this.stage = 'review';
    this.actions.print(...(this.kind === 'article' ? [`Newsgroups: ${this.target.name}`, ...(this.parent ? [`公開フォローアップ先：#${this.parent.number}`, `親 Message-ID: ${this.parent.id}`] : [])] : []), ...(this.kind === 'mail' ? [`宛先：${this.target.name}`] : []), `${this.titleLabel}：${this.title}`, `本文：${this.lines.length}行`,
      ...this.lines.map((line, index) => `${index + 1}: ${line}`), this.kind === 'mail' ? '送信しますか？ (Y/N/EDIT)=' : '投稿しますか？ (Y/N/EDIT)=');
  }
  help() {
    this.actions.print(...(this.kind === 'article' ? [`NetNews / ${this.target.name}${this.parent ? ` / 公開フォローアップ先：#${this.parent.number}` : ' / 新規記事'}`] : []), '下書きは保持されています。.CANCEL / CANCEL: 明示的に破棄。BACK / MAIN: 移動せず保持。',
      this.stage === 'title' ? `${this.titleLabel}を入力（1〜200文字）。`
      : this.stage === 'body' ? '本文を1行ずつ入力（全体1〜20000文字）。空行も保存。.END: 確認 / .TEXT 文字: 命令もそのまま本文へ。'
      : this.stage === 'edit' ? 'TITLE 文字 / LINE 番号 文字 / DELETE 番号 / APPEND / REVIEW。空の LINE 番号 は空行に置換。'
      : 'Y: 保存 / N: 破棄 / EDIT: 編集 / HELP: 案内');
  }
  async submit(line: string) {
    if (this.done) return;
    const command = line.trim().toUpperCase();
    if (['CANCEL', '.CANCEL'].includes(command)) {
      this.done = true; this.actions.print(this.kind === 'mail' ? 'メールを中止しました。コマンド=' : this.kind === 'article' ? '記事を中止しました。コマンド=' : '投稿を中止しました。コマンド='); return;
    }
    if (['HELP', 'BACK', 'MAIN'].includes(command)) { this.help(); return; }
    if (this.stage === 'title') {
      if (!line.trim() || line.length > 200) { this.actions.print(`${this.titleLabel}は空白だけにせず、200文字以内で入力してください。${this.titleLabel}=`); return; }
      this.title = line; this.stage = 'body'; this.help(); return;
    }
    if (this.stage === 'body') {
      if (command === '.END') {
        if (!this.lines.join('\n').trim()) { this.actions.print('本文は空白だけでは投稿できません。入力は保持されています。本文='); return; }
        this.preview(); return;
      }
      const bodyLine = /^\.TEXT(?: |$)/i.test(line) ? line.replace(/^\.TEXT ?/i, '') : line;
      if ([...this.lines, bodyLine].join('\n').length > 20000) {
        this.actions.print('本文は20000文字以内です。この行は追加していません。.END で確認し EDIT で修正できます。'); return;
      }
      this.lines.push(bodyLine); this.actions.print('本文='); return;
    }
    if (this.stage === 'review') {
      if (command === 'N') { this.done = true; this.actions.print(this.kind === 'mail' ? 'メールを中止しました。コマンド=' : this.kind === 'article' ? '記事を中止しました。コマンド=' : '投稿を中止しました。コマンド='); return; }
      if (command === 'EDIT') { this.stage = 'edit'; this.help(); return; }
      if (command !== 'Y') { this.actions.print('Y / N / EDIT を入力してください。下書きは保持されています。'); return; }
      try {
        const post = await this.actions.save(this.target, { authorId: this.authorId, title: this.title,
          body: this.lines.join('\n'), ...(this.parent ? { replyToPostId: this.parent.id } : {}) });
        // Never leave a sendable draft after the transaction commits.
        this.done = true;
        this.actions.print(this.kind === 'mail' ? `メール #${post.number} を送信しました。SENT / READ ${post.number} で確認できます。` : this.kind === 'article' ? `記事 #${post.number} を登録しました。LIST / READ ${post.number} で確認できます。` : `発言 #${post.number} を登録しました。LIST / READ ${post.number} で確認できます。`, 'コマンド=');
      } catch (error) {
        this.actions.print(`${this.kind === 'mail' ? 'メール' : this.kind === 'article' ? '記事' : '投稿'}を保存できませんでした。入力は残っています。${String(error)}`, 'Y: 再試行 / EDIT: 編集 / N: 中止');
      }
      return;
    }
    const title = /^TITLE (.*)$/i.exec(line);
    const replace = /^LINE ([1-9]\d*)(?: (.*))?$/i.exec(line);
    const remove = /^DELETE ([1-9]\d*)$/i.exec(line);
    if (title) {
      if (!title[1]!.trim() || title[1]!.length > 200) this.actions.print(`${this.titleLabel}は1〜200文字です。変更していません。`);
      else { this.title = title[1]!; this.actions.print(`${this.titleLabel}を変更しました。`); }
    } else if (replace || remove) {
      const index = Number((replace ?? remove)![1]) - 1;
      if (index >= this.lines.length) { this.actions.print('その行はありません。変更していません。'); return; }
      const next = [...this.lines];
      if (replace) next[index] = replace[2] ?? ''; else next.splice(index, 1);
      if (next.join('\n').length > 20000) this.actions.print('本文は20000文字以内です。変更していません。');
      else { this.lines = next; this.actions.print('本文を変更しました。REVIEW で確認。'); }
    } else if (command === 'APPEND') { this.stage = 'body'; this.help(); }
    else if (command === 'REVIEW') {
      if (!this.lines.join('\n').trim()) this.actions.print('本文が空白だけです。LINE / APPEND で修正してください。');
      else this.preview();
    } else this.help();
  }
}
