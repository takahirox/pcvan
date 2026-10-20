import { expect, test } from '@playwright/test';
import { demoController } from '../src/controller';
import { TerminalSession } from '../src/session';
import { CommandHistory, COMMAND_HISTORY_LIMIT } from '../src/history';

test('a replaceable controller receives the original input and output stays exact', () => {
  const received: string[] = [];
  const session = new TerminalSession({
    welcome: ['Synthetic test'],
    submit(line) {
      received.push(line);
      return ['  全角：Ａ　半角: ｶﾅ\n <b>plain text</b>  '];
    },
  });
  const line = '  command  ｶﾅ　。 ';
  expect(session.submit(line)).toEqual([`> ${line}`, '  全角：Ａ　半角: ｶﾅ\n <b>plain text</b>  ']);
  expect(received).toEqual([line]);
  session.append('追加\n  出力');
  expect(session.transcript).toEqual([
    'Synthetic test', `> ${line}`, '  全角：Ａ　半角: ｶﾅ\n <b>plain text</b>  ', '追加\n  出力',
  ]);
  expect(session.submit('  ')).toEqual([]);
  expect(received).toHaveLength(1);
});

test('history handles empty history, boundaries, drafts, and a recalled submission', () => {
  const session = new TerminalSession(demoController);
  expect(session.history.previous('draft')).toBe('draft');
  expect(session.history.next('draft')).toBe('draft');
  session.submit('help');
  session.submit('demo');
  expect(session.history.previous('unfinished')).toBe('demo');
  expect(session.history.previous('demo')).toBe('help');
  expect(session.history.previous('help')).toBe('help');
  expect(session.history.next('help')).toBe('demo');
  expect(session.history.next('demo')).toBe('unfinished');
  expect(session.history.next('edited draft')).toBe('edited draft');
  session.history.previous('unfinished');
  session.submit('echo recalled');
  expect(session.history.next('')).toBe('');
  expect(session.history.previous('new draft')).toBe('echo recalled');
  expect(session.history.next('echo recalled')).toBe('new draft');
});

test('history bounds restored and submitted commands while retaining edits to recalled input', () => {
  const history = new CommandHistory();
  history.replace(Array.from({ length: COMMAND_HISTORY_LIMIT + 10 }, (_, i) => `command ${i}`));
  let recalled = 'draft';
  for (let i = 0; i < 150; i++) recalled = history.previous(recalled);
  expect(recalled).toBe('command 10');
  history.add('submitted');
  recalled = 'draft';
  for (let i = 0; i < 150; i++) recalled = history.previous(recalled);
  expect(recalled).toBe('command 11');
  history.replace(['command 108', 'command 109']);
  expect(history.previous('original draft')).toBe('command 109');
  expect(history.previous('edited newest')).toBe('command 108');
  expect(history.next('edited older')).toBe('edited newest');
  expect(history.next('edited newest')).toBe('original draft');
  expect(history.previous('new draft')).toBe('edited newest');
  history.add('submitted');
  expect(history.next('')).toBe('');
  expect(history.previous('draft')).toBe('submitted');
  history.replace([' ', 'help', '']);
  expect(history.previous('draft')).toBe('help');
  expect(history.previous('help')).toBe('help');
  expect(history.next('edited help')).toBe('draft');
});
