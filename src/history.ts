export const COMMAND_HISTORY_LIMIT = 100;

export class CommandHistory {
  private lines: string[] = [];
  private cursor = 0;
  private draft = '';
  private edits = new Map<number, string>();

  replace(lines: readonly string[]): void {
    this.lines = lines.filter((line) => line.trim()).slice(-COMMAND_HISTORY_LIMIT);
    this.cursor = this.lines.length;
    this.draft = '';
    this.edits.clear();
  }

  add(line: string): void {
    if (line.trim()) this.replace([...this.lines, line]);
  }

  previous(current: string): string {
    if (this.cursor === this.lines.length) this.draft = current;
    else this.edits.set(this.cursor, current);
    if (this.cursor > 0) this.cursor -= 1;
    return this.edits.get(this.cursor) ?? this.lines[this.cursor] ?? current;
  }

  next(current: string): string {
    if (this.cursor === this.lines.length) return current;
    this.edits.set(this.cursor, current);
    if (this.cursor < this.lines.length) this.cursor += 1;
    return this.edits.get(this.cursor) ?? this.lines[this.cursor] ?? this.draft;
  }
}
