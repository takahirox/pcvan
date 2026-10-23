import { additionalSigs, boardCulture } from './communities';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import type { TerminalController } from './controller';
import { emptyContent, forumName, forumPosts, renderPost, replyReference } from './forums';
import type { ForumContent } from './forums';
import type { ForumDestination } from './storage/repository';
import { mainCollections, serviceCollections, mailboxes, renderCollection } from './sections';
import { mailboxRows, renderMailList, mailHelp } from './mail';
import type { CollectionKind, Mailbox } from './sections';

const { miti, daisizen } = sigEvidence;
const services = daisizen.sections.filter((section) => section.demo_entry);

export type Screen = 'main' | 'communication' | 'miti' | 'miti-forums' | 'miti-materials' |
  'daisizen' | 'daisizen-forums' | 'daisizen-service' | 'forum' | 'disconnected' |
  'index' | 'section' | 'mailbox' | 'community';

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
    'MAIN',
    ...rows,
    ...mainMenu.entries.filter((entry) => !/^\d+$/.test(entry.selector)).map(entryText),
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

  get needsContent(): boolean {
    return !!this.mailContext || ['miti-forums', 'miti-materials', 'daisizen-forums', 'forum'].includes(this.currentScreen);
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
        if (service) { this.service = service; return this.enter('daisizen-service'); }
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
        ...renderPost(post, forumName(keyword, boardNo), undefined, this.content.members),
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
      case 'daisizen-service': return [
        ...(this.collectionKind === 'mail' ? [this.collectionTitle,
          `受信箱：${mailboxRows(this.content.mail ?? [], this.memberId, 'INBOX').length}件 / 送信済み：${mailboxRows(this.content.mail ?? [], this.memberId, 'SENT').length}件`,
          ...((this.content.mail ?? []).length ? [] : ['現在、メールはありません。']), mailHelp]
          : renderCollection(this.collectionTitle, this.collectionKind)),
        ...(this.currentScreen === 'section' && ['8', '11'].includes(this.section.selector) ? ['SIGS: SIG 一覧'] : []),
        'LIST: 一覧を再表示', returnHelp, demoPrompt,
      ];
      case 'mailbox': return [
        `${this.collectionTitle} / ${mailboxes[this.mailbox]}`,
        ...renderMailList(this.content.mail ?? [], this.content.members ?? [], this.memberId, this.mailbox),
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
