import type { TerminalController } from './controller';
import { PcvanController } from './navigation';
import type { ForumContent } from './forums';

const greeting = ['PC-VAN 接続中…'];

/** A local presentation step around the existing screen-scoped navigation. */
export class ConnectionController implements TerminalController {
  private readonly navigation = new PcvanController();
  private connecting = true;
  readonly welcome = greeting;

  get screen() { return this.connecting ? 'connecting' : this.navigation.screen; }

  get needsContent(): boolean { return this.navigation.needsContent; }

  setContent(content: ForumContent): void { this.navigation.setContent(content); }
  setMemberId(id: string | undefined): void { this.navigation.setMemberId(id); }
  get forum() { return this.navigation.forum; }

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
