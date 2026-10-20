import type { AiActivity, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, MAX_SESSION_POSTS } from './activity';
import { runActivityBatch } from './activity-runner';
import type { ActivityActions } from './activity-runner';
import { models, personas } from './personas';
import { buildPrompt, checkRequest, requireWebGpu, validateGeneration } from './generation';
import type { AdapterFactory, GenerationRequest, LocalLlmAdapter } from './generation';

interface AiActions {
  read(): Promise<Backup>;
  save(request: GenerationRequest, raw: string, modelId: string): Promise<void>;
  activity?: ActivityActions;
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
    <p>まず手動投稿でローカル掲示板を作成してください。AI はそこにだけ投稿します。
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
      <label>AI 投稿先 <select class="ai-forum"></select></label>
      <label>AI 返信先 <select class="ai-reply"></select></label>
      <button type="button" class="ai-generate">AI 投稿案を生成</button>
    </div>
    <p class="ai-message" aria-live="polite"></p>
    <pre class="ai-preview" hidden></pre>
    <button type="button" class="ai-send" hidden>この AI 投稿を保存</button>
    <button type="button" class="ai-discard" hidden>AI 投稿案を破棄</button>
    <h2>再接続時の架空の活動</h2>
    <p>ブラウザーを閉じている間は AI は動きません。再度開いた時に、経過時間に応じた架空の投稿を今生成し、自動保存します。
      投稿時刻は創作です。初期値は 0（無効）。有効にすると、次回から選択モデルを自動読込します（通信・GPU 使用あり）。</p>
    <label>1 回の接続で自動保存する上限 (0〜12)
      <input class="ai-activity-cap" type="number" min="0" max="12" step="1" value="0"></label>
    <button type="button" class="ai-activity-save">上限と選択モデルを保存（自動生成に同意）</button>
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
  let configuring = false;
  let revision = 0;
  const budget = { attempts: 0, committed: 0 };

