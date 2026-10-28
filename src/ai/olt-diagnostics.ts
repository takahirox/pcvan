/** One text-free, tab-local observation. Never persisted in backups or prompts. */
export class OltDiagnostics {
  private started = 0;
  private event = '';
  private stages: Record<string, number> = {};
  private outcome = '未実行';
  private warmth = '未確認';
  begin(at = Date.now(), event = '') {
    this.event = event; this.started = at; this.stages = { Enter: 0 }; this.outcome = '保存待ち'; this.warmth = '未確認';
  }
  prepare(event: string, savedAt?: number) {
    if (event === this.event) return;
    this.event = event; this.started = savedAt ?? Date.now();
    this.stages = savedAt === undefined ? {} : { '保存済み発言': 0 };
    this.outcome = '応答待ち'; this.warmth = '未確認';
  }
  stage(name: string) {
    if (!this.started) { this.started = Date.now(); this.stages = {}; }
    // Callers supply fixed labels only; never conversation or exception text.
    if (Object.keys(this.stages).length < 18) this.stages[name] ??= Math.max(0, Date.now() - this.started);
    this.outcome = name;
  }
  model(warm: boolean) { this.warmth = warm ? 'warm（読込済み）' : 'cold（読込が必要）'; }
  status() {
    return `OLT: ${this.outcome} / ${this.warmth}` + (this.started
      ? `\nOLT 経過 ms（開始から）: ${Object.entries(this.stages).map(([name, ms]) => `${name}=${ms}`).join(' / ')}` : '');
  }
}
