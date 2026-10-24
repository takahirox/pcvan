import { bulletin } from './bulletin';
import { wakaba } from './wakaba';
import { EcomVisit } from './ecom';
import { GopherVisit } from './gopher';
import { ArchieVisit } from './archie';
import { ftpFiles, renderFtp } from './ftp';
import { remoteLetters, renderTelnet, telnetControls, telnetHost, telnetPrompt } from './telnet';
import type { TelnetScreen } from './telnet';
import { calendarSetting } from './calendar';
import { conferenceState, conferenceHelp, renderConference, renderContribution } from './conference';
import { additionalSigs, boardCulture } from './communities';
import type { OltContext } from './olt-state';
import { renderOltDirectory } from './olt';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import type { TerminalController } from './controller';
import { emptyContent, forumName, forumPosts, renderPost, replyReference, unreadPosts } from './forums';
import type { ForumContent } from './forums';
import type { ForumDestination } from './storage/repository';
import { mainCollections, serviceCollections, mailboxes, renderCollection } from './sections';
import { mailboxRows, renderMailList, mailHelp } from './mail';
import type { CollectionKind, Mailbox } from './sections';
import { categoryItems, serviceCategories, renderServiceDirectory, renderServiceCategory, renderServiceItem } from './service-collections';
import type { ServiceDownload, ReadingService } from './service-collections';
import { eicReadings, renderEnvironmentalGateway, renderEicList, renderEicItem } from './eic';
import { bizArticles, bizSetLimit, bizHelp, bizKeywordHelp, renderDatabaseDirectory, renderBizSearch, renderBizTitles, renderBizArticle } from './biz';
import type { BizSet } from './biz';
import { publicationInstallments, renderPublicationDirectory, renderPublicationContents, renderPublicationInstallment } from './publications';
import { newsBriefs, renderNewsDirectory, renderNewsHeadlines, renderNewsBrief } from './news';
import { netNewsGroup, netNewsGroups, netNewsHelp, netNewsSearchHelp, netNewsResults, renderInternetDirectory, renderNetNewsDirectory, renderNetNewsList, renderNetNewsArticle } from './netnews';
import type { NetNewsSearch } from './netnews';

const { miti, daisizen } = sigEvidence;
const services = daisizen.sections.filter((section) => section.demo_entry);

