import { expect, test } from '@playwright/test';
import { demoController } from '../src/controller';
import { TerminalSession } from '../src/session';

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
