import type { TerminalController } from './controller';
import { PcvanController } from './navigation';
import type { ForumContent } from './forums';

const greeting = [
  'シミュレーション接続中… [D / reconstructed]',
  '接続・ログインの文面と待ち時間は創作です。1996年の挨拶文は未確認です。',
  '実際のモデム・通信回線・ネットワーク接続は使用しません。',
  'まもなく MAIN を表示します。「接続演出をスキップ」またはコマンド入力で進めます。',
];

/** A local presentation step around the existing screen-scoped navigation. */
export class ConnectionController implements TerminalController {
  private readonly navigation = new PcvanController();
  private connecting = true;
  readonly welcome = greeting;

  get screen() { return this.connecting ? 'connecting' : this.navigation.screen; }

  get needsContent(): boolean { return this.navigation.needsContent; }

  setContent(content: ForumContent): void { this.navigation.setContent(content); }

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
      return greeting;
    }
    return [...opening, ...result];
  }
}
