import type { Page } from '@playwright/test';
export async function mockWorker(page: Page, mode: 'interrupt' | 'ok' | 'invalid' | 'failure') {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, 'gpu', { value: {} });
    // Keep outputs distinct when a new page resumes the same persona/forum run.
    const visitKey = 'pcvan-test-worker-visit';
    const visit = Number(localStorage.getItem(visitKey) ?? 0) + 1;
    localStorage.setItem(visitKey, String(visit));
    const stats = { generations: 0, loads: 0, prompts: [] as Record<string, unknown>[] };
    Object.assign(window, { journeyWorker: stats });
    class MockWorker {
      onmessage?: (event: MessageEvent) => void;
      onerror?: () => void;
      postMessage(message: { kind: string; uuid: string; content: { request: { messages: { content: string }[] } } }) {
        let content: unknown = null;
        if (message.kind === 'reload') stats.loads++;
        if (message.kind === 'chatCompletionNonStreaming') {
          stats.generations++;
          if (mode === 'interrupt' && stats.generations === 2) return;
          if (mode === 'failure') { queueMicrotask(() => this.onerror?.()); return; }
          const data = JSON.parse(message.content.request.messages[1]!.content);
          stats.prompts.push(data);
          const raw = mode === 'invalid' ? '{}' : data.kind === 'mail' ? JSON.stringify({
            personaId: data.personaId, recipientId: data.recipientId,
            ...(data.replyToMailId ? { replyToMailId: data.replyToMailId } : {}),
            subject: '星見のお便り', body: `お便りありがとう。夜空を見上げました。${data.personaId}/${visit}/${stats.generations}`,
          }) : JSON.stringify({
            personaId: data.personaId, forumId: data.forumId,
            ...(data.replyToPostId ? { replyToPostId: data.replyToPostId } : {}),
            title: '架空の旅だより', body: `これは創作の活動です。${data.personaId}/${visit}/${stats.generations}`,
          });
          content = { choices: [{ finish_reason: 'stop', message: { content: raw } }] };
        }
        queueMicrotask(() => this.onmessage?.(new MessageEvent('message', {
          data: { uuid: message.uuid, kind: 'return', content },
        })));
      }
      terminate() {}
    }
    window.Worker = MockWorker as unknown as typeof Worker;
  }, mode);
}


export async function mockPendingWorker(page: Page, work: 'load' | 'generate') {
  await page.addInitScript((work) => {
    Object.defineProperty(navigator, 'gpu', { value: {} });
    const pendingWork: string[] = []; Object.assign(window, { pendingWork });
    class PendingWorker {
      onmessage?: (event: MessageEvent) => void;
      postMessage(message: { kind: string; uuid: string }) {
        pendingWork.push(message.kind);
        if (message.kind === (work === 'load' ? 'reload' : 'chatCompletionNonStreaming')) return;
        queueMicrotask(() => this.onmessage?.(new MessageEvent('message', { data: { uuid: message.uuid, kind: 'return', content: null } })));
      }
      terminate() {}
    }
    window.Worker = PendingWorker as unknown as typeof Worker;
  }, work);
}

export async function mockModel(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
    Object.assign(window, { aiMock: { mode: 'ok', loads: [] as string[], prompts: [] as unknown[], disposed: 0 } });
  });
  await page.route('**/src/ai/webllm-adapter.ts', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export async function modelWeightsCached() { return true; }
    export function createWebLlmAdapter() {
      const mock = window.aiMock;
      return {
        async load(id, progress, signal) {
          mock.loads.push(id); progress(.42);
          if (mock.mode === 'load-fail') throw new Error('offline weights unavailable');
          if (mock.mode === 'load-wait') await new Promise((resolve) => { mock.complete = resolve; });
          progress(1);
        },
        async generate(prompt, signal) {
          mock.prompts.push(prompt);
          if (mock.mode === 'fail') throw new Error('GPU lost');
          if (mock.mode === 'malformed') return '{}';
          if (mock.mode === 'wait') await new Promise((resolve) => { mock.complete = resolve; });
          const data = JSON.parse(prompt.user);
          return JSON.stringify({ personaId: data.personaId, forumId: data.forumId,
            ...(data.replyToPostId ? { replyToPostId: data.replyToPostId } : {}), title: '星の話題', body: '日本語の本文。\\n次の行。' });
        }, dispose() { mock.disposed++; }
      };
    }
  ` }));
}
