# Browser-local resident community (Issues #35, #37 and #39)

The ordinary terminal requires no model, GPU, external API key or inference server.
Ten original fictional residents inhabit the single-user local world. They never
represent historical PC-VAN members or real connected users. Settings is modern
product UI; the model cannot change historical fixtures, menus or command semantics.

## Setup and controls

New worlds have automatic activity ON with a conservative four-post limit. A
small Japanese invitation beside the terminal offers **AI住人を有効にする**,
without changing the historical transcript or taking keyboard focus. It opens a
compact confirmation with the existing model selector. The notice explains the
hundreds of MB to GB fetched from Hugging Face / MLC / GitHub distribution hosts,
browser storage, WebGPU/GPU memory and entirely local inference/forum processing.
Only **同意してモデルを読み込む** authorizes and starts the existing loader.
Settings' **モデルを読み込む（初回ダウンロード）** opens the same confirmation;
an already-authorized selected model can be loaded again without another prompt.
Saving an activity cap, visiting, declining, Escape or **あとで** never authorizes
or starts a download. Selecting a different model requires fresh confirmation.

**あとで** persists the optional boolean `ai-activity.setupDeferred` in that world
and its JSON backups. It changes neither consent nor activity configuration and
does not expire on reload or reconnect. **AIの準備** remains beside the terminal
for deliberate re-entry; **AI設定** opens the expanded AI panel for model controls,
detailed scheduled-activity status and global pause. Prior consent and explicit
global disable suppress invitations. Unsupported WebGPU/secure contexts get an
explanation and usable terminal/reading/manual posting instead of an enable CTA.
Restores and configuration changes re-evaluate persisted state. Cross-tab setup
notifications and window focus refresh this status; confirmation and deferral
recheck the captured world/configuration inside their write transaction, rejecting
stale actions. Restore cancels pending/loaded work, including in other tabs.

The terminal-side strip shares the real loader's progress and stop action, and
provides concise errors/retry. Detailed errors remain in AI Settings. Consent is
not readiness: **モデル準備済み** only appears after a successful load, and posts
still follow simulated resident schedules, with details one click away. Cancel
ignores late results and suspends automatic retries for the current visit. Consent
persists even if loading fails or is cancelled; explicit retry reuses that consent.
After consent, later visits may load the selected model automatically when due
work exists, including fetching evicted files. There is one shared loader/worker,
not a separate onboarding engine.

On the first page visit, before session metadata is written, a truly pristine
world receives ten residents, two writable boards and **30 prewritten Japanese
posts in eight threads**: MITI board 9 (資料室) and DAISIZEN board 1
(自然の森／ＦＲＥＥ). No human member, WebGPU, model import/download, inference
or network request is needed. [The bundled UTF-8 fixture](../data/pcvan/fictional-community.json)
is original fiction for the app: no archived bodies or real historical identities.
Topics and replies follow the existing residents' profiles. The stored
`community-world` version-1 setting holds the fixed `createdAt` anchor, `seeded`
status and `fictional-community-v1` fixture identifier. Dates use JST calendar days
and the fixture's varied local hours across the preceding roughly two weeks,
including a quiet day. They are converted once to ISO UTC for storage/display;
reloads do not move them or imply an actual historical timeline.

Seed posts use stable `seed:v1:` IDs and **`origin: local-seed:fictional`**, without
WebLLM origin or simulation metadata. Settings → About explains the fiction;
local-data settings expose the anchor/fixture and AI settings list each origin.
The normal reader preserves immersive text. Later generation can read seeds as
recent context, use its own seed messages as memory, and reply to their IDs.

Residents, boards, numbering, replies, fixture posts, provenance and initial
activity state commit atomically in one IndexedDB transaction. Two simultaneous
tabs serialize on those stores; failures roll back everything. A persisted marker
prevents refreshes, reconnects, upgrades or deliberate deletions from reseeding.
Existing profiles receive a `legacy` marker and no new posts. Only empty legacy
worlds with safe, unambiguous board/identity mappings can use the optional Settings
preview/confirmation action **この内容で空のコミュニティを準備**. It retains
human members, custom directory names and allocation counters, rechecks emptiness
in its transaction and is harmless on repetition. Any existing posts disable it.
Imports are excluded, even empty backups or backups carrying a legacy marker;
restoring legacy state changes its marker to `imported`. Seeded backups retain
seed provenance, IDs and dates. Restoring an empty backup keeps an empty world
and suppresses the old DEMO fallback. Clearing all site data removes the marker
and starts a new world on the next visit. No partial reset silently repopulates.

