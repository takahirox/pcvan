import { expect, test } from '@playwright/test';
import { command, start, enterForum, post, snapshot, noOtherUi, backup } from './terminal-helpers';

test('first run → handle → seeded read → reply/edit/save → list/read → reload uses only commands', async ({ page }) => {
  await start(page, 'たか'); await noOtherUi(page);
  await enterForum(page); await command(page, 'READ 1', '★内容');
  const before = await snapshot(page);
  expect(before.posts).toHaveLength(66);
  expect(before.readStates[0]!.lastReadNumber).toBe(1);
  await command(page, 'REPLY 1', '返信先：#1');
  await command(page, '昔のパソコン通信', '本文');
  for (const line of ['  日本語　ｶﾅ <b>文字</b>  ', '', '夜更かししていました。']) await command(page, line, '本文=');
  await command(page, '.END', '本文：3行');
  await command(page, 'MAIN', '下書きは保持');
  await command(page, '', 'Y / N / EDIT');
  await command(page, 'EDIT', 'LINE 番号');
  await command(page, 'TITLE 返信を編集', 'タイトルを変更');
  await command(page, 'LINE 3  変更した本文  ', '本文を変更');
  await command(page, 'DELETE 99', 'その行はありません');
  await command(page, 'REVIEW', '投稿しますか');
  await command(page, 'Y', '発言 #17 を登録しました');
  await command(page, 'Y', 'この画面では使えない');
  await command(page, 'LIST', '#17 返信を編集');
  await command(page, 'READ 17', '返信先：#1');
  const saved = await snapshot(page), reply = saved.posts.find((p) => p.number === 17)!;
  expect(saved.posts).toHaveLength(67);
  expect(reply).toMatchObject({ title: '返信を編集', body: '  日本語　ｶﾅ <b>文字</b>  \n\n 変更した本文  ', origin: 'local-human', replyToPostId: before.posts.find((p) => p.number === 1 && p.forumId === reply.forumId)!.id });
  await expect(page.locator('.output b')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.output')).toContainText('番号またはコマンド=');
  await expect(page.locator('.output')).not.toContainText('ハンドル名を登録しますか');
  await enterForum(page); await command(page, 'LIST', '#17 返信を編集 RE#1 [既読]');
  await command(page, 'READ 17', reply.body); await noOtherUi(page);
});

test('skipped handle resumes pending WRITE; blank, long, command-shaped body and cancel preserve data', async ({ page }) => {
  await start(page); await enterForum(page);
  await command(page, 'REPLY 999', '返信先のローカル投稿がありません');
  await command(page, 'WRITE', '登録しますか');
  await command(page, 'nope', 'Y / N / SKIP');
  await command(page, 'Y', 'ハンドル名=');
  await command(page, '', '80文字以内');
  await command(page, '旅人', 'タイトル=');
  await command(page, '', '200文字以内');
  await command(page, 'a'.repeat(201), '200文字以内');
  await command(page, '題名', '本文');
  await command(page, '.END', '本文は空白だけ');
  await command(page, ' ', '本文=');
  await command(page, '.END', '本文は空白だけ');
  await command(page, 'BACK', '下書きは保持');
  await command(page, '.TEXT MAIN', '本文=');
  await command(page, '.TEXT .END', '本文=');
  await command(page, 'x'.repeat(20001), 'この行は追加していません');
  await command(page, '.END', '本文：3行');
  await command(page, 'EDIT', 'APPEND');
  await command(page, 'DELETE 1', '本文を変更');
  await command(page, 'APPEND', '本文を1行ずつ');
  await command(page, '追記', '本文=');
  await command(page, '.END', '本文：3行');
  await command(page, 'Y', '発言 #17');
  expect((await snapshot(page)).posts.find((p) => p.number === 17)!.body).toBe('MAIN\n.END\n追記');
  for (const stage of ['title', 'body', 'review', 'edit']) {
    await command(page, 'WRITE', 'タイトル=');
    if (stage !== 'title') await command(page, '中止する投稿', '本文');
    if (['review', 'edit'].includes(stage)) { await command(page, '中止', '本文='); await command(page, '.END', '投稿しますか'); }
    if (stage === 'edit') await command(page, 'EDIT', 'LINE 番号');
    await command(page, '.CANCEL', '投稿を中止');
  }
  expect((await snapshot(page)).posts).toHaveLength(67);
});

test('human handle selection retains independent read states and never selects residents', async ({ page }) => {
  await start(page, '一人目'); await enterForum(page); await command(page, 'READ 2', '★内容');
  await command(page, 'HANDLE', '1 一人目 [選択中]');
  await command(page, '2', '番号 / NEW');
  await command(page, 'NEW', 'ハンドル名='); await command(page, '二人目', '登録しました');
  await command(page, 'MAIN', 'MAIN'); await enterForum(page); await command(page, 'LIST', '[未読]');
  await command(page, 'READ   1', '★内容');
  await command(page, 'HANDLE', '二人目 [選択中]');
  const humans = (await snapshot(page)).members.filter((m) => m.actor === 'human');
  await command(page, String(humans.findIndex((m) => m.handle === '一人目') + 1), '一人目 を選択');
  await command(page, 'RENAME 一人目改', 'ハンドル名を変更しました');
  await command(page, 'MAIN', 'MAIN'); await enterForum(page); await command(page, 'LIST', '#2');
  const data = await snapshot(page);
  expect(data.readStates.map((r) => r.lastReadNumber).sort()).toEqual([1, 2]);
  expect(data.members.filter((m) => m.actor === 'human')).toHaveLength(2);
});

test('IME confirmation cannot submit title/body/review; storage failure retains a retryable draft without duplicate saves', async ({ page }) => {
  await start(page, '入力者'); await enterForum(page); await command(page, 'WRITE', 'タイトル=');
  const input = page.locator('#command');
  await input.fill('変換中'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('変換中');
  expect((await snapshot(page)).posts).toHaveLength(66);
  await input.dispatchEvent('compositionend'); await input.press('Enter');
  await expect(page.locator('.output')).toContainText('本文を1行ずつ');
  await command(page, '日本語', '本文='); await command(page, '.END', '投稿しますか');
  await input.fill('Y'); await input.dispatchEvent('compositionstart'); await input.press('Enter');
  await expect(input).toHaveValue('Y'); await input.dispatchEvent('compositionend');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'forums') throw new DOMException('test quota', 'QuotaExceededError');
      return key === undefined ? native.call(this, value) : native.call(this, value, key);
    };
    Object.assign(window, { restorePut: () => { IDBObjectStore.prototype.put = native; } });
  });
  await command(page, 'Y', '入力は残っています');
  expect((await snapshot(page)).posts).toHaveLength(66);
  await page.evaluate(() => (window as unknown as { restorePut(): void }).restorePut());
  await command(page, 'Y', '発言 #17'); await command(page, 'LIST', '#17 変換中');
  expect((await snapshot(page)).posts).toHaveLength(67);
});

