import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import type { TerminalController } from './controller';
import { emptyContent, forumName, forumPosts, renderPost, replyReference } from './forums';
import type { ForumContent } from './forums';
import type { ForumDestination } from './storage/repository';

const { miti, daisizen } = sigEvidence;
const services = daisizen.sections.filter((section) => section.demo_entry);

export type Screen = 'main' | 'communication' | 'miti' | 'miti-forums' | 'miti-materials' |
  'daisizen' | 'daisizen-forums' | 'daisizen-service' | 'forum' | 'disconnected';

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
    'HELP: メニューを表示',
    mainMenu.prompt.text,
  ];
}

const returnHelp = 'MAIN: MAIN に戻る / HELP: この画面を再表示';
const demoPrompt = 'コマンド=';

/** Each instance is one simulated connection; no browser routes or shared state. */
export class PcvanController implements TerminalController {
  readonly welcome = renderMain();
  private currentScreen: Screen = 'main';
  private content = emptyContent();
  private boardNo = 9;
  private memberId: string | undefined;
  private service = services[0]!;

  /** Refreshed by the app from #6's repository before forum commands. */
  setContent(content: ForumContent): void { this.content = content; }
  setMemberId(id: string | undefined): void { this.memberId = id; }

  get forum(): ForumDestination | null {
    const keyword = this.currentScreen === 'miti-materials' ? 'MITI' : this.currentScreen === 'forum' ? 'DAISIZEN' : null;
    if (!keyword) return null;
    const boardNo = keyword === 'MITI' ? 9 : this.boardNo;
    return { keyword, boardNo, name: forumName(keyword, boardNo) };
  }

  get needsContent(): boolean {
    return ['miti-forums', 'miti-materials', 'daisizen-forums', 'forum'].includes(this.currentScreen);
  }

  get screen(): Screen {
    return this.currentScreen;
  }

  submit(line: string): readonly string[] {
    const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
    switch (this.currentScreen) {
      case 'main': {
        if (command === 'HELP') return renderMain();
        if (command === miti.steps[0]!.input) return this.enter('miti');
        const entry = mainMenu.entries.find((item) => item.selector === command);
        if (entry?.selector === 'Q') return [entryText(entry), ...this.enter('disconnected')];
        if (entry?.selector === '13') return [entryText(entry), ...this.enter('communication')];
        if (entry) return [`${entryText(entry)}：未実装です。MAIN に留まります。`, mainMenu.prompt.text];
        return [
          command.startsWith('J ')
            ? '移動先が見つかりません。この画面で対応するジャンプは J MITI です。'
            : 'この画面では使えないコマンドです。1–21 / X / Q / J MITI / HELP を入力してください。',
          mainMenu.prompt.text,
        ];
      }
      case 'communication':
        // Bridge selectors are documented in Settings, not historical data.
        if (command === '1') return this.enter('miti');
        if (command === '2') return this.enter('daisizen');
        return this.handleMenu(command, '1 / 2 / MAIN / HELP');
      case 'miti':
        if (command === miti.steps[1]!.input) return this.enter('miti-forums');
        return this.handleMenu(command, `${miti.steps[1]!.input} / MAIN / HELP`);
      case 'miti-forums':
        if (command === miti.steps[2]!.input) return this.enter('miti-materials');
        return this.handleMenu(command, `${miti.steps[2]!.input} / MAIN / HELP`);
      case 'miti-materials':
        return this.handleForum(command, 'MITI', 9);
      case 'daisizen': {
        if (command === 'FORUMS') return this.enter('daisizen-forums');
        const service = services.find((section) => section.demo_entry!.input === command);
        if (service) { this.service = service; return this.enter('daisizen-service'); }
        if (command === 'BACK') return this.enter('communication');
        return this.handleMenu(command, `FORUMS / ${services.map((section) => section.demo_entry!.input).join(' / ')} / BACK / MAIN / HELP`);
      }
      case 'daisizen-service':
        if (command === 'BACK') return this.enter('daisizen');
        return this.handleMenu(command, 'BACK / MAIN / HELP');
      case 'daisizen-forums': {
        const forum = daisizen.forums.find((item) => String(item.number) === command);
        if (forum) { this.boardNo = forum.number; return this.enter('forum'); }
        if (command === 'BACK') return this.enter('daisizen');
        return this.handleMenu(command, '1–7 / BACK / MAIN / HELP');
      }
      case 'forum':
        return this.handleForum(command, 'DAISIZEN', this.boardNo);
      case 'disconnected':
        if (command === 'RECONNECT') return this.enter('main');
        return ['接続は終了しています。RECONNECT で再接続してください。'];
    }
  }

  private handleForum(command: string, keyword: 'MITI' | 'DAISIZEN', boardNo: number): readonly string[] {
    if (command === 'BACK') return this.enter(keyword === 'MITI' ? 'miti-forums' : 'daisizen-forums');
    if (command === 'LIST') return this.render();
    const read = /^READ ([1-9]\d*)$/.exec(command);
    if (read && Number.isSafeInteger(Number(read[1]))) {
      const data = forumPosts(this.content, keyword, boardNo);
      const post = data.posts.find((item) => item.number === Number(read[1]));
      const parent = post && replyReference(post, data.posts);
      return post ? [
        ...renderPost(post, forumName(keyword, boardNo)),
        ...(parent ? [`返信先 RE#${parent.number} → READ ${parent.number}`] : []),
        this.forumHelp,
        demoPrompt,
      ] : ['その番号の投稿はありません。画面は変わりません。', this.forumHelp, demoPrompt];
    }
    return this.handleMenu(command, 'LIST / READ 番号 / WRITE / REPLY 番号 / BACK / MAIN / HELP');
  }

  private readonly forumHelp = 'LIST: 投稿一覧 / READ 番号: 本文 / WRITE: 新規投稿 / REPLY 番号: 返信 / BACK: フォーラム一覧';

  private renderForum(keyword: 'MITI' | 'DAISIZEN', boardNo: number): string[] {
    const data = forumPosts(this.content, keyword, boardNo);
    return [
      `${keyword} / ${forumName(keyword, boardNo)} / 投稿一覧（番号順）`,
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

  private handleMenu(command: string, allowed: string): readonly string[] {
    if (command === 'MAIN') return this.enter('main');
    if (command === 'HELP') return this.render();
    return [`この画面では使えないコマンドです。${allowed} を入力してください。`, demoPrompt];
  }

  private enter(screen: Screen): readonly string[] {
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
      case 'communication': return [
        'コミュニケーション',
        `1 ${miti.name}（MITI）へ`,
        `2 ${daisizen.name}へ`,
        returnHelp,
        demoPrompt,
      ];
      case 'daisizen': return [
        daisizen.name,
        ...daisizen.sections.map((section) => section.label),
        'FORUMS: フォーラム一覧 / BACK: コミュニケーション',
        ...services.map((section) => `${section.demo_entry!.input}: ${section.label}（利用不可）`),
        returnHelp, demoPrompt,
      ];
      case 'daisizen-service': return [
        `${daisizen.name} / ${this.service.label}`,
        'サービスの操作・送受信・ファイル転送は利用できません。',
        'BACK: SIG に戻る',
        returnHelp, demoPrompt,
      ];
      case 'daisizen-forums': return [
        `${daisizen.name} / フォーラム（電子掲示板）`,
        ...daisizen.forums.map((forum) => `${forum.number} ${forum.label}`),
        'BACK: SIG に戻る',
        returnHelp, demoPrompt,
      ];
      case 'forum': return [...this.renderForum('DAISIZEN', this.boardNo), returnHelp, demoPrompt];
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
