import { TERMINAL_SETTING, validateTerminalPreferences } from './storage/schema';
import type { Session, Setting, TerminalPreferences } from './storage/schema';
import { OutputRenderer } from './output-renderer';

interface TerminalActions {
  submit(line: string, enteredAt: number): void;
  previous(current: string): string;
  next(current: string): string;
  completeConnection?(): void;
}

// DOM rendering and keyboard behavior only; no command parsing or stored history.
export function mountTerminal(root: HTMLElement, actions: TerminalActions) {
  root.innerHTML = `
    <section class="terminal" aria-label="テキスト端末" data-theme="white">
      <header class="terminal-header"><h1>PC-VAN</h1>
        <div class="application-options"><button type="button" class="prepare-model" hidden>AIモデルの準備</button>
          <button type="button" class="open-settings">設定 / Options</button></div></header>
      <div class="terminal-screen">
        <div class="transcript" role="log" aria-label="出力履歴" aria-live="off" tabindex="0"><pre class="output"></pre></div>
        <form class="command-form">
          <label for="command"><span class="sr-only">コマンド</span><span aria-hidden="true">&gt;</span></label>
          <input id="command" name="command" type="text" autocomplete="off" enterkeyhint="send"
            autocapitalize="off" spellcheck="false" aria-describedby="keyboard-help" />
        </form>
      </div>
    </section>
    <p id="keyboard-help" class="sr-only">Enter: 送信。↑ / ↓: 入力履歴。PageUp / PageDown: 出力スクロール。
      Tab: 出力・入力へ。Esc: 全文表示・接続演出をスキップ。HELP: 現在の操作案内。</p>
    <div class="output-announcement sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
  `;

  const transcript = root.querySelector<HTMLDivElement>('.transcript')!;
  const output = root.querySelector<HTMLPreElement>('.output')!;
  const input = root.querySelector<HTMLInputElement>('#command')!;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const shell = root.querySelector<HTMLElement>('.terminal')!;
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
  }, () => {}, (text) => {
    // Streaming itself is silent. Announce a complete drained batch once.
    root.querySelector('.output-announcement')!.textContent = text;
  });
  function apply(value: TerminalPreferences) {
    preferences = { ...value };
    shell.dataset.theme = value.theme;
    shell.classList.toggle('effects', value.effects);
    renderer.setSpeed(value.speed);
  }
  apply(preferences);
  motion.addEventListener('change', () => { if (!explicit) apply(defaults()); });
  shell.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !composing && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      renderer.reveal();
      actions.completeConnection?.();
    }
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
    const enteredAt = Date.now();
    const line = input.value;
    input.value = '';
    renderer.reveal();
    actions.submit(line, enteredAt);
    input.focus({ preventScroll: true });
  });

  let times = 'セッション時刻を読み込み中…';
  input.focus({ preventScroll: true });
  return {
    get hasInput() { return !!input.value; },
    get composing() { return composing; },
    get preferences() { return { ...preferences }; },
    setPreferences(value: TerminalPreferences) {
      validateTerminalPreferences(value);
      explicit = true;
      apply(value);
    },
    logText: () => renderer.text,
    whenVisible: (callback: () => void) => renderer.whenVisible(callback),
    get sessionTimes() { return times; },
    clearInput: () => { input.value = ''; },
    focus: () => input.focus({ preventScroll: true }),
    reveal: () => renderer.reveal(),
    restorePreferences(settings: Setting[]) {
      const saved = settings.find((row) => row.id === TERMINAL_SETTING);
      if (saved) {
        validateTerminalPreferences(saved.value);
        explicit = true;
        apply(saved.value);
      } else { explicit = false; apply(defaults()); }
    },
    showSessionTimes(saved: Session | null) {
      times = `最終ログイン: ${saved?.lastLoginAt ?? '記録なし'} / 最終ログアウト: ${saved?.lastLogoutAt ?? '記録なし'} (UTC)`;
    },
    append: (...text: readonly string[]) => renderer.append(...text),
  };
}
