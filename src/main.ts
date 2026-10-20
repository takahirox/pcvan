import { PcvanController } from './navigation';
import { TerminalSession } from './session';
import { mountTerminal } from './terminal';
import './style.css';

const session = new TerminalSession(new PcvanController());
const terminal = mountTerminal(document.querySelector<HTMLElement>('#app')!, {
  submit: (line) => terminal.append(...session.submit(line)),
  previous: (current) => session.history.previous(current),
  next: (current) => session.history.next(current),
});
terminal.append(...session.transcript);
