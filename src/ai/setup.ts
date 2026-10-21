import type { AiActivity, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, setupContext, migrateActivity } from './activity';

interface SetupActions {
  read(): Promise<boolean>;
  load(modelId: string, expected: string): Promise<void>;
  defer(expected: string): Promise<void>;
  inspect(): void;
  stop(): void;
}

/** A modern invitation and explicit consent step, sharing the existing model selector. */
export function mountAiSetup(root: HTMLElement, model: HTMLSelectElement, supported: boolean, actions: SetupActions) {
  const notice = document.createElement('aside');
  notice.className = 'ai-setup';
  notice.setAttribute('aria-label', 'AIモデルの準備');
  notice.hidden = true;
  notice.innerHTML = `<span class="ai-setup-status" role="status"></span>
    <progress class="ai-setup-progress" aria-label="モデル読込の進捗" max="1" value="0" hidden></progress>
    <button type="button" class="ai-setup-start">モデルを読み込む</button>
    <button type="button" class="ai-setup-later">あとで</button>
    <button type="button" class="ai-setup-stop" hidden>AI を停止・解放</button>
    <button type="button" class="ai-setup-options">AIモデルの設定</button>`;
  root.querySelector('.terminal-header')?.after(notice);
  const get = <T extends HTMLElement>(name: string) => notice.querySelector<T>(`.ai-setup-${name}`)!;
  const dialog = document.createElement('dialog');
  dialog.className = 'ai-consent';
  dialog.setAttribute('aria-labelledby', 'ai-consent-heading');
  dialog.setAttribute('aria-describedby', 'ai-consent-description');
  dialog.innerHTML = `<h2 id="ai-consent-heading">AIモデルを読み込む</h2>
    <div class="ai-consent-model"></div>
    <p id="ai-consent-description">選択モデルの初回読込は数百 MB〜数 GB を配布元（Hugging Face / MLC / GitHub）からダウンロードします。
    ブラウザーの保存領域と WebGPU / GPU メモリを使います。推論と投稿データの処理はすべてこの端末内で行い、外部の推論サービスには送りません。
    AI が架空の掲示板投稿を生成します。詳細・出自は設定で確認できます。</p>
    <button type="button" class="ai-consent-confirm">同意してモデルを読み込む</button>
    <button type="button" class="ai-consent-close" autofocus>今は読み込まない</button>`;
  root.append(dialog);
  let snapshot: Backup | undefined;
  let state: AiActivity | undefined;
  let legacy = false;
  let ready = false;
  let busy = false;
  let pending = false;
  let expected = '';
  let previous: HTMLElement | null = null;
  let composing = false;
  const selector = model.closest('label')!;
  const anchor = document.createComment('shared AI model selector');
  selector.before(anchor);
  function close() {
    if (!dialog.open) return;
    dialog.close();
    anchor.after(selector);
    composing = false;
    (previous?.isConnected && previous.checkVisibility() ? previous : root.querySelector<HTMLElement>('#command'))?.focus({ preventScroll: true });
  }
  function invalidate() { close(); expected = ''; }
  async function request() {
    if (!supported || busy || pending || (root.querySelector('dialog[open]') && !root.querySelector('.settings-dialog[open]'))) return;
    pending = true;
    const initial = !legacy && snapshot && state ? setupContext(snapshot) : undefined;
    try {
      const selected = model.value;
      if (!await actions.read() || !snapshot || (initial && initial !== setupContext(snapshot))) return;
      // Settings may have an unsaved model selection; the visible selector owns it.
      model.value = selected;
      expected = setupContext(snapshot);
      if (state?.consent && state.modelId === model.value) {
        if (!root.querySelector('.settings-dialog[open]')) root.querySelector<HTMLElement>('#command')?.focus({ preventScroll: true });
        await actions.load(model.value, expected);
        return;
      }
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.querySelector('.ai-consent-model')!.append(selector);
      dialog.showModal();
    } finally { pending = false; }
  }
  get('start').addEventListener('click', () => { void request(); });
  get('options').addEventListener('click', actions.inspect);
  get('stop').addEventListener('click', () => {
    actions.stop();
    root.querySelector<HTMLElement>('#command')?.focus({ preventScroll: true });
  });
  get('later').addEventListener('click', async () => {
    if (!snapshot || pending) return;
    pending = true;
    try { await actions.defer(setupContext(snapshot)); }
    finally { pending = false; root.querySelector<HTMLElement>('#command')?.focus({ preventScroll: true }); }
  });
  dialog.querySelector('.ai-consent-close')!.addEventListener('click', close);
  dialog.querySelector('.ai-consent-confirm')!.addEventListener('click', () => {
    const context = expected;
    const selected = model.value;
    close();
    if (!root.querySelector('.settings-dialog[open]')) root.querySelector<HTMLElement>('#command')?.focus({ preventScroll: true });
    if (context) void actions.load(selected, context);
  });
  dialog.addEventListener('compositionstart', () => { composing = true; });
  dialog.addEventListener('compositionend', () => { composing = false; });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (composing || event.isComposing || event.keyCode === 229)) event.preventDefault();
    if (event.key === 'Tab') {
      const stops = [...dialog.querySelectorAll<HTMLElement>('select, button')];
      const first = stops[0]!; const last = stops.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); if (!composing) close(); });
  return {
    request, invalidate,
    refresh(content: Backup) {
      if (snapshot && setupContext(content) !== setupContext(snapshot)) invalidate();
      snapshot = content;
      const saved = content.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      legacy = saved?.version === 1;
      state = saved && migrateActivity(saved);
    },
    show(loaded: boolean, working: boolean, stoppable: boolean, fraction: number, message: string) {
      ready = loaded; busy = working;
      notice.hidden = !snapshot;
      const enabled = !state || state.maxPosts > 0;
      const invitation = supported && enabled && !state?.consent && !state?.setupDeferred;
      notice.classList.toggle('compact', !invitation && !busy);
      const text = !supported ? 'AIモデル：WebGPU 対応ブラウザーの HTTPS / localhost が必要です。'
        : busy ? message
        : ready ? 'モデル準備完了'
        : message.includes('利用できません') ? '読み込み失敗。通信・保存領域・GPUを確認して再試行してください。'
        : message.includes('キャンセル') ? '読み込み・処理をキャンセルしました。モデル解放済み。'
        : !enabled ? '自動投稿は休止中です。'
        : invitation ? 'AIモデルの準備：ローカルAI機能を利用するにはモデルの読み込みが必要です。'
        : state?.consent ? 'AIモデル：読込の同意済み・未読込' : 'AIモデルの準備';
      if (get('status').textContent !== text) get('status').textContent = text;
      get('start').hidden = !supported || busy || ready || (!enabled && !state?.consent);
      get('start').textContent = message.includes('利用できません') ? '読み込みを再試行' : 'モデルを読み込む';
      get('later').hidden = !invitation || busy;
      get('stop').hidden = !stoppable;
      const progress = get<HTMLProgressElement>('progress');
      progress.hidden = !busy; progress.value = fraction;
    },
  };
}
