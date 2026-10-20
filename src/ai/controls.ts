import type { Backup } from '../storage/schema';
import { models, personas } from './personas';
import { buildPrompt, checkRequest, requireWebGpu, validateGeneration } from './generation';
import type { AdapterFactory, GenerationRequest, LocalLlmAdapter } from './generation';

interface AiActions {
  read(): Promise<Backup>;
  save(request: GenerationRequest, raw: string, modelId: string): Promise<void>;
}

/** Kept outside the historical terminal. Dependencies are injectable for GPU-free tests. */
export function mountAiControls(root: HTMLElement, actions: AiActions,
  factory: AdapterFactory = async () => (await import('./webllm-adapter')).createWebLlmAdapter(),
  supported = requireWebGpu()) {
  const section = document.createElement('details');
  section.className = 'ai-controls';
  section.innerHTML = `
    <summary>ローカル AI 設定・投稿の出自 [創作 / reconstructed]</summary>
    <p>任意の機能です。全員が架空の AI 人格です。履歴上の実在会員ではありません。</p>
    <p>初回のモデル読込は数百 MB〜数 GB の通信・ブラウザー保存と GPU メモリを使います。
      モデルファイルは配布元 (Hugging Face / MLC) から取得します。推論と投稿データの処理はこの端末内です。
      外部推論・API キーは使いません。日本語の品質はモデルと機器により異なります。</p>
    <p>まず手動投稿でローカル掲示板を作成してください。AI はそこにだけ投稿します。
      文脈は同じ掲示板の直近最大 4 件のローカル創作投稿の抜粋です。</p>
    <div class="ai-fields">
      <label>AI モデル <select class="ai-model"></select></label>
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
  let draft: { raw: string; request: GenerationRequest; modelId: string } | undefined;

  function buttons() {
    model.disabled = persona.disabled = forum.disabled = reply.disabled = saving || !!operation;
    load.disabled = !supported || saving || !!operation;
    generate.disabled = !loadedModel || !forum.value || saving || !!operation;
    stop.disabled = saving || (!adapter && !operation);
    send.disabled = discard.disabled = saving || !!operation;
  }
  function clearDraft() { draft = undefined; preview.hidden = send.hidden = discard.hidden = true; preview.textContent = ''; }
  function cancel() {
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
  profile(); unavailable(); buttons();
  stop.addEventListener('click', () => { cancel(); message.textContent = 'AI をキャンセルし、モデルを解放しました。端末・手動投稿は利用できます。'; });
  model.addEventListener('change', () => { cancel(); unavailable(); });
  persona.addEventListener('change', () => { clearDraft(); profile(); });
  forum.addEventListener('change', () => { clearDraft(); reply.value = ''; updateReplies(); buttons(); });
  reply.addEventListener('change', clearDraft);
  discard.addEventListener('click', clearDraft);

  load.addEventListener('click', async () => {
    if (!supported || operation || saving) return;
    cancel();
    const task = new AbortController(); operation = task; buttons();
    message.textContent = 'モデルを読み込んでいます。停止ボタンでキャンセルできます。';
    try {
      const created = await factory();
      if (task.signal.aborted) { created.dispose(); return; }
      adapter = created;
      await created.load(model.value, (fraction) => {
        if (task.signal.aborted) return;
        progress.value = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
        message.textContent = `モデル読込 ${Math.round(progress.value * 100)}%`;
      }, task.signal);
      if (task.signal.aborted) return;
      loadedModel = model.value; progress.value = 1;
      message.textContent = 'AI の準備ができました。投稿案を生成して確認できます。';
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
    invalidate() { cancel(); unavailable(); },
    refresh(snapshot: Backup) {
      content = snapshot;
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
        item.textContent = `${member?.handle} / ${post.authorId} / actor=${member?.actor} / origin=${post.origin} / forumId=${post.forumId} / #${post.number} / ${post.title}`;
        records.append(item);
      }
      buttons();
    },
  };
}
