import { TerminalFileMail } from './file-mail';
import { identityToken, penName } from './member-presentation';
import { serviceCategories } from './service-collections';
import { profileArgument, renderResidentProfile } from './resident-profile';
import type { ServiceDownload } from './service-collections';
import type { NetNewsArticle } from './netnews';
import { calendarSetting, scheduleInstant, scheduleTime, SCHEDULE_HORIZON } from './calendar';
import { conferenceState } from './conference';
import type { Contribution } from './storage/schema';
import type { OltContext } from './olt-state';
import { TerminalOlt } from './olt';
import type { Backup, Mail, Post, TerminalPreferences } from './storage/schema';
import { resolveMailDestination, resolveMailResident, validateBackup, scheduledMail } from './storage/schema';
import type { ForumDestination, LocalRepository } from './storage/repository';
import { ACTIVE_MEMBER_SETTING, createRecordId, residentContext, worldContext as context } from './storage/repository';
import { activeHuman, forumPosts } from './forums';
import { TerminalComposer } from './composer';
import type { ComposeDraft } from './composer';
import { about, keyboardHelp, settingsMenu } from './settings';
import { downloadFile, downloadText, chooseBackup } from './storage/controls';
import { canPopulateCommunity } from './storage/community';
import { createOfflineControls } from './offline/controls';
import { models, residentProfiles } from './ai/personas';
import type { ResidentProfile } from './ai/personas';
import type { createAiControls } from './ai/controls';
import { setupContext } from './ai/activity';
import { mailCorrespondent, mailboxRows, renderMail, internetMailHelp } from './mail';
import { personaMemberId } from './ai/personas';
import type { Mailbox } from './sections';
import { modelDisclosure } from './ai/setup';
import { createSettingsActions } from './settings-actions';

type Menu = 'settings' | 'display' | 'handles' | 'ai' | 'storage' | 'offline' | 'profiles' | 'about' | 'help';
type Intent = { fileMail: true; recipient: string } | { osl: true; category: 1 | 2 } | { multiMail: true } | { netnews: true; group: string; parent?: NetNewsArticle } | { conference: true; parent?: Contribution } | { target: ForumDestination; parent?: Post } | { mail: true; recipient: string; parent?: Mail; scheduled?: boolean };
type Confirmation = { kind: 'model' | 'import' | 'reset' | 'populate'; expected: string; text?: string; modelId?: string };
export interface CommandActions {
  applicationPrint?(...lines: string[]): void;
  repository(): Promise<LocalRepository>;
  read(): Promise<Backup>;
  print(...lines: string[]): void;
  navigate(line: string): void;
  destination(): ForumDestination | null;
  oslCategory?(): 1 | 2 | null;
  selectDownload?(number: number): ServiceDownload | null;
  downloadFile?(body: string, filename: string): void;
  isTelnet?(): boolean;
  isGopher?(): boolean;
  isArchie?(): boolean;
  isEcom?(): boolean;
  ecomDrafting?(): boolean;
  invalidateEcom?(): void;
  oltContext?(): OltContext | null;
  isConference?(): boolean;
  netNews?(): { group: string; articles: readonly NetNewsArticle[] } | null;
  netNewsSaved?(): void;
  isNetNewsDirectory?(): boolean;
  mailbox?(): { box: Mailbox; title: string } | null;
  save(target: ForumDestination, draft: ComposeDraft): Promise<Post>;
  restore(text: string, expectedContext: string): Promise<void>;
  reset(expectedContext: string): Promise<void>;
  preferences(): TerminalPreferences;
  applyPreferences(value: TerminalPreferences): void;
  sessionTimes(): string;
  log(): string;
  ai: ReturnType<typeof createAiControls>;
}
const inviteSetting = 'terminal-handle-invited';
export const profileFields: (keyof ResidentProfile)[] = ['handle', 'occupation', 'routine', 'profile', 'interests', 'preferredBoards',
  'weekdayHours', 'weekendHours', 'utcOffsetMinutes', 'frequency', 'participation', 'reading', 'newThread', 'reply', 'inactivity', 'affinities'];

export const profileLabels = ['ハンドル', '職業', '生活・仕事・睡眠の習慣', '人物像・文体', '興味（カンマ区切り）',
  '好みの掲示板（MITI:9, DAISIZEN:1 またはID）', '平日の接続時間（0〜23）', '休日の接続時間（0〜23）',
  'UTCからの時差（分 -720〜840、日本は540）', '活動頻度（0〜3、0で休止）', '訪問の確率（0〜1）',
  '読む重み（0〜1）', '新しい話題の重み（0〜1）', '返信の重み（0〜1）', '何もしない重み（0〜1）', '住人との親しさ（IDと0〜1のJSON）'];

