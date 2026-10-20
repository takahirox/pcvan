import type { Session } from './storage/schema';

interface TerminalActions {
  submit(line: string): void;
  previous(current: string): string;
  next(current: string): string;
  completeConnection?(): void;
}

// DOM rendering and keyboard behavior only; no command parsing or stored history.
export function mountTerminal(root: HTMLElement, actions: TerminalActions) {
  root.innerHTML = `
    <header>
      <h1>pcvan / テキスト端末</h1>
      <p>1996年頃の MAIN（暫定）· 再構成のローカルセッション</p>
    </header>
    <section class="terminal" aria-label="テキスト端末">
      <div class="transcript" role="log" aria-label="出力履歴"
        aria-live="polite" aria-relevant="additions" tabindex="0">
        <pre class="output"></pre>
      </div>
      <form class="command-form">
        <label for="command">コマンド <span aria-hidden="true">&gt;</span></label>
        <input id="command" name="command" type="text" autocomplete="off"
          autocapitalize="off" spellcheck="false" aria-describedby="keyboard-help" />
        <button type="submit">送信</button>
      </form>
      <a class="reply-reference" href="#referenced-post" hidden></a>
    </section>
    <div class="session-controls">
      <button type="button" class="skip-connection" hidden>接続演出をスキップ</button>
      <button type="button" class="download-log">端末ログを保存 (.txt)</button>
      <p class="session-times">セッション時刻を読み込み中…</p>
    </div>
    <p id="keyboard-help">Enter: 送信 · ↑ / ↓: 入力履歴 · PageUp / PageDown: 出力をスクロール<br />
      Tab: 出力・入力へ移動 · 出力にフォーカスして ← / →: 横スクロール</p>
  `;

  const transcript = root.querySelector<HTMLDivElement>('.transcript')!;
  const output = root.querySelector<HTMLPreElement>('.output')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const skip = root.querySelector<HTMLButtonElement>('.skip-connection')!;
  const reference = root.querySelector<HTMLAnchorElement>('.reply-reference')!;
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
    // Snapshot exactly the displayed text, including Japanese and embedded newlines.
    const url = URL.createObjectURL(new Blob([output.textContent ?? ''], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcvan-terminal-${new Date().toISOString().replaceAll(':', '-')}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  let composing = false;
  let hasOutput = false;

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
    setConnecting(connecting: boolean) { skip.hidden = !connecting; },
    showSessionTimes(saved: Session | null) {
      root.querySelector('.session-times')!.textContent =
        `最終ログイン: ${saved?.lastLoginAt ?? '記録なし'} / 最終ログアウト: ${saved?.lastLogoutAt ?? '記録なし'} (UTC)`;
    },
    append(...text: readonly string[]) {
      if (text.length === 0) return;
      const atBottom = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 2;
      // Never interpret controller output as HTML or replace the input element.
      output.append(document.createTextNode(`${hasOutput ? '\n' : ''}${text.join('\n')}`));
      hasOutput = true;
      if (atBottom) transcript.scrollTop = transcript.scrollHeight;
    },
  };
}
