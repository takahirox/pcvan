import type { Page } from '@playwright/test';
export async function mockWorker(page: Page, mode: 'interrupt' | 'ok' | 'invalid' | 'failure' | 'self-greeting' | 'echo' | 'conversation' | 'retry-ok' | 'slow' | 'once-slow' | 'chatter') {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, 'gpu', { value: {} });
    // Keep outputs distinct when a new page resumes the same persona/forum run.
    const visitKey = 'pcvan-test-worker-visit';
    const visit = Number(localStorage.getItem(visitKey) ?? 0) + 1;
    localStorage.setItem(visitKey, String(visit));
    const stats = { generations: 0, loads: 0, prompts: [] as Record<string, unknown>[], settings: [] as unknown[] };
    Object.assign(window, { journeyWorker: stats });
    class MockWorker {
      onmessage?: (event: MessageEvent) => void;
      onerror?: () => void;
      postMessage(message: { kind: string; uuid: string; content: { request: { messages: { content: string }[] } } }) {
        let content: unknown = null;
        if (message.kind === 'reload') stats.loads++;
        if (message.kind === 'chatCompletionNonStreaming') {
          stats.generations++;
          stats.settings.push(message.content.request);
          if ((mode === 'interrupt' && stats.generations === 2) || (mode === 'once-slow' && stats.generations === 1)) return;
          if (mode === 'failure') { queueMicrotask(() => this.onerror?.()); return; }
          const data = JSON.parse(message.content.request.messages[1]!.content);
          stats.prompts.push(data);
          const raw = mode === 'invalid' || (mode === 'retry-ok' && stats.generations === 1) ? '{}' : data.kind === 'olt' ? JSON.stringify({
            kind: 'olt', personaId: data.personaId, roomId: data.roomId,
            text: mode === 'self-greeting' ? `こんにちは${data.speaker.handle}さん、初めてのOLTでドキドキワクワクしています。`
              : mode === 'echo' ? 'こんにちは、初めてのOLTでドキドキワクワクしています。'
              : mode === 'chatter' ? [
                '今夜は月の輪郭がくっきり見えました。窓から見える方はいますか。',
                '双眼鏡を手すりに置くと、揺れが少なくて楽ですよ。',
                '低倍率から試してみます。影の境目も面白そうですね。',
                '鉢の朝顔に種ができました。来年のために取っておこうと思います。',
                '乾燥させて紙袋に入れると、蒸れずに保管しやすいです。',
                '袋に収穫した日を書いておけば忘れませんね。',
                '散歩の途中で金木犀の香りがしました。季節が変わってきましたね。',
                'こちらの公園でも咲いていました。夕方は特に良い香りです。',
                '明日は少し遠回りして、近所の並木を眺めてみます。',
                '机の小さなラジオで音楽を聞きながら、観察記録をまとめています。',
                '日付と空模様だけでも残すと、読み返す楽しみがありますね。',
                '写真だけだったので、短い言葉も添えてみようと思います。',
              ][(stats.generations - 1) % 12]
              : mode === 'conversation' ? [
                `${data.addressee?.handle}さん、ゆっくりどうぞ。私は今夜、双眼鏡で月の縁を眺めていました。`,
                `${data.addressee?.handle}さん、月なら小さな望遠鏡でも影が面白いですね。どの倍率でしたか。`,
                '低倍率から試すと見つけやすいですよ。手すりに肘を置くと像が落ち着きました。',
              ][(stats.generations - 1) % 3]
              : `星の観察、いいですね。${visit}-${stats.generations}`,
          }) : data.kind === 'mail' ? JSON.stringify({
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
        const deliver = () => this.onmessage?.(new MessageEvent('message', {
          data: { uuid: message.uuid, kind: 'return', content },
        }));
        if (mode === 'slow' && message.kind === 'chatCompletionNonStreaming') Object.assign(window, { completeOlt: deliver });
        else queueMicrotask(deliver);
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

export async function mockModel(page: Page, mode: 'ok' | 'load-fail' = 'ok') {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
    Object.assign(window, { aiMock: { mode, loads: [] as string[], prompts: [] as unknown[], disposed: 0 } });
  }, mode);
  // Vite can append a timestamp after dependency optimization or invalidation.
  await page.route((url) => url.pathname === '/src/ai/webllm-adapter.ts', (route) => route.fulfill({ contentType: 'text/javascript', body: `
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