/** One screen owner interprets each line; navigation cannot leak into a prompt. */
export class TerminalCommands {
  private menu: Menu | null = null;
  private registration: 'offer' | 'name' | null = null;
  private intent: Intent | undefined;
  private composer: TerminalComposer | TerminalComposer<{ keyword: string; name: string }> | undefined;
  private nativeFile?: TerminalFileMail;
  private mailAddress = false;
  private scheduledAddress = false;
  private pendingCancellation: { senderId: string; reference: string } | undefined;
  private mailSelection: { authorId: string; recipients: { id: string; label: string }[] } | undefined;
  private confirmation: Confirmation | undefined;
  private fileRequest: ServiceDownload | undefined;
  private revision = 0;
  private submission = 0;
  private detailReturns: (Menu | null)[] = [];
  private selectedModel: string = models[0].id;
  private profile: ResidentProfile | undefined;
  private profileContext: string | undefined;
  private field: keyof ResidentProfile | undefined;
  readonly olt;
  readonly offline;
  readonly settings;
  constructor(private actions: CommandActions) {
    this.olt = new TerminalOlt({ ...actions, oltContext: () => actions.oltContext?.() ?? null });
    this.offline = createOfflineControls(actions.applicationPrint ?? actions.print);
    this.settings = createSettingsActions(actions);
  }
  applicationOutput(kind: 'ai' | 'offline') {
    return !this.nativeFile?.active && !this.composer?.active && !this.mailAddress && !this.mailSelection && !this.registration && !this.pendingCancellation && (kind === 'ai' ? this.menu === 'ai' : this.menu === 'offline');
  }
  observeFileMail(data: Backup) { this.nativeFile?.observe(data); }
  get fileInputContext() { return this.nativeFile?.active ? this.nativeFile.inputContext : undefined; }
  get recordsHistory() { return !this.actions.isEcom?.() && !this.nativeFile?.active && !this.composer?.active && !this.mailAddress && !this.mailSelection && !this.registration && !this.confirmation && !this.pendingCancellation && !this.fileRequest && !this.profile; }
  invalidate() {
    this.revision++;
    this.actions.invalidateEcom?.();
    this.olt.invalidate();
    const active = this.nativeFile?.active || this.composer?.active || this.mailAddress || this.mailSelection || this.registration || this.pendingCancellation || this.confirmation || this.fileRequest || this.profile;
    this.nativeFile?.invalidate(); this.nativeFile = undefined;
    this.composer?.invalidate();
    this.pendingCancellation = undefined; this.scheduledAddress = false;
    this.composer = undefined; this.mailAddress = false; this.mailSelection = undefined; this.registration = null; this.intent = undefined;
    this.fileRequest = undefined;
    this.confirmation = undefined; this.profile = undefined; this.field = undefined; this.menu = null;
    this.detailReturns = [];
    if (active) this.actions.print('別の操作で世界が変更されました。入力を中止しました。現在のデータから操作し直してください。コマンド=');
  }
  async welcome() {
    const data = await this.actions.read();
    if (data.members.some((member) => member.actor === 'human') || data.settings.some((row) => row.id === inviteSetting)) return;
    await (await this.actions.repository()).put('settings', { id: inviteSetting, value: true });
    this.registration = 'offer';
    this.actions.print('PC-VANへようこそ', 'ハンドル名を登録しますか？ (Y/N/SKIP)=', 'HELP: 案内 / N・SKIP: 登録せず読む');
  }
  private async show(menu: Menu) {
    if (menu !== 'about' && menu !== 'help') this.detailReturns = [];
    this.menu = menu;
    const data = await this.actions.read();
    const print = this.actions.print;
    if (menu === 'about') print(...about(data));
    if (menu === 'help') print(...keyboardHelp);
    if (menu === 'settings') print(...settingsMenu);
    if (menu === 'handles') {
      print('ハンドル設定（人間の利用者のみ）', ...data.members.filter((m) => m.actor === 'human').map((m, i) =>
        `${i + 1} ${m.handle}${m.id === activeHuman(data) ? ' [選択中]' : ''}`), '番号: 選択 / NEW: 新規登録 / RENAME 名前: 選択中のハンドルを変更');
    }
    if (menu === 'display') {
      const value = this.actions.preferences();
      print('表示・速度', `表示色：${value.theme} / 表示速度：${value.speed} / 光彩・走査線：${value.effects ? 'オン' : 'オフ'}`,
        'THEME white / green / amber', 'SPEED 300 / 1200 / 2400 / 9600 / instant', 'EFFECTS ON / OFF');
    }
    if (menu === 'ai') {
      const saved = data.settings.find((row) => row.id === 'ai-activity')?.value as { modelId?: string } | undefined;
      this.selectedModel = models.find((row) => row.id === saved?.modelId)?.id ?? models[0].id;
      print('モデル・活動・住人', ...this.actions.ai.status(), ...models.map((row, i) => `MODEL ${i + 1}: ${row.label}`),
        `選択モデル: ${this.selectedModel}`, 'LOAD: 説明・読込確認 / LATER: 準備を延期 / STOP: 中止・モデル解放 / CACHE: 重み確認',
        'AUTO 0〜12: 6時間の自動投稿上限（0で休止）/ RETRY: 未完了を再試行 / RESIDENTS: 住人編集');
    }
    if (menu === 'storage') print('JSON バックアップ・復元・初期化', 'BACKUP: JSON 保存 / IMPORT: ファイル選択・置換確認 / RESET: 初期状態に戻す',
      ...(canPopulateCommunity(data) ? ['POPULATE: 空の掲示板に初期会話を追加'] : []), 'JSON は会員・投稿・メール・ローカルNetNews記事・登録OSLテキスト・既読・設定・履歴を含みます。モデル・端末キャッシュ・ECOMの郵便内容と模擬受付票は含みません。外部に保存してください。');
    if (menu === 'offline') { print('オフライン・容量', 'CACHE: 端末を保存 / STATUS: 保存状態・容量 / PERSIST: 永続保存を要求'); await this.offline.storage(); }
    if (menu === 'profiles') print('住人編集', ...residentProfiles(data).map((row, i) => `${i + 1} ${row.handle}`), '番号: 編集する住人');
    if (menu !== 'settings') print('HELP: この案内 / BACK: 一つ戻る / MAIN: MAIN');
    print('コマンド=');
  }
  private startCompose(intent: Intent, data: Backup) {
    const authorId = activeHuman(data);
    if (!authorId) { this.intent = intent; this.registration = 'offer'; this.actions.print(`${'osl' in intent ? 'OSL 登録' : 'mail' in intent || 'multiMail' in intent || 'fileMail' in intent ? 'メール' : '投稿'}にはハンドルが必要です。登録しますか？ (Y/N/SKIP)=`); return; }
    if ('fileMail' in intent) {
      this.startFileMail(authorId);
      if (intent.recipient) {
        try { this.nativeFile!.selectRecipient(resolveMailResident(data.members, intent.recipient.trim())); }
        catch { this.actions.print('既存のローカル住人1人の宛先IDを入力してください。宛先='); }
      }
    } else if ('osl' in intent) {
      const id = createRecordId(), revision = this.revision;
      const author = data.members.find((m) => m.id === authorId);
      this.composer = new TerminalComposer({ keyword: 'DAISIZEN', name: 'OSL' }, authorId, undefined, {
        print: this.actions.print,
        save: async (_target, draft) => {
          const repo = await this.actions.repository();
          if (revision !== this.revision) throw new Error('世界が変更されました。REGISTER から操作し直してください。');
          const row = await repo.createOslEntry({ id, category: intent.category, authorId: draft.authorId,
            filename: draft.filename!, title: draft.title, purpose: draft.purpose!, body: draft.body });
          try { await this.actions.read(); } catch { /* Committed: a later LIST refreshes. */ }
          return row;
        },
      }, 'file', '', { category: `${intent.category} ${serviceCategories('OSL')[intent.category - 1]}`,
        author: `${penName(author)} (${identityToken(author)})` });
    } else if ('multiMail' in intent) {
      this.mailSelection = { authorId, recipients: [] };
      this.printAddresses(data); this.selectionHelp();
    } else if ('netnews' in intent) {
      const id = createRecordId();
      this.composer = new TerminalComposer({ keyword: 'NetNews', name: intent.group }, authorId,
        intent.parent ? { id: intent.parent.messageId, number: intent.parent.number } : undefined, {
          print: this.actions.print,
          save: async (_target, draft) => {
            const row = await (await this.actions.repository()).createNetNewsArticle({ id, group: intent.group,
              authorId: draft.authorId, title: draft.title, body: draft.body,
              ...(intent.parent ? { parentMessageId: intent.parent.messageId } : {}) });
            // Commit succeeded: even refresh/render failure must consume the draft.
            try { await this.actions.read(); } catch { /* A later LIST refreshes. */ }
            try { this.actions.netNewsSaved?.(); } catch { /* The draft is still consumed. */ }
            return row;
          },
        }, 'article', intent.parent ? `Re: ${intent.parent.subject.replace(/^(?:Re:\s*)+/i, '')}`.slice(0, 200) : '');
    } else if ('conference' in intent) {
      const id = createRecordId();
      this.composer = new TerminalComposer({ keyword: 'DAISIZEN', name: '電子会議室' }, authorId, intent.parent, {
        print: this.actions.print,
        save: async (_target, draft) => {
          const row = await (await this.actions.repository()).createConferenceContribution({ id, ...draft });
          try { await this.actions.read(); } catch { /* Committed: a later LIST refreshes. */ }
          return row;
        },
      });
    } else if ('mail' in intent) {
      if (!intent.recipient) {
        this.scheduledAddress = !!intent.scheduled; this.mailAddress = true; this.printAddresses(data); this.actions.print('宛先='); return;
      }
      let recipient;
      try { recipient = intent.scheduled ? { recipientId: resolveMailResident(data.members, intent.recipient).id } : resolveMailDestination(data.members, intent.recipient); }
      catch { this.scheduledAddress = !!intent.scheduled; this.mailAddress = true; this.actions.print(intent.scheduled ? '宛先が見つからないか重複しています。日時指定は既存のローカル住人1人だけです。宛先=' : '宛先が見つからないか重複しています。MEMBERS の宛先または有効な INET#address を入力してください。宛先='); return; }
      this.mailAddress = false;
      const id = createRecordId(), revision = this.revision;
      const label = mailCorrespondent(data.members.find((m) => m.id === recipient.recipientId));
      const calendar = calendarSetting(data)!;
      this.composer = new TerminalComposer({ keyword: 'MAIL', name: recipient.internetAddress !== undefined ? `INET#${recipient.internetAddress}` : mailCorrespondent(data.members.find((m) => m.id === recipient.recipientId)), localMail: recipient.internetAddress !== undefined }, authorId, intent.parent, {
        print: this.actions.print,
        save: async (_target, draft) => {
          const repo = await this.actions.repository();
          if (revision !== this.revision) throw new Error('世界が変更されました。');
          if (intent.scheduled) {
            const row = await repo.scheduleHumanMail({ id: `P-${id}`, senderId: draft.authorId, recipientId: recipient.recipientId!,
              recipientLabel: label, subject: draft.title, body: draft.body, dueAt: draft.dueAt! });
            return { pendingReference: row.id, status: row.status };
          }
          const row = await repo.createHumanMail({ id, senderId: draft.authorId,
            recipient: recipient.internetAddress !== undefined ? `INET#${recipient.internetAddress}` : recipient.recipientId, subject: draft.title, body: draft.body,
            ...(intent.parent ? { replyToMailId: intent.parent.id } : {}) });
          // Saving is committed. A failed refresh must never leave a sendable draft.
          try { await this.actions.read(); } catch { /* A later LIST refreshes. */ }
          return row;
        },
      }, 'mail', intent.parent ? `Re: ${intent.parent.subject.replace(/^(Re: )+/i, '')}`.slice(0, 200) : '', undefined, intent.scheduled ? {
        prompt: () => { const now = new Date().toISOString(); return [
          `日時指定（再構成） 宛先：${label}`,
          `現在：${scheduleTime(now, calendar)} (JST)。現在より後〜${scheduleTime(new Date(Date.parse(now) + SCHEDULE_HORIZON).toISOString(), calendar)} (JST)、最大30日。`,
          'YYYY-MM-DD HH:mm (JST) / .CANCEL: 中止。配達日時=']; },
        parse: (line) => scheduleInstant(line, calendar, new Date().toISOString()),
        valid: (due) => Date.parse(due) > Date.now() && Date.parse(due) <= Date.now() + SCHEDULE_HORIZON,
        label: (due) => scheduleTime(due, calendar),
      } : undefined);
    } else this.composer = new TerminalComposer(intent.target, authorId, intent.parent, this.actions);
  }
  private startFileMail(senderId: string, saved?: Mail) {
    const revision = this.revision;
    const flow = new TerminalFileMail(senderId, { ...this.actions,
      current: () => this.revision === revision && this.nativeFile === flow,
    }, saved);
    this.nativeFile = flow;
  }
  private selectionHelp() {
    this.actions.print('WRITE-MULTI：ローカル住人を1行に1人選択（再構成）。',
      ...this.mailSelection!.recipients.map((m) => `選択済み：${m.label}`),
      '.END: 2人以上で本文作成へ / HELP・MEMBERS: 一覧 / CANCEL・.CANCEL: 破棄。移動するには中止してください。宛先=');
  }
  private startMultiComposer() {
    const selection = this.mailSelection!;
    const revision = this.revision;
    this.mailSelection = undefined;
    const id = createRecordId();
    this.composer = new TerminalComposer({ keyword: 'MAIL', name: '複数の住人（個別コピー）', localMail: true,
      recipients: selection.recipients.map((m) => m.label) }, selection.authorId, undefined, {
      print: this.actions.print,
      save: async (_target, draft) => {
        const repository = await this.actions.repository();
        if (revision !== this.revision) throw new Error('世界が変更されました。下書きを作り直してください。');
        const rows = await repository.createHumanMultiMail({ id, senderId: draft.authorId,
          recipientIds: selection.recipients.map((m) => m.id), subject: draft.title, body: draft.body });
        try { await this.actions.read(); } catch { /* Committed: a later LIST refreshes. */ }
        return { copies: rows.map((row, i) => ({ number: row.number, recipient: selection.recipients[i]!.label })) };
      },
    }, 'mail');
  }
  private printAddresses(data: Backup) {
    this.actions.print('宛先一覧（宛先ID / 会員表示）', ...residentProfiles(data).filter((p) => data.members.some((m) => m.id === personaMemberId(p.id) && m.actor === 'ai'))
      .map((p) => `${p.id} / ${mailCorrespondent(data.members.find((m) => m.id === personaMemberId(p.id)))}`), 'PROFILE 宛先ID・SYN-表示ID・ハンドル: 公開プロフィール', 'WRITE 宛先（一覧の宛先IDまたはハンドル） / WRITE-AT 宛先・PENDING: 日時指定（再構成） / WRITE-MULTI: 複数のローカル住人（再構成） / .CANCEL: 中止', internetMailHelp);
  }
  private confirm(value: Confirmation, ...warning: string[]) {
    this.fileRequest = undefined;
    this.confirmation = value;
    this.actions.print(...warning, 'Y: 実行 / N・BACK: 中止 / HELP: 説明');
  }
  private explainDownload() {
    const file = this.fileRequest!;
    this.actions.print(`${file.filename} / ${new TextEncoder().encode(file.body).byteLength} bytes（UTF-8）`,
      'このファイルの取得をブラウザーに依頼します。',
      'Y: 取得 / N・BACK・CANCEL: 中止 / MAIN: MAIN / HELP: 説明');
  }
  private returnToMain() {
    if (this.composer?.active) this.composer.help();
    else this.actions.navigate('MAIN');
  }
  private returnFromMenu() {
    if (this.composer?.active) this.composer.help();
    else if (this.fileRequest) { this.actions.print(...this.fileRequest.returnTo()); this.explainDownload(); }
    else this.actions.navigate('HELP');
  }
  private profileHelp() {
    this.actions.print('住人の編集（未保存）',
      ...profileFields.map((key, i) => `${i + 1} ${profileLabels[i]}: ${JSON.stringify(this.profile?.[key])}`), '番号: 値を入力 / SAVE: 検証して保存 / CANCEL・BACK: 変更を破棄');
  }
  async submit(line: string): Promise<boolean> {
    const revision = this.revision, submission = ++this.submission;
    const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
    const print = this.actions.print;
    if (this.actions.ecomDrafting?.()) return false;
    if (this.nativeFile?.active) { await this.nativeFile.submit(line); return true; }
    if (this.composer?.active && (!this.composer.isFile || (!this.menu && !['SETTINGS', 'CONFIG', 'ABOUT'].includes(command)))) { await this.composer.submit(line); return true; }
    if (this.mailSelection) {
      const selection = this.mailSelection;
      if (['CANCEL', '.CANCEL'].includes(command)) {
        this.mailSelection = undefined; print('メールを中止しました。コマンド='); return true;
      }
      if (command === '.END') {
        if (selection.recipients.length < 2) { print('異なる住人を2人以上選択してください。宛先='); return true; }
        this.startMultiComposer(); return true;
      }
      const data = await this.actions.read();
      if (revision !== this.revision || this.mailSelection !== selection) return true;
      if (['HELP', 'MEMBERS', 'BACK', 'MAIN'].includes(command)) {
        this.printAddresses(data); this.selectionHelp(); return true;
      }
      try {
        if (/^INET#/i.test(line.trim())) throw new Error('Local residents only.');
        const resident = resolveMailResident(data.members, line.trim());
        if (selection.recipients.some((m) => m.id === resident.id)) print('その住人は選択済みです。宛先=');
        else { selection.recipients.push({ id: resident.id, label: mailCorrespondent(resident) }); this.selectionHelp(); }
      } catch { print('宛先を選択できません。既存のローカル住人を1行に1人入力してください。選択は保持されています。移動するには CANCEL。宛先='); }
      return true;
    }
    if (this.mailAddress) {
      if (['CANCEL', '.CANCEL'].includes(command)) { this.mailAddress = false; print('メールを中止しました。コマンド='); }
      else if (['HELP', 'MEMBERS', 'BACK', 'MAIN'].includes(command)) { this.printAddresses(await this.actions.read()); print('宛先='); }
      else { const data = await this.actions.read(); if (revision === this.revision) this.startCompose({ mail: true, recipient: line, scheduled: this.scheduledAddress }, data); }
      return true;
    }
    if (this.pendingCancellation) {
      const pending = this.pendingCancellation;
      if (['N', 'CANCEL', '.CANCEL', 'BACK', 'MAIN'].includes(command)) {
        this.pendingCancellation = undefined; print('取消しを中止しました。コマンド='); return true;
      }
      if (command !== 'Y') { print('この予約を取り消しますか？ (Y/N)='); return true; }
      const data = await this.actions.read();
      if (revision !== this.revision || this.pendingCancellation !== pending) return true;
      this.pendingCancellation = undefined;
      if (activeHuman(data) !== pending.senderId) { print('利用者が変更されました。取消しを確認し直してください。'); return true; }
      const cancelled = await (await this.actions.repository()).cancelScheduledMail(pending.senderId, pending.reference);
      print(cancelled ? `予約 ${pending.reference} を取り消しました。` : '取消しできません。配達時刻以降または処理済みです。', 'コマンド='); return true;
    }
    if (this.registration) {
      if (['N', 'SKIP', 'CANCEL', '.CANCEL', 'BACK', 'MAIN'].includes(command)) {
        this.registration = null; this.intent = undefined; print('登録を中止しました。読むだけでも利用できます。');
        if (command === 'MAIN') { this.fileRequest = undefined; this.menu = null; this.detailReturns = []; this.returnToMain(); }
        else print('コマンド=');
        return true;
      }
      if (command === 'HELP') { print('Y: 登録へ / N・SKIP・BACK: 中止。ハンドル入力中は名前をそのまま入力。HANDLE で後から選択・登録。'); return true; }
      if (this.registration === 'offer') {
        if (command !== 'Y') { print('Y / N / SKIP を入力してください。'); return true; }
        this.registration = 'name'; print('ハンドル名='); return true;
      }
      if (!line.trim() || line.length > 80) { print('ハンドル名は空白だけにせず80文字以内で入力してください。'); return true; }
      try { await (await this.actions.repository()).createHumanMember(line); }
      catch (error) { print(`登録できませんでした。ハンドル名は再入力できます。${String(error)}`); return true; }
      if (revision !== this.revision) return true;
      // Registration is committed. A refresh failure must not invite creation
      // of a duplicate identity, just as a committed post cannot be resent.
      this.registration = null;
      const intent = this.intent; this.intent = undefined;
      print('ハンドルを登録しました。');
      try {
        const data = await this.actions.read();
        if (revision !== this.revision) return true;
        if (intent) this.startCompose(intent, data); else if (this.menu) await this.show(this.menu); else print('コマンド=');
      } catch (error) { print(`登録済みですが画面を更新できません。HANDLE / WRITE から再開してください。${String(error)}`); }
      return true;
    }
    if (this.fileRequest && !this.menu && !['SETTINGS', 'CONFIG', 'ABOUT'].includes(command)) {
      const file = this.fileRequest;
      if (command === 'HELP') { this.explainDownload(); return true; }
      if (['N', 'BACK', 'CANCEL', '.CANCEL', 'MAIN'].includes(command)) {
        this.fileRequest = undefined; print('ファイル取得を中止しました。');
        if (command === 'MAIN') this.returnToMain(); else print(...file.returnTo());
        return true;
      }
      if (command !== 'Y') { print('Y / N を入力してください。取得していません。'); return true; }
      // Consume before any await or browser action; even concurrently submitted Y is single-use.
      this.fileRequest = undefined;
      const revision = this.revision;
      await this.actions.read(); // Also checks the repository's reset/restore generation.
      if (revision !== this.revision) return true;
      try {
        (this.actions.downloadFile ?? downloadFile)(file.body, file.filename);
        print(`${file.filename} のダウンロードをブラウザーに依頼しました。`);
      } catch {
        print('ダウンロードを開始できませんでした。DOWNLOAD 番号 から確認し直してください。');
      }
      print(...file.returnTo()); return true;
    }
    if (this.confirmation) {
      const pending = this.confirmation;
      if (command === 'HELP') { print('この操作だけを確認しています。Y: 実行 / N・BACK・MAIN・CANCEL: 中止。空入力は承認しません。'); return true; }
      if (['N', 'BACK', 'MAIN', 'CANCEL', '.CANCEL'].includes(command)) {
        this.confirmation = undefined; print('操作を中止しました。');
        if (command === 'MAIN') { this.fileRequest = undefined; this.menu = null; this.returnToMain(); }
        else if (this.menu) await this.show(this.menu); else print('コマンド=');
        return true;
      }
      if (command !== 'Y') { print('Y / N を入力してください。実行していません。'); return true; }
      if (pending.kind === 'import' && pending.text === undefined) { print('ファイル選択が完了していません。N で中止できます。'); return true; }
      const data = await this.actions.read();
      if ((pending.kind === 'model' ? setupContext(data) : context(data)) !== pending.expected) {
        this.confirmation = undefined; print('世界や設定が変わりました。現在の設定から確認し直してください。'); return true;
      }
      // Consume before the asynchronous action: repeated Y cannot reuse approval.
      this.confirmation = undefined;
      if (pending.kind === 'model') void this.actions.ai.load(pending.modelId!, pending.expected);
      if (pending.kind === 'import') await this.actions.restore(pending.text!, pending.expected);
      if (pending.kind === 'reset') await this.actions.reset(pending.expected);
      if (pending.kind === 'populate') { await (await this.actions.repository()).populateEmptyCommunity({ confirmPopulate: true }); await this.actions.read(); print('初期会話を準備しました。'); }
      print('コマンド='); return true;
    }
    if (this.profile) {
      if (['BACK', 'CANCEL', '.CANCEL', 'MAIN'].includes(command)) {
        this.profile = undefined; this.field = undefined; print('住人の変更を破棄しました。');
        if (command === 'MAIN') { this.fileRequest = undefined; this.menu = null; this.returnToMain(); } else await this.show('profiles');
      } else if (command === 'HELP') this.profileHelp();
      else if (this.field) {
        const key = this.field;
        let value: unknown = line;
        try {
          if (['interests', 'preferredBoards', 'weekdayHours', 'weekendHours'].includes(key)) {
            value = line.trim() ? line.split(',').map((part) => key.endsWith('Hours') ? Number(part.trim()) : part.trim()) : [];
          } else if (typeof this.profile[key] === 'number') value = Number(line);
          else if (key === 'affinities') value = JSON.parse(line);
          Object.assign(this.profile, { [key]: value }); this.field = undefined; this.profileHelp();
        } catch { print('値を解釈できません。再入力してください。'); }
      } else if (command === 'SAVE') {
        try {
          await this.settings.resident(this.profile, this.profileContext); this.profile = undefined; print('住人の設定を保存しました。次の予定から反映します。'); await this.show('profiles');
        } catch (error) { print(`保存できませんでした。編集内容は保持しています。${String(error)}`); }
      } else if (/^\d+$/.test(command) && profileFields[Number(command) - 1]) {
        this.field = profileFields[Number(command) - 1];
        print(`${profileLabels[profileFields.indexOf(this.field!)]} / ${this.field}=`, '配列はカンマ区切り。affinities は JSON。数値の範囲は SAVE で検証します。');
      } else this.profileHelp();
      return true;
    }
    if (!this.menu && this.olt.active && ['/HANDLE', '/SETTINGS'].includes(command)) {
      await this.olt.leave(); return this.submit(command.slice(1));
    }
    if (!this.menu && await this.olt.submit(line)) return true;
    if (!command) return !!this.menu;
    if (command === 'STOP') { this.actions.ai.stop(); if (!this.applicationOutput('ai')) print('処理をキャンセルし、モデルを解放しました。'); return true; }
    if (['SETTINGS', 'CONFIG'].includes(command)) { await this.show('settings'); return true; }
    if (command === 'HANDLE') { await this.show('handles'); return true; }
    if (command === 'ABOUT') { if (this.menu !== 'about') this.detailReturns.push(this.menu); await this.show('about'); return true; }
    if (command === 'LOG') { downloadText(this.actions.log(), 'terminal'); print('ログのダウンロードを開始しました。保存先を確認してください。'); return true; }
    if (command === 'BACKUP') {
      downloadText(await (await this.actions.repository()).exportJson(), 'backup'); print('バックアップのダウンロードを開始しました。保存先を確認してください。'); return true;
    }
    if (command === 'IMPORT') {
      // The picker is asynchronous but the queue is released; its late result is
      // fenced by the operation/world context before a confirmation is installed.
      const data = await this.actions.read(), expected = context(data);
      this.confirm({ kind: 'import', expected }, 'ファイルを選択しています。N / BACK で中止できます。');
      const waiting = this.confirmation;
      void chooseBackup().then(async (text) => {
        if (this.confirmation !== waiting) return;
        if (text === null) { this.confirmation = undefined; print('ファイル選択を中止しました。コマンド='); return; }
        try {
          const parsed: unknown = JSON.parse(text); validateBackup(parsed);
          if (this.confirmation !== waiting) return;
          this.confirm({ kind: 'import', expected, text }, 'このブラウザー内の全データ（投稿・メール・ローカルNetNews記事・登録OSLテキスト・会員・既読・設定・履歴）をファイルで置き換えます。取り消せません。必要なら先に BACKUP。', '置き換えて復元しますか？ (Y/N)=');
        } catch (error) { this.confirmation = undefined; print(`復元できません。${String(error)}`, 'コマンド='); }
      }).catch((error) => { if (this.confirmation === waiting) { this.confirmation = undefined; print(`ファイルを読めません。${String(error)}`); } });
      return true;
    }
    if (command === 'RESET') {
      this.confirm({ kind: 'reset', expected: context(await this.actions.read()) },
        '投稿・メール・ローカルNetNews記事・登録OSLテキスト・会員・既読・住人編集・活動設定・モデル同意・表示設定・履歴をすべて削除します。取り消せません。必要なら先に BACKUP。',
        '最初の10人・72件の投稿と電子会議室の3件を準備し、他のタブも再読み込みします。NetNewsの同梱6件は残ります。モデル重み・端末キャッシュは保持します。AI には再同意が必要です。', '初期状態に戻しますか？ (Y/N)='); return true;
    }
    // Global application controls above retain ownership. Every service command
    // in these bounded services belongs to navigation, including unsupported input.
    if (!this.menu && (this.actions.isTelnet?.() || this.actions.isEcom?.() || this.actions.isGopher?.() || this.actions.isArchie?.())) return false;
    if (!this.menu && this.actions.mailbox?.()) {
      const argument = profileArgument(line);
      if (argument !== null) {
        const mailbox = this.actions.mailbox()!;
        const data = await this.actions.read(); // Existing reset/restore generation check.
        const current = this.actions.mailbox();
        if (revision === this.revision && submission === this.submission && !this.menu &&
            current?.box === mailbox.box && current?.title === mailbox.title) {
          print(...renderResidentProfile(data, argument), 'コマンド=');
        }
        return true;
      }
      const data = await this.actions.read(), human = activeHuman(data);
      if (revision !== this.revision) return true;
      if (command === 'MEMBERS') { this.printAddresses(data); return true; }
      const fileWrite = /^ *WRITE-FILE(?: ([\s\S]*))?$/i.exec(line);
      if (fileWrite) { this.startCompose({ fileMail: true, recipient: fileWrite[1] ?? '' }, data); return true; }
      const acquire = /^ACQUIRE ([1-9]\d*)$/.exec(command);
      if (acquire) {
        const saved = mailboxRows(data.mail ?? [], human, this.actions.mailbox!()!.box).find((m) => m.number === Number(acquire[1]) && m.file && m.senderId === human);
        if (!saved) print('その番号のファイルメールはこの箱にありません。SENT で確認してください。');
        else this.startFileMail(human!, saved);
        return true;
      }
      if (command === 'WRITE-MULTI') { this.startCompose({ multiMail: true }, data); return true; }
      if (command === 'PENDING' || /^(READ-PENDING|CANCEL-PENDING)(?: |$)/.test(command)) {
        const letters = scheduledMail(data).letters.filter((l) => l.senderId === human && l.status === 'pending');
        if (command === 'PENDING') {
          print(`配達待ち：${letters.length}件`, ...letters.map((l) => `${l.id} / ${l.recipientLabel} / ${scheduleTime(l.dueAt, calendarSetting(data)!)} (JST) / ${l.subject}`),
            'READ-PENDING 参照 / CANCEL-PENDING 参照（配達前にYで取消し） / BACK: 戻る / MAIN: MAIN'); return true;
        }
        const reference = line.trim().split(/\s+/)[1];
        const letter = letters.find((l) => l.id.toUpperCase() === reference?.toUpperCase());
        if (!letter) { print('その参照の配達待ちはありません。PENDING で確認してください。'); return true; }
        print(`予約 ${letter.id}`, `宛先：${letter.recipientLabel}`, `配達予定：${scheduleTime(letter.dueAt, calendarSetting(data)!)} (JST)`, `件名：${letter.subject}`, '★内容', letter.body);
        if (command.startsWith('CANCEL-PENDING')) {
          this.pendingCancellation = { senderId: human!, reference: letter.id }; print('この予約を取り消しますか？ (Y/N)=');
        } else print('PENDING / CANCEL-PENDING 参照 / コマンド=');
        return true;
      }
      const scheduled = /^ *WRITE-AT(?: ([\s\S]*))?$/i.exec(line);
      if (scheduled) { this.startCompose({ mail: true, scheduled: true, recipient: scheduled[1] ?? '' }, data); return true; }
      const write = /^ *(?:WRITE|COMPOSE)(?: ([\s\S]*))?$/i.exec(line);
      if (write) { this.startCompose({ mail: true, recipient: write[1] ?? '' }, data); return true; }
      const selected = /^(READ|REPLY) ([1-9]\d*)$/.exec(command);
      if (selected) {
        const rows = mailboxRows(data.mail ?? [], human, this.actions.mailbox!()!.box);
        const mail = rows.find((m) => m.number === Number(selected[2]));
        if (!mail) { print('その番号のメールはこの箱にありません。INBOX / SENT / LIST で確認してください。'); return true; }
        if (selected[1] === 'REPLY') {
          if (mail.file) print('ファイルメールには返信できません。');
          else if (mail.recipientId !== human) print('受信したメールに返信してください。INBOX / REPLY 番号');
          else this.startCompose({ mail: true, recipient: mail.senderInternetAddress !== undefined ? `INET#${mail.senderInternetAddress}` : mail.senderId!, parent: mail }, data);
        } else {
          if (mail.recipientId === human) await (await this.actions.repository()).markMailRead(human!, mail.id);
          print(...renderMail(mail, data.members, data.mail ?? [], calendarSetting(data)));
        }
        return true;
      }
    }
    if (!this.menu) {
      if (command === 'REGISTER' && this.actions.oslCategory?.()) {
        const category = this.actions.oslCategory()!;
        const data = await this.actions.read();
        if (revision === this.revision && submission === this.submission && !this.menu && this.actions.oslCategory?.() === category)
          this.startCompose({ osl: true, category }, data);
        return true;
      }
      const download = /^DOWNLOAD ([1-9]\d*)$/.exec(command);
      if (download) {
        await this.actions.read();
        if (revision !== this.revision || submission !== this.submission || this.menu) return true;
      }
      const file = download ? this.actions.selectDownload?.(Number(download[1])) : null;
      if (file) { this.fileRequest = file; this.explainDownload(); return true; }
      // Directory errors belong to their navigation screen, not another service.
      if (this.actions.isNetNewsDirectory?.() && /^(?:WRITE|REPLY)(?: |$)/.test(command)) return false;
      if (this.actions.netNews?.() && /^(?:WRITE|REPLY)(?: |$)/.test(command)) {
        const selected = /^REPLY ([1-9]\d*)$/.exec(command);
        const number = selected ? Number(selected[1]) : undefined;
        if (command !== 'WRITE' && (!selected || !Number.isSafeInteger(number))) {
          print('WRITE / REPLY 番号 を入力してください。現在の一覧の記事を指定します。コマンド='); return true;
        }
        const data = await this.actions.read(), current = this.actions.netNews!()!;
        const parent = number === undefined ? undefined : current.articles.find((a) => a.number === number);
        if (number !== undefined && !parent) print('その番号の記事は現在の一覧にありません。LIST で全記事を表示してください。コマンド=');
        else this.startCompose({ netnews: true, group: current.group, ...(parent ? { parent } : {}) }, data);
        return true;
      }
      if (command === 'WRITE' || /^REPLY \d+$/.test(command)) {
        if (this.actions.isConference?.()) {
          const data = await this.actions.read(), state = conferenceState(data);
          const number = command === 'WRITE' ? undefined : Number(command.split(' ')[1]);
          const parent = state.contributions.find((row) => row.number === number);
          if (number !== undefined && !parent) print('返信先の発言がありません。LIST で一覧を確認してください。');
          else this.startCompose({ conference: true, ...(parent ? { parent } : {}) }, data);
          return true;
        }
        const target = this.actions.destination();
        if (!target) { print('投稿先の掲示板で WRITE / REPLY 番号 を入力してください。'); return true; }
        const data = await this.actions.read(), posts = forumPosts(data, target.keyword, target.boardNo);
        const number = command === 'WRITE' ? undefined : Number(command.split(' ')[1]);
        const parent = number === undefined ? undefined : posts.posts.find((p) => p.number === number);
        if (number !== undefined && (!parent || posts.source !== 'local')) print('返信先のローカル投稿がありません。');
        else {
          const sigs = data.sigs.filter((sig) => sig.keyword.toUpperCase() === target.keyword);
          const boards = data.forums.filter((forum) => forum.sigId === sigs[0]?.id && forum.boardNo === target.boardNo);
          if (sigs.length > 1 || boards.length > 1) print('ローカル掲示板が重複しています。投稿できません。');
          else this.startCompose({ target, ...(parent ? { parent } : {}) }, data);
        }
        return true;
      }
      return false;
    }
    if (command === 'HELP') { await this.show(this.menu); return true; }
    if (command === 'MAIN') { this.fileRequest = undefined; this.menu = null; this.detailReturns = []; this.returnToMain(); return true; }
    if (['BACK', 'CANCEL', '.CANCEL'].includes(command)) {
      if (this.menu === 'about' || this.menu === 'help') {
        const caller = this.detailReturns.pop();
        if (caller) await this.show(caller);
        else { this.menu = null; this.returnFromMenu(); }
      } else if (this.menu === 'settings') { this.menu = null; print('元の画面に戻りました。'); this.returnFromMenu(); }
      else await this.show(this.menu === 'profiles' ? 'ai' : 'settings');
      return true;
    }
    const data = await this.actions.read(), repo = await this.actions.repository();
    if (this.menu === 'settings') {
      const next: Record<string, Menu> = { '1': 'display', '2': 'handles', '3': 'ai', '4': 'storage', '5': 'offline' };
      if (next[command]) { await this.show(next[command]!); return true; }
      else if (command === '6') print(this.actions.sessionTimes());
      else if (command === '7') { downloadText(this.actions.log(), 'terminal'); print('ログのダウンロードを開始しました。'); }
      else if (command === '8' || command === '9') { this.detailReturns.push('settings'); await this.show(command === '8' ? 'help' : 'about'); return true; }
      else print(...settingsMenu);
    } else if (this.menu === 'handles') {
      if (/^RENAME /i.test(line)) {
        const member = data.members.find((row) => row.id === activeHuman(data)), handle = line.slice(7);
        if (!member || !handle.trim() || handle.length > 80) print('人間の利用者を選択し、1〜80文字の名前を入力してください。');
        else { await repo.put('members', { ...member, handle }); await this.actions.read(); print('ハンドル名を変更しました。'); }
      } else if (command === 'NEW') { this.registration = 'name'; print('ハンドル名='); return true; }
      else {
        const member = /^\d+$/.test(command) ? data.members.filter((m) => m.actor === 'human')[Number(command) - 1] : undefined;
        if (!member) print('番号 / NEW / BACK を入力してください。');
        else { await repo.put('settings', { id: ACTIVE_MEMBER_SETTING, value: member.id }); await this.actions.read(); print(`${member.handle} を選択しました。`); }
      }
    } else if (this.menu === 'display') {
      const value = this.actions.preferences(), [key, setting] = command.split(' ');
      if (key === 'THEME' && ['WHITE', 'GREEN', 'AMBER'].includes(setting ?? '')) value.theme = setting!.toLowerCase() as TerminalPreferences['theme'];
      else if (key === 'SPEED' && ['300', '1200', '2400', '9600', 'INSTANT'].includes(setting ?? '')) value.speed = setting!.toLowerCase() as TerminalPreferences['speed'];
      else if (key === 'EFFECTS' && ['ON', 'OFF'].includes(setting ?? '')) value.effects = setting === 'ON';
      else { print('THEME white/green/amber / SPEED 300/1200/2400/9600/instant / EFFECTS ON/OFF'); return true; }
      await this.settings.display(value); print('表示設定を保存しました。');
    } else if (this.menu === 'offline') {
      if (command === 'CACHE') void this.offline.cache();
      else if (command === 'PERSIST') void this.offline.persist();
      else if (command === 'STATUS') await this.offline.storage();
      else print('CACHE / STATUS / PERSIST / BACK');
    } else if (this.menu === 'profiles') {
      const row = /^\d+$/.test(command) ? residentProfiles(data)[Number(command) - 1] : undefined;
      if (row) { this.profile = structuredClone(row); this.profileContext = residentContext(data); this.profileHelp(); return true; }
      else print('表示された住人の番号 / BACK');
    } else if (this.menu === 'storage') {
      if (command === 'POPULATE' && canPopulateCommunity(data)) { this.confirm({ kind: 'populate', expected: context(data) }, '空の掲示板に最大66件・18話題の創作を追加します。モデルのダウンロードはありません。追加しますか？ (Y/N)='); return true; }
      else print('BACKUP / IMPORT / RESET / HELP / BACK');
    } else if (this.menu === 'ai') {
      const savedModel = (data.settings.find((row) => row.id === 'ai-activity')?.value as { modelId?: string } | undefined)?.modelId;
      this.selectedModel = models.find((row) => row.id === savedModel)?.id ?? models[0].id;
      const [key, arg] = command.split(' ');
      const index = Number(arg) - 1;
      if (key === 'MODEL' && models[index]) { this.selectedModel = models[index]!.id; await this.settings.activity((data.settings.find((row) => row.id === 'ai-activity')?.value as { maxPosts?: number })?.maxPosts ?? 0, this.selectedModel); print(`モデルを選択しました: ${this.selectedModel}`); }
      else if (command === 'LOAD') { this.confirm({ kind: 'model', expected: setupContext(data), modelId: this.selectedModel }, ...modelDisclosure(this.selectedModel)); return true; }
      else if (command === 'LATER') { await this.settings.defer(setupContext(data)); print('モデル準備を延期しました。LOAD で再開。'); }
      else if (command === 'CACHE') void this.actions.ai.checkCache(this.selectedModel);
      else if (key === 'AUTO' && /^\d+$/.test(arg ?? '') && Number(arg) <= 12) {
        await this.settings.activity(Number(arg), this.selectedModel); print(Number(arg) ? '自動投稿を有効にしました。モデル読込への同意は別に必要です。' : '自動投稿を休止しました。');
      } else if (command === 'RETRY') void this.actions.ai.retry();
      else if (command === 'RESIDENTS') { await this.show('profiles'); return true; }
      else print('HELP でモデル・活動の操作を表示します。');
    }
    print('コマンド=');
    return true;
  }
}
