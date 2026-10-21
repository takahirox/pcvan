import { WORLD_SETTING } from '../storage/schema';
import type { AiActivity, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, MAX_SESSION_POSTS, setupContext, migrateActivity } from './activity';
import { runActivityBatch } from './activity-runner';
import { mountAiSetup } from './setup';
import type { ActivityActions } from './activity-runner';
import { models, personas, residentProfiles } from './personas';
import type { ResidentProfile } from './personas';
import { buildPrompt, checkRequest, requireWebGpu, validateGeneration } from './generation';
import type { AdapterFactory, GenerationRequest, LocalLlmAdapter } from './generation';

interface AiActions {
  read(): Promise<Backup>;
  save(request: GenerationRequest, raw: string, modelId: string): Promise<void>;
  activity?: ActivityActions;
  deferSetup?(expected: string): Promise<void>;
  inspect?(): void;
}

/** Kept outside the historical terminal. Dependencies are injectable for GPU-free tests. */
export function mountAiControls(root: HTMLElement, actions: AiActions,
  factory: AdapterFactory = async () => (await import('./webllm-adapter')).createWebLlmAdapter(),
  supported = requireWebGpu(),
  probeCache: (modelId: string) => Promise<boolean> = async (id) =>
    (await import('./webllm-adapter')).modelWeightsCached(id)) {
  const section = document.createElement('details');
  section.className = 'ai-controls';
  section.innerHTML = `
    <summary>ローカル AI 設定・投稿の出自</summary>
    <p>任意の機能です。全員が架空の AI 人格です。履歴上の実在会員ではありません。</p>
    <p>初回のモデル読込は数百 MB〜数 GB の通信・ブラウザー保存と GPU メモリを使います。
      モデルファイルは配布元 (Hugging Face / MLC) から取得します。推論と投稿データの処理はこの端末内です。
      外部推論・API キーは使いません。日本語の品質はモデルと機器により異なります。</p>
    <p>初回のモデル設定時に、小さな空のローカル掲示板を用意します。復元済みの世界は変更しません。
      文脈は同じ掲示板の直近最大 4 件のローカル創作投稿の抜粋です。</p>
    <div class="ai-fields">
      <label>AI モデル <select class="ai-model"></select></label>
      <button type="button" class="ai-cache-check">選択モデルの保存を確認</button>
      <p class="ai-cache-status" role="status"></p>
      <button type="button" class="ai-load">モデルを読み込む（初回ダウンロード）</button>
      <button type="button" class="ai-stop">AI を停止・解放</button>
      <label>モデル読込の進捗 <progress class="ai-progress" max="1" value="0"></progress></label>
      <label>架空の AI 人格 <select class="ai-persona"></select></label>
      <p class="ai-profile"></p>
      <details class="ai-resident-editor"><summary>この住人を編集</summary>
        <form class="ai-resident-form">
          <label>住人のハンドル <input name="handle" maxlength="40" required></label>
          <label>職業 <input name="occupation" maxlength="80" required></label>
          <label>生活・仕事・睡眠の習慣 <input name="routine" maxlength="240" required></label>
          <label>人物像・文体 <input name="profile" maxlength="300" required></label>
          <label>興味（カンマ区切り） <input name="interests" required></label>
          <label>好みの掲示板（MITI:9, DAISIZEN:1 または掲示板 ID） <input name="preferredBoards"></label>
          <label>平日の接続時間（0〜23、カンマ区切り） <input name="weekdayHours"></label>
          <label>休日の接続時間（0〜23、カンマ区切り） <input name="weekendHours"></label>
          <label>UTC からの時差（分、日本は540、夏時間の自動切替なし） <input name="utcOffsetMinutes" type="number" min="-720" max="840" required></label>
          <label>活動頻度（0で休止、標準1） <input name="frequency" type="number" min="0" max="3" step="0.05" required></label>
          <label>訪問の確率（0〜1） <input name="participation" type="number" min="0" max="1" step="0.05" required></label>
          <label>読む重み <input name="reading" type="number" min="0" max="1" step="0.05" required></label>
          <label>新しい話題の重み <input name="newThread" type="number" min="0" max="1" step="0.05" required></label>
          <label>返信の重み <input name="reply" type="number" min="0" max="1" step="0.05" required></label>
          <label>何もしない重み <input name="inactivity" type="number" min="0" max="1" step="0.05" required></label>
          <p>仕事・睡眠中は訪問が少なくなります。数日留守にすることもあります。重みは相対値です。</p>
          <button class="ai-resident-save" type="submit">この住人の設定を保存</button>
        </form>
      </details>
      <label>AI 投稿先 <select class="ai-forum"></select></label>
      <label>AI 返信先 <select class="ai-reply"></select></label>
      <button type="button" class="ai-generate">AI 投稿案を生成</button>
    </div>
    <p class="ai-message" aria-live="polite"></p>
    <pre class="ai-preview" hidden></pre>
    <button type="button" class="ai-send" hidden>この AI 投稿を保存</button>
    <button type="button" class="ai-discard" hidden>AI 投稿案を破棄</button>
    <h2>10人の住人の自動活動</h2>
    <p>新しい世界では自動活動が有効です。AI 設定が必要：上のモデル読込ボタンで初回ダウンロードに同意してください。
      ページを開いている間は約1分ごとに予定を確認します。閉じている間は動かず、再度開いた時に最大72時間の一部を時刻順に再現します。
      投稿時刻は創作です。上限はこのページの滞在全体に適用され、再接続では増えません。生成の試行は手動の投稿案を含めて最大12回です。</p>
    <label>1 回の滞在で自動保存する上限 (0〜12、0で休止)
      <input class="ai-activity-cap" type="number" min="0" max="12" step="1" value="4"></label>
    <button type="button" class="ai-activity-save">上限と選択モデルを保存</button>
    <button type="button" class="ai-activity-disable">架空の活動を無効にする</button>
    <button type="button" class="ai-activity-retry">未完了の架空の活動を再試行</button>
    <label>架空の活動の進捗 <progress class="ai-activity-progress" max="1" value="0"></progress></label>
    <p class="ai-activity-message" aria-live="polite"></p>
    <ul class="ai-runs"></ul>
    <h2>AI の識別情報・保存済み投稿</h2>
    <p>表示ハンドルのほか、会員 ID / actor と投稿の origin で AI を識別できます。</p>
    <ul class="ai-identities"></ul>
    <ul class="ai-records"></ul>
  `;
  root.append(section);
  const get = <T extends Element>(name: string) => section.querySelector<T>(`.ai-${name}`)!;
  const model = get<HTMLSelectElement>('model');
  const persona = get<HTMLSelectElement>('persona');
  const forum = get<HTMLSelectElement>('forum');
  const reply = get<HTMLSelectElement>('reply');
  const load = get<HTMLButtonElement>('load');
  const stop = get<HTMLButtonElement>('stop');
  const generate = get<HTMLButtonElement>('generate');
  const send = get<HTMLButtonElement>('send');
  const discard = get<HTMLButtonElement>('discard');
  const preview = get<HTMLElement>('preview');
  const message = get<HTMLElement>('message');
  const progress = get<HTMLProgressElement>('progress');
  const cap = get<HTMLInputElement>('activity-cap');
  const activitySave = get<HTMLButtonElement>('activity-save');
  const activityDisable = get<HTMLButtonElement>('activity-disable');
  const retry = get<HTMLButtonElement>('activity-retry');
  const activityMessage = get<HTMLElement>('activity-message');
  const activityProgress = get<HTMLProgressElement>('activity-progress');
  const cacheCheck = get<HTMLButtonElement>('cache-check');
  const cacheStatus = get<HTMLElement>('cache-status');
  for (const row of models) model.add(new Option(row.label, row.id));
  for (const row of personas) persona.add(new Option(`${row.handle} — 架空の AI (${row.id})`, row.id));
  for (const row of personas) {
    const item = document.createElement('li');
    item.textContent = `${row.handle} / ${row.id}: ${row.profile}`;
    get('identities').append(item);
  }
  let content: Backup | undefined;
  let adapter: LocalLlmAdapter | undefined;
  let loadedModel: string | undefined;
  let operation: AbortController | undefined;
  let saving = false;
  let checking = false;
  let cacheCheckId = 0;
  let draft: { raw: string; request: GenerationRequest; modelId: string } | undefined;
  let activity: AiActivity | undefined;
  let activityBusy = false;
  let autoBlocked = false;
  let releaseModelLock: (() => void) | undefined;
  let configuring = false;
  let revision = 0;
  const budget = { attempts: 0, committed: 0 };
  let authorizingContext: string | undefined;
  const setup = mountAiSetup(root, model, supported, {
    read: async () => {
      const before = revision;
      try {
        let snapshot = await actions.read();
        if (revision !== before) return false;
        const saved = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
        if (!saved || saved.version === 1) {
          await actions.activity?.openActivity();
          snapshot = await actions.read();
          if (revision !== before) return false;
        }
        refresh(snapshot);
        return true;
      } catch (error) { failure(error); return false; }
    },
    load: loadModel,
    defer: async (expected) => {
      try { await actions.deferSetup?.(expected); refresh(await actions.read()); }
      catch (error) { failure(error); }
    },
    inspect: () => actions.inspect?.(),
    stop: () => stop.click(),
  });
  // Status is shared with the existing controls, including asynchronous failures.
  new MutationObserver(() => showSetup()).observe(section, { childList: true, characterData: true, subtree: true });
  function showSetup() {
    setup.show(!!loadedModel, !!operation, !stop.disabled, progress.value,
      message.textContent ?? '');
  }

  function buttons() {
    model.disabled = persona.disabled = forum.disabled = reply.disabled = saving || !!operation;
    load.disabled = !supported || saving || !!operation;
    generate.disabled = !loadedModel || !forum.value || saving || !!operation || budget.attempts >= MAX_SESSION_POSTS;
    stop.disabled = saving || (!adapter && !operation);
    send.disabled = discard.disabled = saving || !!operation;
    activitySave.disabled = cap.disabled = !actions.activity || saving || !!operation || configuring;
    activityDisable.disabled = !actions.activity || configuring;
    retry.disabled = !supported || !actions.activity || saving || !!operation || activityBusy || configuring ||
      !activity?.maxPosts || !activity.batch?.runs.some((run) => run.status !== 'committed') ||
      budget.attempts >= MAX_SESSION_POSTS || budget.committed >= activity.maxPosts;
    cacheCheck.disabled = checking || saving || !!operation;
    get<HTMLButtonElement>('resident-save').disabled = !actions.activity || saving || !!operation || configuring;
    showSetup();
  }
  function unknownCache() {
    cacheCheckId++; checking = false;
    cacheStatus.textContent = '選択モデルの重み：未確認です。端末の保存だけでは AI をオフライン利用できません。';
  }
  async function checkCache() {
    const id = ++cacheCheckId;
    const selected = model.value;
    checking = true; buttons();
    cacheStatus.textContent = '選択モデルの重みを確認しています（重みのダウンロードはしません）…';
    try {
      const cached = await probeCache(selected);
      if (id !== cacheCheckId) return;
      cacheStatus.textContent = cached
        ? '選択モデルの重み：保存済みです。設定・トークナイザー・実行ファイルの欠落や削除、GPU の状態によりオフライン読込が失敗する場合があります。利用可能かはモデル読込で確認します。'
        : '選択モデルの重み：未保存または不完全です。オフライン AI は利用できません。オンラインで明示的にモデルを読み込んでください。';
    } catch {
      if (id === cacheCheckId) cacheStatus.textContent = '選択モデルの保存状態を確認できません。実行ファイルの未保存や保存領域の制限が考えられます。オフライン AI は保証できません。端末・手動投稿は利用できます。';
    } finally { if (id === cacheCheckId) { checking = false; buttons(); } }
  }
  function clearDraft() { draft = undefined; preview.hidden = send.hidden = discard.hidden = true; preview.textContent = ''; }
  function cancel() {
    revision++;
    authorizingContext = undefined;
    operation?.abort(); operation = undefined;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
    releaseModelLock?.(); releaseModelLock = undefined;
    progress.value = 0;
    clearDraft(); buttons();
  }
  function unavailable() {
    message.textContent = supported ? 'AI はオフです。必要な場合だけモデルを読み込んでください。'
      : 'WebGPU が利用できないため AI はオフです。対応ブラウザーの HTTPS / localhost が必要です。端末・閲覧・手動投稿は利用できます。';
  }
  function failure(error: unknown) {
    message.textContent = `AI を利用できません。オフラインで重みが未保存、GPU メモリ不足、通信・推論エラーなどが考えられます。端末・閲覧・手動投稿は利用できます。再試行はモデル読込から行ってください。 ${error instanceof Error ? error.message : String(error)}`;
  }
  function updateReplies() {
    const selected = reply.value;
    reply.replaceChildren(new Option('新規投稿（返信なし）', ''));
    for (const post of content?.posts.filter((row) => row.forumId === forum.value).sort((a, b) => a.number - b.number) ?? []) {
      reply.add(new Option(`#${post.number} ${post.title.slice(0, 120)}`, post.id));
    }
    if (Array.from(reply.options).some((option) => option.value === selected)) reply.value = selected;
  }
  const residentForm = get<HTMLFormElement>('resident-form');
  let profileSignature = '';
  function profile() {
    const row = (content ? residentProfiles(content) : personas).find((p) => p.id === persona.value)!;
    get('profile').textContent = `${row.handle} / ${row.id} — ${row.occupation}。${row.routine} ${row.profile} 仲間: ${Object.keys(row.affinities).join(', ')}`;
    const signature = JSON.stringify(row);
    if (signature === profileSignature) return;
    profileSignature = signature;
    for (const [key, value] of Object.entries(row)) {
      const input = residentForm.elements.namedItem(key);
      if (input instanceof HTMLInputElement) input.value = Array.isArray(value) ? value.join(',') : String(value);
    }
  }
  residentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!actions.activity || !content || !residentForm.reportValidity() || operation || configuring) return;
    const previous = residentProfiles(content).find((p) => p.id === persona.value)!;
    const updated = structuredClone(previous);
    const arrays = ['interests', 'preferredBoards', 'weekdayHours', 'weekendHours'];
    for (const key of Object.keys(updated) as (keyof ResidentProfile)[]) {
      const input = residentForm.elements.namedItem(key);
      if (!(input instanceof HTMLInputElement)) continue;
      const values = input.value.trim() ? input.value.split(',').map((s) => s.trim()) : [];
      Object.assign(updated, { [key]: arrays.includes(key) ? (key.endsWith('Hours') ? values.map(Number) : values)
        : input.type === 'number' ? Number(input.value) : input.value });
    }
    cancel(); configuring = true; buttons();
    try {
      showActivity(await actions.activity.configureResident(updated));
      refresh(await actions.read());
      autoBlocked = false;
      message.textContent = '住人の設定を保存しました。次の予定から反映します。過去の投稿は保持します。';
    } catch (error) { message.textContent = `住人の設定を保存できませんでした。${String(error)}`; }
    finally { configuring = false; buttons(); }
  });
  function showActivity(state: AiActivity | undefined) {
    state = state && migrateActivity(state);
    activity = state;
    cap.value = String(state?.maxPosts ?? 0);
    const runs = state?.batch?.runs ?? [];
    const done = runs.filter((run) => run.status === 'committed').length;
    activityProgress.max = Math.max(1, runs.length); activityProgress.value = done;
    activityMessage.textContent = !state?.maxPosts ? '架空の活動は無効です。自動生成はありません。'
      : !state.consent ? 'AI 設定が必要：住人の自動活動は有効です。モデル読込で初回ダウンロードに同意してください。'
      : `架空の活動 ${done}/${runs.length} 件保存済み / 滞在ごとの上限 ${state.maxPosts} 件、使用 ${budget.committed} 件・試行 ${budget.attempts}/${MAX_SESSION_POSTS} 回。${state.truncated ? '長い不在・上限のため一部の予定を省略しました。' : ''}閉じている間の実行ではありません。`;
    const list = get('runs'); list.replaceChildren();
    for (const run of runs) {
      const item = document.createElement('li');
      item.textContent = `${run.id} / ${run.status} / ${run.personaId} / ${run.forumId} / fictional=true / simulatedAt=${run.simulatedAt}`;
      list.append(item);
    }
    buttons();
  }
  profile(); unavailable(); unknownCache(); buttons();
  cacheCheck.addEventListener('click', () => { void checkCache(); });
  stop.addEventListener('click', () => { autoBlocked = true; cancel(); message.textContent = 'AI をキャンセルし、モデルを解放しました。端末・手動投稿は利用できます。'; });
  model.addEventListener('change', () => { cancel(); unavailable(); unknownCache(); buttons(); });
  persona.addEventListener('change', () => { clearDraft(); profile(); });
  forum.addEventListener('change', () => { clearDraft(); reply.value = ''; updateReplies(); buttons(); });
  reply.addEventListener('change', clearDraft);
  discard.addEventListener('click', clearDraft);

  async function loadEngine(task: AbortController, modelId: string): Promise<LocalLlmAdapter> {
    if (adapter && loadedModel === modelId) return adapter;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
    // Hold a single cross-tab model lease until unload, including manual previews.
    if (!releaseModelLock && navigator.locks) {
      await new Promise<void>((resolve, reject) => {
        void navigator.locks.request('pcvan-local-ai-model', { ifAvailable: true }, (lock) => {
          if (!lock) { reject(new Error('別のタブで AI モデルを使用中です。そちらで停止・解放してください。')); return; }
          return new Promise<void>((release) => { releaseModelLock = release; resolve(); });
        }).catch(reject);
      });
    }
    if (task.signal.aborted) { releaseModelLock?.(); releaseModelLock = undefined; task.signal.throwIfAborted(); }
    const created = await factory();
    if (task.signal.aborted) { created.dispose(); task.signal.throwIfAborted(); }
    adapter = created;
    await created.load(modelId, (fraction) => {
      if (task.signal.aborted) return;
      progress.value = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
      message.textContent = `モデル読込 ${Math.round(progress.value * 100)}%`;
    }, task.signal);
    task.signal.throwIfAborted();
    loadedModel = modelId; progress.value = 1;
    return created;
  }

  async function simulate() {
    if (!supported || !actions.activity || !activity?.maxPosts || !activity.consent || !activity.batch || operation || saving || activityBusy || draft || autoBlocked) return;
    if (!navigator.locks) { activityMessage.textContent = 'タブ間の排他制御が利用できないため自動活動を休止します。手動投稿は利用できます。'; return; }
    const state = activity;
    if (!state.batch!.runs.some((run) => run.status !== 'committed') ||
        budget.attempts >= MAX_SESSION_POSTS || budget.committed >= state.maxPosts) return;
    clearDraft();
    const task = new AbortController(); operation = task; activityBusy = true; buttons();
    message.textContent = '予定された住人の架空の活動を生成します。AI を停止・解放でキャンセルできます。';
    const run = async () => {
      task.signal.throwIfAborted();
      const engine = await loadEngine(task, state.batch!.modelId);
      message.textContent = '住人の架空の活動を生成しています。投稿は予定に従います。停止ボタンでキャンセルできます。';
      await runActivityBatch(actions.activity!, actions.read, state, engine, task.signal, budget,
        (updated) => {
          if (!task.signal.aborted || activity?.batch?.id === updated.batch?.id) showActivity(updated);
        });
    };
    try {
      // Only one tab loads/generates a batch. IDB still enforces idempotent commits.
      if (navigator.locks) {
        await navigator.locks.request('pcvan-ai-activity', { ifAvailable: true }, async (lock) => {
          if (lock) await run();
          else activityMessage.textContent = '別のタブで架空の活動を処理中です。このタブでは生成しません。';
        });
      } else await run();
      if (!task.signal.aborted) message.textContent = '架空の活動の処理を終了しました。未完了分は上限内で再試行できます。';
    } catch (error) { if (!task.signal.aborted) { autoBlocked = true; cancel(); failure(error); } }
    finally { if (operation === task) operation = undefined; activityBusy = false; buttons(); }
  }
  retry.addEventListener('click', () => { autoBlocked = false; void simulate(); });
  async function configure(maxPosts: number) {
    if (!actions.activity || configuring) return;
    cancel(); configuring = true; buttons();
    try {
      showActivity(await actions.activity.configureActivity(maxPosts, model.value));
      autoBlocked = false;
      message.textContent = maxPosts ? '架空の活動を有効にしました。これからの予定に適用します。モデル設定が未完了の場合はモデル読込が必要です。' : '架空の活動を無効にしました。';
    } catch (error) { failure(error); }
    finally { configuring = false; buttons(); }
  }
  activitySave.addEventListener('click', () => {
    if (!cap.checkValidity() || cap.value === '') { cap.reportValidity(); return; }
    void configure(Number(cap.value));
  });
  activityDisable.addEventListener('click', () => { void configure(0); });

  load.addEventListener('click', () => { void setup.request(); });
  async function loadModel(modelId: string, expected: string) {
    if (!supported || operation || saving || !content || setupContext(content) !== expected) return;
    cancel();
    unknownCache();
    const task = new AbortController(); operation = task; buttons();
    message.textContent = 'モデルを読み込んでいます。停止ボタンでキャンセルできます。';
    try {
      const authorized = structuredClone(content);
      const row = authorized.settings.find((row) => row.id === ACTIVITY_SETTING);
      if (row) row.value = { ...(row.value as object), consent: true, modelId } as typeof row.value;
      authorizingContext = setupContext(authorized);
      if (actions.activity) showActivity(await actions.activity.authorizeModel(modelId, undefined, expected));
      task.signal.throwIfAborted();
      const latest = await actions.read();
      task.signal.throwIfAborted();
      if (setupContext(latest) !== authorizingContext) throw new Error('世界や AI 設定が変わりました。現在の設定から再試行してください。');
      refresh(latest);
      authorizingContext = undefined;
      autoBlocked = false;
      await loadEngine(task, modelId);
      message.textContent = 'AI の準備ができました。投稿案を生成して確認できます。';
      // Loaded into memory is distinct from persistent cache availability.
      void checkCache();
    } catch (error) { if (!task.signal.aborted) { autoBlocked = true; cancel(); failure(error); } }
    finally { if (operation === task) { authorizingContext = undefined; operation = undefined; } buttons(); }
  }
  generate.addEventListener('click', async () => {
    if (!adapter || !loadedModel || operation || saving || budget.attempts >= MAX_SESSION_POSTS) return;
    const engine = adapter;
    const modelId = loadedModel;
    clearDraft();
    const task = new AbortController(); operation = task; buttons();
    const request: GenerationRequest = { personaId: persona.value, forumId: forum.value,
      ...(reply.value ? { replyToPostId: reply.value } : {}) };
    message.textContent = 'AI 投稿案を生成しています。停止ボタンでキャンセルできます。';
    try {
      const snapshot = await actions.read();
      task.signal.throwIfAborted();
      const prompt = buildPrompt(snapshot, request);
      budget.attempts++;
      showActivity(activity);
      const raw = await engine.generate(prompt, task.signal);
      if (task.signal.aborted) return;
      const result = validateGeneration(raw, snapshot, request);
      draft = { raw, request, modelId };
      preview.textContent = `${residentProfiles(snapshot).find((row) => row.id === request.personaId)!.handle} [架空の AI]\n${request.replyToPostId ? `返信先 ID: ${request.replyToPostId}\n` : ''}${result.title}\n\n${result.body}`;
      preview.hidden = send.hidden = discard.hidden = false;
      message.textContent = '検証済みの AI 投稿案です。内容を確認して保存してください。まだ投稿されていません。';
    } catch (error) { if (!task.signal.aborted) { autoBlocked = true; cancel(); failure(error); } }
    finally { if (operation === task) operation = undefined; buttons(); }
  });
  send.addEventListener('click', async () => {
    if (!draft || saving || operation) return;
    const reviewed = draft;
    saving = true; buttons();
    try {
      await actions.save(reviewed.request, reviewed.raw, reviewed.modelId);
      clearDraft(); message.textContent = 'AI 投稿を保存しました。LIST / READ で確認できます。';
    } catch (error) { message.textContent = `AI 投稿を保存できませんでした。${String(error)}`; }
    finally { saving = false; buttons(); }
  });

  function refresh(snapshot: Backup) {
    const changed = !content || setupContext(content) !== setupContext(snapshot);
    if (changed && setupContext(snapshot) !== authorizingContext) {
      const next = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      const worldChanged = JSON.stringify(content?.settings.find((row) => row.id === WORLD_SETTING)?.value) !==
        JSON.stringify(snapshot.settings.find((row) => row.id === WORLD_SETTING)?.value);
      if (operation || worldChanged || (loadedModel && (!next?.consent || !next.maxPosts || next.modelId !== loadedModel))) {
        if (operation) autoBlocked = true;
        cancel(); unavailable();
      }
    }
    content = snapshot;
    setup.refresh(snapshot);
    const current = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
    if (changed && !operation && !draft) model.value = current && models.some((row) => row.id === current.modelId) ? current.modelId : models[0].id;
    profile();
    get('identities').replaceChildren();
    for (const row of residentProfiles(snapshot)) {
      const item = document.createElement('li');
      item.textContent = `${row.handle} / fictional-ai:${row.id} / ${row.occupation}: ${row.routine} ${row.profile}`;
      get('identities').append(item);
      const option = [...persona.options].find((o) => o.value === row.id);
      if (option) option.textContent = `${row.handle} — 架空の AI (${row.id})`;
    }
    showActivity(snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined);
    const selected = forum.value;
    forum.replaceChildren();
    for (const row of snapshot.forums) {
      const sig = snapshot.sigs.find((sig) => sig.id === row.sigId);
      forum.add(new Option(`${sig?.keyword} / ${row.name} (${row.id})`, row.id));
    }
    if (Array.from(forum.options).some((option) => option.value === selected)) forum.value = selected;
    updateReplies();
    if (draft) {
      try { checkRequest(snapshot, draft.request); }
      catch { clearDraft(); }
    }
    const records = get('records'); records.replaceChildren();
    for (const post of snapshot.posts.filter((row) => row.origin.startsWith('local-ai:') || snapshot.members.find((m) => m.id === row.authorId)?.actor === 'ai')) {
      const member = snapshot.members.find((row) => row.id === post.authorId);
      const item = document.createElement('li');
      item.textContent = `${member?.handle} / ${post.authorId} / actor=${member?.actor} / origin=${post.origin} / ${post.forumId} #${post.number} / ${post.title}${post.simulation ? ` / fictional=true / runId=${post.simulation.runId} / simulatedAt=${post.simulation.simulatedAt} / generatedAt=${post.createdAt}` : ''}`;
      records.append(item);
    }
    buttons();
  }
  return {
    async openActivity(planned?: AiActivity) {
      if (!actions.activity || activityBusy || operation) return;
      autoBlocked = false;
      const before = revision;
      if (!planned) await actions.activity.openActivity();
      const snapshot = await actions.read();
      if (revision !== before) return;
      refresh(snapshot);
      if (revision !== before) return;
      const state = activity;
      if (state?.maxPosts && models.some((row) => row.id === (state.batch?.modelId ?? state.modelId))) {
        model.value = state.batch?.modelId ?? state.modelId;
      }
      await simulate();
    },
    invalidate() { setup.invalidate(); autoBlocked = true; cancel(); unavailable(); },
    refresh,
    async tick() {
      if (!actions.activity || activityBusy || operation || configuring || autoBlocked || draft ||
          budget.attempts >= MAX_SESSION_POSTS || (activity && budget.committed >= activity.maxPosts)) return;
      // Failed/cancelled work waits for explicit retry or a later page visit.
      if (activity?.batch?.runs.some((r) => ['failed', 'cancelled'].includes(r.status))) return;
      const before = revision;
      await actions.activity.openActivity();
      const snapshot = await actions.read();
      if (before !== revision) return;
      refresh(snapshot);
      if (before !== revision) return;
      await simulate();
    },
  };
}
