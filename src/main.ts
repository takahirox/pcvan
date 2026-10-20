import { PcvanController } from './navigation';
import { TerminalSession } from './session';
import { mountTerminal } from './terminal';
import { openRepository } from './storage/repository';
import type { Session } from './storage/repository';
import { mountStorageControls } from './storage/controls';
import './style.css';

const session = new TerminalSession(new PcvanController());
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
  } finally { commandsDuringHistoryLoad = null; }
}
const startup = enqueue(() => loadHistory(async () => (await repository).startSession()));
const terminal = mountTerminal(root, {
  submit: (line) => {
    terminal.append(...session.submit(line));
    if (!line.trim()) return;
    commandsDuringHistoryLoad?.push(line);
    void enqueue(async () => {
      await (await repository).recordCommand(line);
    }).catch((error) => controls.reportError(error));
  },
  previous: (current) => session.history.previous(current),
  next: (current) => session.history.next(current),
});
terminal.append(...session.transcript);
const controls = mountStorageControls(root, repository, enqueue, (text) => loadHistory(async () => {
  const repo = await repository;
  await repo.replaceFromJson(text, { confirmReplace: true });
  return repo.getSession();
}));
void startup.catch((error) => controls.reportError(error));
