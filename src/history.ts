export class CommandHistory {
  private lines: string[] = [];
  private cursor = 0;
  private draft = '';

  replace(lines: readonly string[]): void {
    this.lines = [...lines];
    this.cursor = this.lines.length;
    this.draft = '';
  }

  add(line: string): void {
    this.lines.push(line);
    this.cursor = this.lines.length;
    this.draft = '';
  }

  previous(current: string): string {
    if (this.cursor === this.lines.length) this.draft = current;
    if (this.cursor > 0) this.cursor -= 1;
    return this.lines[this.cursor] ?? current;
  }

  next(current: string): string {
    if (this.cursor === this.lines.length) return current;
    if (this.cursor < this.lines.length) this.cursor += 1;
    return this.lines[this.cursor] ?? this.draft;
  }
}
