import { calendarSetting } from './calendar';
import { conferenceState, conferenceHelp, renderConference, renderContribution } from './conference';
import { additionalSigs, boardCulture } from './communities';
import { renderOltDirectory } from './olt';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import type { TerminalController } from './controller';
import { emptyContent, forumName, forumPosts, renderPost, replyReference } from './forums';
import type { ForumContent } from './forums';
import type { ForumDestination } from './storage/repository';
import { mainCollections, serviceCollections, mailboxes, renderCollection } from './sections';
import { mailboxRows, renderMailList, mailHelp } from './mail';
import type { CollectionKind, Mailbox } from './sections';
import { categoryItems, serviceCategories, renderServiceDirectory, renderServiceCategory, renderServiceItem } from './service-collections';
import type { ReadingService } from './service-collections';

const { miti, daisizen } = sigEvidence;
const services = daisizen.sections.filter((section) => section.demo_entry);

export type Screen = 'main' | 'communication' | 'miti' | 'miti-forums' | 'miti-materials' |
  'daisizen' | 'daisizen-forums' | 'daisizen-service' | 'forum' | 'disconnected' |
  'index' | 'section' | 'mailbox' | 'community' | 'service-category' | 'service-item';

// MAIN's row grouping follows the circa-1996 reproduction; the 44-cell column
// offset is reconstructed. In this fixture, Japanese/full-width characters and
// stars occupy two cells; ASCII (including normalized label spaces) occupies one.
// Padding never changes the label itself.
function padColumn(text: string, width: number): string {
  const cells = Array.from(text).reduce((sum, character) => sum + (character.charCodeAt(0) <= 0x7e ? 1 : 2), 0);
  return text + ' '.repeat(Math.max(2, width - cells));
}

function entryText(entry: { selector: string; label: string }): string {
  return `${entry.selector.padStart(2)} ${entry.label}`;
}

// Historical display only: fixture selectors and accepted input remain ASCII.
function mainEntryText(entry: { selector: string; label: string }): string {
  const selector = entry.selector.replace(/[0-9A-Z]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 0xfee0));
  return `${selector.padStart(2, '　')}．${entry.label}`;
}

function renderMain(): string[] {
  // Consecutive pairs 1/2 through 21/X, followed by standalone Q.
  const rows: string[] = [];
  for (let index = 0; index < mainMenu.entries.length; index += 2) {
    const entry = mainEntryText(mainMenu.entries[index]!);
    const other = mainMenu.entries[index + 1];
    rows.push(other ? padColumn(entry, 44) + mainEntryText(other) : entry);
  }
  return [
    '　＝＝＝ＰＣ－ＶＡＮ＝＝＝ (MAIN)',
    ...rows,
    `${miti.steps[0]!.input}: ${miti.steps[0]!.destination}へ`,
    'HELP: メニューを表示 / SETTINGS: 設定 / HANDLE: 利用者 / ABOUT: 来歴 / LOG: ログ保存',
    mainMenu.prompt.text,
  ];
}

const returnHelp = 'BACK: 戻る / MAIN: MAIN に戻る / HELP: この画面を再表示';
const indexEntries = mainMenu.entries.filter((entry) => !['2', 'Q'].includes(entry.selector));
const demoPrompt = 'コマンド=';

/** Each instance is one simulated connection; no browser routes or shared state. */
export class PcvanController implements TerminalController {
  readonly welcome = renderMain();
  private currentScreen: Screen = 'main';
  private content = emptyContent();
  private boardNo = 9;
  private community = additionalSigs[0]!;
  private forumKeyword = 'DAISIZEN';
  private memberId: string | undefined;
  private service = services[0]!;
  private serviceCategory = 0;
  private serviceItem = 0;
  private section = mainMenu.entries[0]!;
  private mailbox: Mailbox = 'INBOX';
  private readonly parents: Screen[] = [];

  /** Refreshed by the app from #6's repository before forum commands. */
  setContent(content: ForumContent): void { this.content = content; }
  setMemberId(id: string | undefined): void { this.memberId = id; }

  get forum(): ForumDestination | null {
    const keyword = this.currentScreen === 'miti-materials' ? 'MITI' : this.currentScreen === 'forum' ? this.forumKeyword : null;
    if (!keyword) return null;
    const boardNo = keyword === 'MITI' ? 9 : this.boardNo;
    return { keyword, boardNo, name: forumName(keyword, boardNo) };
  }

  get mailContext(): { box: Mailbox; title: string } | null {
    return (['section', 'daisizen-service', 'mailbox'].includes(this.currentScreen) && this.collectionKind === 'mail')
      ? { box: this.currentScreen === 'mailbox' ? this.mailbox : 'INBOX', title: this.collectionTitle } : null;
  }

  get isConference(): boolean { return this.currentScreen === 'daisizen-service' && this.service.demo_entry!.input === 'CONFERENCE'; }

