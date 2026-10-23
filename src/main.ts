import { ConnectionController, ENTRY_STAGE_MS } from './connection';
import { TerminalSession } from './session';
import { mountTerminal } from './terminal';
import { openRepository, RepositoryError, DATABASE_NAME } from './storage/repository';
import type { Session } from './storage/repository';
import type { Backup } from './storage/schema';
import { activeHuman, forumPosts } from './forums';
import { TerminalCommands } from './commands';
import { createAiControls } from './ai/controls';
import { mountSettings } from './settings-dialog';
import './style.css';

const controller = new ConnectionController();
const session = new TerminalSession(controller);
const repository = openRepository();
const root = document.querySelector<HTMLElement>('#app')!;
let pending: Promise<unknown> = Promise.resolve();
let resetting = false;
let revision = 0;
let settingsDialog: ReturnType<typeof mountSettings> | undefined;
let connectionTimer: ReturnType<typeof setTimeout> | undefined;
let connectionRevision = 0;
let commandsDuringHistoryLoad: string[] | null = null;
const RESET_NOTICE = 'pcvan-reset-notice';
const print = (...lines: string[]) => terminal.append(...session.append(...lines));
function reportError(error: unknown) {
  if (error instanceof RepositoryError && error.code === 'stale') { reloadWorld(); return; }
  print(error instanceof RepositoryError && error.code === 'quota'
    ? '保存容量が足りません。BACKUP で JSON を保存し、空き容量を確認してください。'
    : `ローカル保存エラー: ${String(error)}`);
}
function reloadWorld() {
  resetting = true; revision++; ai.invalidate(); commands.invalidate();
  clearTimeout(connectionTimer); window.location.reload();
}
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  if (resetting) return Promise.reject(new Error('世界の切り替え中です。'));
  const task = pending.catch(() => {}).then(async () => {
    if (resetting) throw new Error('世界の切り替え中です。');
    return action();
  }).catch((error) => {
    if (error instanceof RepositoryError && error.code === 'stale') reloadWorld();
    throw error;
  });
  pending = task; return task;
}
async function loadHistory(load: () => Promise<Session | null>) {
  const lines: string[] = []; commandsDuringHistoryLoad = lines;
  try {
    const saved = await load(); session.history.replace([...(saved?.commandHistory ?? []), ...lines]); showSessionTimes(saved);
  } finally { commandsDuringHistoryLoad = null; }
}
async function refreshContent(): Promise<Backup> {
  const content = await (await repository).exportBackup();
  terminal.restorePreferences(content.settings);
  controller.setContent(content); controller.setMemberId(activeHuman(content)); ai.refresh(content);
  try { settingsDialog?.refresh(content); }
  catch (error) { settingsDialog?.showError(error); }
  return content;
}
function showSessionTimes(saved: Session | null) {
  terminal.showSessionTimes(saved); controller.setSession(saved);
}
function cancelConnectionTimer() {
  clearTimeout(connectionTimer);
  connectionRevision++;
}
async function finishConnection() {
  cancelConnectionTimer();
  const opening = controller.completeConnection();
  if (opening.length) {
    print(...opening);
    await commands.welcome();
  }
}
function completeConnection() {
  cancelConnectionTimer();
  void enqueue(finishConnection).catch(reportError);
}
function updateConnection() {
  cancelConnectionTimer();
  const expected = connectionRevision;
  if (controller.screen === 'connecting') connectionTimer = setTimeout(() => {
    // Startup/session reads and command ownership share this queue. A cancelled
    // callback must not advance a later reconnect or print into a human prompt.
    void enqueue(async () => {
      if (expected !== connectionRevision || controller.screen !== 'connecting') return;
      print(...controller.advanceConnection());
      if (controller.screen === 'connecting') updateConnection();
      else await commands.welcome();
    }).catch(reportError);
  }, ENTRY_STAGE_MS);
}
function navigate(line: string) { print(...controller.submit(line)); }
const terminal = mountTerminal(root, {
  submit: (line) => {
    if (resetting) return;
    cancelConnectionTimer();
    const acceptedRevision = revision;
    // Echo inside the same queue as the response so rapid lines never split a
    // title/body prompt. Empty lines reach the composer unchanged.
    void enqueue(async () => {
      if (acceptedRevision !== revision) return;
      await finishConnection();
      const recordable = commands.recordsHistory;
      if (recordable) { session.history.add(line); commandsDuringHistoryLoad?.push(line); }
      print(`> ${line}`); terminal.reveal();
      const before = controller.screen;
      if (!await commands.submit(line)) {
        if (line.trim() && controller.needsContent && !['MAIN', 'BACK'].includes(line.trim().toUpperCase())) {
          const content = await refreshContent();
          const target = controller.forum;
          const read = /^READ ([1-9]\d*)$/i.exec(line.trim().replace(/\s+/g, ' '));
          if (target && read) {
            const data = forumPosts(content, target.keyword, target.boardNo);
            const post = data.posts.find((p) => p.number === Number(read[1]));
            const memberId = activeHuman(content);
            if (post && data.source === 'local' && memberId) {
              try { await (await repository).markRead(memberId, post.id); }
              catch (error) { reportError(error); print('既読の保存に失敗しました。再試行してください。'); return; }
            }
          }
        }
        if (line.trim()) navigate(line);
      }
      if (resetting) return;
      const repo = await repository, after = controller.screen;
      if (before === 'disconnected' && after !== 'disconnected') {
        showSessionTimes(await repo.startSession());
        const activity = await repo.openActivity();
        if (document.visibilityState === 'visible') void ai.openActivity(activity).catch(reportError);
      }
      if (before !== 'disconnected' && after === 'disconnected') {
        ai.invalidate(); showSessionTimes(await repo.endSession());
      }
      if (before !== 'disconnected') await repo.touchActivity();
      if (recordable) await repo.recordCommand(line);
      updateConnection();
    }).catch(reportError);
  },
  previous: (current) => session.history.previous(current),
  next: (current) => session.history.next(current),
  completeConnection,
});
function applicationReport(kind: 'ai' | 'offline', ...lines: string[]) {
  settingsDialog?.report(kind, ...lines);
  // Typed legacy application menus remain optional shortcuts. Background model
  // work never interrupts a human prompt or prints setup chatter in SIG output.
  if (!settingsDialog?.open && commands.applicationOutput(kind)) print(...lines);
}
const ai = createAiControls({
  print: (...lines) => applicationReport('ai', ...lines),
  read: () => enqueue(async () => (await repository).exportBackup()),
  activity: {
    openActivity: (now) => enqueue(async () => (await repository).openActivity(now)),
    configureActivity: (maxPosts, modelId, now) => enqueue(async () => {
      const state = await (await repository).configureActivity(maxPosts, modelId, now); await refreshContent(); return state;
    }),
    authorizeModel: (modelId, now, expected) => enqueue(async () => {
      const state = await (await repository).authorizeModel(modelId, now, expected); await refreshContent(); return state;
    }),
    configureResident: (profile, now) => enqueue(async () => {
      const state = await (await repository).configureResident(profile, now); await refreshContent(); return state;
    }),
    setAiRunStatus: (id, status) => enqueue(async () => (await repository).setAiRunStatus(id, status)),
    commitAiRun: (id, raw, signal) => enqueue(async () => {
      signal?.throwIfAborted(); const post = await (await repository).commitAiRun(id, raw, signal);
      try { await refreshContent(); } catch (error) { reportError(error); } return post;
    }),
  },
});
const commandActions = {
  repository: () => repository, read: refreshContent, print, navigate,
  applicationPrint: (...lines: string[]) => applicationReport('offline', ...lines),
  isConference: () => controller.isConference, isOlt: () => controller.isOlt, destination: () => controller.forum, mailbox: () => controller.mailContext, ai,
  preferences: () => terminal.preferences, applyPreferences: terminal.setPreferences,
  sessionTimes: () => terminal.sessionTimes, log: terminal.logText,
  save: async (target, draft) => {
    const post = await (await repository).createForumPost(target, { ...draft, origin: 'local-human' });
    try { await refreshContent(); } catch (error) { reportError(error); } return post;
  },
  restore: async (text, expectedContext) => {
    ai.invalidate();
    await loadHistory(async () => {
      const repo = await repository;
      await repo.replaceFromJson(text, { confirmReplace: true, expectedContext });
      commands.invalidate(); terminal.clearInput(); revision++;
      if (!settingsDialog?.open) print('バックアップを復元しました。コマンド=');
      try { await refreshContent(); } catch (error) { reportError(error); }
      return repo.getSession();
    });
    ai.resume();
    if (!settingsDialog?.open) terminal.focus();
  },
  reset: async (expectedContext) => {
    ai.invalidate();
    await (await repository).resetWorld({ confirmReset: true, expectedContext });
    try { sessionStorage.setItem(RESET_NOTICE, 'true'); } catch { /* Optional notice. */ }
    reloadWorld();
  },
} satisfies import('./commands').CommandActions;
const commands = new TerminalCommands(commandActions);
settingsDialog = mountSettings(root, {
  ...commandActions, read: () => enqueue(refreshContent), run: enqueue,
  settings: commands.settings, offline: commands.offline,
  focus: terminal.focus, composing: () => terminal.composing,
});
terminal.append(...session.transcript);
const startup = enqueue(async () => {
  const repo = await repository;
  const activity = await repo.openActivity();
  await loadHistory(() => repo.startSession());
  await refreshContent();
  try {
    if (sessionStorage.getItem(RESET_NOTICE)) { sessionStorage.removeItem(RESET_NOTICE); print('初期状態に戻しました。'); }
  } catch { /* Optional notice. */ }
  updateConnection();
  return activity;
});
void startup.then((activity) => {
  if (document.visibilityState === 'visible' && controller.screen !== 'disconnected') return ai.openActivity(activity);
}).catch(reportError);
const touchActivity = () => {
  if (!resetting && controller.screen !== 'disconnected') void enqueue(async () => (await repository).touchActivity()).catch(reportError);
};
function tickResidents() {
  if (!resetting && controller.screen !== 'disconnected' && document.visibilityState === 'visible') void ai.tick().catch(reportError);
}
setInterval(tickResidents, 60_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { commands.olt.suspend(); ai.cancelBackground(); touchActivity(); }
  else { tickResidents(); tickRoom(); }
});
function tickRoom() {
  if (!resetting && document.visibilityState === 'visible' && !settingsDialog?.open)
    void commands.olt.tick(() => terminal.composing || terminal.hasInput || !!settingsDialog?.open).catch(reportError);
}
setInterval(tickRoom, 3_000);
window.addEventListener('pagehide', () => { commands.olt.suspend(); ai.invalidate(); touchActivity(); });
window.addEventListener('pageshow', (event) => {
  if (event.persisted) { ai.resume(); tickResidents(); }
});
if (typeof BroadcastChannel !== 'undefined') {
  try {
    const changes = new BroadcastChannel(`pcvan-ai-setup:${DATABASE_NAME}`);
    changes.addEventListener('message', (event) => {
      void repository.then((repo) => {
        if (event.data?.source === repo.notificationSource) return;
        const kind = typeof event.data === 'string' ? event.data : event.data?.kind;
        if (kind === 'reset' || kind === 'replace') { reloadWorld(); return; }
        void enqueue(refreshContent).catch(reportError);
      }).catch(reportError);
    });
  } catch { /* Focus refresh covers missed notifications. */ }
}
window.addEventListener('focus', () => { void enqueue(refreshContent).catch(reportError); });