  function buttons() {
    model.disabled = persona.disabled = forum.disabled = reply.disabled = saving || !!operation;
    load.disabled = !supported || saving || !!operation;
    generate.disabled = !loadedModel || !forum.value || saving || !!operation;
    stop.disabled = saving || (!adapter && !operation);
    send.disabled = discard.disabled = saving || !!operation;
    activitySave.disabled = cap.disabled = !actions.activity || saving || !!operation || configuring;
    activityDisable.disabled = !actions.activity || configuring;
    retry.disabled = !supported || !actions.activity || saving || !!operation || activityBusy || configuring ||
      !activity?.maxPosts || !activity.batch?.runs.some((run) => run.status !== 'committed') ||
      budget.attempts >= MAX_SESSION_POSTS || budget.committed >= activity.maxPosts;
    cacheCheck.disabled = checking || saving || !!operation;
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
    operation?.abort(); operation = undefined;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
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
  function profile() { get('profile').textContent = personas.find((row) => row.id === persona.value)!.profile; }
  function showActivity(state: AiActivity | undefined) {
    activity = state;
    cap.value = String(state?.maxPosts ?? 0);
    const runs = state?.batch?.runs ?? [];
    const done = runs.filter((run) => run.status === 'committed').length;
    activityProgress.max = Math.max(1, runs.length); activityProgress.value = done;
    activityMessage.textContent = !state?.maxPosts ? '架空の活動は無効です。自動生成はありません。'
      : `架空の活動 ${done}/${runs.length} 件保存済み / 接続ごとの上限 ${state.maxPosts} 件。閉じている間の実行ではありません。`;
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
  stop.addEventListener('click', () => { cancel(); message.textContent = 'AI をキャンセルし、モデルを解放しました。端末・手動投稿は利用できます。'; });
  model.addEventListener('change', () => { cancel(); unavailable(); unknownCache(); buttons(); });
  persona.addEventListener('change', () => { clearDraft(); profile(); });
  forum.addEventListener('change', () => { clearDraft(); reply.value = ''; updateReplies(); buttons(); });
  reply.addEventListener('change', clearDraft);
  discard.addEventListener('click', clearDraft);

  async function loadEngine(task: AbortController, modelId: string): Promise<LocalLlmAdapter> {
    if (adapter && loadedModel === modelId) return adapter;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
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
    if (!supported || !actions.activity || !activity?.maxPosts || !activity.batch || operation || saving || activityBusy) return;
    const state = activity;
    if (!state.batch!.runs.some((run) => run.status !== 'committed') ||
        budget.attempts >= MAX_SESSION_POSTS || budget.committed >= state.maxPosts) return;
    clearDraft();
    section.open = true;
    const task = new AbortController(); operation = task; activityBusy = true; buttons();
    message.textContent = '再接続用の架空の活動を今生成します。AI を停止・解放でキャンセルできます。';
    const run = async () => {
      task.signal.throwIfAborted();
      const engine = await loadEngine(task, state.batch!.modelId);
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
    } catch (error) { if (!task.signal.aborted) { cancel(); failure(error); } }
    finally { if (operation === task) operation = undefined; activityBusy = false; buttons(); }
  }
  retry.addEventListener('click', () => { void simulate(); });
  async function configure(maxPosts: number) {
    if (!actions.activity || configuring) return;
    cancel(); configuring = true; buttons();
    try {
      showActivity(await actions.activity.configureActivity(maxPosts, model.value));
      message.textContent = maxPosts ? '架空の活動を有効にしました。次回の接続から適用します。' : '架空の活動を無効にしました。';
    } catch (error) { failure(error); }
    finally { configuring = false; buttons(); }
  }
  activitySave.addEventListener('click', () => {
    if (!cap.checkValidity() || cap.value === '') { cap.reportValidity(); return; }
    void configure(Number(cap.value));
  });
  activityDisable.addEventListener('click', () => { void configure(0); });

  load.addEventListener('click', async () => {
    if (!supported || operation || saving) return;
    cancel();
    unknownCache();
    const task = new AbortController(); operation = task; buttons();
    message.textContent = 'モデルを読み込んでいます。停止ボタンでキャンセルできます。';
    try {
      await loadEngine(task, model.value);
      message.textContent = 'AI の準備ができました。投稿案を生成して確認できます。';
      // Loaded into memory is distinct from persistent cache availability.
      void checkCache();
    } catch (error) { if (!task.signal.aborted) { cancel(); failure(error); } }
    finally { if (operation === task) operation = undefined; buttons(); }
  });
  generate.addEventListener('click', async () => {
    if (!adapter || !loadedModel || operation || saving) return;
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
      const raw = await engine.generate(buildPrompt(snapshot, request), task.signal);
      if (task.signal.aborted) return;
      const result = validateGeneration(raw, snapshot, request);
      draft = { raw, request, modelId };
      preview.textContent = `${personas.find((row) => row.id === request.personaId)!.handle} [架空の AI]\n${request.replyToPostId ? `返信先 ID: ${request.replyToPostId}\n` : ''}${result.title}\n\n${result.body}`;
      preview.hidden = send.hidden = discard.hidden = false;
      message.textContent = '検証済みの AI 投稿案です。内容を確認して保存してください。まだ投稿されていません。';
    } catch (error) { if (!task.signal.aborted) { cancel(); failure(error); } }
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

  return {
    async openActivity(planned?: AiActivity) {
      if (!actions.activity || activityBusy || operation) return;
      budget.attempts = budget.committed = 0;
      const before = revision;
      const state = planned ?? await actions.activity.openActivity();
      if (revision !== before) return;
      showActivity(state);
      if (state.maxPosts && models.some((row) => row.id === (state.batch?.modelId ?? state.modelId))) {
        model.value = state.batch?.modelId ?? state.modelId;
      }
      await simulate();
    },
    invalidate() { cancel(); unavailable(); },
    refresh(snapshot: Backup) {
      content = snapshot;
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
      for (const post of snapshot.posts.filter((row) => row.origin.startsWith('local-ai:') || snapshot.members.some((member) => member.id === row.authorId && member.actor === 'ai'))) {
        const member = snapshot.members.find((row) => row.id === post.authorId);
        const item = document.createElement('li');
        item.textContent = `${member?.handle} / ${post.authorId} / actor=${member?.actor} / origin=${post.origin} / forumId=${post.forumId} / #${post.number} / ${post.title} / generatedAt=${post.createdAt}`
          + (post.simulation ? ` / runId=${post.simulation.runId} / simulatedAt=${post.simulation.simulatedAt} / fictional=true（架空の投稿時刻）` : '');
        records.append(item);
      }
      buttons();
    },
  };
}