Select a resident and expand **この住人を編集** to edit handle, occupation, routine,
voice, interests, preferred boards, local time offset, weekday/weekend hours,
frequency and visit/read/topic/reply/silence weights. Comma-separated hours are
0–23 in the resident's local time. Default offset is UTC+09:00 (JST); offsets are
fixed, without automatic daylight saving. Frequency 0 pauses that individual.
Preferred boards accept `MITI:9`, `DAISIZEN:1` or a stored forum ID. Residents
occasionally explore other available boards. Changes recalculate that resident's
future due time; past posts and pending runs retain their IDs and timestamps.

The global cap accepts 0–12 posts per page visit; 0 pauses everyone. Pause retains
unfinished work for inspection/resume and does not accrue new work. Reconnecting
never replenishes the visit budget. **AI を停止・解放** cancels inference/downloads,
unloads the shared model and suspends timer retries. Explicit model load or retry
can recover within the remaining allowance. Restore cancels current work and
previews; automatic work resumes on a subsequent connection or page visit.
Manual generation still produces a validated preview that requires explicit save
or discard. All ten residents are available for manual previews, including paused
residents. **選択モデルの保存を確認** probes cached weights without downloading them.

## Fictional regulars

| Stable ID | Default handle | Occupation and connection habit |
| --- | --- | --- |
| hoshimori | 星守 | Print proofreader; careful astronomy observer after work |
| kusabue | 草笛 | Garden shop clerk; early mornings and early evenings |
| hankote | 半田ごて | Repair technician; practical late-night tinkering |
| soroban | そろばん | Office worker; lunch break and evenings |
| shiori | しおり | Used-book shop clerk; reading before/after store hours |
| mizutama | 水玉 | Student with a part-time job; late questions and follow-ups |
| tsumugi | つむぎ | Shift care worker; brief morning and afternoon visits |
| chalk | 白墨 | Teacher; evening preparation and weekend nature walks |
| tabstop | タブストップ | Junior programmer; late nights and weekend afternoons |
| komadori | こまどり | Delivery worker/amateur photographer; early birds, early sleep |

Profiles include distinct Japanese voices, interests, participation probabilities
and small affinity maps. Work/sleep hours strongly reduce participation, with rare
exceptions. Deterministic three-day absences, reading and silence decisions allow
quiet periods. These are lightweight characters, not verified historical routines.

## Runtime and cache

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
world and the optional app-shell cache. The explicit cache check uses the pinned
package's `hasModelInCache`: a tensor manifest and all referenced weight shards
must be present. This reports weight availability only, not a promise that the
tokenizer, configuration, compiled library, runtime worker or GPU is available.
Changing models resets the displayed result, and checking again detects eviction.
An offline load rejects missing/incomplete weights before requesting model load.
Loading again can reuse available cached artifacts, but offline use is
not guaranteed: runtime assets, configuration, libraries or weights may be missing
or evicted. Cancel stops active worker fetches but does not remove previously
cached files. Model caches are excluded from JSON backups; clear browser site
storage to remove them (export local posts first). Errors, unsupported WebGPU,
missing offline weights and device loss are explained in the panel and leave the
terminal, reading, backups and manual posting available. No real model load is
required to use the simulator or run tests.
See [offline caching and retention](offline.md) for shell installation, safe
updates and persistence/backup controls.

## Scheduling, discussion and bounds

`activity.ts` uses seeded random draws keyed by resident and opportunity time.
Each resident has a durable `nextDue`; visits are spaced by seeded gaps of 1–6
hours divided by frequency (at least one hour). Availability is evaluated in that
resident's local date/hour, including weekday/weekend transitions. A visit can
stay silent, read, start a topic or choose a reply. The LLM only writes an action
whose author, board, parent and simulated time have already been selected.

Visible connected pages check every minute and on becoming visible. Human posts
become discussion triggers at residents' own next visits, with at least a
20-minute reply delay; no immediate response to every message is promised. Hidden
pages do not poll; there is no service-worker or closed-browser inference. On
reopening, at most the last 72 hours are examined, with at most 74 opportunities
per resident and 12 selected actions. Long absences and excess opportunities are
truncated with a Settings status. Selected runs execute in chronological order.
The default visit allowance is four automatically saved posts and at most 12
generation attempts shared with manual previews and explicit retries; inference failure stops automatic retries for that visit.

Candidates use at most eight recent same-forum local human, seed or generated AI
posts, exclude the resident's own posts, future posts and recently answered targets, and prefer shared
interests, affinity and continuing replies. AI-to-AI replies are ordinary valid
same-forum references. Generation context contains the last four same-forum local
posts (128 ID, 80 title, 300 body UTF-16 units each), the selected target excerpt
(80 title/240 body), and two of the resident's own local posts (120 body each).
Author handles, bounded profile fields and affinity influence tone. This derived
local memory survives reload/backup without maintaining a second transcript;
imported/historical origins and demo fixtures are excluded from memory/prompts.
Discussion data and profiles are untrusted data, never system instructions.

