import type { Backup, Post, TerminalPreferences } from './storage/schema';
import { TERMINAL_SETTING, validateBackup } from './storage/schema';
import type { ForumDestination, LocalRepository } from './storage/repository';
import { ACTIVE_MEMBER_SETTING } from './storage/repository';
import { activeHuman, forumPosts } from './forums';
import { TerminalComposer } from './composer';
import type { ComposeDraft } from './composer';
import { about, keyboardHelp, settingsMenu } from './settings';
import { downloadText, chooseBackup } from './storage/controls';
import { canPopulateCommunity } from './storage/community';
import { createOfflineControls } from './offline/controls';
import { models, residentProfiles } from './ai/personas';
import type { ResidentProfile } from './ai/personas';
import type { createAiControls } from './ai/controls';
import { setupContext } from './ai/activity';
import { modelDisclosure } from './ai/setup';

type Menu = 'settings' | 'display' | 'handles' | 'ai' | 'storage' | 'offline' | 'profiles' | 'about' | 'help';
type Intent = { target: ForumDestination; parent?: Post };
type Confirmation = { kind: 'model' | 'import' | 'reset' | 'populate' | 'ai-save'; expected: string; text?: string; modelId?: string };
interface CommandActions {
  repository(): Promise<LocalRepository>;
  read(): Promise<Backup>;
  print(...lines: string[]): void;
  navigate(line: string): void;
  destination(): ForumDestination | null;
  save(target: ForumDestination, draft: ComposeDraft): Promise<Post>;
  restore(text: string): Promise<void>;
  reset(): Promise<void>;
  preferences(): TerminalPreferences;
  applyPreferences(value: TerminalPreferences): void;
  sessionTimes(): string;
  log(): string;
  ai: ReturnType<typeof createAiControls>;
}
const inviteSetting = 'terminal-handle-invited';
// Activity watermarks advance after every command; they are not a world edit.
const context = (data: Backup) => JSON.stringify([data.members, data.sigs, data.forums, data.posts, data.readStates,
  data.settings.map((row) => row.id === 'ai-activity' ? { ...row, value: { ...(row.value as object), lastActivityAt: null } } : row)]);
const profileFields: (keyof ResidentProfile)[] = ['handle', 'occupation', 'routine', 'profile', 'interests', 'preferredBoards',
  'weekdayHours', 'weekendHours', 'utcOffsetMinutes', 'frequency', 'participation', 'reading', 'newThread', 'reply', 'inactivity', 'affinities'];

const profileLabels = ['ハンドル', '職業', '生活・仕事・睡眠の習慣', '人物像・文体', '興味（カンマ区切り）',
  '好みの掲示板（MITI:9, DAISIZEN:1 またはID）', '平日の接続時間（0〜23）', '休日の接続時間（0〜23）',
  'UTCからの時差（分 -720〜840、日本は540）', '活動頻度（0〜3、0で休止）', '訪問の確率（0〜1）',
  '読む重み（0〜1）', '新しい話題の重み（0〜1）', '返信の重み（0〜1）', '何もしない重み（0〜1）', '住人との親しさ（IDと0〜1のJSON）'];

