import type { AiActivity, Backup, TerminalPreferences } from './storage/schema';
import { validateBackup } from './storage/schema';
import { worldContext, residentContext } from './storage/repository';
import type { CommandActions } from './commands';
import { profileFields, profileLabels } from './commands';
import { activeHuman } from './forums';
import { mailCorrespondent } from './mail';
import { about, keyboardHelp } from './settings';
import { models, residentProfiles } from './ai/personas';
import type { ResidentProfile } from './ai/personas';
import { ACTIVITY_SETTING, setupContext } from './ai/activity';
import { modelDisclosure } from './ai/setup';
import { canPopulateCommunity } from './storage/community';
import { chooseBackup, downloadText } from './storage/controls';
import type { createSettingsActions } from './settings-actions';
import type { createOfflineControls } from './offline/controls';

interface SettingsActions extends Pick<CommandActions, 'repository' | 'read' | 'restore' | 'reset' | 'preferences' | 'sessionTimes' | 'log' | 'ai'> {
  settings: ReturnType<typeof createSettingsActions>;
  offline: ReturnType<typeof createOfflineControls>;
  run<T>(action: () => Promise<T>): Promise<T>;
  focus(): void;
  composing(): boolean;
}

/** Modern application chrome. It never submits a service command or owns a draft. */
export function mountSettings(root: HTMLElement, actions: SettingsActions) {
  const dialog = document.createElement('dialog');
  dialog.className = 'settings-dialog';
  dialog.setAttribute('aria-labelledby', 'settings-heading');
  dialog.innerHTML = `
    <header class="settings-header"><h2 id="settings-heading">設定 / Options</h2>
      <button type="button" class="close-settings" autofocus>閉じる</button></header>
    <p>アプリの設定です。PC-VAN 内の閲覧・ハンドル登録・投稿は端末で操作します。</p>
    <p class="settings-message" role="status" aria-live="polite"></p>
    <section class="settings-confirmation" aria-label="操作の確認" hidden>
      <pre class="confirmation-copy" id="settings-confirmation-copy"></pre>
      <button type="button" class="confirm-action" aria-describedby="settings-confirmation-copy">同意して実行</button>
      <button type="button" class="cancel-action">中止</button>
      <button type="button" class="confirmation-backup">先に JSON を保存</button>
    </section>
    <details class="display-panel" open><summary>表示・端末</summary>
      <form class="display-form">
        <label>表示色<select name="theme"><option value="white">白</option><option value="green">緑</option><option value="amber">琥珀</option></select></label>
        <label>表示速度<select name="speed">${['300', '1200', '2400', '9600', 'instant'].map((value) => `<option value="${value}">${value === 'instant' ? '即時' : value + ' bps'}</option>`).join('')}</select></label>
        <label><input name="effects" type="checkbox">光彩・走査線</label>
        <button type="submit">表示設定を保存</button>
      </form>
      <p class="session-times"></p><button type="button" class="download-log">端末ログを保存</button>
    </details>
    <details class="ai-panel"><summary>AIモデル・活動</summary>
      <p>モデルの準備後は生活時間に沿って自動で投稿・返信・メール送信します。すぐに投稿するとは限りません。モデルの準備は任意です。WebGPU 対応ブラウザーの HTTPS / localhost と十分な GPU メモリが必要です。</p>
      <label>モデル<select class="model-select"></select></label>
      <div class="settings-buttons"><button type="button" class="load-model">モデルを読み込む</button>
        <button type="button" class="stop-model">処理を中止・モデルを解放</button>
        <button type="button" class="defer-model">あとで準備</button>
        <button type="button" class="model-cache">モデルの保存状態を確認</button></div>
      <pre class="ai-status" role="status" aria-live="polite"></pre>
      <form class="activity-form"><label>6時間の自動投稿上限（メールを含む、0で休止、最大12）<input name="maxPosts" type="number" min="0" max="12" required></label>
        <button type="submit">活動設定を保存</button></form>
      <button type="button" class="retry-activity">未完了の活動を再試行</button>
      <details><summary>住人のプロフィール・生活時間</summary>
        <label>編集する住人<select class="resident-select"></select></label>
        <form class="resident-form">${profileFields.map((key, i) => `<label>${profileLabels[i]}<textarea name="${key}" rows="2"></textarea></label>`).join('')}
          <p>配列はカンマ区切り。親しさは JSON。保存時に範囲・内容を検証します。</p>
          <button type="submit">住人の設定を保存</button><button type="button" class="cancel-resident">変更を破棄</button></form>
      </details>
    </details>
    <details class="mail-sample-panel"><summary>Internetメールの創作サンプル</summary>
      <p>選択中の人間会員に、架空の差出人 observer@letters.example.invalid からの手紙を1通だけローカルに追加します。実際の受信や外部接続はありません。返信も明示した場合だけブラウザー内に保存し、外部へ送信しません。同じ会員への追加は繰り返しても1通です。</p>
      <p class="mail-sample-recipient"></p><button type="button" class="load-mail-sample">創作メールをローカルに追加</button>
    </details>
    <details class="storage-panel"><summary>ローカルデータ・保守</summary>
      <p>JSON は投稿・メール（INET#外部宛先・手紙を含む）・ローカルNetNews記事・会員・既読・設定・履歴・出自を含みます。モデルの重みと端末キャッシュ、未送信の下書き、ECOMの郵便内容・模擬受付票は含みません。外部に保存してください。</p>
      <div class="settings-buttons"><button type="button" class="export-json">JSON を保存</button>
        <button type="button" class="import-json">JSON から復元</button><button type="button" class="populate-world" hidden>初期会話を追加</button><button type="button" class="reset-world">初期状態に戻す</button></div>
      <h3>オフライン・保存領域</h3><p>端末とモデルの重みは別の保存です。端末の保存ではモデルを取得しません。</p>
      <div class="settings-buttons"><button type="button" class="cache-shell">端末をオフライン用に保存</button>
        <button type="button" class="storage-status">保存状態・容量を確認</button><button type="button" class="persist-storage">永続保存を要求</button></div>
      <pre class="storage-status-text" role="status"></pre>
    </details>
    <details class="about-panel"><summary>操作案内・詳細・出自</summary><pre class="settings-help"></pre><pre class="settings-about"></pre></details>
  `;
  root.append(dialog);
  const query = <T extends HTMLElement = HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
  const trigger = root.querySelector<HTMLButtonElement>('.open-settings')!;
  const cue = root.querySelector<HTMLButtonElement>('.prepare-model')!;
  const display = query<HTMLFormElement>('.display-form');
  const activityForm = query<HTMLFormElement>('.activity-form');
  const residentForm = query<HTMLFormElement>('.resident-form');
  const modelSelect = query<HTMLSelectElement>('.model-select');
  const residentSelect = query<HTMLSelectElement>('.resident-select');
  const field = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(form: HTMLFormElement, name: string) => form.elements.namedItem(name) as T;
  for (const model of models) modelSelect.add(new Option(model.label, model.id));
  let snapshot: Backup | undefined;
  let profile: ResidentProfile | undefined;
  let profileDirty = false;
  let profileContext = '';
  let epoch = 0;
  let composing = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let confirmation: (() => Promise<void>) | undefined;
  let confirmationContext = '';
  let confirmationKind: 'model' | 'world' = 'world';
  let confirming = false;
  let busyEpoch: number | undefined;
  let lastSettings = '';
  function message(text: string) { query('.settings-message').textContent = text; }
  function updateStatus() {
    const text = actions.ai.status().join('\n');
    if (query('.ai-status').textContent !== text) query('.ai-status').textContent = text;
  }
  function clearConfirmation() {
    confirmation = undefined;
    const panel = query('.settings-confirmation');
    const ownsFocus = panel.contains(document.activeElement);
    panel.hidden = true;
    for (const section of dialog.querySelectorAll<HTMLElement>(':scope > details')) section.inert = false;
    if (ownsFocus && dialog.open) query('.close-settings').focus();
  }
  function options(select: HTMLSelectElement, rows: readonly { id: string; label: string }[]) {
    const value = select.value;
    if (JSON.stringify(Array.from(select.options, (o) => [o.value, o.text])) === JSON.stringify(rows.map((r) => [r.id, r.label]))) return;
    select.replaceChildren(...rows.map((row) => new Option(row.label, row.id)));
    if (rows.some((row) => row.id === value)) select.value = value;
  }
  function editResident() {
    if (!snapshot) return;
    profileDirty = false;
    profile = structuredClone(residentProfiles(snapshot).find((row) => row.id === residentSelect.value));
    profileContext = residentContext(snapshot);
    for (const key of profileFields) {
      const value = profile?.[key];
      field<HTMLTextAreaElement>(residentForm, key).value = Array.isArray(value) ? value.join(',') :
        typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    }
  }
  function refresh(content: Backup) {
    snapshot = content;
    const activity = content.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
    cue.hidden = !!activity?.consent || !!activity?.setupDeferred;
    query('.populate-world').hidden = !canPopulateCommunity(content);
    const recipient = content.members.find((m) => m.id === activeHuman(content));
    query('.mail-sample-recipient').textContent = recipient ? `追加先：${mailCorrespondent(recipient)}` :
      '人間会員が未登録です。端末の HANDLE で登録、または既存のハンドルを選択してから追加してください。';
    if (!dialog.open) return;
    if (confirmation && (confirmationKind === 'model' ? setupContext(content) : worldContext(content)) !== confirmationContext) {
      clearConfirmation(); message('世界や設定が変わりました。現在の設定から確認し直してください。');
    }
    const saved = JSON.stringify([actions.preferences(), activity?.modelId, activity?.maxPosts]);
    if (saved !== lastSettings) {
      lastSettings = saved;
      const preferences = actions.preferences();
      field<HTMLSelectElement>(display, 'theme').value = preferences.theme;
      field<HTMLSelectElement>(display, 'speed').value = preferences.speed;
      field<HTMLInputElement>(display, 'effects').checked = preferences.effects;
      modelSelect.value = activity?.modelId ?? models[0].id;
      field<HTMLInputElement>(activityForm, 'maxPosts').value = String(activity?.maxPosts ?? 0);
    }
    const residents = residentProfiles(content).map((row) => ({ id: row.id, label: row.handle }));
    options(residentSelect, residents);
    query('.session-times').textContent = actions.sessionTimes();
    query('.settings-help').textContent = keyboardHelp.join('\n');
    query('.settings-about').textContent = about(content).join('\n');
    if (!profileDirty) editResident();
    updateStatus();
  }
  residentForm.addEventListener('input', () => { profileDirty = true; });
  async function execute(action: () => Promise<unknown> | unknown) {
    if (busyEpoch === epoch || composing) return;
    const accepted = epoch;
    busyEpoch = accepted;
    try { await action(); }
    catch (error) { if (accepted === epoch && dialog.open) message(`操作できませんでした。${String(error)}`); }
    finally { if (busyEpoch === accepted) busyEpoch = undefined; updateStatus(); }
  }
  function click(selector: string, action: () => Promise<unknown> | unknown) {
    query(selector).addEventListener('click', () => { void execute(action); });
  }
  function submit(form: HTMLFormElement, action: () => Promise<unknown>) {
    form.addEventListener('submit', (event) => { event.preventDefault(); void execute(action); });
  }
  function confirm(kind: 'model' | 'world', content: Backup, text: string[], action: () => Promise<void>, label = '同意して実行') {
    if (!dialog.open) return;
    confirmationKind = kind;
    confirmationContext = kind === 'model' ? setupContext(content) : worldContext(content);
    confirmation = action;
    query('.confirmation-copy').textContent = text.join('\n');
    query('.confirm-action').textContent = label;
    query('.confirmation-backup').hidden = kind === 'model';
    query('.settings-confirmation').hidden = false;
    for (const section of dialog.querySelectorAll<HTMLElement>(':scope > details')) section.inert = true;
    query('.confirm-action').focus();
  }
  async function exportJson() {
    downloadText(await actions.run(async () => (await actions.repository()).exportJson()), 'backup');
    message('JSON のダウンロードを開始しました。');
  }
  click('.export-json', exportJson); click('.confirmation-backup', exportJson);
  click('.download-log', () => downloadText(actions.log(), 'terminal'));
  submit(display, async () => {
    const value: TerminalPreferences = { version: 1, theme: field<HTMLSelectElement>(display, 'theme').value as TerminalPreferences['theme'],
      speed: field<HTMLSelectElement>(display, 'speed').value as TerminalPreferences['speed'], effects: field<HTMLInputElement>(display, 'effects').checked };
    await actions.run(() => actions.settings.display(value)); message('表示設定を保存しました。');
  });
  modelSelect.addEventListener('change', () => { void execute(async () => {
    const modelId = modelSelect.value;
    const content = await actions.read();
    const state = content.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
    await actions.run(() => actions.settings.activity(state?.maxPosts ?? 0, modelId));
    message('モデルを選択しました。読込には同意が必要です。');
  }); });
  submit(activityForm, async () => {
    const maxPosts = Number(field<HTMLInputElement>(activityForm, 'maxPosts').value);
    const modelId = modelSelect.value;
    await actions.run(() => actions.settings.activity(maxPosts, modelId));
    message(maxPosts ? '自動投稿を有効にしました。モデル読込への同意は別に必要です。' : '自動投稿を休止しました。');
  });
  click('.load-model', async () => {
    const accepted = epoch, modelId = modelSelect.value, content = await actions.read(), expected = setupContext(content);
    if (accepted !== epoch) return;
    confirm('model', content, modelDisclosure(modelId).slice(0, -1), async () => { void actions.ai.load(modelId, expected); }, '同意してモデルを読み込む');
  });
  // Cancellation must stay available while a load/generation or file picker is pending.
  query('.stop-model').addEventListener('click', () => { actions.ai.stop(); updateStatus(); });
  click('.defer-model', async () => {
    const content = await actions.read();
    await actions.run(() => actions.settings.defer(setupContext(content)));
    message('モデル準備を延期しました。設定からいつでも再開できます。');
  });
  click('.model-cache', () => actions.ai.checkCache(modelSelect.value));
  click('.retry-activity', () => { void actions.ai.retry(); });
  residentSelect.addEventListener('change', editResident);
  click('.cancel-resident', editResident);
  submit(residentForm, async () => {
    if (!profile) return;
    const edited = structuredClone(profile);
    for (const key of profileFields) {
      const raw = field<HTMLTextAreaElement>(residentForm, key).value;
      const value = Array.isArray(edited[key]) ? (raw.trim() ? raw.split(',').map((part) => key.endsWith('Hours') ? Number(part.trim()) : part.trim()) : []) :
        typeof edited[key] === 'number' ? Number(raw) : key === 'affinities' ? JSON.parse(raw) : raw;
      Object.assign(edited, { [key]: value });
    }
    const expected = profileContext;
    await actions.run(() => actions.settings.resident(edited, expected));
    editResident(); message('住人の設定を保存しました。次の予定から反映します。');
  });
  click('.import-json', async () => {
    const accepted = epoch;
    const content = await actions.read(), expected = worldContext(content);
    if (accepted !== epoch || !dialog.open) return;
    const text = await chooseBackup(dialog);
    if (accepted !== epoch || !dialog.open) return;
    if (text === null) { message('ファイル選択を中止しました。'); return; }
    const parsed: unknown = JSON.parse(text); validateBackup(parsed);
    const latest = await actions.read();
    if (accepted !== epoch || !dialog.open) return;
    if (worldContext(latest) !== expected) throw new Error('世界や設定が変わりました。ファイルを選び直してください。');
    confirm('world', content, ['投稿・メール・ローカルNetNews記事・会員・既読・設定・履歴をこの JSON で置き換えます。取り消せません。',
      '未送信の下書きも失われます。必要なら先に JSON を保存してください。', 'モデルの重み・端末キャッシュは保持します。'], async () => {
      await actions.run(() => actions.restore(text, expected));
      close();
    }, '置き換えて復元する');
  });
  click('.load-mail-sample', async () => {
    const accepted = epoch, content = await actions.read(), recipientId = activeHuman(content);
    if (accepted !== epoch || !dialog.open) return;
    if (!recipientId) { message('端末の HANDLE で人間会員を登録・選択してください。会員は自動作成しません。'); return; }
    const expected = worldContext(content);
    confirm('world', content, [`追加先：${mailCorrespondent(content.members.find((m) => m.id === recipientId))}`,
      '架空のInternetメールを1通だけローカルに追加します。実際の受信ではありません。JSON と表示した端末ログにも含まれます。'], async () => {
      await actions.run(async () => { await (await actions.repository()).loadInternetSample(recipientId, expected); });
      refresh(await actions.read()); message('創作メールをローカルに追加しました（既存なら重複しません）。端末の MAIN 1 / MAIN X / SIG MAIL → INBOX で読めます。');
    }, '創作メールを追加する');
  });
  click('.populate-world', async () => {
    const accepted = epoch, content = await actions.read();
    if (accepted !== epoch) return;
    confirm('world', content, ['空の掲示板に最大66件・18話題の創作を追加します。モデルは取得しません。'], async () => {
      await actions.run(async () => { await (await actions.repository()).populateEmptyCommunity({ confirmPopulate: true }); });
      refresh(await actions.read());
    }, '初期会話を追加する');
  });
  click('.reset-world', async () => {
    const accepted = epoch, content = await actions.read(), expected = worldContext(content);
    if (accepted !== epoch) return;
    confirm('world', content, ['投稿・メール・ローカルNetNews記事・会員・既読・住人編集・活動設定・モデル同意・表示設定・履歴・未送信の下書きを削除します。取り消せません。',
      '必要なら先に JSON を保存してください。最初の10人・72件の投稿と電子会議室の3件を準備し、他のタブも再読み込みします。NetNewsの同梱6件は残ります。',
      'モデルの重み・端末キャッシュは保持します。AI には再同意が必要です。'], () => actions.run(() => actions.reset(expected)), '初期状態に戻す');
  });
  click('.cache-shell', () => actions.offline.cache());
  click('.storage-status', () => { query('.storage-status-text').textContent = ''; return actions.offline.storage(); });
  click('.persist-storage', () => actions.offline.persist());
  click('.confirm-action', async () => {
    if (!confirmation || confirming) return;
    const action = confirmation, expected = confirmationContext, kind = confirmationKind;
    const current = await actions.read();
    if (confirmation !== action || (kind === 'model' ? setupContext(current) : worldContext(current)) !== expected) {
      clearConfirmation(); throw new Error('世界や設定が変わりました。確認し直してください。');
    }
    clearConfirmation(); confirming = true;
    try { await action(); } finally { confirming = false; }
  });
  click('.cancel-action', () => { clearConfirmation(); message('操作を中止しました。'); query('.close-settings').focus(); });
  function close() {
    if (!dialog.open) return;
    epoch++; clearConfirmation(); clearInterval(timer); composing = false;
    dialog.close(); actions.focus();
  }
  function open(panel?: string) {
    if (actions.composing()) { actions.focus(); return; }
    if (!dialog.open) {
      epoch++; lastSettings = ''; message(''); dialog.showModal();
      if (snapshot) refresh(snapshot);
      editResident();
      timer = setInterval(updateStatus, 250);
      const accepted = epoch;
      void actions.read().then((content) => { if (accepted === epoch && dialog.open) { refresh(content); } })
        .catch((error) => { if (accepted === epoch) message(`設定を読み込めません。${String(error)}`); });
    }
    if (panel) { query<HTMLDetailsElement>(`.${panel}-panel`).open = true; query(`.${panel}-panel summary`).focus(); }
  }
  trigger.addEventListener('click', () => open());
  cue.addEventListener('click', () => open('ai'));
  query('.close-settings').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); if (!composing) close(); });
  dialog.addEventListener('compositionstart', () => { composing = true; });
  dialog.addEventListener('compositionend', () => { composing = false; });
  dialog.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === 'Escape') && (composing || event.isComposing || event.keyCode === 229)) event.preventDefault();
    if (event.key !== 'Tab') return;
    // Keep keyboard focus in the modal even at the boundaries in all browsers.
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, select, input, textarea, summary'))
      .filter((element) => element.getClientRects().length && !element.closest('[inert]') && !(element as HTMLButtonElement).disabled);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  return {
    refresh,
    showError(error: unknown) { message(`設定を更新できません。${String(error)}`); },
    get open() { return dialog.open; },
    report(kind: 'ai' | 'offline', ...text: string[]) {
      if (kind === 'offline') query('.storage-status-text').textContent += text.join('\n') + '\n';
      updateStatus();
    },
  };
}