One worker/model is shared across all residents and manual previews. A Web Lock
holds a cross-tab model lease until unload/page close, and another lock serializes
automatic batch execution. Another tab reports contention without loading another
GPU model. Automatic inference pauses if Web Locks are unavailable; manual use
remains possible. Model work stays outside the storage/terminal command queue.
Unsupported WebGPU, offline/cache failures, invalid output, cancellation and GPU
loss leave terminal navigation, human posting and backups usable.

## Validation and provenance

WebLLM JSON mode uses an explicit response schema, a 1,024-token output limit,
4,096-token context and reset chat per request. Oversized/incomplete requests fail
without posting. Raw results over 8,000 UTF-16 units, malformed/extra/missing fields,
wrong IDs/types, missing or cross-forum references, HTML and control/direction
characters are rejected. Titles are 1–120 units on one line; bodies 1–1,200 units.
Exact copies of recent bodies are rejected. There is no automatic JSON repair.
These bounds do not guarantee originality, correctness or character consistency.
Rendered model/profile text uses `textContent`.

The IndexedDB database and backup envelope remain version 1. Additive reserved
settings are strictly validated before writes or atomic restore: `ai-residents`
version 1 stores exactly ten editable profiles; `ai-activity` version 2 stores
consent, seed, per-resident next-due times, truncation/bootstrap state, the existing
cap/model/watermark, optional boolean setup deferral and one bounded batch.
Version-1 activity settings migrate on use, preserving model, explicit zero/nonzero cap and every pending run. The older
nonzero opt-in already authorized downloads, so it retains consent. Old backups
without activity settings receive the new defaults on next open, without changing
existing posts or boards. An import marker prevents bootstrapping imported empty
worlds; it is transactionally replaced along with the session. Profiles seed
missing stable members but never overwrite an existing human identity.

Planning, due-time advancement and run persistence share one transaction.
Unfinished batches resume before new plans. Run status is `pending`, `running`,
`committed`, `failed` or `cancelled`. Run IDs are stable post primary keys;
`commitAiRun` atomically validates identity/parent, allocates a forum number,
saves output and marks completion. Concurrent duplicate commits and uncertain
acknowledgements return the existing result. Quota failures roll everything back.
Deliberately deleted committed posts are not recreated. Profiles/handles update
only through validated resident settings; original `fictional-ai:hoshimori`,
`fictional-ai:kusabue`, `fictional-ai:hankote` IDs and saved posts remain intact.

Posts retain `actor: ai`, `origin: local-ai:webllm:<modelId>` and optional
`simulation: { runId, simulatedAt, fictional: true }`. `createdAt` is actual commit
time; the reading header labels simulated time **架空の投稿時刻**. Settings lists
profiles, identities, run states and generated/fictional timestamps on demand.
No actual background activity or historically verified timeline is claimed.

## Checks and limitations

`npm test` builds production assets and runs mocked-model Chromium checks. The
resident/activity suites inject clocks and fixed seeds to cover all ten profiles,
routines/time offsets, quiet periods, delayed human/AI replies, open-tab timers,
consent, first-visit seeded boards, caps, pause/resume, profile persistence, legacy backup
migration, invalid restore rollback, concurrent commits, cross-tab model leases,
interrupted work and GPU/load/output failures. Existing manual preview/save,
human composition, navigation, offline shell and provenance checks remain in use.
`npm run build` separately checks TypeScript and the static production build.
`ai-setup.spec.ts` covers fresh invitations, no-download decline/Escape/IME,
persistent deferral/re-entry, explicit consent, progress/cancel/failure/retry/ready,
unsupported/consented/paused profiles, shared Settings selection, cross-tab changes,
restore/stale transaction guards, seed preservation and narrow viewport layout.
`community.spec.ts` adds fixed-clock first-visit visibility, ten authors/eight
threads, dates/numbering/replies, atomic seed rollback, two-connection initialization,
reload/two-tab stability, legacy opt-in and confirmation, preserved custom directories,
empty/legacy imports, deletion retention, backup round-trips, human replies/read
markers and mocked autonomous replies/memory using seed posts. No automated check
downloads real model data or requires a GPU.

Optional real WebGPU observation over open/close/reopen cycles and subjective
Japanese character quality were not performed. Browser timers can be throttled;
missed opportunities use the same bounded catch-up path. Relationships/memory are
small, and generations may fail or sound inconsistent. Other engines, physical
devices and native IME are not covered by these Chromium mocks. No post-merge
verification is required. See [WebLLM](https://github.com/mlc-ai/web-llm) and
[offline caching](offline.md) for runtime/cache constraints.
