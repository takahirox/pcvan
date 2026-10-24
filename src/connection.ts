import { calendarSetting, serviceDate } from './calendar';
import type { HistoricalCalendar } from './calendar';
import type { TerminalController } from './controller';
import { PcvanController } from './navigation';
import type { ForumContent } from './forums';
import type { Session } from './storage/schema';

const greeting = ['PC-VAN 接続中…'];
// Reconstructed pacing, independent of the terminal's character reveal speed.
export const ENTRY_STAGE_MS = 400;

/** A local presentation step around the existing screen-scoped navigation. */
export class ConnectionController implements TerminalController {
  private readonly navigation = new PcvanController();
  private connecting = true;
  private stage = 0;
  private calendar: HistoricalCalendar | undefined;
  private session: Session | null = null;
  readonly welcome = greeting;

  get screen() { return this.connecting ? 'connecting' : this.navigation.screen; }

  get needsContent(): boolean { return this.navigation.needsContent; }

  setContent(content: ForumContent): void { this.calendar = calendarSetting(content); this.navigation.setContent(content); }
  setMemberId(id: string | undefined): void { this.navigation.setMemberId(id); }
  selectDownload(number: number) { return this.navigation.selectDownload(number); }
  get netNewsContext() { return this.navigation.netNewsContext; }
  get isEcom() { return this.navigation.isEcom; }
  get ecomDrafting() { return this.navigation.ecomDrafting; }
  invalidateEcom() { this.navigation.invalidateEcom(); }
  get isTelnet() { return this.navigation.isTelnet; }
  get isGopher() { return this.navigation.isGopher; }
  get isConference() { return this.navigation.isConference; }
  get isOlt() { return this.navigation.isOlt; }
  get mailContext() { return this.navigation.mailContext; }
  get forum() { return this.navigation.forum; }

  setSession(session: Session | null): void { this.session = session; }

  advanceConnection(): readonly string[] {
    if (!this.connecting) return [];
    switch (++this.stage) {
      case 1: return ['PC-VAN / パーソナル通信サービス'];
      case 2: return ['デモID: LOCAL-DEMO（架空・自動表示）', 'パスワード: ［入力・認証なし］'];
      case 3: return [
        `前回使用終了: ${this.session?.lastLogoutAt ? serviceDate(this.session.lastLogoutAt, this.calendar) : '記録なし'} (JST)`,
        `今回使用開始: ${this.session?.lastLoginAt ? serviceDate(this.session.lastLoginAt, this.calendar) : '記録なし'} (JST)`,
      ];
      case 4: return ['プロファイル修正: N（自動・変更しません）'];
      case 5: return ['ようこそ PC-VAN へ。掲示板の話題をゆっくりお楽しみください。'];
      default: return this.completeConnection();
    }
  }

  completeConnection(): readonly string[] {
    if (!this.connecting) return [];
    this.connecting = false;
    return this.navigation.welcome;
  }

  submit(line: string): readonly string[] {
    // Commands cancel the wait and run immediately; typing is never disabled.
    const opening = this.completeConnection();
    const before = this.navigation.screen;
    const result = this.navigation.submit(line);
    if (before === 'disconnected' && this.navigation.screen === 'main') {
      this.connecting = true;
      this.stage = 0;
      return greeting;
    }
    return [...opening, ...result];
  }
}
