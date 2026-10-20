import { TERMINAL_SETTING, validateTerminalPreferences } from './storage/schema';
import type { Session, Setting, TerminalPreferences } from './storage/schema';
import { OutputRenderer } from './output-renderer';

interface TerminalActions {
  submit(line: string): void;
  previous(current: string): string;
  next(current: string): string;
  completeConnection?(): void;
  savePreferences?(preferences: TerminalPreferences): void;
}

// DOM rendering and keyboard behavior only; no command parsing or stored history.
export function mountTerminal(root: HTMLElement, actions: TerminalActions) {
  root.innerHTML = `
    <section class="terminal" aria-label="テキスト端末" data-theme="white">
      <header class="terminal-header">
        <h1>PC-VAN</h1>
        <button type="button" class="open-settings" aria-haspopup="dialog" aria-controls="settings-dialog">設定 / Options</button>
      </header>
      <div class="terminal-status">
        <span class="connection-status" role="status">接続中</span>
        <button type="button" class="reveal-output" aria-keyshortcuts="Escape" disabled>全文表示 (Esc)</button>
      </div>
      <div class="terminal-screen">
        <div class="transcript" role="log" aria-label="出力履歴" aria-live="off" tabindex="0">
          <pre class="output"></pre>
        </div>
        <form class="command-form">
          <label for="command"><span class="sr-only">コマンド</span><span aria-hidden="true">&gt;</span></label>
          <input id="command" name="command" type="text" autocomplete="off"
            autocapitalize="off" spellcheck="false" aria-describedby="keyboard-help" />
          <button type="submit">送信</button>
        </form>
      </div>
      <a class="reply-reference" href="#referenced-post" hidden></a>
      <div class="session-controls">
        <button type="button" class="skip-connection" hidden>接続演出をスキップ</button>
      </div>
    </section>
    <div class="output-announcement sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    <details class="display-controls">
      <summary>表示・速度</summary>
        <label>表示速度（シミュレーション）
          <select class="terminal-speed" aria-label="表示速度（シミュレーション）">
            <option value="300">300 bps</option><option value="1200">1200 bps</option>
            <option value="2400" selected>2400 bps</option><option value="9600">9600 bps</option>
            <option value="instant">Instant（即時）</option>
          </select>
        </label>
      <button type="button" class="download-log">端末ログを保存 (.txt)</button>
      <label>表示色 <select class="terminal-theme"><option value="white">白</option>
        <option value="green">緑（蛍光体風）</option><option value="amber">琥珀</option></select></label>
      <label><input class="terminal-effects" type="checkbox" /> 光彩・走査線</label>
      <p class="session-times">セッション時刻を読み込み中…</p>
    </details>
    <details class="help-controls">
      <summary>操作ガイド</summary>
      <p id="keyboard-help">Enter: 送信 · ↑ / ↓: 入力履歴 · PageUp / PageDown: 出力をスクロール<br />
        Tab: 出力・入力へ移動 · 出力にフォーカスして ← / →: 横スクロール<br />
        Esc: 待機中の全文を表示（入力・出力内） · Instant: 以後の出力を即時表示</p>
    </details>
  `;

  const transcript = root.querySelector<HTMLDivElement>('.transcript')!;
  const output = root.querySelector<HTMLPreElement>('.output')!;
  const input = root.querySelector<HTMLInputElement>('#command')!;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const skip = root.querySelector<HTMLButtonElement>('.skip-connection')!;
  const reference = root.querySelector<HTMLAnchorElement>('.reply-reference')!;
  const shell = root.querySelector<HTMLElement>('.terminal')!;
  const reveal = root.querySelector<HTMLButtonElement>('.reveal-output')!;
  const speed = root.querySelector<HTMLSelectElement>('.terminal-speed')!;
  const theme = root.querySelector<HTMLSelectElement>('.terminal-theme')!;
  const effects = root.querySelector<HTMLInputElement>('.terminal-effects')!;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const defaults = (): TerminalPreferences => ({ version: 1, theme: 'white',
    speed: motion.matches ? 'instant' : '2400', effects: false });
  let preferences = defaults();
  let explicit = false;
  const painted = document.createTextNode('');
  output.append(painted);
  const renderer = new OutputRenderer(preferences.speed, (text) => {
    const atBottom = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 2;
    // Append literal text in one batch per frame, preserving selection and the input.
    painted.appendData(text);
    if (atBottom) transcript.scrollTop = transcript.scrollHeight;
  }, (pending) => { reveal.disabled = !pending; }, (text) => {
    // Streaming itself is silent. Announce a complete drained batch once.
    root.querySelector('.output-announcement')!.textContent = text;
  });
  function apply(value: TerminalPreferences) {
    preferences = { ...value };
    shell.dataset.theme = value.theme;
    shell.classList.toggle('effects', value.effects);
    speed.value = value.speed;
    theme.value = value.theme;
    effects.checked = value.effects;
    renderer.setSpeed(value.speed);
  }
  apply(preferences);
  function changed() {
    explicit = true;
    apply({ version: 1, theme: theme.value as TerminalPreferences['theme'],
      speed: speed.value as TerminalPreferences['speed'], effects: effects.checked });
    actions.savePreferences?.({ ...preferences });
  }
  speed.addEventListener('change', changed);
  theme.addEventListener('change', changed);
  effects.addEventListener('change', changed);
  motion.addEventListener('change', () => { if (!explicit) apply(defaults()); });
  reveal.addEventListener('click', () => { renderer.reveal(); input.focus({ preventScroll: true }); });
  shell.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !composing && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      renderer.reveal();
    }
  });
  let referenceNumber: number | null = null;
  reference.addEventListener('click', (event) => {
    event.preventDefault();
    if (referenceNumber !== null) actions.submit(`READ ${referenceNumber}`);
    input.focus({ preventScroll: true });
  });
  skip.addEventListener('click', () => {
    actions.completeConnection?.();
    input.focus({ preventScroll: true });
  });
  root.querySelector('.download-log')!.addEventListener('click', () => {
    // Include accepted output still waiting to be painted; exclude unsent drafts.
    const url = URL.createObjectURL(new Blob([renderer.text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcvan-terminal-${new Date().toISOString().replaceAll(':', '-')}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  let composing = false;

  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; });
  input.addEventListener('keydown', (event) => {
    // keyCode 229 also covers IME confirmation in browsers with legacy events.
    if (composing || event.isComposing || event.keyCode === 229) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      input.value = event.key === 'ArrowUp' ? actions.previous(input.value) : actions.next(input.value);
      input.setSelectionRange(input.value.length, input.value.length);
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      transcript.scrollBy(0, transcript.clientHeight * 0.8 * (event.key === 'PageUp' ? -1 : 1));
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (composing) return;
    const line = input.value;
    input.value = '';
    renderer.reveal();
    actions.submit(line);
    input.focus({ preventScroll: true });
  });

  input.focus({ preventScroll: true });
  return {
    showReplyReference(number: number | null) {
      referenceNumber = number;
      reference.hidden = number === null;
      reference.textContent = number === null ? '' : `返信先 RE#${number} を読む`;
    },
    reveal: () => renderer.reveal(),
    restorePreferences(settings: Setting[]) {
      const saved = settings.find((row) => row.id === TERMINAL_SETTING);
      if (saved) {
        validateTerminalPreferences(saved.value);
        explicit = true;
        apply(saved.value);
      } else { explicit = false; apply(defaults()); }
    },
    setConnecting(connecting: boolean) {
      skip.hidden = !connecting;
      root.querySelector('.connection-status')!.textContent = connecting ? '接続中' : '入力待ち';
    },
    showSessionTimes(saved: Session | null) {
      root.querySelector('.session-times')!.textContent =
        `最終ログイン: ${saved?.lastLoginAt ?? '記録なし'} / 最終ログアウト: ${saved?.lastLogoutAt ?? '記録なし'} (UTC)`;
    },
    append: (...text: readonly string[]) => renderer.append(...text),
  };
}
