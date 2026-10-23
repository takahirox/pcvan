import { expect, test } from '@playwright/test';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';

const entries = [
  ['MAIL', '電子メール', '受信箱：0件'],
  ['LIBRARY', 'ライブラリィ', 'ファイル一覧：0件'],
  ['CONFERENCE', '電子会議室', '参加者：0人'],
  ['OLT', 'ＯＬＴ（＊）', '参加者：0人'],
  ['OSL', 'ＯＳＬ', 'ファイル一覧：0件'],
] as const;

function daisizen() {
  const controller = new PcvanController();
  controller.submit('13');
  controller.submit('2');
  return controller;
}

test('service helpers preserve provisional metadata and show concise operational labels', () => {
  const controller = daisizen();
  const output = controller.submit('HELP').join('\n');
  for (const [input, label] of entries) {
    const section = evidence.daisizen.sections.find((item) => item.label === label)!;
    expect(section.selector).toBeNull();
    expect(section.status).toBe('provisional');
    expect(section.demo_entry).toEqual({ input, evidence_category: 'D', status: 'reconstructed' });
    expect(output).toContain(`${label}`);
    expect(output).toContain(`${input}: ${label}`);
  }
});

for (const [input, label, empty] of entries) {
  test(`${input} opens its own empty collection with stable HELP, BACK and MAIN`, () => {
    const controller = daisizen();
    const directory = controller.submit('HELP');
    const output = controller.submit(`  ${input.toLowerCase()}  `);
    expect(controller.screen).toBe('daisizen-service');
    expect(controller.needsContent).toBe(input === 'MAIL');
    expect(output.join('\n')).toContain(`大自然＆動植物（DAISIZEN） / ${label}`);
    expect(output.join('\n')).toContain(empty);
    expect(output.join('\n')).not.toMatch(/未実装|利用不可/);
    expect(controller.submit('LIST')).toEqual(output);
    for (const command of ['1', '2', 'Q', 'E', 'H', 'RB1', 'TL1', 'DL1', 'KW', 'READ 1', 'SEND hello', 'UPLOAD file', 'hello', '<b>発言</b>', 'FORUMS', ...entries.map(([helper]) => helper)]) {
      expect(controller.submit(command).join('\n')).toContain('この画面では使えない');
      expect(controller.screen).toBe('daisizen-service');
      expect(controller.submit('HELP')).toEqual(output);
    }
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.screen).toBe('daisizen');
    controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    expect(controller.screen).toBe('main');
  });
}

test('service helpers stay scoped to the SIG; forum reading and MITI navigation still work', () => {
  const controller = new PcvanController();
  const paths = [[], ['13'], ['2', 'FORUMS'], ['1'], ['MAIN', 'J MITI'], ['3'], ['9']];
  for (const path of paths) {
    for (const command of path) controller.submit(command);
    const before = controller.screen;
    for (const [input] of entries) {
      expect(controller.submit(input).join('\n')).toContain('この画面では使えない');
      expect(controller.screen).toBe(before);
    }
    if (before === 'forum' || before === 'miti-materials') {
      expect(controller.submit('READ 1').join('\n')).toContain('★内容');
    }
  }
});