test('deleted reply parent fails safely and a failed read marker never reveals stale post content', async ({ page }) => {
  await start(page, '読む人'); await enterForum(page); await command(page, 'REPLY 1', 'タイトル=');
  await command(page, '返信', '本文'); await command(page, '保持する本文', '本文='); await command(page, '.END', '投稿しますか');
  // Repository API enforces parent relationships, including external deletion.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const req = indexedDB.open('pcvan-local'); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>((resolve) => { const tx = db.transaction('posts', 'readwrite'); const store = tx.objectStore('posts');
      const req = store.getAll(); req.onsuccess = () => { const row = req.result.find((p) => p.forumId === 'resident-forum:MITI:9' && p.number === 1); store.delete(row.id); }; tx.oncomplete = () => resolve(); }); db.close();
  });
  await command(page, 'Y', '入力は残っています'); await command(page, 'CANCEL', '投稿を中止');
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) { if (this.name === 'readStates') throw new DOMException('test', 'QuotaExceededError'); return key === undefined ? native.call(this, value) : native.call(this, value, key); };
  });
  const response = await command(page, 'READ 2', '既読の保存に失敗');
  expect(response).not.toContain('★内容');
  await command(page, 'MAIN', 'MAIN');
});

test('composer state machine isolates navigation, non-destructive edit validation and consumed sends', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const path = '/src/composer.ts'; const { TerminalComposer } = await import(path);
    const outputs: string[] = [], saves: unknown[] = [];
    const composer = new TerminalComposer({ keyword: 'MITI', boardNo: 9, name: '資料室' }, 'human', undefined, {
      print: (...lines: string[]) => outputs.push(...lines),
      save: async (_target: unknown, draft: unknown) => { saves.push(draft); return { number: 1 }; },
    });
    for (const line of ['題名', '一行目', '', '.END', 'MAIN', 'EDIT', 'DELETE 1', 'REVIEW', 'APPEND', '二行目', '.END', 'Y', 'Y']) await composer.submit(line);
    return { outputs, saves, active: composer.active };
  });
  expect(result.saves).toEqual([{ authorId: 'human', title: '題名', body: '\n二行目' }]);
  expect(result.active).toBe(false);
  expect(result.outputs.join('\n')).toContain('本文が空白だけです');
  expect(result.outputs.join('\n')).toContain('下書きは保持');
});

test('rapid queued lines preserve prompt order, exact text and a single transactional send', async ({ page }) => {
  await start(page, '連続入力'); await enterForum(page);
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#command')!, form = input.form!;
    for (const line of ['WRITE', '連続入力の題', '  最初  ', '', '最後', '.END', 'Y', 'Y', 'LIST']) {
      input.value = line; form.requestSubmit();
    }
  });
  await expect(page.locator('.output')).toContainText('#17 連続入力の題');
  const data = await backup(page);
  expect(data.posts).toHaveLength(67);
  expect(data.posts.find((p) => p.number === 17)!.body).toBe('  最初  \n\n最後');
  expect(data.session!.commandHistory).toContain('WRITE');
  expect(data.session!.commandHistory).not.toContain('  最初  ');
});

test('first send creates an absent board in an existing SIG; cancelling never creates it', async ({ page }) => {
  await start(page, '新しい掲示板');
  for (const [line, response] of [['13', 'コミュニケーション'], ['2', '大自然'], ['FORUMS', 'フォーラム'], ['2', '投稿一覧']]) await command(page, line!, response!);
  const before = await snapshot(page);
  await command(page, 'WRITE', 'タイトル='); await command(page, 'CANCEL', '投稿を中止');
  expect((await snapshot(page)).forums).toEqual(before.forums);
  await post(page, '新しい話題', '空の掲示板に初投稿');
  const saved = await snapshot(page);
  expect(saved.forums).toHaveLength(before.forums.length + 1);
  const created = saved.posts.find((p) => p.title === '新しい話題')!;
  expect(created.number).toBe(1); expect(saved.forums.find((f) => f.id === created.forumId)!.boardNo).toBe(2);
  await command(page, 'READ 1', '空の掲示板に初投稿');
});
