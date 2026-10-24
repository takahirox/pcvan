import { expect, test } from '@playwright/test';
import { PcvanController } from '../src/navigation';
import { backupFixture } from './backup-fixture';
import { emptyOsl, OSL_SETTING } from '../src/storage/schema';

function enter(nav: PcvanController, category: number) {
  for (const line of ['MAIN', '13', '2', 'OSL', String(category)]) nav.submit(line);
}

test('OSL category scope, current authored catalog, safe attribution and stable selection do not affect library or other services', () => {
  const nav = new PcvanController(), content = backupFixture();
  const state = emptyOsl(); state.nextNumbers['2'] = 3;
  state.entries.push({ id: 'authored', number: 2, category: 2, filename: 'MINE.CSV', title: '観察', purpose: '目的', body: 'a,b\n',
    createdAt: '1996-11-23T01:00:00.000Z', authorId: 'human', origin: 'local-human' });
  content.settings.push({ id: OSL_SETTING, value: state as never });
  content.members[1]!.handle = '\u001b名前'; nav.setContent(content);
  for (const category of [1, 2, 3, 4, 5, 6]) {
    enter(nav, category);
    expect(nav.oslCategory).toBe(category <= 2 ? category : null);
    expect(nav.submit('LIST').join('\n').includes('REGISTER:')).toBe(category <= 2);
  }
  enter(nav, 2); const listing = nav.submit('LIST').join('\n');
  expect(listing).toContain('#2 MINE.CSV'); expect(listing).toContain('著者：名無し (SYN-'); expect(listing).not.toContain('\u001b');
  expect(nav.selectDownload(2)!.body).toBe('a,b\n');
  expect(nav.submit('READ 2').join('\n')).toContain('a,b\n'); expect(nav.oslCategory).toBeNull();
  nav.submit('BACK'); nav.submit('BACK'); nav.submit('BACK'); nav.submit('LIBRARY'); nav.submit('2');
  expect(nav.oslCategory).toBeNull(); expect(nav.selectDownload(2)).toBeNull();
  expect(nav.submit('LIST').join('\n')).not.toContain('MINE');
  enter(nav, 2); nav.submit('READ 2'); nav.setContent(backupFixture());
  expect(nav.submit('HELP').join('\n')).toContain('その番号の項目はありません');
  expect(nav.submit('LIST').join('\n')).toContain('ファイル一覧：1件');
  expect(content.settings.find((s) => s.id === OSL_SETTING)!.value).toEqual(state);
});