  get isOlt(): boolean { return this.currentScreen === 'daisizen-service' && this.service.demo_entry!.input === 'OLT'; }

  get needsContent(): boolean {
    return this.isConference || this.isOlt || !!this.mailContext || ['miti-forums', 'miti-materials', 'daisizen-forums', 'forum'].includes(this.currentScreen);
  }

  get screen(): Screen {
    return this.currentScreen;
  }

  submit(line: string): readonly string[] {
    const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
    if (this.currentScreen !== 'main' && this.currentScreen !== 'disconnected') {
      if (command === 'MAIN') {
        this.parents.length = 0;
        this.currentScreen = 'main';
        return this.render();
      }
      if (command === 'BACK') {
        this.currentScreen = this.parents.pop() ?? 'main';
        return this.render();
      }
      if (command === 'HELP') return this.render();
    }
    switch (this.currentScreen) {
      case 'main': {
        if (['HELP', 'MAIN', 'BACK'].includes(command)) return renderMain();
        if (command === miti.steps[0]!.input) return this.enter('miti');
        const entry = mainMenu.entries.find((item) => item.selector === command);
        if (entry?.selector === 'Q') return [entryText(entry), ...this.enter('disconnected')];
        if (entry) return this.openSection(entry);
        return [
          command.startsWith('J ')
            ? '移動先が見つかりません。この画面で対応するジャンプは J MITI です。'
            : 'この画面では使えないコマンドです。1–21 / X / Q / J MITI / HELP を入力してください。',
          mainMenu.prompt.text,
        ];
      }
      case 'index': {
        const entry = indexEntries.find((item) => item.selector === command);
        if (entry) return this.openSection(entry);
        if (command === miti.steps[0]!.input) return this.enter('miti');
        return this.invalidCommand('表示された番号 / X / J MITI / BACK / MAIN / HELP');
      }
      case 'section':
      case 'daisizen-service': {
        if (this.isConference) {
          if (command === 'LIST') return this.render();
          const read = /^READ ([1-9]\d*)$/.exec(command);
          if (read) {
            const state = conferenceState(this.content), row = state.contributions.find((r) => r.number === Number(read[1]));
            return row ? renderContribution(row, state, this.content.members ?? [], calendarSetting(this.content))
              : ['その番号の発言はありません。LIST で一覧を確認してください。', conferenceHelp, demoPrompt];
          }
          return this.invalidCommand('LIST / READ 番号 / WRITE / REPLY 番号 / BACK / MAIN / HELP');
        }
        if (this.readingService) {
          if (command === 'LIST') return this.render();
          const category = Number(command);
          if (/^[1-9]\d*$/.test(command) && serviceCategories(this.readingService)[category - 1]) {
            this.serviceCategory = category;
            return this.enter('service-category');
          }
          return this.invalidCommand(`1–${serviceCategories(this.readingService).length} / LIST / BACK / MAIN / HELP`);
        }
        if (command === 'SIGS' && this.currentScreen === 'section' && ['8', '11'].includes(this.section.selector)) return this.enter('communication');
        if (this.collectionKind === 'mail' && Object.hasOwn(mailboxes, command)) {
          this.mailbox = command as Mailbox;
          return this.enter('mailbox');
        }
        if (command === 'LIST') return this.render();
        return this.invalidCommand(this.collectionKind === 'mail'
          ? 'INBOX / SENT / LIST / BACK / MAIN / HELP' : this.currentScreen === 'section' && ['8', '11'].includes(this.section.selector)
            ? 'SIGS / LIST / BACK / MAIN / HELP' : 'LIST / BACK / MAIN / HELP');
      }
      case 'mailbox':
        if (Object.hasOwn(mailboxes, command)) { this.mailbox = command as Mailbox; return this.render(); }
        if (command === 'LIST') return this.render();
        return this.invalidCommand('LIST / BACK / MAIN / HELP');
      case 'service-category':
      case 'service-item': {
        if (command === 'LIST') {
          if (this.currentScreen === 'service-item') this.currentScreen = this.parents.pop()!;
          return this.render();
        }
        const read = /^READ ([1-9]\d*)$/.exec(command);
        if (read) {
          const index = Number(read[1]) - 1;
          if (categoryItems(this.readingService!, this.serviceCategory)[index]) {
            this.serviceItem = index;
            return this.currentScreen === 'service-item' ? this.render() : this.enter('service-item');
          }
          return ['その番号の項目はありません。LIST で一覧を確認してください。', demoPrompt];
        }
        return this.invalidCommand('READ 番号 / LIST / BACK / MAIN / HELP');
      }
      case 'communication':
        // Bridge selectors are documented in Settings, not historical data.
        if (command === '1') return this.enter('miti');
        if (command === '2') return this.enter('daisizen');
        {
          const sig = additionalSigs.find((s) => s.selector === command);
          if (sig) { this.community = sig; return this.enter('community'); }
        }
        return this.invalidCommand('1–5 / BACK / MAIN / HELP');
      case 'miti':
        if (command === miti.steps[1]!.input) return this.enter('miti-forums');
        return this.invalidCommand(`${miti.steps[1]!.input} / BACK / MAIN / HELP`);
      case 'miti-forums':
        if (command === miti.steps[2]!.input) return this.enter('miti-materials');
        return this.invalidCommand(`${miti.steps[2]!.input} / BACK / MAIN / HELP`);
      case 'miti-materials':
        return this.handleForum(command, 'MITI', 9);
      case 'daisizen': {
        if (command === 'FORUMS') return this.enter('daisizen-forums');
        const service = services.find((section) => section.demo_entry!.input === command);
        if (service) {
          this.service = service;
          this.serviceCategory = 0; this.serviceItem = 0;
          return this.enter('daisizen-service');
        }
        return this.invalidCommand(`FORUMS / ${services.map((section) => section.demo_entry!.input).join(' / ')} / BACK / MAIN / HELP`);
      }
      case 'daisizen-forums': {
        const forum = daisizen.forums.find((item) => String(item.number) === command);
        if (forum) { this.boardNo = forum.number; this.forumKeyword = 'DAISIZEN'; return this.enter('forum'); }
        return this.invalidCommand('1–7 / BACK / MAIN / HELP');
      }
      case 'community': {
        const board = this.community.boards.find((b) => String(b.number) === command);
        if (board) { this.boardNo = board.number; this.forumKeyword = this.community.keyword; return this.enter('forum'); }
        return this.invalidCommand('表示された番号 / BACK / MAIN / HELP');
      }
      case 'forum':
        return this.handleForum(command, this.forumKeyword, this.boardNo);
      case 'disconnected':
        if (command === 'RECONNECT') return this.enter('main');
        return ['接続は終了しています。RECONNECT で再接続してください。'];
    }
  }

