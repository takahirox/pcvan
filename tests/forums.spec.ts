import { expect, test } from '@playwright/test';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import demos from '../data/pcvan/demo-posts.json' with { type: 'json' };
import { PcvanController } from '../src/navigation';
import { renderPost } from '../src/forums';
import { validateRecord } from '../src/storage/schema';
import { backupFixture } from './backup-fixture';

function miti() {
  const controller = new PcvanController();
  for (const step of evidence.miti.steps) controller.submit(step.input);
  return controller;
}

function daisizen() {
  const controller = new PcvanController();
  controller.submit('13');
  controller.submit('2');
  return controller;
}

test('DAISIZEN sections preserve evidence labels without invented section numbers or jump', () => {
  const controller = daisizen();
  const output = controller.submit('HELP').join('\n');
  for (const section of evidence.daisizen.sections) {
    expect(output).toContain(`${section.label}`);
    expect(section.selector).toBeNull();
  }
  expect(evidence.daisizen.jump.input).toBeNull();
  controller.submit('MAIN');
  expect(controller.submit('J DAISIZEN').join('\n')).toContain('移動先が見つかりません');
  expect(controller.screen).toBe('main');
});

test('all seven DAISIZEN boards are independently selectable with scoped numbers and back', () => {
  const controller = daisizen();
  const output = controller.submit('FORUMS').join('\n');
  expect(evidence.daisizen.forums.map((forum) => forum.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  for (const forum of evidence.daisizen.forums) {
    expect(output).toContain(`${forum.number} ${forum.label}`);
    expect(controller.submit(String(forum.number)).join('\n')).toContain(`DAISIZEN / ${forum.label} / 投稿一覧`);
    expect(controller.screen).toBe('forum');
    expect(controller.submit('1').join('\n')).toContain('この画面では使えない');
    expect(controller.screen).toBe('forum');
    expect(controller.submit('BACK').join('\n')).toBe(output);
  }
  controller.submit('BACK');
  expect(controller.screen).toBe('daisizen');
  controller.submit('BACK');
  expect(controller.screen).toBe('communication');
});

test('MITI route reaches numbered original demos; gaps and invalid reads preserve the screen', () => {
  const controller = miti();
  const listing = controller.submit('LIST').join('\n');
  expect(listing.indexOf('#1 ')).toBeLessThan(listing.indexOf('#3 '));
  expect(listing).not.toMatch(/創作|再構成|https?:/);
  const read = controller.submit(' read   1 ').join('\n');
  expect(read).toContain('#1/9001　資料室');
  expect(read).toContain('★タイトル (DEMO0001)  96/07/06  21:34');
  expect(read).toContain('★内容\n  架空の星');
  expect(read).toContain('架空の星を見つけたら、どんな名前を付けますか。');
  for (const invalid of ['READ 2', 'READ 999', 'READ 0', 'READ -1', 'READ 1.5', 'READ 9007199254740992', 'READ 1 extra', 'Q', 'J MITI']) {
    expect(controller.submit(invalid).join('\n')).toMatch(/ありません|この画面では使えない/);
    expect(controller.screen).toBe('miti-materials');
    expect(controller.submit('HELP').join('\n')).toContain(listing);
  }
  expect(controller.submit('READ 3').join('\n')).toContain('#3　資料室');
  expect(controller.submit('READ 3').join('\n')).not.toContain('#3/');
  controller.submit('BACK');
  expect(controller.screen).toBe('miti-forums');
  controller.submit('9');
  expect(controller.screen).toBe('miti-materials');
});

test('headers preserve title/body spacing and optional fields without interpreting secondary numbers', () => {
  const post = { ...demos.posts[0]!, displaySecondNumber: 0, title: '  創作　ｶﾅ  ', body: '\n  <b>文字</b>　。\n\n末尾  \n' };
  expect(renderPost(post, '表示試験', 7)).toEqual([
    '#1/0　表示試験', '★タイトル (DEMO0001)  96/07/06  21:34  ( 7)',
    post.title, '★内容', post.body,
  ]);
  const { displaySecondNumber: _second, ...withoutSecond } = post;
  expect(renderPost(withoutSecond, '表示試験')[0]).toBe('#1　表示試験');
  expect(renderPost(withoutSecond, '表示試験')[1]).not.toContain('( 7)');
});

test('all seeded demo posts have original provenance and synthetic IDs', () => {
  expect(demos.evidence_category).toBe('D');
  expect(demos.status).toBe('reconstructed');
  for (const post of demos.posts) {
    validateRecord('posts', post);
    expect(post.origin).toBe('synthetic-demo');
    expect(post.authorId).toMatch(/^DEMO\d{4}$/);
    expect(post.title).toContain('創作デモ');
  }
});

test('author headers use current handles for human, seed, generated and legacy posts without changing records', () => {
  const fixture = backupFixture();
  const human = fixture.posts[0]!;
  const seeded = { ...human, authorId: 'fictional-ai:resident', origin: 'local-seed:fictional' };
  const generated = { ...seeded, id: 'run', origin: 'local-ai:webllm:test-model',
    simulation: { runId: 'run', simulatedAt: '1996-07-06T12:34:00.000Z', fictional: true as const } };
  const members = [...fixture.members, { id: seeded.authorId, handle: '常連', actor: 'ai' as const }];
  const before = structuredClone([human, seeded, generated]);
  expect(renderPost(human, '広場', undefined, members)[1]).toContain('(人間)');
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(常連)');
  const rendered = renderPost(generated, '広場', undefined, members).join('\n');
  expect(rendered).toContain('(常連)  96/07/06  21:34');
  expect(rendered).not.toMatch(/fictional-ai:|架空の投稿時刻|local-ai:|runId|AI住人|シミュレーション/);
  members[2]!.handle = '星の番人';
  expect(renderPost(generated, '広場', undefined, members)[1]).toContain('(星の番人)');
  for (const authorId of ['missing', 'fictional-ai:missing', 'local-human:old', '<b>record key</b>']) {
    expect(renderPost({ ...human, authorId }, '広場')[1]).toContain('(名無し)');
  }
  expect(renderPost({ ...human, authorId: 'ai' }, '広場', undefined, fixture.members)[1]).toContain('(AI)');
  members[2]!.handle = '';
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(名無し)');
  members[2]!.handle = seeded.authorId;
  expect(renderPost(seeded, '広場', undefined, members)[1]).toContain('(名無し)');
  expect([human, seeded, generated]).toEqual(before);
});

test('repository identities map by SIG keyword and board number; empty/missing/ambiguous boards stay empty', () => {
  const controller = miti();
  const content = backupFixture();
  content.sigs[0]!.keyword = 'miti';
  content.forums[0]!.boardNo = 9;
  // Reverse storage order, and give the lower number a later date: numbering
  // determines the stable order, independently of IDs/timestamps.
  content.posts[0]!.createdAt = '2026-10-21T01:02:03.000Z';
  content.posts.reverse();
  controller.setContent(content);
  const listing = controller.submit('LIST').join('\n');
  expect(listing.indexOf('#1 ')).toBeLessThan(listing.indexOf('#4 '));
  expect(listing).not.toContain('創作デモ投稿');
  expect(controller.submit('READ 4').join('\n')).toContain('#4/12　資料室');
  expect(controller.submit('READ 2').join('\n')).toContain('投稿はありません');
  content.posts = [];
  expect(controller.submit('LIST').join('\n')).toContain('投稿はありません');
  content.forums[0]!.boardNo = 8;
  expect(controller.submit('LIST').join('\n')).toContain('見つからないか、重複');
  content.forums[0]!.boardNo = 9;
  content.forums.push({ ...content.forums[0]!, id: 'duplicate' });
  expect(controller.submit('LIST').join('\n')).toContain('見つからないか、重複');
  expect(controller.submit('READ 1').join('\n')).toContain('投稿はありません');
  expect(controller.screen).toBe('miti-materials');
  expect(controller.submit('MAIN')).toEqual(controller.welcome);
});

test('empty DAISIZEN board and invalid forum selectors preserve navigation', () => {
  const controller = daisizen();
  const sigScreen = controller.submit('HELP');
  expect(controller.submit('1').join('\n')).toContain('この画面では使えない');
  expect(controller.submit('HELP')).toEqual(sigScreen);
  controller.submit('FORUMS');
  const forums = controller.submit('HELP');
  for (const invalid of ['0', '8', '9', 'READ 1', 'J DAISIZEN', 'Q']) {
    expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
    expect(controller.submit('HELP')).toEqual(forums);
  }
  expect(controller.submit('7').join('\n')).toContain('投稿はありません');
  expect(controller.submit('READ 1').join('\n')).toContain('投稿はありません');
  controller.submit('BACK');
  controller.submit('1');
  expect(controller.submit('READ 1').join('\n')).toContain('小さな庭の便り');
});
