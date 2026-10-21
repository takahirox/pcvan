import { ConnectionController } from './connection';
import { TerminalSession } from './session';
import { mountTerminal } from './terminal';
import { openRepository, RepositoryError } from './storage/repository';
import type { Session } from './storage/repository';
import { mountStorageControls } from './storage/controls';
import { ACTIVE_MEMBER_SETTING, DATABASE_NAME } from './storage/repository';
import { TERMINAL_SETTING } from './storage/schema';
import type { AiActivity, Backup, JsonValue } from './storage/schema';
import { activeHuman, forumPosts, replyReference } from './forums';
import { mountComposer } from './composer';
import { mountAiControls } from './ai/controls';
import { postInput, validateGeneration } from './ai/generation';
import { mountOfflineControls } from './offline/controls';
import { mountSettings } from './settings';
import './style.css';

const controller = new ConnectionController();
const session = new TerminalSession(controller);
const root = document.querySelector<HTMLElement>('#app')!;
const repository = openRepository();
// Serialize startup, command persistence and backups/restores. The controller stays
// usable when storage is denied; the status reports failed persistence operations.
let pending: Promise<unknown> = Promise.resolve();
let resetting = false;
const RESET_NOTICE = 'pcvan-reset-notice';
function reloadWorld() {
  resetting = true;
  ai.invalidate();
  clearTimeout(connectionTimer);
  window.location.reload();
}
let commandsDuringHistoryLoad: string[] | null = null;
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  if (resetting) return Promise.reject(new Error('初期状態への切り替え中です。'));
  const task = pending.catch(() => {}).then(action).catch((error) => {
    if (error instanceof RepositoryError && error.code === 'stale') reloadWorld();
    throw error;
  });
  pending = task;
  return task;
}
async function loadHistory(load: () => Promise<Session | null>): Promise<void> {
  const commands: string[] = [];
  commandsDuringHistoryLoad = commands;
  try {
    const saved = await load();
    session.history.replace([...(saved?.commandHistory ?? []), ...commands]);
    terminal.showSessionTimes(saved);
  } finally { commandsDuringHistoryLoad = null; }
}
const startup = enqueue(async () => {
  let activity: AiActivity | undefined;
  await loadHistory(async () => {
    activity = await (await repository).openActivity();
    return (await repository).startSession();
  });
  await refreshContent();
  return activity;
});
let displayPreferencesLoaded = false;
async function refreshContent(): Promise<Backup> {
  const content = await (await repository).exportBackup();
  if (!displayPreferencesLoaded) {
    terminal.restorePreferences(content.settings);
    displayPreferencesLoaded = true;
  }
  controller.setContent(content);
  controller.setMemberId(activeHuman(content));
  composer.refresh(content);
  ai.refresh(content);
  controls.refresh(content);
  return content;
}
let connectionTimer: ReturnType<typeof setTimeout> | undefined;
function completeConnection(): void {
  clearTimeout(connectionTimer);
  terminal.append(...session.append(...controller.completeConnection()));
  terminal.setConnecting(false);
}
function updateConnection(): void {
  clearTimeout(connectionTimer);
  const connecting = controller.screen === 'connecting';
  terminal.setConnecting(connecting);
  if (connecting) connectionTimer = setTimeout(completeConnection, 1200);
}
const terminal = mountTerminal(root, {
  submit: (line) => {
    if (resetting || !line.trim()) return;
    completeConnection();
    // Echo and history stay immediate even while IndexedDB is loading. Responses
    // are serialized with restores so rapid commands use the correct screen/data.
    session.history.add(line);
    terminal.append(...session.append(`> ${line}`));
    terminal.reveal();
    commandsDuringHistoryLoad?.push(line);
    void enqueue(async () => {
      const before = controller.screen;
      let canSubmit = true;
      let content: Backup | undefined;
      terminal.showReplyReference(null);
      if (controller.needsContent && !['MAIN', 'BACK'].includes(line.trim().toUpperCase())) {
        try { content = await refreshContent(); }
        catch (error) {
          controls.reportError(error);
          terminal.append(...session.append('投稿の読み込みに失敗しました。再試行してください。'));
          canSubmit = false; // Do not display stale posts after a failed read.
        }
      }
      const command = line.trim().replace(/\s+/g, ' ').toUpperCase();
      const target = controller.forum;
      if (canSubmit && target && content) {
        const data = forumPosts(content, target.keyword, target.boardNo);
        const reply = /^REPLY ([1-9]\d*)$/.exec(command);
        const read = /^READ ([1-9]\d*)$/.exec(command);
        if (command === 'WRITE' || reply) {
          canSubmit = false;
          const parent = reply && data.posts.find((post) => post.number === Number(reply[1]));
          if (reply && (!parent || data.source !== 'local')) {
            terminal.append(...session.append('返信先のローカル投稿がありません。見本の投稿には返信できません。'));
          } else if (data.source === 'local' && !data.available) {
            // Missing boards can be created on send; ambiguous mappings cannot.
            const sigs = content.sigs.filter((sig) => sig.keyword.toUpperCase() === target.keyword);
            const boards = content.forums.filter((forum) => forum.sigId === sigs[0]?.id && forum.boardNo === target.boardNo);
            if (sigs.length !== 1 || boards.length > 1) {
              terminal.append(...session.append('ローカルフォーラムが重複しているため投稿できません。'));
            } else composer.open(target, content, parent || undefined);
          } else composer.open(target, content, parent || undefined);
        } else if (read && Number.isSafeInteger(Number(read[1]))) {
          const post = data.posts.find((post) => post.number === Number(read[1]));
          const memberId = activeHuman(content);
          if (post && data.source === 'local' && memberId) {
            try {
              await (await repository).markRead(memberId, post.id);
            } catch (error) {
              controls.reportError(error);
              terminal.append(...session.append('既読の保存に失敗しました。再試行してください。'));
              canSubmit = false;
            }
          } else if (post && data.source === 'local') {
            terminal.append(...session.append('既読を記録するにはローカル利用者を作成してください。'));
          }
          if (canSubmit && post) terminal.showReplyReference(replyReference(post, data.posts)?.number ?? null);
        }
      }
      if (canSubmit) terminal.append(...session.append(...controller.submit(line)));
      const after = controller.screen;
      updateConnection();
      const repo = await repository;
      if (before === 'disconnected' && after !== 'disconnected') {
        terminal.showSessionTimes(await repo.startSession());
        // Persist the plan before queued commands can advance its watermark.
        const activity = await repo.openActivity();
        void ai.openActivity(activity).catch((error) => controls.reportError(error));
      }
      if (before !== 'disconnected' && after === 'disconnected') {
        ai.invalidate();
        terminal.showSessionTimes(await repo.endSession());
      }
      if (before !== 'disconnected') await repo.touchActivity();
      await repo.recordCommand(line);
    }).catch((error) => controls.reportError(error));
  },
  previous: (current) => session.history.previous(current),
  next: (current) => session.history.next(current),
  completeConnection,
  savePreferences: (preferences) => {
    // Mark the in-memory choice immediately; startup must not overwrite it.
    displayPreferencesLoaded = true;
    void enqueue(async () => {
      await (await repository).put('settings', { id: TERMINAL_SETTING, value: preferences as unknown as JsonValue });
    }).catch((error) => controls.reportError(error));
  },
});
terminal.append(...session.transcript);
updateConnection();
const settings = mountSettings(root);
const composer = mountComposer(root, {
  configureMember: () => settings.open('member'),
  beforeCompose: () => settings.close(),
  createMember: (handle) => enqueue(async () => {
    await (await repository).createHumanMember(handle);
    await refreshContent();
  }),
  selectMember: (id) => enqueue(async () => {
    const repo = await repository;
    if ((await repo.get('members', id))?.actor !== 'human') throw new Error('Missing human member.');
    await repo.put('settings', { id: ACTIVE_MEMBER_SETTING, value: id });
    await refreshContent();
  }),
  save: (target, draft) => enqueue(async () => {
    const post = await (await repository).createForumPost(target, { ...draft, origin: 'local-human' });
    terminal.append(...session.append(`投稿 #${post.number} を保存しました。LIST / READ ${post.number} で確認できます。`));
    // A failed refresh after a committed send must never invite duplicate sends.
    try { await refreshContent(); } catch (error) { controls.reportError(error); }
  }),
});
const ai = mountAiControls(root, {
  read: () => enqueue(async () => (await repository).exportBackup()),
  inspect: () => settings.open('ai'),
  deferSetup: (expected) => enqueue(async () => { await (await repository).deferAiSetup(expected); }),
  activity: {
    openActivity: (now) => enqueue(async () => (await repository).openActivity(now)),
    configureActivity: (maxPosts, modelId, now) => enqueue(async () => {
      const state = await (await repository).configureActivity(maxPosts, modelId, now);
      await refreshContent();
      return state;
    }),
    authorizeModel: (modelId, now, expected) => enqueue(async () => {
      const state = await (await repository).authorizeModel(modelId, now, expected);
      await refreshContent();
      return state;
    }),
    configureResident: (profile, now) => enqueue(async () => {
      const state = await (await repository).configureResident(profile, now);
      await refreshContent();
      return state;
    }),
    setAiRunStatus: (id, status) => enqueue(async () => (await repository).setAiRunStatus(id, status)),
    commitAiRun: (id, raw, signal) => enqueue(async () => {
      signal?.throwIfAborted();
      const post = await (await repository).commitAiRun(id, raw, signal);
      try { await refreshContent(); } catch (error) { controls.reportError(error); }
      return post;
    }),
  },
  save: (request, raw, modelId) => enqueue(async () => {
    const repo = await repository;
    const generated = validateGeneration(raw, await repo.exportBackup(), request);
    const input = postInput(generated, modelId, await repo.exportBackup());
    await repo.createAiPost(input.member, input.post);
    // Report refresh failures separately after the committed send to avoid duplicates.
    try { await refreshContent(); } catch (error) { controls.reportError(error); }
  }),
});
const controls = mountStorageControls(root, repository, enqueue, (text) => loadHistory(async () => {
  ai.invalidate();
  const repo = await repository;
  await repo.replaceFromJson(text, { confirmReplace: true });
  terminal.showReplyReference(null);
  displayPreferencesLoaded = false;
  await refreshContent();
  return repo.getSession();
}), async () => {
  await (await repository).populateEmptyCommunity({ confirmPopulate: true });
  await refreshContent();
}, async () => {
  ai.invalidate();
  const task = enqueue(async () => {
    await (await repository).resetWorld({ confirmReset: true });
    // This tab-only message survives the intentional reload; it is not world data.
    try { sessionStorage.setItem(RESET_NOTICE, 'true'); } catch { /* Optional status persistence. */ }
    reloadWorld();
  });
  resetting = true;
  try { await task; }
  catch (error) { resetting = false; throw error; }
});
// Model work runs outside the storage/command queue so the terminal stays usable.
void startup.then((activity) => {
  try {
    if (sessionStorage.getItem(RESET_NOTICE)) {
      sessionStorage.removeItem(RESET_NOTICE);
      controls.reportReset();
    }
  } catch { /* The world remains usable when sessionStorage is denied. */ }
  if (!resetting) return ai.openActivity(activity);
}).catch((error) => controls.reportError(error));
const touchActivity = () => {
  if (!resetting && controller.screen !== 'disconnected') {
    void enqueue(async () => (await repository).touchActivity()).catch((error) => controls.reportError(error));
  }
};
function tickResidents() {
  if (!resetting && controller.screen !== 'disconnected' && document.visibilityState === 'visible') {
    void ai.tick().catch((error) => controls.reportError(error));
  }
}
setInterval(() => { tickResidents(); }, 60_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') touchActivity();
  else tickResidents();
});
window.addEventListener('pagehide', () => {
  ai.invalidate();
  touchActivity(); // Best effort on close; the last periodic/command watermark is already durable.
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) void ai.openActivity().catch((error) => controls.reportError(error));
});
mountOfflineControls(root);
settings.collect();

// Other tabs may pause activity, record consent, defer setup or replace the world.
if (typeof BroadcastChannel !== 'undefined') {
  try {
    const changes = new BroadcastChannel(`pcvan-ai-setup:${DATABASE_NAME}`);
    changes.addEventListener('message', (event) => {
      if (event.data === 'reset') { reloadWorld(); return; }
      if (event.data === 'replace') ai.invalidate();
      void enqueue(refreshContent).catch((error) => controls.reportError(error));
    });
  } catch { /* Storage policy may deny notifications; focus still refreshes state. */ }
}
window.addEventListener('focus', () => {
  void enqueue(refreshContent).catch((error) => controls.reportError(error));
});
