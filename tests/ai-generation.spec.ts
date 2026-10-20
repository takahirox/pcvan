import { expect, test } from '@playwright/test';
import { backupFixture } from './backup-fixture';

test('prompts bound persona, SIG and four recent local posts; strict validation rejects malformed content and IDs', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (fixture) => {
    const path = '/src/ai/generation.ts';
    const { buildPrompt, validateGeneration } = await import(path) as typeof import('../src/ai/generation');
    const request = { personaId: 'hoshimori', forumId: 'forum', replyToPostId: 'first' };
    const valid = { ...request, title: '星の観察', body: '今夜の空を眺める工夫について考えてみました。\n皆さんはどうしていますか。' };
    const invalid: string[] = ['{', 'null', '[]', '"post"', '```json\n' + JSON.stringify(valid) + '\n```', 'x'.repeat(8001)];
    for (const change of [
      { personaId: 'real-historical-person' }, { forumId: 'other' }, { replyToPostId: 'third' },
      { extra: 'unknown' }, { title: '' }, { title: '　 ' }, { body: '' }, { body: 7 },
      { title: 'x'.repeat(121) }, { body: 'x'.repeat(1201) }, { title: 'line\nbreak' },
      { body: '\u001b[2Jscreen' }, { body: 'a\u0000b' }, { body: '\u202ehidden' }, { body: '<script>alert(1)</script>' },
      { body: fixture.posts[0]!.body },
    ]) invalid.push(JSON.stringify({ ...valid, ...change }));
    const { title: _, ...missing } = valid;
    invalid.push(JSON.stringify(missing));
    const rejected = invalid.map((raw) => {
      try { validateGeneration(raw, fixture, request); return false; } catch { return true; }
    });
    const noReply = { personaId: 'kusabue', forumId: 'forum' };
    let unexpectedReply = false;
    try { validateGeneration(JSON.stringify({ ...valid, ...noReply }), fixture, noReply); } catch { unexpectedReply = true; }
    const maxAccepted = validateGeneration(JSON.stringify({ ...valid, title: 'あ'.repeat(120), body: 'い'.repeat(1200) }), fixture, request);
    const missingTargets = [
      { ...request, personaId: 'missing' }, { ...request, forumId: 'missing' },
      { ...request, replyToPostId: 'missing' }, { ...request, replyToPostId: 'third' },
    ].map((target) => { try { buildPrompt(fixture, target); return false; } catch { return true; } });
    for (let n = 10; n < 20; n++) fixture.posts.push({ ...fixture.posts[0]!, id: `post-${n}`, number: n, title: 't'.repeat(1000), body: 'b'.repeat(10000) });
    fixture.posts.push({ ...fixture.posts[0]!, id: 'historical', number: 30, origin: 'historical', body: 'PRESERVED-HISTORICAL-CONTENT' });
    const prompts = ['hoshimori', 'kusabue', 'hankote'].map((personaId) => buildPrompt(fixture, { ...request, personaId }));
    return { rejected, unexpectedReply, missingTargets, maxAccepted, prompts,
      accepted: validateGeneration(JSON.stringify(valid), fixture, request) };
  }, backupFixture());
  expect(result.rejected.every(Boolean)).toBe(true);
  expect(result.unexpectedReply).toBe(true);
  expect(result.missingTargets).toEqual([true, true, true, true]);
  expect(result.maxAccepted.body).toHaveLength(1200);
  expect(result.accepted.personaId).toBe('hoshimori');
  expect(new Set(result.prompts.map((prompt) => JSON.parse(prompt.user).persona)).size).toBe(3);
  for (const prompt of result.prompts) {
    expect(prompt.system.length + prompt.user.length).toBeLessThan(5000);
    expect(prompt.user).not.toContain('PRESERVED-HISTORICAL-CONTENT');
    const data = JSON.parse(prompt.user);
    expect(data.sig).toEqual({ keyword: 'LOCAL', title: '個人の世界' });
    expect(data.recentPosts.map((post: { id: string }) => post.id)).toEqual(['post-16', 'post-17', 'post-18', 'post-19']);
    expect(data.recentPosts.every((post: { title: string; body: string }) => post.title.length <= 80 && post.body.length <= 300)).toBe(true);
    expect(JSON.parse(prompt.schema).additionalProperties).toBe(false);
  }
});

test('AI identity, provenance and allocation commit atomically; collisions, deleted parents and quota errors roll back', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async (fixture) => {
    const repoPath = '/src/storage/repository.ts';
    const genPath = '/src/ai/generation.ts';
    const { openRepository } = await import(repoPath) as typeof import('../src/storage/repository');
    const { postInput } = await import(genPath) as typeof import('../src/ai/generation');
    const repo = await openRepository('ai-atomic');
    await repo.replaceFromJson(JSON.stringify(fixture), { confirmReplace: true });
    const input = postInput({ personaId: 'hoshimori', forumId: 'forum', title: '創作の観察', body: '創作の本文', replyToPostId: 'first' }, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    const created = await repo.createAiPost(input.member, input.post);
    const saved = await repo.exportBackup();
    await repo.replaceFromJson(JSON.stringify(saved), { confirmReplace: true });
    const restored = await repo.exportBackup();
    async function rejectsUnchanged(action: () => Promise<unknown>) {
      const before = await repo.exportJson();
      let rejected = false;
      try { await action(); } catch { rejected = true; }
      return rejected && before === await repo.exportJson();
    }
    const results = [];
    results.push(await rejectsUnchanged(() => repo.createAiPost({ ...input.member, id: 'human' }, { ...input.post, authorId: 'human' })));
    results.push(await rejectsUnchanged(() => repo.createAiPost({ ...input.member, handle: '別人' }, input.post)));
    const fresh = { id: 'new-ai', handle: '仮の AI', actor: 'ai' as const };
    results.push(await rejectsUnchanged(() => repo.createAiPost(fresh, { ...input.post, authorId: fresh.id, replyToPostId: 'third' })));
    await repo.delete('posts', created.id);
    await repo.delete('posts', 'reply');
    await repo.delete('posts', 'first');
    results.push(await rejectsUnchanged(() => repo.createAiPost(fresh, { ...input.post, authorId: fresh.id })));
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'forums') throw new DOMException('Test quota', 'QuotaExceededError');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    };
    try {
      const { replyToPostId: _, ...post } = input.post;
      results.push(await rejectsUnchanged(() => repo.createAiPost(fresh, { ...post, authorId: fresh.id })));
    } finally { IDBObjectStore.prototype.put = nativePut; }
    repo.close();
    return { created, saved, restored, results };
  }, backupFixture());
  expect(result.created).toMatchObject({ authorId: 'fictional-ai:hoshimori', number: 8, replyToPostId: 'first', origin: 'local-ai:webllm:Qwen2.5-0.5B-Instruct-q4f16_1-MLC' });
  expect(result.saved.members).toContainEqual({ id: 'fictional-ai:hoshimori', handle: '星守', actor: 'ai' });
  expect(result.saved.forums[0]!.nextPostNumber).toBe(9);
  expect(result.restored).toEqual(result.saved);
  expect(result.results).toEqual([true, true, true, true, true]);
});

test('the pinned runtime includes every offered model', async () => {
  const { prebuiltAppConfig } = await import('@mlc-ai/web-llm');
  const { models } = await import('../src/ai/personas');
  for (const model of models) expect(prebuiltAppConfig.model_list.some((row) => row.model_id === model.id)).toBe(true);
});