  private handleForum(command: string, keyword: string, boardNo: number): readonly string[] {
    if (command === 'LIST') return this.render();
    const read = /^READ ([1-9]\d*)$/.exec(command);
    if (read && Number.isSafeInteger(Number(read[1]))) {
      const data = forumPosts(this.content, keyword, boardNo);
      const post = data.posts.find((item) => item.number === Number(read[1]));
      const parent = post && replyReference(post, data.posts);
      return post ? [
        ...renderPost(post, forumName(keyword, boardNo), undefined, this.content.members, calendarSetting(this.content)),
        ...(parent ? [`返信先：#${parent.number}`] : []),
        this.forumHelp, returnHelp,
        demoPrompt,
      ] : ['その番号の投稿はありません。画面は変わりません。', this.forumHelp, returnHelp, demoPrompt];
    }
    return this.invalidCommand('LIST / READ 番号 / WRITE / REPLY 番号 / BACK / MAIN / HELP');
  }

  private readonly forumHelp = 'LIST: 投稿一覧 / READ 番号: 本文 / WRITE: 新規投稿 / REPLY 番号: 返信 / BACK: フォーラム一覧';

  private renderForum(keyword: string, boardNo: number): string[] {
    const data = forumPosts(this.content, keyword, boardNo);
    return [
      `${additionalSigs.find((s) => s.keyword === keyword)?.name ?? keyword} / ${forumName(keyword, boardNo)} / 投稿一覧（番号順）`,
      ...(boardCulture(keyword, boardNo) ? [boardCulture(keyword, boardNo)!] : []),
      ...(!data.available ? ['対応するローカルフォーラムが見つからないか、重複しています。']
        : data.posts.length ? data.posts.map((post) => {
          const parent = replyReference(post, data.posts);
          const reference = parent && post.title !== `RE#${parent.number}` && !post.title.startsWith(`RE#${parent.number} `)
            ? ` RE#${parent.number}` : '';
          const lastRead = this.content.readStates?.find((state) => state.memberId === this.memberId && state.forumId === post.forumId)?.lastReadNumber ?? 0;
          return `#${post.number} ${post.title}${reference}${data.source === 'local' && this.memberId ? ` [${post.number <= lastRead ? '既読' : '未読'}]` : ''}`;
        }) : ['投稿はありません。']),
      this.forumHelp,
    ];
  }

  private invalidCommand(allowed: string): readonly string[] {
    return [`この画面では使えないコマンドです。${allowed} を入力してください。`, demoPrompt];
  }

  private openSection(entry: typeof mainMenu.entries[number]): readonly string[] {
    this.section = entry;
    return [entryText(entry), ...this.enter(entry.selector === '13' ? 'communication'
      : entry.selector === '2' ? 'index' : 'section')];
  }

