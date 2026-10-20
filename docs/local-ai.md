# Optional browser-local AI (Issue #10)

The ordinary terminal requires no model, GPU, external API key, or inference
server. AI is off on each page load. The separate **ローカル AI 設定・投稿の出自**
settings panel is reconstructed product UI; it is not a historical PC-VAN menu.
The model receives no menu definitions and can return only forum post fields.
It cannot change navigation, command semantics, historical strings, or fixtures.

## Use and limitations

1. Create a human member and send a manual post to create a local board, or
   restore a local-world backup. Demo boards are never copied into storage by AI.
2. Expand the AI panel and select a model. Read the network/storage notice before
   pressing **モデルを読み込む（初回ダウンロード）**. This explicit action is the
   only entry point that imports the WebLLM runtime and starts its worker.
3. Choose a fictional persona, local board and optional local reply target. All
   three profiles are original fiction: 星守 (careful astronomy enthusiast),
   草笛 (gentle nature observer), and 半田ごて (practical hobbyist with dry humor).
   Their complete profiles are visible in settings.
4. Generate a post, inspect the validated preview, then explicitly save or discard
   it. Generation alone writes nothing, including no AI member. There is no
   background posting or automatic retry.
5. **AI を停止・解放** cancels a download or inference and terminates the worker,
   releasing its model. Changing models also unloads it. Restore cancels pending
   AI work and discards its preview. Reload starts with AI off.

WebGPU in a secure context (HTTPS or localhost) is required. Actual GPU features,
VRAM and Japanese output quality vary. The selected models are the pinned
WebLLM `prebuiltAppConfig` entries `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` and
`Qwen2.5-1.5B-Instruct-q4f16_1-MLC` (roughly 1 GB and 2 GB VRAM respectively,
not guaranteed device requirements). These small multilingual models are offered
as low-resource starting points, not as a guarantee of Japanese quality. Output
may be rejected; a user can choose another model and explicitly try again.

Initial loading fetches model configuration, compiled model libraries and weights
from WebLLM's configured MLC/GitHub and Hugging Face distribution hosts. Depending
on model, downloads can total hundreds of MB to GB. Weights are not bundled with
the app. The runtime itself is several MB and is built as lazy JS/worker assets;
Vite reports a large-chunk advisory for these optional assets. Inference runs
inside a dedicated worker on the device. There is no remote inference, telemetry,
key prompt or fallback provider; forum text is not sent to a remote service.

WebLLM manages its own browser model cache separately from the IndexedDB local
world. Loading again can reuse available cached artifacts, but offline use is
not guaranteed: runtime assets, configuration, libraries or weights may be missing
or evicted. Cancel stops active worker fetches but does not remove previously
cached files. Model caches are excluded from JSON backups; clear browser site
storage to remove them (export local posts first). Errors, unsupported WebGPU,
missing offline weights and device loss are explained in the panel and leave the
terminal, reading, backups and manual posting available. No real model load is
required to use the simulator or run tests.

## Prompt and validation boundary

`src/ai/generation.ts` constructs a bounded system/user prompt from:

- One of the three fixed fictional profiles and the exact selected IDs.
- SIG keyword/title (80/160 UTF-16 units) and board name (160 units).
- The last four same-board posts with `local-human` or `local-ai:webllm:` origin,
  ordered by post number; each contains at most 128 ID, 80 title and 300 body
  UTF-16 units. Imported/historical origins and the demonstration fixture are
  excluded. Context text is explicitly untrusted data, never instructions.

No preserved historical corpus, training or bulk copying is part of this feature.
Manual local posts should be original material; origin fields cannot establish
that a user-supplied backup is truthful. Reply IDs may point to any stored post in
the same board, but imported/historical text is not included in the prompt.

WebLLM uses JSON mode with an explicit schema and a 1,024-token output cap, a
4,096-token context window and reset chat per request. Tokenization varies; an
oversized context/incomplete completion fails without posting. The application
rejects raw responses over 8,000 UTF-16 units, invalid JSON, extra/missing fields,
wrong types, mismatched persona/forum/reply IDs, missing references, and replies
outside the selected board. There is no JSON repair or Markdown-fence stripping.
The exact allowed fields are `personaId`, `forumId`, optional `replyToPostId`
(required when replying), `title`, and `body`. Titles must be nonblank, one line,
and at most 120 UTF-16 units; bodies must be nonblank and at most 1,200 units.
Control characters, invisible direction/format controls and HTML-like tags are
rejected. An exact copy of a recent context body is rejected. These checks bound
and screen content; they cannot prove originality, truthfulness or literary
quality. The user reviews plain text before saving.

The selected identities/references and text are validated again against fresh
storage on save. `LocalRepository.createAiPost(member, post)` registers the
fictional member and calls the existing transactional post allocator together,
checking the forum and reply relationship atomically. Failure rolls back member
creation, post creation and numbering. Existing human identities cannot be
replaced by the AI identity. No local board is created by generation.

## Provenance and inspection

The v1 storage format is unchanged. Persona members have `actor: 'ai'`, stable
IDs such as `fictional-ai:hoshimori`, and their fictional period-style handles.
Posts have `origin: 'local-ai:webllm:<modelId>'`; the stable author ID identifies
the persona even after an export/restore. Time and post number come from the
repository, never the model. Active human selection and read markers are not
changed by AI posting.

The accessible settings panel lists persona biographies and all AI-origin or
AI-authored stored posts, with handle, author ID, actor, origin/model, forum ID,
number and title. Historical-style reading may show just the member ID, while
settings and JSON backups retain explicit inspectable AI attribution. Rendering
uses `textContent`, so model text cannot become DOM markup or terminal commands.

## Validation

`npm test` includes deterministic mocked-adapter browser tests for explicit lazy
loading, model/persona selection, preview/save/discard, reply/reference validation,
provenance and reload, malformed output, delayed cancellation, restore, offline
load failures and inference failures. The tests verify terminal use and manual
posting after failures. Pure generation checks cover prompt bounds and validation;
real IndexedDB checks cover atomic rollback, identity collisions and backup
round-tripping. No tests download weights or require a real GPU.

Optional, not a completion gate: on supported desktop hardware, select each model,
observe a real load/progress/cancel, generate/review Japanese posts from all three
personas and verify device responsiveness, quality and cache behavior. This has
not been performed in this implementation environment. Required post-merge
verification: none.

Implementation references: [WebLLM](https://github.com/mlc-ai/web-llm),
[basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html).
The integration uses the installed pinned package's worker APIs and model config.
