/** One text-free, tab-local observation. Never persisted in backups or prompts. */
export class OltDiagnostics {
  private counts = { started: 0, completed: 0, failed: 0, rejected: 0, committed: 0, discarded: 0 };
  private started = 0;
  private event = '';
  private stages: Record<string, number> = {};
  private outcome = '未実行';
  private warmth = '未確認';
  private availability = '';
  idle(reason: string) { this.availability = reason; }
  begin(at = Date.now(), event = '') {
    this.event = event; this.started = at; this.stages = { Enter: 0 }; this.outcome = '保存待ち'; this.warmth = '未確認';
  }
  prepare(event: string, savedAt?: number) {
    if (event === this.event || (this.stages.Enter !== undefined && Date.now() - this.started < 120_000)) return;
    this.event = event; this.started = savedAt ?? Date.now();
    this.stages = savedAt === undefined ? {} : { '保存済み発言': 0 };
    this.outcome = '応答待ち'; this.warmth = '未確認';
  }
  stage(name: string) {
    if (name === '生成開始' || name === '再生成開始') this.counts.started++;
    if (name === '生成終了' || name === '再生成終了') this.counts.completed++;
    if (['生成失敗', '生成時間切れ', '生成・保存失敗'].includes(name)) this.counts.failed++;
    if (name.startsWith('不正な応答を拒否')) this.counts.rejected++;
    if (name === '応答保存') this.counts.committed++;
    if (name === '期限・在室・設定変更で破棄') this.counts.discarded++;
    if (!this.started) { this.started = Date.now(); this.stages = {}; }
    // Callers supply fixed labels only; never conversation or exception text.
    if (Object.keys(this.stages).length < 18) this.stages[name] ??= Math.max(0, Date.now() - this.started);
    this.outcome = name;
  }
  model(warm: boolean) {
    if (warm && this.warmth.startsWith('cold')) this.warmth = 'cold → warm（読込完了）';
    else this.warmth = warm ? 'warm（読込済み）' : 'cold（読込が必要）';
  }
  status() {
    return `OLT 生成集計: ${JSON.stringify(this.counts)}\nOLT: ${this.outcome} / ${this.warmth} / ${this.availability}` + (this.started
      ? `\nOLT 経過 ms（開始から）: ${Object.entries(this.stages).map(([name, ms]) => `${name}=${ms}`).join(' / ')}` : '');
  }
}