test('OSL composer preserves review/edit/cancel/retry and excursions; repeated confirmation and invalidation across awaits cannot save twice', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (fixture) => {
    const cp = '/src/commands.ts', np = '/src/navigation.ts';
    const { TerminalCommands } = await import(cp);
    const { PcvanController } = await import(np) as typeof import('../src/navigation');
    const nav = new PcvanController(), prints: string[] = [], saved: Record<string, unknown>[] = [];
    let failSave = false, failPrint = false, failRefresh = false, readGate: Promise<void> | undefined, repoGate: Promise<void> | undefined;
    const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
    const repo = { createOslEntry: async (draft: Record<string, unknown>) => {
      if (failSave) throw new Error('quota');
      saved.push(draft); failRefresh = true; return { ...draft, number: saved.length + 1 };
    } };
    const commands = new TerminalCommands({
      repository: async () => { await repoGate; return repo; },
      read: async () => { await readGate; if (failRefresh) { failRefresh = false; throw new Error('render refresh'); } nav.setContent(fixture); return fixture; },
      print: (...lines: string[]) => { if (failPrint && lines.some((s) => s.includes('OSL #'))) throw new Error('render output'); prints.push(...lines); },
      navigate: (line: string) => prints.push(...nav.submit(line)), destination: () => nav.forum, oslCategory: () => nav.oslCategory,
      ai: { stop() {} },
    });
    const submit = async (line: string) => { prints.length = 0; if (!await commands.submit(line)) prints.push(...nav.submit(line)); return prints.join('\n'); };
    const enter = (category = 1) => { for (const line of ['MAIN', '13', '2', 'OSL', String(category)]) nav.submit(line); };
    for (const path of [[], ['13'], ['13', '2'], ['13', '2', 'OSL'], ['13', '2', 'OSL', '3'], ['7', '3'], ['13', '2', 'LIBRARY', '1']]) {
      nav.submit('MAIN'); path.forEach((line) => nav.submit(line)); await submit('REGISTER');
      check(commands.recordsHistory, 'unrelated service started a composer');
    }
    enter(); const categoryView = nav.submit('HELP').join('\n');
    for (const stage of ['filename', 'title', 'purpose', 'body', 'review', 'edit']) {
      await submit('REGISTER');
      if (stage !== 'filename') await submit('TEST.TXT');
      if (!['filename', 'title'].includes(stage)) await submit('題');
      if (['body', 'review', 'edit'].includes(stage)) await submit('用途');
      if (['review', 'edit'].includes(stage)) { await submit('本文'); await submit('.END'); }
      if (stage === 'edit') await submit('EDIT');
      check(!commands.recordsHistory, 'draft entered ordinary history');
      await submit(stage === 'review' ? 'N' : '.CANCEL');
      check(commands.recordsHistory && saved.length === 0, 'cancellation wrote state');
      check(nav.submit('HELP').join('\n') === categoryView, 'cancellation lost category');
    }
    await submit('REGISTER');
    for (const line of ['', '../A.TXT', 'A/B.CSV', 'A B.TXT', 'A.EXE', 'A'.repeat(61) + '.TXT', '\u001b.TXT'])
      check((await submit(line)).includes('無効'), 'invalid filename accepted');
    await submit('MINE.txt');
    for (const line of [' ', 'x'.repeat(201), '題\u001b']) check((await submit(line)).includes('200文字'), 'invalid title accepted');
    await submit('  題  ');
    for (const line of ['', 'x'.repeat(201), '用\u202e途']) check((await submit(line)).includes('用途は'), 'invalid purpose accepted');
    await submit('  用途  ');
    check((await submit('\u001b[2J')).includes('制御文字'), 'unsafe body accepted');
    check((await submit('x'.repeat(20001))).includes('20000文字'), 'oversize body accepted');
    await submit('.END'); check(prints.join('\n').includes('空白だけ'), 'empty body reviewed');
    await submit('  日本語 <b>本文</b>  '); await submit(''); await submit('.TEXT MAIN'); await submit('.TEXT .END'); await submit('');
    for (const line of ['BACK', 'MAIN', 'HELP']) check((await submit(line)).includes('下書きは保持'), 'navigation discarded body');
    await submit('.END');
    for (const line of ['LIST', 'REGISTER', 'Y extra', '']) check((await submit(line)).includes('Y / N / EDIT'), 'implicit confirmation');
    await submit('EDIT'); await submit('FILENAME FINAL.CSV'); await submit('PURPOSE   編集した用途  '); await submit('TITLE 編集した題');
    await submit('LINE 3   結び  '); await submit('DELETE 4'); await submit('APPEND'); await submit('.TEXT SETTINGS'); await submit('');
    const review = await submit('.END');
    for (const text of ['分類：1', 'ファイル名：FINAL.CSV', '用途：  編集した用途  ', '著者：人間 (SYN-', 'タイトル：編集した題', '1:   日本語 <b>本文</b>  ', '5: SETTINGS', '6: ']) check(review.includes(text), `missing review: ${text}`);
    await submit('SETTINGS'); await submit('MAIN');
    check(nav.submit('HELP').join('\n') === categoryView && !commands.recordsHistory, 'menu MAIN lost draft or category');
    await submit('SETTINGS'); await submit('ABOUT'); await submit('BACK'); await submit('BACK');
    check((await submit('HELP')).includes('Y: 保存'), 'Settings/About lost review');
    failSave = true; check((await submit('Y')).includes('再試行'), 'failed save lost input'); failSave = false;
    await Promise.all([submit('Y'), submit('Y'), submit('Y')]);
    check(saved.length === 1 && commands.recordsHistory, 'concurrent Y duplicated or retained draft');
    await submit('Y'); check(saved.length === 1, 'repeated Y duplicated');
    enter(2); await submit('REGISTER'); await submit('SECOND.TXT'); await submit('題'); await submit('用途'); await submit('本文'); await submit('.END');
    failPrint = true; await submit('Y').catch(() => {}); failPrint = false;
    check(commands.recordsHistory && saved.length === 2, 'render failure left draft sendable');
    await submit('Y'); check(saved.length === 2, 'render retry duplicated');
    // World changes during REGISTER's read must not install a stale composer.
    enter(); let release!: () => void; readGate = new Promise<void>((resolve) => { release = resolve; });
    const starting = submit('REGISTER'); commands.invalidate(); release(); await starting; readGate = undefined;
    check(commands.recordsHistory, 'stale read started composer');
    // World changes while acquiring the repository must not write the old draft.
    await submit('REGISTER'); await submit('STALE.TXT'); await submit('題'); await submit('用途'); await submit('本文'); await submit('.END');
    repoGate = new Promise<void>((resolve) => { release = resolve; });
    const saving = submit('Y'); commands.invalidate(); release(); await saving; repoGate = undefined;
    check(saved.length === 2 && commands.recordsHistory, 'stale awaited save committed');
    return { saved, review };
  }, backupFixture());
  expect(result.saved[0]).toMatchObject({ category: 1, filename: 'FINAL.CSV', title: '編集した題', purpose: '  編集した用途  ',
    body: '  日本語 <b>本文</b>  \n\n  結び  \n\nSETTINGS\n', authorId: 'human' });
  expect(result.saved[1]!.category).toBe(2); expect(result.saved[0]!.id).not.toBe(result.saved[1]!.id);
  expect(result.review).toContain(`${Buffer.byteLength(result.saved[0]!.body as string, 'utf8')} bytes（UTF-8）`);
});
