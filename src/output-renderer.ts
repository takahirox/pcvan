import type { TerminalSpeed } from './storage/schema';

// Bound pending UTF-16 string length independently of timing costs; retain the full log.
export const MAX_PENDING_UNITS = 65_536;
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

/**
 * Shift-JIS-oriented timing units, not wire bytes or a representability check.
 * ASCII (including LF), half-width kana/punctuation, yen and overline cost one;
 * all other code points cost two, including modern emoji and combining marks.
 * Graphemes wait for their summed cost. Text is never transcoded or normalized.
 */
export function displayCost(text: string): number {
  let cost = 0;
  for (const character of text) {
    const point = character.codePointAt(0)!;
    cost += point <= 0x7f || (point >= 0xff61 && point <= 0xff9f)
      || point === 0xa5 || point === 0x203e ? 1 : 2;
  }
  return cost;
}

export class OutputRenderer {
  private painted = 0;
  private observers: { at: number; callback: () => void }[] = [];
  private logical: string[] = [];
  private queue: { text: string; cost: number }[] = [];
  private head = 0;
  private units = 0;
  private frame: number | undefined;
  private last = 0;
  private credit = 0;
  private announcement = '';

  constructor(private speed: TerminalSpeed,
    private paint: (text: string) => void,
    private pending: (value: boolean) => void,
    private announce: (text: string) => void,
  ) {}

  get text(): string { return this.logical.join(''); }

  whenVisible(callback: () => void): void {
    const at = this.text.length;
    if (this.painted >= at) callback();
    else this.observers.push({ at, callback });
  }
  private render(text: string): void {
    this.paint(text); this.painted += text.length;
    const ready = this.observers.filter((o) => o.at <= this.painted);
    this.observers = this.observers.filter((o) => o.at > this.painted);
    ready.forEach((o) => o.callback());
  }

  append(...lines: readonly string[]): void {
    if (!lines.length) return;
    const text = `${this.logical.length ? '\n' : ''}${lines.join('\n')}`;
    this.logical.push(text);
    this.announcement += text;
    // A large append or sustained backlog reveals everything, never drops text.
    if (this.speed === 'instant' || this.units + text.length > MAX_PENDING_UNITS) {
      this.reveal(text);
      return;
    }
    for (const { segment } of segmenter.segment(text)) {
      this.queue.push({ text: segment, cost: displayCost(segment) });
    }
    this.units += text.length;
    if (!this.units) { this.finish(); return; }
    this.pending(true);
    if (this.frame === undefined) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  setSpeed(speed: TerminalSpeed): void {
    if (speed === this.speed) return;
    // Mode changes settle the old queue; later output uses the new mode.
    this.reveal();
    this.speed = speed;
  }

  reveal = (extra = ''): void => {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    const text = this.queue.slice(this.head).map((item) => item.text).join('') + extra;
    if (text) this.render(text);
    this.finish();
  };

  private finish(): void {
    this.queue = [];
    this.head = this.units = this.credit = 0;
    this.pending(false);
    if (this.announcement) this.announce(this.announcement);
    this.announcement = '';
  }

  private tick = (now: number): void => {
    this.frame = undefined;
    this.credit += (now - this.last) * (Number(this.speed) / 10) / 1000;
    this.last = now;
    const batch: string[] = [];
    while (this.head < this.queue.length) {
      const item = this.queue[this.head]!;
      if (item.cost > this.credit) break;
      this.credit -= item.cost;
      this.units -= item.text.length;
      batch.push(item.text);
      this.head += 1;
    }
    if (batch.length) this.render(batch.join(''));
    if (this.head === this.queue.length) this.finish();
    else {
      // Release consumed entries even if producers keep appending indefinitely.
      if (this.head > 1024) { this.queue = this.queue.slice(this.head); this.head = 0; }
      this.frame = requestAnimationFrame(this.tick);
    }
  };
}
