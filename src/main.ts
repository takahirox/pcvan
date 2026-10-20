import { ConnectionController } from './connection';
import { TerminalSession } from './session';
import { mountTerminal } from './terminal';
import { openRepository } from './storage/repository';
import type { Session } from './storage/repository';
import { mountStorageControls } from './storage/controls';
import './style.css';

const controller = new ConnectionController();
const session = new TerminalSession(controller);
const root = document.querySelector<HTMLElement>('#app')!;
const repository = openRepository();
// Serialize startup, command persistence and backups/restores. The controller stays
// usable when storage is denied; the status reports failed persistence operations.
let pending: Promise<unknown> = Promise.resolve();
let commandsDuringHistoryLoad: string[] | null = null;
function enqueue(action: () => Promise<void>): Promise<void> {
  const task = pending.catch(() => {}).then(action);
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
const startup = enqueue(() => loadHistory(async () => (await repository).startSession()));
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
    if (!line.trim()) return;
    completeConnection();
    // Echo and history stay immediate even while IndexedDB is loading. Responses
    // are serialized with restores so rapid commands use the correct screen/data.
    session.history.add(line);
    terminal.append(...session.append(`> ${line}`));
    commandsDuringHistoryLoad?.push(line);
    void enqueue(async () => {
      const before = controller.screen;
      let canSubmit = true;
      if (controller.needsContent && !['MAIN', 'BACK'].includes(line.trim().toUpperCase())) {
        try { controller.setContent(await (await repository).exportBackup()); }
        catch (error) {
          controls.reportError(error);
          terminal.append(...session.append('投稿の読み込みに失敗しました。再試行してください。'));
          canSubmit = false; // Do not display stale posts after a failed read.
        }
      }
      if (canSubmit) terminal.append(...session.append(...controller.submit(line)));
      const after = controller.screen;
      updateConnection();
      const repo = await repository;
      if (before === 'disconnected' && after !== 'disconnected') {
        terminal.showSessionTimes(await repo.startSession());
      }
      if (before !== 'disconnected' && after === 'disconnected') {
        terminal.showSessionTimes(await repo.endSession());
      }
      await repo.recordCommand(line);
    }).catch((error) => controls.reportError(error));
  },
  previous: (current) => session.history.previous(current),
  next: (current) => session.history.next(current),
  completeConnection,
});
terminal.append(...session.transcript);
updateConnection();
const controls = mountStorageControls(root, repository, enqueue, (text) => loadHistory(async () => {
  const repo = await repository;
  await repo.replaceFromJson(text, { confirmReplace: true });
  return repo.getSession();
}));
void startup.catch((error) => controls.reportError(error));
