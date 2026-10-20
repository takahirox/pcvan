import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import sigEvidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };

/** Relocate existing controls without replacing their state or event handlers. */
export function mountSettings(root: HTMLElement) {
  const trigger = root.querySelector<HTMLButtonElement>('.open-settings')!;
  const dialog = document.createElement('dialog');
  dialog.id = 'settings-dialog';
  dialog.className = 'settings-dialog';
  dialog.setAttribute('aria-labelledby', 'settings-heading');
  dialog.innerHTML = `
    <header class="settings-header"><h2 id="settings-heading">設定 / Options</h2>
      <button type="button" class="close-settings" autofocus>閉じる</button></header>
    <div class="settings-panels"></div>
    <details class="about-controls">
      <summary>このシステムについて / 出典・制約</summary>
      <p>ブラウザー内だけで動く PC-VAN の再構成です。実際の通信回線には接続しません。
        史実の完全な複製ではありません。接続文・待ち時間・表示速度・配色は創作の演出です。</p>
      <p>MAIN の項目とプロンプトは1996年頃の回顧転記（C / provisional）です。
        1997年全期間への適用は未確認。2列配置は再構成です。</p>
      <p>MITI の J MITI → 3 → 9 は1996年の経路記述（B / verified）で確認しています。
        画面・配置・プロンプトや他のコマンドは確認できていません。</p>
      <p>DAISIZEN は年代不明のアーカイブ構成（B / provisional）です。
        山のフォーラムは1992年に独立との記述があり、1996–1997年への適用は暫定です。
        コミュニケーションの 1 / 2、FORUMS、MAIL / LIBRARY / CONFERENCE / OLT / OSL、
        MAIN / BACK / HELP / RECONNECT、LIST / READ / WRITE / REPLY は創作の橋渡し・操作補助です。
        英字の大小文字や余分な空白の許容も操作補助です。未実装のサービスは利用できません。</p>
      <p>投稿ヘッダーは保存史料（A / verified）を参考に再構成しています。日時は UTC です。
        / の後の数の意味・行数の算定規則は未確認です。</p>
      <p>DEMO0001〜DEMO0003 は架空の見本投稿（D / reconstructed）です。
        ID・日時・タイトル・本文は創作で、歴史上の実在会員・投稿ではありません。
        ローカル利用者の投稿も史料ではありません。既読は利用者ごとの最大番号を保存し、見本投稿は対象外です。</p>
      <p>ローカル AI の人格・投稿・自動活動はすべて架空です。会員 ID の fictional-ai:、actor、
        投稿の origin で識別でき、AI 設定内で詳細を確認できます。架空の活動の時刻は生成時刻と異なる場合があります。</p>
      <p>端末書体は手元の等幅ゴシックを使う現代の表示です。当時の PC-VAN 専用フォントではありません。
        書体がない環境ではブラウザーの等幅フォントを使用します。</p>
      <ul>
        <li><a href="https://github.com/takahirox/pcvan/blob/main/docs/research/pcvan-1996-1997.md" target="_blank" rel="noopener">史料・年代・不確実性の調査記録</a></li>
        <li><a class="main-source" target="_blank" rel="noopener">MAIN の回顧転記</a></li>
        <li><a class="miti-source" target="_blank" rel="noopener">MITI の経路記述</a></li>
        <li><a class="daisizen-source" target="_blank" rel="noopener">DAISIZEN のアーカイブ構成</a></li>
        <li><a href="https://www.rumic.org/forum/rumicworld/rumic2491.html" target="_blank" rel="noopener">投稿ヘッダーの保存史料</a></li>
        <li><a href="https://github.com/takahirox/pcvan/blob/main/data/pcvan/demo-posts.json" target="_blank" rel="noopener">見本投稿の原文・来歴</a></li>
      </ul>
    </details>
  `;
  root.append(dialog);
  for (const [name, href] of [['main', mainMenu.source_url], ['miti', sigEvidence.miti.source_url], ['daisizen', sigEvidence.daisizen.source_url]]) {
    dialog.querySelector<HTMLAnchorElement>(`.${name}-source`)!.href = href!;
  }
  const notice = document.createElement('span');
  notice.className = 'settings-notice sr-only';
  notice.id = 'settings-notice';
  trigger.setAttribute('aria-describedby', notice.id);
  notice.setAttribute('role', 'status');
  root.append(notice);
  let previous: HTMLElement | null = null;
  function open(panel?: string) {
    if (!dialog.open) {
      // A composer owns keyboard focus until it is closed.
      if (root.querySelector('dialog[open]')) return;
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      trigger.textContent = '設定 / Options';
      notice.textContent = '';
    }
    if (panel) {
      const section = dialog.querySelector<HTMLElement>(`.${panel}-controls`);
      const details = section instanceof HTMLDetailsElement ? section : section?.querySelector('details');
      if (details) { details.open = true; details.querySelector('summary')!.focus(); }
    }
  }
  trigger.addEventListener('click', () => open());
  function close() {
    if (!dialog.open) return;
    dialog.close();
    composing = false;
    (previous?.isConnected ? previous : root.querySelector<HTMLElement>('#command'))?.focus({ preventScroll: true });
  }
  dialog.querySelector('.close-settings')!.addEventListener('click', close);
  // Escape keeps its native modal behavior, except during IME confirmation.
  let composing = false;
  dialog.addEventListener('compositionstart', () => { composing = true; });
  dialog.addEventListener('compositionend', () => { composing = false; });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (composing || event.isComposing || event.keyCode === 229)) event.preventDefault();
    if (event.key === 'Tab') {
      const stops = [...dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], summary, [tabindex]')]
        .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.checkVisibility());
      const first = stops[0];
      const last = stops.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!composing) close();
  });
  return {
    open, close,
    collect() {
      // The editor remains a sibling modal, never inside the Settings dialog.
      const composer = root.querySelector<HTMLDialogElement>('.member-controls dialog')!;
      root.append(composer);
      const panels = dialog.querySelector('.settings-panels')!;
      for (const selector of ['.display-controls', '.member-controls', '.ai-controls', '.storage-controls', '.offline-controls', '.help-controls']) {
        panels.append(root.querySelector(selector)!);
      }
      // Preserve detailed progress/errors in their original controls. Background
      // changes get one discreet, accessible indication outside the closed modal.
      const messages = dialog.querySelectorAll<HTMLElement>('.ai-message, .ai-activity-message, .ai-cache-status, .member-message, .storage-status, .shell-status');
      const lastText = new Map([...messages].map((message) => [message, message.textContent]));
      const observer = new MutationObserver(() => {
        const changed = [...messages].filter((message) => {
          const text = message.textContent;
          const previous = lastText.get(message);
          lastText.set(message, text);
          return text && text !== previous && !/^(ローカル保存を利用できます|架空の活動は無効)/.test(text);
        });
        if (dialog.open || !changed.length) return;
        trigger.textContent = '設定 / Options •';
        notice.textContent = `${changed[0]!.closest('.ai-controls') ? 'AI' : '保存'}の状態が更新されました。設定で確認できます。`;
      });
      messages.forEach((message) => observer.observe(message, { childList: true, characterData: true, subtree: true }));
    },
  };
}