/** One screen owner interprets each line; navigation cannot leak into a prompt. */
export class TerminalCommands {
  private menu: Menu | null = null;
  private registration: 'offer' | 'name' | null = null;
  private intent: Intent | undefined;
  private composer: TerminalComposer | undefined;
  private confirmation: Confirmation | undefined;
  private modelSelected = false;
  private detailReturn: Menu | null = null;
  private selectedModel: string = models[0].id;
  private selectedResident = 0;
  private selectedForum = 0;
  private selectedReply: number | undefined;
  private profile: ResidentProfile | undefined;
  private field: keyof ResidentProfile | undefined;
  private offline;
  constructor(private actions: CommandActions) { this.offline = createOfflineControls(actions.print); }
  get recordsHistory() { return !this.composer?.active && !this.registration && !this.confirmation && !this.profile; }
  invalidate() {
    const active = this.composer?.active || this.registration || this.confirmation || this.profile;
    this.composer = undefined; this.registration = null; this.intent = undefined;
    this.confirmation = undefined; this.profile = undefined; this.field = undefined; this.menu = null;
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
      if (!this.modelSelected) {
        const saved = data.settings.find((row) => row.id === 'ai-activity')?.value as { modelId?: string } | undefined;
        if (models.some((row) => row.id === saved?.modelId)) this.selectedModel = saved!.modelId!;
        this.modelSelected = true;
      }
      print('モデル・活動・住人', ...this.actions.ai.status(), ...models.map((row, i) => `MODEL ${i + 1}: ${row.label}`),
        `選択モデル: ${this.selectedModel}`, 'LOAD: 説明・読込確認 / LATER: 準備を延期 / STOP: 中止・モデル解放 / CACHE: 重み確認',
        'AUTO 0〜12: 自動保存上限（0で休止）/ RETRY: 未完了を再試行 / RESIDENTS: 住人編集',
        ...residentProfiles(data).map((row, i) => `PERSONA ${i + 1}: ${row.handle}${i === this.selectedResident ? ' [選択中]' : ''}`),
        ...data.forums.map((row, i) => `FORUM ${i + 1}: ${row.name}${i === this.selectedForum ? ' [選択中]' : ''}`),
        `返信先: ${this.selectedReply ?? 'なし'}`, 'REPLY 番号 / REPLY NONE / GENERATE: 投稿案 / PREVIEW / SEND / DISCARD');
    }
    if (menu === 'storage') print('JSON バックアップ・復元・初期化', 'BACKUP: JSON 保存 / IMPORT: ファイル選択・置換確認 / RESET: 初期状態に戻す',
      ...(canPopulateCommunity(data) ? ['POPULATE: 空の掲示板に初期会話を追加'] : []), 'JSON は会員・投稿・既読・設定・履歴を含みます。モデルと端末キャッシュは含みません。外部に保存してください。');
    if (menu === 'offline') { print('オフライン・容量', 'CACHE: 端末を保存 / STATUS: 保存状態・容量 / PERSIST: 永続保存を要求'); await this.offline.storage(); }
    if (menu === 'profiles') print('住人編集', ...residentProfiles(data).map((row, i) => `${i + 1} ${row.handle}`), '番号: 編集する住人');
    if (menu !== 'settings') print('HELP: この案内 / BACK: 一つ戻る / MAIN: MAIN');
    print('コマンド=');
  }
  private startCompose(intent: Intent, data: Backup) {
    const authorId = activeHuman(data);
    if (!authorId) { this.intent = intent; this.registration = 'offer'; this.actions.print('投稿にはハンドルが必要です。登録しますか？ (Y/N/SKIP)='); return; }
    this.composer = new TerminalComposer(intent.target, authorId, intent.parent, this.actions);
  }
  private confirm(value: Confirmation, ...warning: string[]) {
    this.confirmation = value;
    this.actions.print(...warning, 'Y: 実行 / N・BACK: 中止 / HELP: 説明');
  }
  private profileHelp() {
    this.actions.print('住人の編集（未保存）',
      ...profileFields.map((key, i) => `${i + 1} ${profileLabels[i]}: ${JSON.stringify(this.profile?.[key])}`), '番号: 値を入力 / SAVE: 検証して保存 / CANCEL・BACK: 変更を破棄');
  }
  async submit(line: string): Promise<boolean> {
    const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
    const print = this.actions.print;
    if (this.composer?.active) { await this.composer.submit(line); return true; }
    if (this.registration) {
      if (['N', 'SKIP', 'CANCEL', '.CANCEL', 'BACK', 'MAIN'].includes(command)) {
        this.registration = null; this.intent = undefined; print('登録を中止しました。読むだけでも利用できます。');
        if (command === 'MAIN') this.actions.navigate('MAIN'); else print('コマンド=');
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
      // Registration is committed. A refresh failure must not invite creation
      // of a duplicate identity, just as a committed post cannot be resent.
      this.registration = null;
      const intent = this.intent; this.intent = undefined;
      print('ハンドルを登録しました。');
      try {
        const data = await this.actions.read();
        if (intent) this.startCompose(intent, data); else if (this.menu) await this.show(this.menu); else print('コマンド=');
      } catch (error) { print(`登録済みですが画面を更新できません。HANDLE / WRITE から再開してください。${String(error)}`); }
      return true;
    }
    if (this.confirmation) {
      const pending = this.confirmation;
      if (command === 'HELP') { print('この操作だけを確認しています。Y: 実行 / N・BACK・MAIN・CANCEL: 中止。空入力は承認しません。'); return true; }
      if (['N', 'BACK', 'MAIN', 'CANCEL', '.CANCEL'].includes(command)) {
        this.confirmation = undefined; print('操作を中止しました。');
        if (command === 'MAIN') { this.menu = null; this.actions.navigate('MAIN'); }
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
      if (pending.kind === 'ai-save') void this.actions.ai.send();
      if (pending.kind === 'import') await this.actions.restore(pending.text!);
      if (pending.kind === 'reset') await this.actions.reset();
      if (pending.kind === 'populate') { await (await this.actions.repository()).populateEmptyCommunity({ confirmPopulate: true }); await this.actions.read(); print('初期会話を準備しました。'); }
      print('コマンド='); return true;
    }
    if (this.profile) {
      if (['BACK', 'CANCEL', '.CANCEL', 'MAIN'].includes(command)) {
        this.profile = undefined; this.field = undefined; print('住人の変更を破棄しました。');
        if (command === 'MAIN') { this.menu = null; this.actions.navigate('MAIN'); } else await this.show('profiles');
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
          this.actions.ai.invalidate();
          await (await this.actions.repository()).configureResident(this.profile);
          await this.actions.read(); this.actions.ai.resume(); this.profile = undefined; print('住人の設定を保存しました。次の予定から反映します。'); await this.show('profiles');
        } catch (error) { print(`保存できませんでした。編集内容は保持しています。${String(error)}`); }
      } else if (/^\d+$/.test(command) && profileFields[Number(command) - 1]) {
        this.field = profileFields[Number(command) - 1];
        print(`${profileLabels[profileFields.indexOf(this.field!)]} / ${this.field}=`, '配列はカンマ区切り。affinities は JSON。数値の範囲は SAVE で検証します。');
      } else this.profileHelp();
      return true;
    }
    if (!command) return !!this.menu;
    if (command === 'STOP') { this.actions.ai.stop(); return true; }
    if (['SETTINGS', 'CONFIG'].includes(command)) { await this.show('settings'); return true; }
    if (command === 'HANDLE') { await this.show('handles'); return true; }
    if (command === 'ABOUT') { this.detailReturn = this.menu === 'about' ? this.detailReturn : this.menu; await this.show('about'); return true; }
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
          this.confirm({ kind: 'import', expected, text }, 'このブラウザー内の全データ（投稿・会員・既読・設定・履歴）をファイルで置き換えます。取り消せません。必要なら先に BACKUP。', '置き換えて復元しますか？ (Y/N)=');
        } catch (error) { this.confirmation = undefined; print(`復元できません。${String(error)}`, 'コマンド='); }
      }).catch((error) => { if (this.confirmation === waiting) { this.confirmation = undefined; print(`ファイルを読めません。${String(error)}`); } });
      return true;
    }
    if (command === 'RESET') {
      this.confirm({ kind: 'reset', expected: context(await this.actions.read()) },
        '投稿・会員・既読・住人編集・活動設定・モデル同意・表示設定・履歴をすべて削除します。取り消せません。必要なら先に BACKUP。',
        '最初の10人・30件の投稿を準備し、他のタブも再読み込みします。モデル重み・端末キャッシュは保持します。AI には再同意が必要です。', '初期状態に戻しますか？ (Y/N)='); return true;
    }
    if (!this.menu) {
      if (command === 'WRITE' || /^REPLY \d+$/.test(command)) {
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
    if (command === 'MAIN') { this.menu = null; this.actions.navigate('MAIN'); return true; }
    if (['BACK', 'CANCEL', '.CANCEL'].includes(command)) {
      if (this.menu === 'about' || this.menu === 'help') {
        if (this.detailReturn) await this.show(this.detailReturn);
        else { this.menu = null; this.actions.navigate('HELP'); }
      } else if (this.menu === 'settings') { this.menu = null; print('元の画面に戻りました。'); this.actions.navigate('HELP'); }
      else await this.show(this.menu === 'profiles' ? 'ai' : 'settings');
      return true;
    }
    const data = await this.actions.read(), repo = await this.actions.repository();
    if (this.menu === 'settings') {
      const next: Record<string, Menu> = { '1': 'display', '2': 'handles', '3': 'ai', '4': 'storage', '5': 'offline' };
      if (next[command]) { await this.show(next[command]!); return true; }
      else if (command === '6') print(this.actions.sessionTimes());
      else if (command === '7') { downloadText(this.actions.log(), 'terminal'); print('ログのダウンロードを開始しました。'); }
      else if (command === '8' || command === '9') { this.detailReturn = 'settings'; await this.show(command === '8' ? 'help' : 'about'); return true; }
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
      await repo.put('settings', { id: TERMINAL_SETTING, value: { ...value } }); this.actions.applyPreferences(value); print('表示設定を保存しました。');
    } else if (this.menu === 'offline') {
      if (command === 'CACHE') void this.offline.cache();
      else if (command === 'PERSIST') void this.offline.persist();
      else if (command === 'STATUS') await this.offline.storage();
      else print('CACHE / STATUS / PERSIST / BACK');
    } else if (this.menu === 'profiles') {
      const row = /^\d+$/.test(command) ? residentProfiles(data)[Number(command) - 1] : undefined;
      if (row) { this.profile = structuredClone(row); this.profileHelp(); return true; }
      else print('表示された住人の番号 / BACK');
    } else if (this.menu === 'storage') {
      if (command === 'POPULATE' && canPopulateCommunity(data)) { this.confirm({ kind: 'populate', expected: context(data) }, '空の掲示板に30件・8話題の創作を追加します。モデルのダウンロードはありません。追加しますか？ (Y/N)='); return true; }
      else print('BACKUP / IMPORT / RESET / HELP / BACK');
    } else if (this.menu === 'ai') {
      const [key, arg] = command.split(' ');
      const index = Number(arg) - 1;
      if (key === 'MODEL' && models[index]) { this.actions.ai.stop(); this.selectedModel = models[index]!.id; this.modelSelected = true; print(`モデルを選択しました: ${this.selectedModel}`); }
      else if (command === 'LOAD') { this.confirm({ kind: 'model', expected: setupContext(data), modelId: this.selectedModel }, ...modelDisclosure(this.selectedModel)); return true; }
      else if (command === 'LATER') { await repo.deferAiSetup(setupContext(data)); await this.actions.read(); print('モデル準備を延期しました。LOAD で再開。'); }
      else if (command === 'CACHE') void this.actions.ai.checkCache(this.selectedModel);
      else if (key === 'AUTO' && /^\d+$/.test(arg ?? '') && Number(arg) <= 12) {
        this.actions.ai.invalidate(); await repo.configureActivity(Number(arg), this.selectedModel); await this.actions.read(); if (Number(arg)) this.actions.ai.resume(); print(Number(arg) ? '自動投稿を有効にしました。モデル読込への同意は別に必要です。' : '自動投稿を休止しました。');
      } else if (command === 'RETRY') void this.actions.ai.retry();
      else if (command === 'RESIDENTS') { await this.show('profiles'); return true; }
      else if (key === 'PERSONA' && residentProfiles(data)[index]) { this.actions.ai.discard(); this.selectedResident = index; print('投稿者を選択しました。'); }
      else if (key === 'FORUM' && data.forums[index]) { this.actions.ai.discard(); this.selectedForum = index; this.selectedReply = undefined; print('投稿先を選択しました。'); }
      else if (key === 'REPLY' && (arg === 'NONE' || /^[1-9]\d*$/.test(arg ?? ''))) {
        this.actions.ai.discard(); this.selectedReply = arg === 'NONE' ? undefined : Number(arg); print(`返信先: ${this.selectedReply ?? 'なし'}`);
      } else if (command === 'GENERATE') {
        const forum = data.forums[this.selectedForum], persona = residentProfiles(data)[this.selectedResident];
        const parent = data.posts.find((p) => p.forumId === forum?.id && p.number === this.selectedReply);
        if (!forum || !persona || (this.selectedReply !== undefined && !parent)) print('投稿先・投稿者・返信先を選択し直してください。');
        else void this.actions.ai.generate({ forumId: forum.id, personaId: persona.id, ...(parent ? { replyToPostId: parent.id } : {}) });
      } else if (command === 'PREVIEW') print(...this.actions.ai.preview());
      else if (command === 'DISCARD') this.actions.ai.discard();
      else if (command === 'SEND' && this.actions.ai.hasDraft) { this.confirm({ kind: 'ai-save', expected: context(data) }, ...this.actions.ai.preview(), '投稿案を保存しますか？ (Y/N)='); return true; }
      else print('HELP でモデル・活動の操作を表示します。');
    }
    print('コマンド=');
    return true;
  }
}
