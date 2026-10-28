import { hasModelInCache, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import type { GenerationPrompt, LocalLlmAdapter } from './generation';

// WebLLM checks the tensor manifest and every referenced weight shard without
// fetching missing files. This does not prove that config/tokenizer/WASM exist.
export const modelWeightsCached = (modelId: string) => hasModelInCache(modelId);

/** Loaded after explicit model setup consent. Termination cancels fetch and GPU work. */
export function createWebLlmAdapter(): LocalLlmAdapter {
  const worker = new Worker(new URL('./webllm-worker.ts', import.meta.url), { type: 'module' });
  const engine = new WebWorkerMLCEngine(worker);
  let disposed = false;
  let failWorker: ((reason: Error) => void) | undefined;
  const dispose = () => { disposed = true; worker.terminate(); };
  worker.onerror = () => { failWorker?.(new Error('AI worker failed.')); dispose(); };
  worker.onmessageerror = () => { failWorker?.(new Error('AI worker message failed.')); dispose(); };

  async function run<T>(signal: AbortSignal, action: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    if (disposed) throw new Error('AI worker is unavailable. Reload the model.');
    let abort: () => void = () => {};
    const stopped = new Promise<never>((_, reject) => {
      failWorker = reject;
      abort = () => { dispose(); reject(new DOMException('Cancelled', 'AbortError')); };
      signal.addEventListener('abort', abort, { once: true });
    });
    try { return await Promise.race([action(), stopped]); }
    finally { signal.removeEventListener('abort', abort); failWorker = undefined; }
  }
  return {
    load: (modelId, progress, signal) => run(signal, async () => {
      if (!navigator.onLine && !await modelWeightsCached(modelId)) {
        throw new Error('選択モデルの重みが未保存です。オンラインでモデルを読み込んでください。');
      }
      signal.throwIfAborted();
      engine.setInitProgressCallback((report) => progress(report.progress));
      await engine.reload(modelId, { context_window_size: 4096 });
    }),
    generate: (prompt: GenerationPrompt, signal) => run(signal, async () => {
      await engine.resetChat();
      const result = await engine.chat.completions.create({
        messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user + (prompt.instruction ? `\n\n${prompt.instruction}` : '') }],
        response_format: { type: 'json_object', schema: prompt.schema },
        max_tokens: prompt.purpose === 'olt' ? 256 : 1024, temperature: prompt.purpose === 'olt' ? 0.65 : 0.8, stream: false,
      });
      const choice = result.choices[0];
      if (choice?.finish_reason !== 'stop' || !choice.message.content) throw new Error('生成が完了しませんでした。');
      return choice.message.content;
    }),
    dispose,
  };
}