  private get collectionKind(): CollectionKind {
    return this.currentScreen === 'daisizen-service' ||
      (this.currentScreen === 'mailbox' && this.parents.at(-1) === 'daisizen-service')
      ? serviceCollections[this.service.demo_entry!.input]!
      : mainCollections[this.section.selector]!;
  }

  private get readingService(): ReadingService | null {
    const input = this.service.demo_entry!.input;
    return ['daisizen-service', 'service-category', 'service-item'].includes(this.currentScreen) &&
      (input === 'LIBRARY' || input === 'OSL') ? input : null;
  }

  private get collectionTitle(): string {
    return this.currentScreen === 'daisizen-service' ||
      (this.currentScreen === 'mailbox' && this.parents.at(-1) === 'daisizen-service')
      ? `${daisizen.name} / ${this.service.label}` : this.section.label;
  }

  private enter(screen: Screen): readonly string[] {
    if (screen === 'main' || screen === 'disconnected') this.parents.length = 0;
    else this.parents.push(this.currentScreen);
    this.currentScreen = screen;
    return this.render();
  }

  private render(): readonly string[] {
    switch (this.currentScreen) {
      case 'main': return renderMain();
      case 'disconnected': return [
        '接続を終了しました。',
        'RECONNECT で MAIN から再接続できます。',
      ];
      case 'index': return [
        '索引', ...indexEntries.map(entryText),
        `${miti.steps[0]!.input}: ${miti.steps[0]!.destination}へ`,
        returnHelp, demoPrompt,
      ];
      case 'section':
      case 'daisizen-service': if (this.isConference) return renderConference(this.content);
        if (this.isOlt) return renderOltDirectory({ settings: this.content.settings ?? [] });
        if (this.readingService) return [this.collectionTitle, ...renderServiceDirectory(this.readingService), returnHelp, demoPrompt];
        return [
        ...(this.collectionKind === 'mail' ? [this.collectionTitle,
          `受信箱：${mailboxRows(this.content.mail ?? [], this.memberId, 'INBOX').length}件 / 送信済み：${mailboxRows(this.content.mail ?? [], this.memberId, 'SENT').length}件`,
          ...((this.content.mail ?? []).length ? [] : ['現在、メールはありません。']), mailHelp]
          : renderCollection(this.collectionTitle, this.collectionKind)),
        ...(this.currentScreen === 'section' && ['8', '11'].includes(this.section.selector) ? ['SIGS: SIG 一覧'] : []),
        'LIST: 一覧を再表示', returnHelp, demoPrompt,
      ];
      case 'service-category':
      case 'service-item': return [
        `${daisizen.name} / ${this.service.label}`,
        ...(this.currentScreen === 'service-category'
          ? renderServiceCategory(this.readingService!, this.serviceCategory)
          : renderServiceItem(this.readingService!, this.serviceCategory, this.serviceItem)),
        returnHelp, demoPrompt,
      ];
      case 'mailbox': return [
        `${this.collectionTitle} / ${mailboxes[this.mailbox]}`,
        ...renderMailList(this.content.mail ?? [], this.content.members ?? [], this.memberId, this.mailbox, calendarSetting(this.content)),
        'LIST: 一覧を再表示', returnHelp, demoPrompt,
      ];
      case 'communication': return [
        'コミュニケーション',
        `1 ${miti.name}（MITI）へ`,
        `2 ${daisizen.name}へ`,
        ...additionalSigs.map((s) => `${s.selector} ${s.name}へ`),
        returnHelp,
        demoPrompt,
      ];
      case 'daisizen': return [
        daisizen.name,
        ...daisizen.sections.map((section) => section.label),
        'FORUMS: フォーラム一覧 / BACK: コミュニケーション',
        ...services.map((section) => `${section.demo_entry!.input}: ${section.label}`),
        returnHelp, demoPrompt,
      ];
      case 'daisizen-forums': return [
        `${daisizen.name} / フォーラム（電子掲示板）`,
        ...daisizen.forums.map((forum) => `${forum.number} ${forum.label}`),
        'BACK: SIG に戻る',
        returnHelp, demoPrompt,
      ];
      case 'community': return [this.community.name,
        ...this.community.boards.map((b) => `${b.number} ${b.label}`), returnHelp, demoPrompt];
      case 'forum': return [...this.renderForum(this.forumKeyword, this.boardNo), returnHelp, demoPrompt];
      default: {
        const step = this.currentScreen === 'miti' ? 0 : this.currentScreen === 'miti-forums' ? 1 : 2;
        const evidence = miti.steps[step]!;
        const next = miti.steps[step + 1];
        return [
          `MITI / ${evidence.destination}`,
          ...(next ? [`${next.input} ${next.destination}`] : this.renderForum('MITI', 9)),
          returnHelp,
          demoPrompt,
        ];
      }
    }
  }
}
