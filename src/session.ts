import type { TerminalController } from './controller';
import { CommandHistory } from './history';

export class TerminalSession {
  readonly history = new CommandHistory();
  private readonly output: string[];

  constructor(private readonly controller: TerminalController) {
    this.output = [...controller.welcome];
  }

  get transcript(): readonly string[] {
    return this.output;
  }

  append(...text: string[]): readonly string[] {
    this.output.push(...text);
    return text;
  }

  submit(line: string): readonly string[] {
    if (!line.trim()) return [];
    this.history.add(line);
    return this.append(`> ${line}`, ...this.controller.submit(line));
  }
}
