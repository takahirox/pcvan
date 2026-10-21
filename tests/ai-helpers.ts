import type { Page } from '@playwright/test';
export async function mockWorker(page: Page, mode: 'interrupt' | 'ok' | 'invalid' | 'failure') {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, 'gpu', { value: {} });
    const stats = { generations: 0, loads: 0 };
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
          const raw = mode === 'invalid' ? '{}' : JSON.stringify({
            personaId: data.personaId, forumId: data.forumId,
            ...(data.replyToPostId ? { replyToPostId: data.replyToPostId } : {}),
            title: '架空の旅だより', body: `これは創作の活動です。${data.personaId}/${stats.generations}`,
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
