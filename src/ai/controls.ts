import { WORLD_SETTING } from '../storage/schema';
import type { AiActivity, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, MAX_SESSION_POSTS, setupContext, migrateActivity } from './activity';
import { runActivityBatch } from './activity-runner';
import type { ActivityActions } from './activity-runner';
import { models, residentProfiles } from './personas';
import { buildPrompt, checkRequest, requireWebGpu, validateGeneration } from './generation';
import type { AdapterFactory, GenerationRequest, LocalLlmAdapter } from './generation';

interface AiActions {
  read(): Promise<Backup>;
  print(...text: string[]): void;
  save(request: GenerationRequest, raw: string, modelId: string, signal: AbortSignal): Promise<void>;
  activity: ActivityActions;
}

/** Model work never holds the command queue. IDB remains the authority for runs. */
export function createAiControls(actions: AiActions,
  factory: AdapterFactory = async () => (await import('./webllm-adapter')).createWebLlmAdapter(),
  supported = requireWebGpu(),
  probeCache: (id: string) => Promise<boolean> = async (id) => (await import('./webllm-adapter')).modelWeightsCached(id)) {
  let content: Backup | undefined;
  let activity: AiActivity | undefined;
  let adapter: LocalLlmAdapter | undefined;
  let loadedModel: string | undefined;
  let operation: AbortController | undefined;
  let releaseModelLock: (() => void) | undefined;
  let autoBlocked = false;
  let revision = 0;
  let authorizingContext: string | undefined;
  let message = 'モデル未読込';
  let draft: { raw: string; request: GenerationRequest; modelId: string; preview: string[] } | undefined;
  const budget = { attempts: 0, committed: 0 };
  function report(text: string) { message = text; actions.print(text); }
  function cancel() {
    revision++; authorizingContext = undefined;
    operation?.abort(); operation = undefined;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
    releaseModelLock?.(); releaseModelLock = undefined;
    draft = undefined;
  }
  function failure(error: unknown) {
    autoBlocked = true; cancel();
    report(`AI を利用できません。通信・保存領域・GPU を確認し、LOAD で再試行してください。端末・閲覧・手動投稿は利用できます。 ${String(error)}`);
  }
  function refresh(snapshot: Backup) {
    const residentsChanged = content && JSON.stringify(residentProfiles(content)) !== JSON.stringify(residentProfiles(snapshot));
    if (content && ((setupContext(content) !== setupContext(snapshot) && setupContext(snapshot) !== authorizingContext) || residentsChanged)) {
      const next = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      const worldChanged = JSON.stringify(content.settings.find((row) => row.id === WORLD_SETTING)?.value) !==
        JSON.stringify(snapshot.settings.find((row) => row.id === WORLD_SETTING)?.value);
      if (operation || worldChanged || residentsChanged || (loadedModel && (!next?.consent || !next.maxPosts || next.modelId !== loadedModel))) {
        if (operation) autoBlocked = true;
        cancel(); message = '設定変更のため処理を中止しました。';
      }
    }
    content = snapshot;
    const saved = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
    activity = saved && migrateActivity(saved);
    if (draft) { try { checkRequest(snapshot, draft.request); } catch { draft = undefined; } }
  }
  async function loadEngine(task: AbortController, modelId: string) {
    if (!supported) throw new Error('WebGPU が利用できません。対応ブラウザーの HTTPS / localhost が必要です。');
    if (adapter && loadedModel === modelId) return adapter;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
    if (!releaseModelLock && navigator.locks) {
      await new Promise<void>((resolve, reject) => {
        void navigator.locks.request('pcvan-local-ai-model', { ifAvailable: true }, (lock) => {
          if (!lock) { reject(new Error('別のタブでモデルを使用中です。そちらで STOP してください。')); return; }
          return new Promise<void>((release) => { releaseModelLock = release; resolve(); });
        }).catch(reject);
      });
    }
    if (task.signal.aborted) { releaseModelLock?.(); releaseModelLock = undefined; task.signal.throwIfAborted(); }
    const created = await factory();
    if (task.signal.aborted) { created.dispose(); task.signal.throwIfAborted(); }
    adapter = created;
    let lastProgress = -1;
    await created.load(modelId, (fraction) => {
      if (task.signal.aborted) return;
      const percent = Number.isFinite(fraction) ? Math.round(Math.min(1, Math.max(0, fraction)) * 100) : 0;
      if (percent !== lastProgress) { lastProgress = percent; report(`モデル読込中… ${percent}% / STOP: 中止`); }
    }, task.signal);
    task.signal.throwIfAborted(); loadedModel = modelId;
    return created;
  }
  async function simulate() {
    if (!supported || !activity?.maxPosts || !activity.consent || !activity.batch || operation || draft || autoBlocked) return;
    if (activity.batch.modelId !== activity.modelId || !navigator.locks) return;
    const state = activity;
    if (!state.batch!.runs.some((run) => run.status !== 'committed') ||
      budget.attempts >= MAX_SESSION_POSTS || budget.committed >= state.maxPosts) return;
    const task = new AbortController(); operation = task;
    try {
      await navigator.locks.request('pcvan-ai-activity', { ifAvailable: true }, async (lock) => {
        if (!lock) return;
        const engine = await loadEngine(task, state.batch!.modelId);
        await runActivityBatch(actions.activity, actions.read, state, engine, task.signal, budget,
          (updated) => { if (!task.signal.aborted) activity = migrateActivity(updated); });
      });
    } catch (error) { if (!task.signal.aborted) failure(error); }
    finally { if (operation === task) operation = undefined; }
  }
  return {
    refresh,
    get supported() { return supported; },
    get busy() { return !!operation; },
    get hasDraft() { return !!draft; },
    status() {
      return [supported ? message : 'WebGPU が利用できません。端末・閲覧・手動投稿は利用できます。',
        `自動投稿の上限: ${activity?.maxPosts ?? 0} / 同意: ${activity?.consent ? 'あり' : 'なし'} / 試行 ${budget.attempts}/${MAX_SESSION_POSTS} / 保存 ${budget.committed}`,
        ...(activity?.batch?.runs.map((run) => `${run.id} / ${run.status} / ${run.personaId} / simulatedAt=${run.simulatedAt}`) ?? [])];
    },
    invalidate() { autoBlocked = true; cancel(); message = 'モデル解放済み'; },
    resume() { autoBlocked = false; },
    stop() { autoBlocked = true; cancel(); report('処理をキャンセルし、モデルを解放しました。'); },
    async checkCache(modelId: string) {
      const before = revision;
      try {
        const cached = await probeCache(modelId);
        if (before !== revision) return;
        report(cached ? '重みは保存済みです。実行ファイル・GPU等によりオフライン読込が失敗する場合があります。'
        : '重みは未保存または不完全です。オンラインで LOAD が必要です。'); }
      catch { if (before === revision) report('モデルの保存状態を確認できません。オフライン AI は保証できません。'); }
    },
    async load(modelId: string, expected: string) {
      if (operation) { report('処理中です。STOP してから再試行してください。'); return; }
      if (!supported) { report('WebGPU が利用できません。端末・閲覧・手動投稿は利用できます。'); return; }
      cancel();
      const task = new AbortController(); operation = task;
      try {
        const snapshot = await actions.read(); task.signal.throwIfAborted();
        if (setupContext(snapshot) !== expected) throw new Error('世界や設定が変わりました。LOAD から確認し直してください。');
        const authorized = structuredClone(snapshot);
        const row = authorized.settings.find((row) => row.id === ACTIVITY_SETTING);
        if (row) row.value = { ...(row.value as object), consent: true, modelId } as typeof row.value;
        authorizingContext = setupContext(authorized);
        await actions.activity.authorizeModel(modelId, undefined, expected); task.signal.throwIfAborted();
        const latest = await actions.read(); task.signal.throwIfAborted();
        if (setupContext(latest) !== authorizingContext) throw new Error('世界や設定が変わりました。再試行してください。');
        refresh(latest); authorizingContext = undefined; autoBlocked = false;
        await loadEngine(task, modelId);
        report('モデル準備完了。GENERATE で投稿案を生成できます。');
      } catch (error) { if (!task.signal.aborted) failure(error); }
      finally { if (operation === task) { authorizingContext = undefined; operation = undefined; } }
    },
    async generate(request: GenerationRequest) {
      if (!adapter || !loadedModel || operation || budget.attempts >= MAX_SESSION_POSTS) {
        report('モデルを LOAD してください。処理中や試行上限では生成できません。'); return;
      }
      const engine = adapter, modelId = loadedModel;
      draft = undefined;
      const task = new AbortController(); operation = task;
      report('投稿案を生成中… STOP: 中止');
      try {
        const snapshot = await actions.read(); task.signal.throwIfAborted();
        const prompt = buildPrompt(snapshot, request); budget.attempts++;
        const raw = await engine.generate(prompt, task.signal); task.signal.throwIfAborted();
        const result = validateGeneration(raw, snapshot, request);
        const preview = [`投稿者：${residentProfiles(snapshot).find((row) => row.id === request.personaId)!.handle}`,
          `投稿先：${snapshot.forums.find((row) => row.id === request.forumId)!.name}`,
          ...(request.replyToPostId ? [`返信先：#${snapshot.posts.find((row) => row.id === request.replyToPostId)!.number}`] : []),
          result.title, result.body];
        draft = { raw, request, modelId, preview };
        report(`投稿案（未保存）\n${preview.join('\n')}\nモデル設定で PREVIEW / SEND / DISCARD`);
      } catch (error) { if (!task.signal.aborted) failure(error); }
      finally { if (operation === task) operation = undefined; }
    },
    preview() { return draft ? [...draft.preview, 'SEND: 保存確認 / DISCARD: 破棄'] : ['投稿案はありません。']; },
    discard() { draft = undefined; report('投稿案を破棄しました。'); },
    async send() {
      if (!draft || operation) return;
      const reviewed = draft;
      const task = new AbortController(); operation = task;
      try {
        await actions.save(reviewed.request, reviewed.raw, reviewed.modelId, task.signal);
        draft = undefined; report('AI 投稿を保存しました。LIST / READ で確認できます。');
      } catch (error) { if (!task.signal.aborted) report(`AI 投稿を保存できませんでした。${String(error)}`); }
      finally { if (operation === task) operation = undefined; }
    },
    async openActivity(planned?: AiActivity) {
      if (operation) return;
      autoBlocked = false;
      const before = revision;
      if (!planned) await actions.activity.openActivity();
      const snapshot = await actions.read();
      if (revision !== before) return;
      refresh(snapshot);
      if (revision !== before) return;
      await simulate();
    },
    async tick() {
      if (operation || autoBlocked || draft || budget.attempts >= MAX_SESSION_POSTS ||
        (activity && budget.committed >= activity.maxPosts) ||
        activity?.batch?.runs.some((r) => ['failed', 'cancelled'].includes(r.status))) return;
      const before = revision;
      await actions.activity.openActivity();
      const snapshot = await actions.read();
      if (before !== revision) return;
      refresh(snapshot);
      if (before !== revision) return;
      await simulate();
    },
    retry() { autoBlocked = false; return simulate(); },
  };
}
