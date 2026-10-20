import { expect, test } from '@playwright/test';

test('real WebLLM adapter uses structured worker requests, forwards progress, rejects truncation and terminates cancelled/failed workers', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const result = await page.evaluate(async () => {
    const path = '/src/ai/webllm-adapter.ts';
    const { createWebLlmAdapter } = await import(path) as typeof import('../src/ai/webllm-adapter');
    const OriginalWorker = window.Worker;
    let active: FakeWorker;
    let mode = 'ok';
    const requests: { kind: string; uuid: string; content: any }[] = [];
    class FakeWorker {
      onmessage?: (event: MessageEvent) => void;
      onerror?: () => void;
      onmessageerror?: () => void;
      terminated = false;
      constructor() { active = this; }
      postMessage(message: { kind: string; uuid: string; content: any }) {
        requests.push(message);
        if (mode === 'wait') return;
        queueMicrotask(() => {
          if (message.kind === 'reload') this.onmessage?.(new MessageEvent('message', { data: { kind: 'initProgressCallback', content: { progress: 0.5 } } }));
          this.onmessage?.(new MessageEvent('message', { data: { uuid: message.uuid, kind: 'return', content: message.kind === 'chatCompletionNonStreaming'
            ? { choices: [{ finish_reason: mode === 'truncated' ? 'length' : 'stop', message: { content: '{"title":"mock"}' } }] }
            : null } }));
        });
      }
      terminate() { this.terminated = true; }
    }
    window.Worker = FakeWorker as unknown as typeof Worker;
    try {
      const progress: number[] = [];
      const adapter = createWebLlmAdapter();
      await adapter.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', (value) => progress.push(value), new AbortController().signal);
      const prompt = { system: 'system', user: 'user', schema: '{"type":"object"}' };
      const text = await adapter.generate(prompt, new AbortController().signal);
      mode = 'truncated';
      let truncated = false;
      try { await adapter.generate(prompt, new AbortController().signal); } catch { truncated = true; }
      adapter.dispose();
      const disposed = active!.terminated;
      mode = 'wait';
      const cancelled = createWebLlmAdapter();
      const signal = new AbortController();
      const pending = cancelled.load('model', () => {}, signal.signal).then(() => 'unexpected', (error) => error.name);
      signal.abort();
      const cancellation = { error: await pending, terminated: active!.terminated };
      const broken = createWebLlmAdapter();
      const failing = broken.load('model', () => {}, new AbortController().signal).then(() => false, () => true);
      active!.onerror?.();
      const failure = { rejected: await failing, terminated: active!.terminated };
      return { requests, progress, text, truncated, disposed, cancellation, failure };
    } finally { window.Worker = OriginalWorker; }
  });
  expect(result.progress).toEqual([0.5]);
  expect(result.text).toBe('{"title":"mock"}');
  expect(result.truncated).toBe(true);
  expect(result.disposed).toBe(true);
  expect(result.cancellation).toEqual({ error: 'AbortError', terminated: true });
  expect(result.failure).toEqual({ rejected: true, terminated: true });
  const completion = result.requests.find((request) => request.kind === 'chatCompletionNonStreaming')!;
  expect(completion.content.request).toMatchObject({
    messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'user' }],
    response_format: { type: 'json_object', schema: '{"type":"object"}' }, max_tokens: 1024, stream: false,
  });
  expect(result.requests[0]!.content.chatOpts).toEqual([{ context_window_size: 4096 }]);
  expect(result.requests[1]!.kind).toBe('resetChat');
});

test('offline real adapter rejects uncached weights before any model reload request', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:14374');
  // Import while online so this test isolates missing weights from missing JS.
  await page.evaluate(async () => { const path = '/src/ai/webllm-adapter.ts'; await import(path); });
  await context.setOffline(true);
  const result = await page.evaluate(async () => {
    const path = '/src/ai/webllm-adapter.ts';
    const { createWebLlmAdapter } = await import(path) as typeof import('../src/ai/webllm-adapter');
    const OriginalWorker = window.Worker;
    const messages: unknown[] = [];
    class FakeWorker { postMessage(message: unknown) { messages.push(message); } terminate() {} }
    window.Worker = FakeWorker as unknown as typeof Worker;
    const adapter = createWebLlmAdapter();
    try {
      await adapter.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', () => {}, new AbortController().signal);
      return { error: '', messages };
    } catch (error) { return { error: String(error), messages }; }
    finally { adapter.dispose(); window.Worker = OriginalWorker; }
  });
  expect(result.error).toContain('重みが未保存');
  expect(result.messages).toEqual([]);
});