export type Screen = TelnetScreen | 'archie' | 'gopher' | 'main' | 'communication' | 'miti' | 'miti-forums' | 'miti-materials' |
  'daisizen' | 'daisizen-forums' | 'daisizen-service' | 'forum' | 'disconnected' |
  'wakaba' | 'wakaba-olt' | 'ecom' | 'index' | 'section' | 'mailbox' | 'community' | 'service-category' | 'service-item' |
  'environmental-gateway' | 'eic-list' | 'eic-item' |
  'publication-directory' | 'publication-contents' | 'publication-installment' |
  'news-directory' | 'news-headlines' | 'news-brief' |
  'ftp-list' | 'ftp-preview' | 'internet-directory' | 'netnews-directory' | 'netnews-list' | 'netnews-article' |
  'database-directory' | 'biz-search' | 'biz-titles' | 'biz-article';

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
    'J ECOM: 電子郵便（紙の郵便を模擬体験）',
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
  private readonly ecom = new EcomVisit();
  private readonly gopher = new GopherVisit();
  private readonly archie = new ArchieVisit();
  get isArchie() { return this.currentScreen === 'archie'; }
  get isGopher() { return this.currentScreen === 'gopher'; }
  get isEcom() { return this.currentScreen === 'ecom'; }
  get ecomDrafting() { return this.isEcom && this.ecom.drafting; }
  invalidateEcom() { this.ecom.invalidate(); }
  private content = emptyContent();
  private boardNo = 9;
  private community = additionalSigs[0]!;
  private forumKeyword = 'DAISIZEN';
  private memberId: string | undefined;
  private service = services[0]!;
  private serviceCategory = 0;
  private serviceItem = 0;
  private eicItem = 0;
  private newsItem = 0;
  private publicationItem = 0;
  private netNewsGroup = 0;
  private netNewsItem = 0;
  private telnetItem = 0;
  private ftpItem = 0;
  private netNewsSearch: NetNewsSearch | undefined;
  private readonly bizSets: BizSet[] = [];
  private bizZeroKeyword: string | undefined;
  private bizSetNumber = 0;
  private bizItem = 0;
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

  get isTelnet(): boolean { return this.currentScreen.startsWith('telnet-'); }

  get netNewsContext() {
    if (!['netnews-list', 'netnews-article'].includes(this.currentScreen)) return null;
    const group = netNewsGroup(this.content, this.netNewsGroup);
    return { group: group.name, articles: netNewsResults(group, this.netNewsSearch) };
  }

  /** Selection and its exact parent stack belong to navigation, not confirmation. */
  selectDownload(number: number): ServiceDownload | null {
    if (!Number.isSafeInteger(number) || number < 1) return null;
    const items = ['ftp-list', 'ftp-preview'].includes(this.currentScreen) ? ftpFiles
      : this.readingService === 'OSL' && ['service-category', 'service-item'].includes(this.currentScreen)
        ? categoryItems('OSL', this.serviceCategory) : [];
    const item = items[number - 1];
    if (!item?.filename) return null;
    const screen = this.currentScreen, service = this.service, category = this.serviceCategory,
      selected = this.serviceItem, ftpItem = this.ftpItem, parents = [...this.parents];
    return { filename: item.filename, body: item.body, returnTo: () => {
      this.ftpItem = ftpItem; this.currentScreen = screen; this.service = service; this.serviceCategory = category; this.serviceItem = selected;
      this.parents.splice(0, this.parents.length, ...parents);
      return this.render();
    } };
  }

  get isConference(): boolean { return this.currentScreen === 'daisizen-service' && this.service.demo_entry!.input === 'CONFERENCE'; }

  get oltContext(): OltContext | null {
    if (this.currentScreen === 'wakaba-olt') return 'wakaba';
    return this.currentScreen === 'daisizen-service' && this.service.demo_entry!.input === 'OLT' ? 'daisizen' : null;
  }
  get isOlt(): boolean { return this.oltContext !== null; }

  get needsContent(): boolean {
    return this.isConference || this.isOlt || !!this.mailContext ||
      ['communication', 'wakaba', 'netnews-directory', 'netnews-list', 'netnews-article', 'miti-forums', 'miti-materials', 'daisizen-forums', 'forum'].includes(this.currentScreen);
  }

  get screen(): Screen {
    return this.currentScreen;
  }

  submit(line: string): readonly string[] {
    const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
    if (this.currentScreen === 'ecom') {
      const result = this.ecom.submit(line);
      if (typeof result !== 'string') return result;
      this.ecom.invalidate();
      if (result === 'back') { this.currentScreen = this.parents.pop() ?? 'main'; return this.render(); }
      return this.enter(result === 'main' ? 'main' : 'disconnected');
    }
    if (this.currentScreen !== 'main' && this.currentScreen !== 'disconnected') {
      if (command === 'MAIN') {
        this.ftpItem = 0;
        this.telnetItem = 0;
        this.clearBiz();
        this.clearNetNews();
        this.gopher.reset();
        this.archie.reset();
        this.parents.length = 0;
        this.currentScreen = 'main';
        return this.render();
      }
      if (command === 'BACK') {
        if (this.isGopher || this.isArchie) {
          const result = (this.isArchie ? this.archie : this.gopher).submit(line);
          if (result) return result;
          this.currentScreen = this.parents.pop() ?? 'main';
          return this.render();
        }
        // BiZ, FTP, NetNews and TELNET replace reading views without pushing
        // duplicate parents. BACK restores the corresponding active list.
        if (this.currentScreen === 'ftp-preview') { this.ftpItem = 0; this.currentScreen = 'ftp-list'; }
        else if (this.currentScreen === 'telnet-letter') { this.telnetItem = 0; this.currentScreen = 'telnet-mailbox'; }
        else if (this.currentScreen === 'netnews-article') this.currentScreen = 'netnews-list';
        else if (this.currentScreen === 'biz-article') this.currentScreen = 'biz-titles';
        else if (this.currentScreen === 'biz-titles') this.currentScreen = 'biz-search';
        else {
          if (this.currentScreen === 'biz-search') this.clearBiz();
          if (this.currentScreen === 'netnews-list') this.clearNetNews();
          this.currentScreen = this.parents.pop() ?? 'main';
        }
        return this.render();
      }
      if (command === 'HELP') return this.render();
    }
    switch (this.currentScreen) {
      case 'main': {
        if (['HELP', 'MAIN', 'BACK'].includes(command)) return renderMain();
        if (command === 'J ECOM') { this.ecom.invalidate(); return this.enter('ecom'); }
        if (command === miti.steps[0]!.input) return this.enter('miti');
        const entry = mainMenu.entries.find((item) => item.selector === command);
        if (entry?.selector === 'Q') return [entryText(entry), ...this.enter('disconnected')];
        if (entry) return this.openSection(entry);
        return [
          command.startsWith('J ')
            ? '移動先が見つかりません。この画面で対応するジャンプは J MITI / J ECOM です。'
            : 'この画面では使えないコマンドです。1–21 / X / Q / J MITI / J ECOM / HELP を入力してください。',
          mainMenu.prompt.text,
        ];
      }
      case 'index': {
        const entry = indexEntries.find((item) => item.selector === command);
        if (entry) return this.openSection(entry);
        if (command === 'J ECOM') { this.ecom.invalidate(); return this.enter('ecom'); }
        if (command === miti.steps[0]!.input) return this.enter('miti');
        return this.invalidCommand('表示された番号 / X / J MITI / J ECOM / BACK / MAIN / HELP');
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
      case 'internet-directory':
        if (command === 'LIST') return this.render();
        if (command === '1') return this.enter('netnews-directory');
        if (command === '2') { this.telnetItem = 0; return this.enter('telnet-directory'); }
        if (command === '3') { this.ftpItem = 0; return this.enter('ftp-list'); }
        if (command === '4') { this.gopher.reset(); return this.enter('gopher'); }
        if (command === '5') { this.archie.reset(); return this.enter('archie'); }
        return this.invalidCommand('1: NetNews / 2: TELNET / 3: FTP / 4: Gopher / 5: Archie / LIST / BACK / MAIN / HELP');
      case 'archie': return this.archie.submit(line)!;
      case 'gopher': return this.gopher.submit(line)!;
      case 'ftp-list':
      case 'ftp-preview': {
        if (command === 'LIST') { this.ftpItem = 0; this.currentScreen = 'ftp-list'; return this.render(); }
        const read = /^READ ([1-9]\d*)$/.exec(command);
        const number = read ? Number(read[1]) : 0;
        if (Number.isSafeInteger(number) && ftpFiles[number - 1]) {
          this.ftpItem = number - 1; this.currentScreen = 'ftp-preview'; return this.render();
        }
        return this.invalidCommand('READ 番号 / DOWNLOAD 番号 / LIST / BACK / MAIN / HELP');
      }
      case 'telnet-directory':
      case 'telnet-shell':
      case 'telnet-mailbox':
      case 'telnet-letter': return this.handleTelnet(this.currentScreen, command);
      case 'netnews-directory':
        if (command === 'LIST') return this.render();
        if (command === '1' || command === '2') {
          this.clearNetNews();
          this.netNewsGroup = Number(command) - 1;
          return this.enter('netnews-list');
        }
        return this.invalidCommand('1: fj.questions.fj / 2: fj.news.usage / LIST / BACK / MAIN / HELP');
      case 'netnews-list':
      case 'netnews-article': return this.handleNetNews(line, command);
      case 'publication-directory':
        if (command === 'LIST') return this.render();
        if (command === '1') return this.enter('publication-contents');
        return this.invalidCommand('1: 目次 / LIST / BACK / MAIN / HELP');
      case 'publication-contents':
      case 'publication-installment': {
        if (command === 'LIST') {
          if (this.currentScreen === 'publication-installment') this.currentScreen = this.parents.pop()!;
          return this.render();
        }
        const read = /^READ ([1-9]\d*)$/.exec(command);
        if (read) {
          const number = Number(read[1]);
          if (Number.isSafeInteger(number) && publicationInstallments[number - 1]) {
            this.publicationItem = number - 1;
            return this.currentScreen === 'publication-installment' ? this.render() : this.enter('publication-installment');
          }
          return ['その番号の連載はありません。LIST で目次を確認してください。', demoPrompt];
        }
        return this.invalidCommand('READ 1 / READ 2 / LIST / BACK / MAIN / HELP');
      }
      case 'news-directory':
        if (command === 'LIST') return this.render();
        if (command === '1') return this.enter('news-headlines');
        return this.invalidCommand('1: 時事通信ニュース / LIST / BACK / MAIN / HELP');
      case 'news-headlines':
      case 'news-brief': {
        if (command === 'LIST') {
          if (this.currentScreen === 'news-brief') this.currentScreen = this.parents.pop()!;
          return this.render();
        }
        const read = /^READ ([1-9]\d*)$/.exec(command);
        if (read) {
          const number = Number(read[1]);
          if (Number.isSafeInteger(number) && newsBriefs[number - 1]) {
            this.newsItem = number - 1;
            return this.currentScreen === 'news-brief' ? this.render() : this.enter('news-brief');
          }
          return ['その番号のニュースはありません。LIST で見出し一覧を確認してください。', demoPrompt];
        }
        return this.invalidCommand('READ 番号 / LIST / BACK / MAIN / HELP');
      }
      case 'database-directory':
        if (command === 'LIST') return this.render();
        if (command === '1') { this.clearBiz(); return this.enter('biz-search'); }
        return this.invalidCommand('1: 日経テレコン BiZ / LIST / BACK / MAIN / HELP');
      case 'biz-search':
      case 'biz-titles':
      case 'biz-article': return this.handleBiz(line);
      case 'environmental-gateway':
        if (command === 'LIST') return this.render();
        if (command === '1') return this.enter('eic-list');
        return this.invalidCommand('1: EICネット / LIST / BACK / MAIN / HELP');
      case 'eic-list':
      case 'eic-item': {
        if (command === 'LIST') {
          if (this.currentScreen === 'eic-item') this.currentScreen = this.parents.pop()!;
          return this.render();
        }
        const read = /^READ ([1-9]\d*)$/.exec(command);
        if (read) {
          const index = Number(read[1]) - 1;
          if (eicReadings[index]) {
            this.eicItem = index;
            return this.currentScreen === 'eic-item' ? this.render() : this.enter('eic-item');
          }
          return ['その番号の記事はありません。LIST で記事一覧を確認してください。', demoPrompt];
        }
        return this.invalidCommand('READ 番号 / LIST / BACK / MAIN / HELP');
      }
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
        return this.invalidCommand(`${this.readingService === 'OSL' ? 'DOWNLOAD 番号 / ' : ''}READ 番号 / LIST / BACK / MAIN / HELP`);
      }
      case 'communication':
        // Bridge selectors are documented in Settings, not historical data.
        if (command === '1') return this.enter('miti');
        if (command === '2') return this.enter('daisizen');
        if (command === '6') { this.boardNo = bulletin.boardNo; this.forumKeyword = bulletin.keyword; return this.enter('forum'); }
        {
          const sig = additionalSigs.find((s) => s.selector === command);
          if (sig) { this.community = sig; return this.enter('community'); }
        }
        return this.invalidCommand('1–6 / BACK / MAIN / HELP');
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
      case 'wakaba':
        if (command === 'LIST') return this.render();
        if (command === '1') { this.boardNo = wakaba.boardNo; this.forumKeyword = wakaba.keyword; return this.enter('forum'); }
        if (command === '2') return this.enter('wakaba-olt');
        return this.invalidCommand('1 / 2 OLT / LIST / BACK / MAIN / HELP');
      case 'wakaba-olt':
        if (command === 'LIST') return this.render();
        return this.invalidCommand('JOIN 1 / WHO 1 / LIST / BACK / MAIN / HELP');
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

  private handleTelnet(screen: TelnetScreen, command: string): readonly string[] {
    if (screen === 'telnet-directory') {
      if (command === 'LIST') return this.render();
      if (command === `OPEN ${telnetHost.toUpperCase()}`) return this.enter('telnet-shell');
    } else {
      if (command === 'LOGOUT') {
        this.telnetItem = 0;
        while (this.parents.length && this.parents.at(-1) !== 'telnet-directory') this.parents.pop();
        this.currentScreen = this.parents.pop()!;
        return ['リモートデモを終了しました。PC-VANの接続は継続しています。', ...this.render()];
      }
      if (screen === 'telnet-shell') {
        if (command === 'MAIL') return this.enter('telnet-mailbox');
      } else {
        if (command === 'LIST') {
          this.telnetItem = 0; this.currentScreen = 'telnet-mailbox'; return this.render();
        }
        const read = /^READ ([1-9]\d*)$/.exec(command);
        const number = read ? Number(read[1]) : 0;
        if (Number.isSafeInteger(number) && remoteLetters.some((letter) => letter.number === number)) {
          this.telnetItem = number; this.currentScreen = 'telnet-letter'; return this.render();
        }
      }
    }
    return ['このTELNETデモ画面では使えないコマンド・接続先・番号です。', telnetControls(screen), telnetPrompt(screen)];
  }

  private clearBiz(): void {
    this.bizSets.length = 0; this.bizZeroKeyword = undefined;
    this.bizSetNumber = 0; this.bizItem = 0;
  }

  private clearNetNews(): void {
    this.netNewsGroup = 0; this.netNewsItem = 0; this.netNewsSearch = undefined;
  }

  private handleNetNews(line: string, command: string): readonly string[] {
    if (command === 'LIST') {
      this.netNewsSearch = undefined; this.netNewsItem = 0;
      this.currentScreen = 'netnews-list';
      return this.render();
    }
    const input = line.trim();
    if (/^SEARCH(?:\s|$)/i.test(input)) {
      // Parse the original line: normal command folding would destroy query
      // spelling and internal whitespace. Every search uses the whole group.
      const search = /^SEARCH\s+(SUBJECT|FROM)\s+([\s\S]+)$/i.exec(input);
      const query = search?.[2]?.trim();
      if (!search || !query) return [netNewsHelp, netNewsSearchHelp, demoPrompt];
      this.netNewsSearch = { field: search[1]!.toUpperCase() === 'SUBJECT' ? 'Subject' : 'From', query };
      this.netNewsItem = 0; this.currentScreen = 'netnews-list';
      return this.render();
    }
    const read = /^READ ([1-9]\d*)$/.exec(command);
    if (read) {
      const number = Number(read[1]);
      const article = Number.isSafeInteger(number) && netNewsResults(netNewsGroup(this.content, this.netNewsGroup), this.netNewsSearch)
        .find((item) => item.number === number);
      if (!article) return ['その番号の記事は現在の一覧にありません。HELP で確認するか LIST で全記事を表示してください。', demoPrompt];
      this.netNewsItem = number;
      // Details replace one another; their active list remains the sole parent.
      this.currentScreen = 'netnews-article';
      return this.render();
    }
    return this.invalidCommand(`${netNewsHelp} / BACK / MAIN / HELP`);
  }

  private handleBiz(line: string): readonly string[] {
    const input = line.trim();
    if (/^FIND(?:\s|$)/i.test(input)) {
      const find = /^FIND\s+(\S+)$/i.exec(input);
      const keyword = find?.[1];
      if (!keyword || /^(?:AND|OR|NOT)$/i.test(keyword) || /[()&|=+*?"/]/.test(keyword)) {
        return [bizKeywordHelp, bizHelp, demoPrompt];
      }
      const folded = keyword.toLowerCase();
      const articles = bizArticles.filter((article) =>
        `${article.title}\n${article.body}`.toLowerCase().includes(folded));
      if (articles.length && this.bizSets.length >= bizSetLimit) {
        return ['検索集合は20件までです。既存の集合は残っています。BACK で検索→一覧へ戻り、1 で入り直してください。', demoPrompt];
      }
      if (articles.length) this.bizSets.push({ keyword, articles });
      this.bizZeroKeyword = articles.length ? undefined : keyword;
      this.currentScreen = 'biz-search';
      return this.render();
    }
    const show = /^SHOW P(1|3) \/([1-9]\d*)(?: ([1-9]\d*))?$/i.exec(input.replace(/\s+/g, ' '));
    if (show && (show[1] === '1' ? show[3] === undefined : show[3] !== undefined)) {
      const number = Number(show[2]), item = Number(show[3]);
      const set = Number.isSafeInteger(number) ? this.bizSets[number - 1] : undefined;
      if (!set) return ['その検索集合はありません。HELP で現在の画面を確認してください。', bizHelp, demoPrompt];
      if (show[1] === '3' && (!Number.isSafeInteger(item) || !set.articles[item - 1])) {
        return ['その番号の記事はありません。SHOW P1 /番号 で見出しを確認してください。', bizHelp, demoPrompt];
      }
      this.bizSetNumber = number;
      this.bizItem = show[1] === '3' ? item : 0;
      this.currentScreen = show[1] === '1' ? 'biz-titles' : 'biz-article';
      return this.render();
    }
    return this.invalidCommand(`${bizHelp} / BACK / MAIN / HELP`);
  }

  private handleForum(command: string, keyword: string, boardNo: number): readonly string[] {
    if (command === 'LIST') return this.render();
    if (command === 'UNREAD' || command === 'NEXT') {
      const data = forumPosts(this.content, keyword, boardNo);
      if (!data.available) return [this.forumUnavailable, this.forumHelp, returnHelp, demoPrompt];
      if (data.source !== 'local' || !this.content.members?.some((member) => member.id === this.memberId && member.actor === 'human'))
        return ['未読の確認には HANDLE で利用者を選択してください。', this.forumHelp, returnHelp, demoPrompt];
      if (command === 'UNREAD') return [...this.renderForum(keyword, boardNo, true), returnHelp, demoPrompt];
      const posts = unreadPosts(this.content, data.posts, this.memberId!);
      if (!posts.length) return ['未読の投稿はありません。', this.forumHelp, returnHelp, demoPrompt];
      // The app persists this exact candidate before forwarding a numbered READ.
      return this.handleForum(`READ ${posts[0]!.number}`, keyword, boardNo);
    }
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
    return this.invalidCommand('LIST / UNREAD / NEXT / READ 番号 / WRITE / REPLY 番号 / BACK / MAIN / HELP');
  }

  private readonly forumHelp = 'LIST: 投稿一覧 / UNREAD: 未読一覧 / NEXT: 次の未読 / READ 番号: 本文 / WRITE: 新規投稿 / REPLY 番号: 返信';
  private readonly forumUnavailable = '対応するローカルフォーラムが見つからないか、重複しています。';

  private renderForum(keyword: string, boardNo: number, unread = false): string[] {
    const data = forumPosts(this.content, keyword, boardNo);
    const posts = unread ? unreadPosts(this.content, data.posts, this.memberId!) : data.posts;
    return [
      `${keyword === bulletin.keyword ? '一般掲示板' : keyword === wakaba.keyword ? 'わかばマーク' : additionalSigs.find((s) => s.keyword === keyword)?.name ?? keyword} / ${forumName(keyword, boardNo)} / ${unread ? '未読一覧' : '投稿一覧'}（番号順）`,
      ...(boardCulture(keyword, boardNo) ? [boardCulture(keyword, boardNo)!] : []),
      ...(!data.available ? [this.forumUnavailable]
        : posts.length ? posts.map((post) => {
          const parent = replyReference(post, data.posts);
          const reference = parent && post.title !== `RE#${parent.number}` && !post.title.startsWith(`RE#${parent.number} `)
            ? ` RE#${parent.number}` : '';
          const lastRead = this.content.readStates?.find((state) => state.memberId === this.memberId && state.forumId === post.forumId)?.lastReadNumber ?? 0;
          return `#${post.number} ${post.title}${reference}${data.source === 'local' && this.memberId ? ` [${post.number <= lastRead ? '既読' : '未読'}]` : ''}`;
        }) : [unread ? '未読の投稿はありません。' : [wakaba.keyword, bulletin.keyword].includes(keyword) ? '投稿はありません。WRITE で最初の投稿をどうぞ。' : '投稿はありません。']),
      this.forumHelp,
    ];
  }

  private invalidCommand(allowed: string): readonly string[] {
    return [`この画面では使えないコマンドです。${allowed} を入力してください。`, demoPrompt];
  }

  private openSection(entry: typeof mainMenu.entries[number]): readonly string[] {
    this.section = entry;
    if (entry.selector === '16') return [entryText(entry), ...this.enter('wakaba')];
    if (entry.selector === '10') {
      this.publicationItem = 0;
      return [entryText(entry), ...this.enter('publication-directory')];
    }
    if (entry.selector === '3') {
      this.newsItem = 0;
      return [entryText(entry), ...this.enter('news-directory')];
    }
    if (entry.selector === '4') return [entryText(entry), ...this.enter('database-directory')];
    if (entry.selector === '5') {
      this.eicItem = 0;
      return [entryText(entry), ...this.enter('environmental-gateway')];
    }
    if (entry.selector === '7') {
      this.clearNetNews();
      return [entryText(entry), ...this.enter('internet-directory')];
    }
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
      case 'ecom': return this.ecom.render();
      case 'disconnected': return [
        '接続を終了しました。',
        'RECONNECT で MAIN から再接続できます。',
      ];
      case 'wakaba': return [
        '☆★☆ わかばマーク ☆★☆', '通信が初めての方も、読むところからどうぞ。',
        `1 ${wakaba.name}`, '2 OLT', 'LIST: 案内を再表示', returnHelp, demoPrompt,
      ];
      case 'wakaba-olt': return renderOltDirectory({ settings: this.content.settings ?? [] }, 'wakaba');
      case 'index': return [
        '索引', ...indexEntries.map(entryText),
        'J ECOM: 電子郵便（紙の郵便を模擬体験）',
        `${miti.steps[0]!.input}: ${miti.steps[0]!.destination}へ`,
        returnHelp, demoPrompt,
      ];
      case 'publication-directory': return [...renderPublicationDirectory(), returnHelp, demoPrompt];
      case 'publication-contents': return [...renderPublicationContents(), returnHelp, demoPrompt];
      case 'publication-installment': return [...renderPublicationInstallment(this.publicationItem), returnHelp, demoPrompt];
      case 'news-directory': return [...renderNewsDirectory(), returnHelp, demoPrompt];
      case 'telnet-directory':
      case 'telnet-shell':
      case 'telnet-mailbox':
      case 'telnet-letter': return renderTelnet(this.currentScreen, this.telnetItem);
      case 'ftp-list': return [...renderFtp(), returnHelp, demoPrompt];
      case 'ftp-preview': return [...renderFtp(this.ftpItem), returnHelp, demoPrompt];
      case 'internet-directory': return [...renderInternetDirectory(), returnHelp, demoPrompt];
      case 'gopher': return this.gopher.render();
      case 'archie': return this.archie.render();
      case 'netnews-directory': return [...renderNetNewsDirectory(), returnHelp, demoPrompt];
      case 'netnews-list': return [...renderNetNewsList(netNewsGroup(this.content, this.netNewsGroup), this.netNewsSearch), returnHelp, demoPrompt];
      case 'netnews-article': {
        const group = netNewsGroup(this.content, this.netNewsGroup);
        const article = group.articles.find((article) => article.number === this.netNewsItem);
        return [...(article ? renderNetNewsArticle(group, article) : renderNetNewsList(group, this.netNewsSearch)), returnHelp, demoPrompt];
      }
      case 'news-headlines': return [...renderNewsHeadlines(), returnHelp, demoPrompt];
      case 'news-brief': return [...renderNewsBrief(this.newsItem), returnHelp, demoPrompt];
      case 'database-directory': return [...renderDatabaseDirectory(), returnHelp, demoPrompt];
      case 'biz-search': return [...renderBizSearch(this.bizSets, this.bizZeroKeyword), returnHelp, demoPrompt];
      case 'biz-titles': return [...renderBizTitles(this.bizSets[this.bizSetNumber - 1]!, this.bizSetNumber), returnHelp, demoPrompt];
      case 'biz-article': return [...renderBizArticle(this.bizSets[this.bizSetNumber - 1]!, this.bizSetNumber, this.bizItem), returnHelp, demoPrompt];
      case 'environmental-gateway': return [...renderEnvironmentalGateway(), returnHelp, demoPrompt];
      case 'eic-list': return [...renderEicList(), returnHelp, demoPrompt];
      case 'eic-item': return [...renderEicItem(this.eicItem), returnHelp, demoPrompt];
      case 'section':
      case 'daisizen-service': if (this.isConference) return renderConference(this.content);
        if (this.isOlt) return renderOltDirectory({ settings: this.content.settings ?? [] }, this.oltContext!);
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
        '6 一般掲示板',
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
