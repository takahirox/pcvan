import { personas, personaMemberId } from './ai/personas';
import { activeHuman } from './forums';
import { mailCorrespondent } from './mail';
import type { Backup, Mail, Member } from './storage/schema';
import { resolveMailResident, validOslText } from './storage/schema';
import { createRecordId } from './storage/repository';
import type { LocalRepository } from './storage/repository';
import { chooseMailFile, downloadFile } from './storage/controls';
import { decodeMailFile, encodeMailBytes, MAIL_FILE_LIMIT, mailExportName, validMailFilename } from './storage/mail-file';
import type { MailFile } from './storage/mail-file';

interface Actions {
  read(): Promise<Backup>; repository(): Promise<LocalRepository>; print(...lines: string[]): void;
  current(): boolean;
}
/** Owns terminal input while a native file is selected, reviewed or acquired. */
export class TerminalFileMail {
  active = true;
  private stage: 'address' | 'subject' | 'pick' | 'reading' | 'review' | 'saving' | 'retry' | 'acquire';
  private recipientId = '';
  private label = '';
  private subject = '';
  private file?: MailFile;
  private id = createRecordId();
  private pickRevision = 0;
  private attempted = false;
  constructor(private senderId: string, private actions: Actions, private saved?: Mail) {
    this.stage = saved ? 'acquire' : 'address';
    if (saved) { this.file = saved.file; this.subject = saved.subject; this.label = ''; this.review(); }
    else actions.print('ファイルメール：既存のローカル住人1人の宛先IDを入力。CANCEL: 中止 / 宛先=');
  }
  observe(data: Backup) {
    if (this.current() && activeHuman(data) !== this.senderId) this.finish('利用者が変更されました。操作を中止しました。');
  }
  get inputContext() { return `${this.id}:${this.stage}:${this.pickRevision}`; }
  selectRecipient(member: Member) {
    this.recipientId = member.id; this.label = mailCorrespondent(member);
    this.stage = 'subject'; this.actions.print(`宛先：${this.label}`, '件名=');
  }
  invalidate() { this.active = false; this.pickRevision++; }
  private current() { return this.active && this.actions.current(); }
  private finish(message: string) { this.invalidate(); this.actions.print(message, 'コマンド='); }
  private review() {
    const file = this.file!;
    this.actions.print(this.saved ? `ファイルメール #${this.saved.number} の取得` : 'ファイルメール確認',
      ...(this.saved ? [] : [`宛先：${this.label}`]), `件名：${this.subject}`,
      `ファイル：${mailExportName(file)} / ${file.size} bytes`,
      this.saved ? 'Y: 取得 / N・BACK・CANCEL: 中止 / HELP: 説明' : 'Y: 保存 / EDIT: 件名 / PICK: 選び直す / N・CANCEL: 中止 / HELP: 説明');
  }
  private async validWorld(): Promise<Backup | undefined> {
    const data = await this.actions.read();
    if (!this.current()) return;
    if (activeHuman(data) !== this.senderId) { this.finish('利用者が変更されました。操作を中止しました。'); return; }
    return data;
  }
  async submit(line: string) {
    const command = line.trim().toUpperCase();
    if (['CANCEL', '.CANCEL', 'N', 'BACK', 'MAIN'].includes(command)) { this.finish('ファイルメールの操作を中止しました。'); return; }
    if (this.stage === 'reading' || this.stage === 'saving') { this.actions.print('処理中です。CANCEL: 中止'); return; }
    const inputContext = this.inputContext;
    const data = await this.validWorld(); if (!data || this.inputContext !== inputContext) return;
    if (this.stage === 'acquire') {
      if (command !== 'Y') { this.review(); return; }
      const saved = data.mail?.find((m) => m.id === this.saved!.id && m.senderId === this.senderId);
      if (!saved || JSON.stringify(saved) !== JSON.stringify(this.saved)) { this.finish('手紙が変更されました。ACQUIRE 番号 から確認し直してください。'); return; }
      // Consume before invoking a browser action, even if it throws.
      this.invalidate();
      try {
        downloadFile(decodeMailFile(saved.file), mailExportName(saved.file!), 'application/octet-stream');
        this.actions.print('ファイル取得をブラウザーに依頼しました。コマンド=');
      } catch { this.actions.print('取得できませんでした。ACQUIRE 番号 から確認し直してください。コマンド='); }
      return;
    }
    if (this.stage === 'address') {
      if (['HELP', 'MEMBERS'].includes(command)) {
        this.actions.print(...data.members.filter((m) => m.actor === 'ai' && personas.some((p) => personaMemberId(p.id) === m.id))
          .map((m) => `${m.id} / ${mailCorrespondent(m)}`), '既存のローカル住人1人の宛先ID / CANCEL: 中止 / 宛先=');
        return;
      }
      try {
        const resident = resolveMailResident(data.members, line.trim());
        this.selectRecipient(resident);
      } catch { this.actions.print('既存のローカル住人1人の宛先IDを入力してください。MEMBERS の一覧を確認し、CANCEL で中止できます。宛先='); }
      return;
    }
    if (command === 'HELP') {
      this.actions.print('1通1ファイル、0〜262144 bytes。PICKで選択、確認後Yで保存。取得はSENT → ACQUIRE 番号 → Y。CANCEL: 中止');
      if (this.stage === 'review') this.review(); return;
    }
    if (this.stage === 'subject') {
      if (!validOslText(line)) { this.actions.print('件名は改行・制御文字なしの1〜200文字。件名='); return; }
      this.subject = line; this.stage = this.file ? 'review' : 'pick';
      if (this.file) this.review(); else this.actions.print('PICK: ファイル選択 / CANCEL: 中止');
      return;
    }
    if ((command === 'EDIT' || command === 'PICK') && this.attempted) {
      this.actions.print('保存結果を確認するため REVIEW → Y で同じ内容を再試行してください。CANCEL: 終了'); return;
    }
    if (command === 'EDIT') { this.stage = 'subject'; this.actions.print('件名='); return; }
    if (command === 'PICK') {
      this.file = undefined; this.stage = 'reading';
      const token = ++this.pickRevision;
      const current = () => this.current() && this.pickRevision === token;
      // Release the terminal queue while the native picker/read is outstanding.
      void chooseMailFile().then(async (file) => {
        if (!current()) return;
        if (!file) { this.stage = 'pick'; this.actions.print('選択を中止しました。PICK: 選び直す / CANCEL: 中止'); return; }
        if (file.size > MAIL_FILE_LIMIT || !validMailFilename(file.name)) throw new Error('名前は英数字で始まる64文字以内の英数字・_・-・.（末尾の.、..、予約名は不可）、容量は0〜262144 bytes。');
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!current() || !await this.validWorld() || !current()) return;
        const payload: MailFile = { encoding: 'base64', filename: file.name, size: file.size, data: encodeMailBytes(bytes) };
        decodeMailFile(payload);
        this.file = payload; this.stage = 'review'; this.review();
      }).catch((error: unknown) => {
        if (!current()) return;
        this.stage = 'pick'; this.actions.print(`ファイルを読み込めません。${error instanceof Error ? error.message : ''}`, 'PICK: 選び直す / CANCEL: 中止');
      });
      return;
    }
    if (this.stage === 'retry') {
      if (command === 'REVIEW') { this.stage = 'review'; this.review(); }
      else this.actions.print('REVIEW: 同じ内容で再確認 / CANCEL: 中止');
      return;
    }
    if (this.stage !== 'review' || command !== 'Y') {
      if (this.stage === 'review') this.review(); else this.actions.print('PICK: ファイル選択 / CANCEL: 中止'); return;
    }
    this.stage = 'saving'; this.attempted = true;
    try {
      const repo = await this.actions.repository();
      if (!this.current()) return;
      const row = await repo.createHumanFileMail({ id: this.id, senderId: this.senderId, recipientId: this.recipientId, subject: this.subject, file: this.file! }, true);
      if (this.current()) this.finish(`ファイルメール #${row.number} を保存しました。SENT / READ ${row.number} / ACQUIRE ${row.number}`);
    } catch {
      if (!this.current()) return;
      this.stage = 'retry'; this.actions.print('保存を確認できません。容量・保存権限を確認し、REVIEW → Y で同じ内容を再試行できます。CANCEL: 中止');
    }
  }
}
