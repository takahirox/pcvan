import { expect, test } from '@playwright/test';
import mainMenu from '../data/pcvan/main-1996.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { backupFixture } from './backup-fixture';

const collections = mainMenu.entries.filter((entry) => !['2', '3', '4', '5', '7', '13', '16', 'Q'].includes(entry.selector));
const emptyCounts: Record<string, string> = {
  '1': '受信箱：0件 / 送信済み：0件', X: '受信箱：0件 / 送信済み：0件',
  '9': '商品カタログ：0件',
  '10': '刊行物一覧：0件', '20': '刊行物一覧：0件',
};

for (const entry of collections) {
  test(`${entry.selector} has the appropriate empty collection and scoped navigation`, () => {
    const controller = new PcvanController();
    const result = controller.submit(entry.selector).slice(1);
    expect(result[0]).toBe(entry.label);
    expect(result.join('\n')).toContain(emptyCounts[entry.selector] ?? '記事一覧：0件');
    expect(result.join('\n')).not.toMatch(/未実装|利用不可|創作|再構成|https?:/);
    expect(controller.submit('HELP')).toEqual(result);
    expect(controller.submit('LIST')).toEqual(result);
    for (const command of ['BUY 1', 'SEND text', 'DOWNLOAD 1', 'CONNECT', 'WRITE', 'READ 1', '13', 'Q', 'B', 'M']) {
      expect(controller.submit(command).join('\n')).toContain('この画面では使えない');
      expect(controller.submit('HELP')).toEqual(result);
    }
    expect(controller.submit('BACK')).toEqual(controller.welcome);
    controller.submit(entry.selector);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
  });
}

test('index links to every other section and preserves the complete return path', () => {
  const controller = new PcvanController();
  const index = controller.submit('2').slice(1);
  const entries = mainMenu.entries.filter((entry) => !['2', 'Q'].includes(entry.selector));
  for (const entry of entries) {
    expect(index.join('\n')).toContain(`${entry.selector.padStart(2)} ${entry.label}`);
    expect(controller.submit(entry.selector).join('\n')).toContain(entry.label);
    expect(controller.screen).toBe(entry.selector === '16' ? 'wakaba' : entry.selector === '13' ? 'communication' : entry.selector === '7' ? 'internet-directory' : entry.selector === '5' ? 'environmental-gateway' : entry.selector === '4' ? 'database-directory' : entry.selector === '3' ? 'news-directory' : 'section');
    expect(controller.submit('BACK')).toEqual(index);
  }
  for (const command of ['2', 'Q', '0', '22', 'J UNKNOWN', 'FORUMS']) {
    expect(controller.submit(command).join('\n')).toContain('この画面では使えない');
    expect(controller.submit('HELP')).toEqual(index);
  }
  for (const command of ['13', '2', 'FORUMS', '7']) controller.submit(command);
  for (const screen of ['daisizen-forums', 'daisizen', 'communication', 'index', 'main']) {
    controller.submit('BACK'); expect(controller.screen).toBe(screen);
  }
  controller.submit('2');
  for (const command of ['J MITI', '3', '9']) controller.submit(command);
  for (const screen of ['miti-forums', 'miti', 'index', 'main']) {
    controller.submit('BACK'); expect(controller.screen).toBe(screen);
  }
  controller.submit('J MITI');
  controller.submit('BACK'); expect(controller.screen).toBe('main');
  controller.submit('2'); controller.submit('13'); controller.submit('MAIN');
  controller.submit('13'); controller.submit('BACK'); expect(controller.screen).toBe('main');
});

for (const route of [['1'], ['X'], ['13', '2', 'MAIL']]) {
  test(`${route.join(' → ')} mailboxes remain distinct and return to their own directory`, () => {
    const controller = new PcvanController();
    for (const command of route) controller.submit(command);
    const directory = controller.submit('HELP');
    for (const [command, label] of [['INBOX', '受信箱'], ['SENT', '送信済み']]) {
      const mailbox = controller.submit(command!);
      expect(mailbox[0]).toBe(`${directory[0]} / ${label}`);
      expect(mailbox.join('\n')).toContain('メール一覧：0件');
      expect(controller.forum).toBeNull();
      expect(controller.submit('HELP')).toEqual(mailbox);
      expect(controller.submit('LIST')).toEqual(mailbox);
      for (const invalid of ['READ 1', 'SEND hello', 'Q']) {
        expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
        expect(controller.submit('HELP')).toEqual(mailbox);
      }
      expect(controller.submit('BACK')).toEqual(directory);
    }
    controller.submit('INBOX');
    expect(controller.submit('SENT')[0]).toBe(`${directory[0]} / 送信済み`);
    expect(controller.submit('INBOX')[0]).toBe(`${directory[0]} / 受信箱`);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('1'); controller.submit('BACK');
    expect(controller.screen).toBe('main');
  });
}

test('empty saved boards remain empty after exploring sections and services', () => {
  const controller = new PcvanController();
  const content = backupFixture();
  content.sigs[0]!.keyword = 'DAISIZEN'; content.posts = [];
  controller.setContent(content);
  for (const command of ['2', '13', '2', 'MAIL', 'INBOX', 'BACK', 'BACK', 'OSL', 'BACK', 'FORUMS']) controller.submit(command);
  expect(controller.submit('1').join('\n')).toContain('投稿はありません。');
  expect(controller.submit('READ 1').join('\n')).not.toContain('DEMO');
  controller.submit('MAIN');
  content.sigs[0]!.keyword = 'MITI'; content.forums[0]!.boardNo = 9;
  for (const command of ['J MITI', '3']) controller.submit(command);
  expect(controller.submit('9').join('\n')).toContain('投稿はありません。');
  expect(controller.submit('READ 1').join('\n')).not.toContain('DEMO');
  expect(content.posts).toEqual([]);
});
