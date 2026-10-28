import type { OltState } from '../olt-state';
import { OltDiagnostics } from './olt-diagnostics';
import { WORLD_SETTING } from '../storage/schema';
import type { AiActivity, Backup } from '../storage/schema';
import { ACTIVITY_SETTING, MAX_SESSION_POSTS, HOUR, canAttempt, setupContext, migrateActivity } from './activity';
import { runActivityBatch } from './activity-runner';
import type { ActivityActions } from './activity-runner';
import { residentProfiles } from './personas';
import { requireWebGpu } from './generation';
import type { AdapterFactory, LocalLlmAdapter } from './generation';

interface AiActions {
  read(): Promise<Backup>;
  print(...text: string[]): void;
  activity: ActivityActions;
}

/** Model work never holds the command queue. IDB remains the authority for runs. */
export function createAiControls(actions: AiActions,
  factory: AdapterFactory = async () => (await import('./webllm-adapter')).createWebLlmAdapter(),
  supported = requireWebGpu(),
  probeCache: (id: string) => Promise<boolean> = async (id) => (await import('./webllm-adapter')).modelWeightsCached(id)) {
  const olt = new OltDiagnostics();
  let roomPriorityUntil = 0;
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
  let checking = false;
  let budgetStartedAt = Date.now();
  class ModelBusy extends Error {}
  const budget = { attempts: 0, committed: 0 };
  function report(text: string) { message = text; actions.print(text); }
  function cancel() {
    roomPriorityUntil = 0;
    revision++; authorizingContext = undefined;
    operation?.abort(); operation = undefined;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
    releaseModelLock?.(); releaseModelLock = undefined;
  }
  function failure(error: unknown) {
    autoBlocked = true; cancel();
    report(`AI を利用できません。通信・保存領域・GPU を確認し、設定のモデル読込または再試行を利用してください。端末・閲覧・手動投稿は利用できます。 ${String(error)}`);
  }
  function refresh(snapshot: Backup) {
    const residentsChanged = content && JSON.stringify(residentProfiles(content)) !== JSON.stringify(residentProfiles(snapshot));
    if (content && ((setupContext(content) !== setupContext(snapshot) && setupContext(snapshot) !== authorizingContext) || residentsChanged)) {
      const next = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
      const worldChanged = JSON.stringify(content.settings.find((row) => row.id === WORLD_SETTING)?.value) !==
        JSON.stringify(snapshot.settings.find((row) => row.id === WORLD_SETTING)?.value);
      if (operation || worldChanged || residentsChanged || (loadedModel && (!next?.consent || !next.maxPosts || next.modelId !== loadedModel))) {
        cancel(); message = '設定変更のため処理を中止しました。';
      }
    }
    content = snapshot;
    const saved = snapshot.settings.find((row) => row.id === ACTIVITY_SETTING)?.value as unknown as AiActivity | undefined;
    activity = saved && migrateActivity(saved);
  }
  async function loadEngine(task: AbortController, modelId: string) {
    if (!supported) throw new Error('WebGPU が利用できません。対応ブラウザーの HTTPS / localhost が必要です。');
    if (!navigator.locks) throw new Error('Web Locks が利用できません。対応ブラウザーが必要です。');
    if (adapter && loadedModel === modelId) return adapter;
    adapter?.dispose(); adapter = undefined; loadedModel = undefined;
    if (!releaseModelLock) {
      await new Promise<void>((resolve, reject) => {
        void navigator.locks.request('pcvan-local-ai-model', { ifAvailable: true }, (lock) => {
          if (!lock) { reject(new ModelBusy('別のタブでモデルを使用中です。解放後に自動で再確認します。')); return; }
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
    if (Date.now() < roomPriorityUntil) return;
    if (document.visibilityState !== 'visible' || !supported || !activity?.maxPosts || !activity.consent || !activity.batch || operation || autoBlocked) return;
    if (activity.batch.modelId !== activity.modelId || !navigator.locks) return;
    const state = activity;
    if (!state.batch!.runs.some((run) => run.status !== 'committed' && canAttempt(state, run, Date.now()) &&
      (run.userResponse || (budget.attempts < MAX_SESSION_POSTS && budget.committed < state.maxPosts)))) return;
    const task = new AbortController(); operation = task;
    try {
      await navigator.locks.request('pcvan-ai-activity', { ifAvailable: true }, async (lock) => {
        if (!lock) { report('別のタブで活動を処理中です。次回、自動で確認します。'); return; }
        const engine = await loadEngine(task, state.batch!.modelId);
        report('予定の活動を処理中…');
        await runActivityBatch(actions.activity, actions.read, state, engine, task.signal, budget,
          (updated) => { if (!task.signal.aborted) activity = migrateActivity(updated); },
          () => Date.now() < roomPriorityUntil);
        if (!task.signal.aborted) report('予定の活動を確認しました。次の予定まで待機します。');
      });
    } catch (error) { if (!task.signal.aborted) {
      if (error instanceof ModelBusy) report(error.message); else failure(error);
    } }
    finally { if (operation === task) operation = undefined; }
  }
  async function advance(planned?: AiActivity) {
    if (operation || checking || autoBlocked || Date.now() < roomPriorityUntil) return;
    checking = true;
    const before = revision;
    try {
      // Reconnect never replenishes the allowance; long-open pages get a bounded
      // new window without needing a command or reopening Settings.
      if (Date.now() - budgetStartedAt >= 6 * HOUR) {
        budgetStartedAt = Date.now(); budget.attempts = 0; budget.committed = 0;
      }
      if (!planned) await actions.activity.openActivity();
      const snapshot = await actions.read();
      if (before !== revision) return;
      refresh(snapshot);
      if (before !== revision) return;
      await simulate();
    } catch (error) { if (before === revision) failure(error); }
    finally { checking = false; }
  }
  function activityStatus() {
    if (!activity?.maxPosts) return '自動活動: 休止中';
    if (!activity.consent) return '自動活動: 有効・初回モデル同意待ち';
    if (!supported) return '自動活動: 利用不可（WebGPU 非対応）';
    if (!navigator.locks) return '自動活動: 利用不可（Web Locks 非対応）';
    if (autoBlocked) return '自動活動: 停止・失敗（設定から再試行できます）';
    if (operation) return loadedModel ? '自動活動: 処理中' : '自動活動: モデル読込中';
    if (budget.attempts >= MAX_SESSION_POSTS || budget.committed >= activity.maxPosts) return '自動活動: 有効・次の上限更新待ち（6時間）';
    if (activity.batch?.runs.some((run) => run.status !== 'committed')) return '自動活動: 有効・未完了の予定あり';
    return '自動活動: 有効・次の予定待ち（静かな時間もあります）';
  }
  return {
    refresh,
    olt,
    prioritizeRoom(until: number) { roomPriorityUntil = until; },
    cancelBackground() { cancel(); },
    async runRoom(work: (engine: LocalLlmAdapter, signal: AbortSignal) => Promise<void>, external: AbortSignal) {
      if (external.aborted || document.visibilityState !== 'visible') return;
      if (!supported) { olt.stage('WebGPU 非対応'); return; }
      if (!navigator.locks) { olt.stage('Web Locks 非対応'); return; }
      if (autoBlocked) { olt.stage('失敗後の再試行待ち'); return; }
      if (operation) { olt.stage(loadedModel ? 'モデル使用中・待機' : 'モデル読込中・待機'); return; }
      const snapshot = await actions.read(); refresh(snapshot);
      if (!activity?.consent || !activity.maxPosts) { olt.stage('モデル未同意・活動休止'); return; }
      if (operation || autoBlocked || external.aborted) return;
      olt.model(!!adapter && loadedModel === activity.modelId);
      const task = new AbortController(); operation = task;
      const abort = () => { if (operation === task) cancel(); };
      external.addEventListener('abort', abort, { once: true });
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; abort(); }, 30_000);
      try {
        await navigator.locks.request('pcvan-ai-activity', { ifAvailable: true }, async (lock) => {
          if (!lock) { olt.stage('別タブで活動中・待機'); return; }
          if (document.visibilityState !== 'visible') return;
          olt.stage('ワーカー取得');
          if (!adapter || loadedModel !== activity!.modelId) olt.stage('モデル読込中');
          const engine = await loadEngine(task, activity!.modelId);
          task.signal.throwIfAborted();
          await work(engine, task.signal);
        });
      } catch (error) {
        if (!task.signal.aborted) {
          if (error instanceof ModelBusy) { olt.stage('別タブでモデル使用中・待機'); report(error.message); }
          else { olt.stage('生成失敗'); failure(error); }
        }
      } finally {
        clearTimeout(timeout); external.removeEventListener('abort', abort);
        if (operation === task) operation = undefined;
        if (timedOut) { olt.stage('生成時間切れ'); autoBlocked = true; report('OLT の生成が時間切れです。設定から再試行できます。'); }
      }
    },
    get supported() { return supported; },
    get busy() { return !!operation; },
    status() {
      const roomBudget = content?.settings.find((row) => row.id === 'olt-rooms')?.value as unknown as OltState | undefined;
      return [olt.status(), activityStatus(), supported ? message : 'WebGPU が利用できません。端末・閲覧・手動投稿は利用できます。',
        `6時間の自動投稿上限: ${activity?.maxPosts ?? 0} / 同意: ${activity?.consent ? 'あり' : 'なし'} / 試行 ${budget.attempts}/${MAX_SESSION_POSTS} / 保存 ${budget.committed}`,
        ...(activity?.allowance ? [`保存済みの6時間枠: 通常試行 ${activity.allowance.attempts}/12 / 通常保存 ${activity.allowance.committed} / 人間への返信 ${activity.allowance.responses}/6`] : []),
        'メールも同じ生成上限を使います。人間の掲示板投稿への返信は別枠で6時間6試行まで（再読込でも維持）。',
        'OLT は別枠で全室1時間24試行まで。自動活動0で OLT も休止。可視タブのみで動作します。',
        `OLT 保存済み時間枠: 試行 ${roomBudget?.attempts ?? 0}/24 / 自発 ${roomBudget?.organicAttempts ?? 0}/16（再生成も含む）`,
        'OLT: 在室住人・読込済みモデルがある時は表示まで約10秒が目標です。保証ではありません。使用中の返信待ちは最大60秒。',
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
        report('モデル準備完了。活動は生活時間に沿って自動で進みます。');
      } catch (error) { if (!task.signal.aborted) {
        if (error instanceof ModelBusy) report(error.message); else failure(error);
      } }
      finally { if (operation === task) { authorizingContext = undefined; operation = undefined; } }
    },
    openActivity(planned?: AiActivity) { autoBlocked = false; return advance(planned); },
    tick() { return advance(); },
    retry() { autoBlocked = false; return advance(); },
  };
}
