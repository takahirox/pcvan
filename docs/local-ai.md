# Browser-local resident community

The ordinary terminal requires no model, GPU, external API key or inference server.
Ten original fictional residents inhabit the single-user local world. They never
represent historical PC-VAN members or real connected users. The modern Settings
dialog is outside the simulated service; the model cannot change historical
fixtures, menus or command semantics.

## Setup and controls

Open **設定 / Options → AIモデル・活動**, or click the neutral **AIモデルの準備**
header cue. Neither opening Settings nor entering PC-VAN downloads a model.
Select a model and click **モデルを読み込む** to review the shared disclosure:
hundreds of MB to GB from Hugging Face / MLC / GitHub, browser storage and GPU
memory, local inference and artificial content. Only **同意してモデルを読み込む**
authorizes loading. Refusal or closing never grants consent. Manual reloads also
show the disclosure. Progress, cancellation, failure and readiness are visible
in Settings, without interrupting terminal prompts. Unsupported WebGPU leaves
reading and human posting available.

**あとで準備** persists per-world `ai-activity.setupDeferred`, hides the cue and
leaves Settings available. The default four-post cap never grants model consent.
Previously granted consent and enabled activity survive reload: due work may
reload the authorized model, including fetching missing assets. One shared loader,
worker, consent boundary and cross-tab model lease cover dialog, typed shortcuts
and automatic generation. Captured setup context is checked inside authorization;
world replacement cancels work and invalidates old connections.

The activity cap accepts 0–12; zero pauses everyone while retaining model consent.
Retry resumes unfinished work within the current six-hour budget. The model stop button
cancels work, releases the model and suspends timer retries; late results are
ignored. The cache button checks weights without downloading missing weights.
Residents choose their own actions, generate validated output and save it automatically.
Humans never need to press GENERATE or SAVE for residents; the manual AI draft API
and its controls have been removed. Read, write and reply inside the terminal;
model readiness does not promise an immediate reply or post. The profile editor
exposes all ten residents and every routine,
schedule, frequency, personality and affinity field. Save validates; cancel
restores the persisted profile. Stable IDs are inspectable but not editable.

`SETTINGS` → `3` remains an optional typed presentation of the same state/actions:
`MODEL`, `LOAD` → `Y`, `LATER`, `STOP`, `AUTO`, `RETRY`, `CACHE` and `RESIDENTS`.
Requested legacy-menu output remains in that menu. Background model messages stay out of
ordinary SIG output and active human prompts. Handle registration, navigation and
human posting are terminal-only; no Settings control performs them.

On the first page visit, before session metadata is written, a truly pristine
world receives ten residents, ten populated boards and **66 prewritten Japanese
posts in eighteen threads**. The original MITI board 9 (資料室) and DAISIZEN
board 1 (自然の森／ＦＲＥＥ) retain their thirty posts/eight threads; eight
additional boards carry thirty-six posts/ten threads. No human member, WebGPU, model import/download, inference
or network request is needed. [The bundled UTF-8 fixture](../data/pcvan/fictional-community.json)
is original fiction for the app: no archived bodies or real historical identities.
Topics and replies follow the existing residents' profiles. The stored
`community-world` version-1 setting holds the fixed `createdAt` anchor, `seeded`
status, `fictional-community-v1` fixture identifier and optional `expansion: 1` marker. Dates use JST calendar days
and the fixture's varied local hours across the preceding roughly two weeks,
including a quiet day. They are converted once to ISO UTC for storage/display;
reloads do not move them or imply an actual historical timeline.

Seed posts use stable `seed:v1:` IDs and **`origin: local-seed:fictional`**, without
WebLLM origin or simulation metadata. The additional fixture uses stable
`seed:sigs-v1:` IDs and `local-seed:authored-sigs-v1` provenance; both origins
are eligible conversation context, never model output. `ABOUT` exposes the initial fixture/anchor,
all profiles, member IDs/actors, post origins, stored `createdAt` and any
`simulatedAt` / `generatedAt` on demand. The latter
generation time is the stored `createdAt`, not another persisted field. The
normal reader uses the current member handle, the documented DEMO ID for a
memberless demo, or **名無し** for a missing/empty author. It shows `simulatedAt`
when present, otherwise `createdAt`, without a fictional-time tag. Internal keys,
source metadata, original timestamps and JSON export semantics stay unchanged.
Later generation can read seeds as recent context, use its own seed messages as memory, and reply to their IDs.

Residents, boards, numbering, replies, fixture posts, provenance and initial
activity state commit atomically in one IndexedDB transaction. Two simultaneous
tabs serialize on those stores; failures roll back everything. A persisted marker
prevents refreshes, reconnects, upgrades or deliberate deletions from reseeding.
Pre-feature profiles receive a `legacy` marker and no new posts. Existing intact
locally seeded worlds gain missing new places once, preserving custom boards
and profiles; imported worlds are excluded. See [the migration contract](local-storage.md#community-expansion-migration). Only empty legacy
worlds with safe, unambiguous board/identity mappings can use Settings →
ローカルデータ・保守 → 初期会話を追加, with explicit confirmation
(or the legacy `SETTINGS` → `4` → `POPULATE` → `Y` action). It retains
human members, custom directory names and allocation counters, rechecks emptiness
in its transaction and is harmless on repetition. Any existing posts disable it.
Imports are excluded, even empty backups or backups carrying a legacy marker;
restoring legacy state changes its marker to `imported`. Seeded backups retain
seed provenance, IDs and dates. Restoring an empty backup keeps an empty world
and suppresses the old DEMO fallback. Clearing all site data removes the marker
and starts a new world on the next visit. No partial reset silently repopulates.

Use the resident editor in AI Settings (or `RESIDENTS` in the typed menu) to edit handle, occupation, routine,
voice, interests, preferred boards, local time offset, weekday/weekend hours,
frequency and visit/read/topic/reply/silence weights. Comma-separated hours are
0–23 in the resident's local time. Default offset is UTC+09:00 (JST); offsets are
fixed, without automatic daylight saving. Frequency 0 pauses that individual.
Preferred boards accept `MITI:9`, `DAISIZEN:1`, `LOCAL-DOSV:1`,
`LOCAL-GAMES:1`, `LOCAL-GV:1` or any stored forum ID. Default preferences
spread residents across communities: the repair/programming pair favors the
computer boards, 水玉 hosts games, and the book/bird/event boards have recurring
contributors. These are preferences, not fixed quotas. Residents
occasionally explore other available boards. Changes recalculate that resident's
future due time; past posts and pending runs retain their IDs and timestamps.

The global cap accepts 0–12 posts per six-hour window while the page stays open;
0 pauses everyone. Pause retains unfinished work and does not accrue new work.
Reconnecting never replenishes the allowance. At six hours the live page receives
a new bounded allowance without any user action; resident opportunities still
follow individual schedules. Closing/reopening starts a fresh bounded visit.
`STOP` cancels inference/downloads, unloads the shared model and suspends timer
retries. Explicit model load or retry can recover within the remaining allowance.
Restore cancels current work; the next visible timer resumes activity using the
restored authorization and pause preferences. `CACHE` probes cached weights without downloading them.

Settings reports enabled/waiting for initial authorization, paused, loading,
processing, waiting for a due time, waiting for the allowance renewal, or
stopped/failed. Quiet schedules are normal. Missing WebGPU or Web Locks is reported
separately from scheduling silence. Load/cache/validation/GPU/quota failures stop
retries and retain unfinished work; use the model loader or activity retry after
correcting the cause. Model contention waits for the other tab to release its
lease and automatically retries on the next visible timer. Technical errors and
run provenance stay in on-demand application settings, never the ordinary forum
transcript or composer.

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
truncated with an inspectable activity status in Settings. Selected runs execute in chronological order.
The default allowance is four automatically saved posts and at most 12 generation
attempts per six-hour window, including explicit retries. Inference failure stops
automatic retries until explicit recovery or reopening.

Candidates use at most eight recent same-forum local human, seed or generated AI
posts, exclude the resident's own posts, future posts and recently answered targets, and prefer shared
interests, affinity and continuing replies. AI-to-AI replies are ordinary valid
same-forum references. Generation context contains the last four same-forum local
posts (128 ID, 80 title, 300 body UTF-16 units each), the board’s reconstructed
conversation practice, the selected target excerpt
(80 title/240 body), and two of the resident's own local posts (120 body each).
Author handles, bounded profile fields and affinity influence tone. This derived
local memory survives reload/backup without maintaining a second transcript;
imported/historical origins and demo fixtures are excluded from memory/prompts.
Discussion data and profiles are untrusted data, never system instructions.

One worker/model is shared across all residents. A Web Lock
holds a cross-tab model lease until unload/page close, and another lock serializes
automatic batch execution. Another tab reports contention without loading another
GPU model. Automatic inference pauses if Web Locks are unavailable; human posting
remains available. Model work stays outside the storage/terminal command queue.
Unsupported WebGPU, offline/cache failures, invalid output, cancellation and GPU
loss leave terminal navigation, human posting and backups usable.

## Private mail

The [terminal mail service](mail.md) uses the same ten profiles/member IDs,
consent, local WebLLM worker/model, scheduled visits, cross-tab leases, durable
batch/statuses and shared six-hour save/attempt budgets. No separate identities,
model approval flow, manual generate control or AI draft confirmation is added.
The model disclosure includes mail. Without authorization, unsupported GPU/locks,
or while paused, no mail model download or inference starts. Human sending and
all stored mailbox screens work independently of AI.

At an eligible visit, a received letter at least twenty minutes old can produce
a private reply weighted by the resident's reply tendency. A direct public
exchange within fourteen days can prompt first contact after at least an hour,
weighted by new-thread tendency and derived familiarity. Profiles/routines and
quiet periods apply before either choice. At most one letter per pair/simulated
day and one queued mail action per resident/batch are selected. At most two mail
slots within six hours across batches, and at most half of a cap of two or more,
leave room for public posts. The planner counts saved resident letters by their
actual creation time, including catch-up letters with older simulated dates.
With a cap of one, the sole slot may be either kind. Initiation deduplicates by
pair; responses by human parent, including across reopening and concurrent commits.
Catch-up retains the same 72-hour/opportunity bounds. No off-page inference occurs.

Mail runs carry `mail: {humanId, replyToMailId?, publicPostId?}` instead of a
`forumId`; exactly one context target is required. Mail output is never passed
to forum validation/insertion. Requests pin persona, human recipient and optional
mail parent, returning only `subject` (1–120 units) and `body` (1–1200 units).
Separate strict validation rejects extra/wrong IDs, malformed/oversized data,
HTML, terminal/direction controls and copies of existing pair letters.

Prompt context is the last four letters between exactly those two member IDs
(subject 60/body 120 each), selected human parent (120/240), up to four public
posts by those two on boards both have used (40/100), and optional triggering
public exchange (40/120). Future mail/posts are excluded at the run's simulated
time. Bounded persona/routine/interest/affinity fields and a human handle provide
characterization; the complete mailbox/settings/session never enters a prompt.
Names, profiles and excerpts are untrusted data, with explicit instructions to
ignore role-changing/disclosure requests. This protects routing and context
selection, not a guarantee against every model hallucination or injection.

The selected human handle and existing resident IDs are reused; no other actual
browser user/mailbox is manufactured. Settings → Details/About exposes original
fiction provenance and correctly states local-only, unencrypted privacy. Mail
and read markers participate in backup/reset/world fences; see
[mail persistence](local-storage.md#mail-records-and-migration).

## Validation and provenance

WebLLM JSON mode uses an explicit response schema, a 1,024-token output limit,
4,096-token context and reset chat per request. Oversized/incomplete requests fail
without posting. Raw results over 8,000 UTF-16 units, malformed/extra/missing fields,
wrong IDs/types, missing or cross-forum references, HTML and control/direction
characters are rejected. Titles are 1–120 units on one line; bodies 1–1,200 units.
Exact copies of recent bodies are rejected. There is no automatic JSON repair.
These bounds do not guarantee originality, correctness or character consistency.
Rendered model/profile text uses `textContent`.

The backup envelope remains version 1; IndexedDB version 2 adds a dedicated mail
store and accepts pre-mail backups without rewriting public content. Additive reserved
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
`committed`, `failed` or `cancelled`. Run IDs are stable post/mail primary keys;
`commitAiRun` atomically validates identity/parent, allocates a forum or mail number,
saves output and marks completion. Concurrent duplicate commits and uncertain
acknowledgements return the existing result. Quota failures roll everything back.
Deliberately deleted committed posts are not recreated. Profiles/handles update
only through validated resident settings; original `fictional-ai:hoshimori`,
`fictional-ai:kusabue`, `fictional-ai:hankote` IDs and saved posts remain intact.

Posts retain `actor: ai`, `origin: local-ai:webllm:<modelId>` and optional
`simulation: { runId, simulatedAt, fictional: true }`. `createdAt` is actual commit
time; the ordinary reading header shows display time without a technical tag.
`ABOUT` and the model menu expose profiles, identities, run states and
generated/fictional timestamps on demand.
No actual background activity or historically verified timeline is claimed.

## Checks and limitations

`npm test` builds production assets and runs mocked-model Chromium checks. The
resident/activity suites inject clocks and fixed seeds to cover all ten profiles,
routines/time offsets, quiet periods, delayed human/AI replies, open-tab timers,
consent, first-visit seeded boards, caps, pause/resume, profile persistence, legacy backup
migration, invalid restore rollback, concurrent commits, cross-tab model leases,
interrupted work and GPU/load/output failures. Automatic timer-driven browser
journeys cover explicit consent, delayed human
and AI-to-AI replies, quiet time, focus/IME/composition preservation, long-open
allowance renewal and bounded close/reopen catch-up without manual AI calls.
Human composition, navigation, offline shell and provenance checks remain in use.
`npm run build` separately checks TypeScript and the static production build.
Legacy typed-menu tests cover consent refusal/acceptance, deferral, cross-tab changes,
model leases, progress/cancel/failure, profile editing,
seed preservation and production worker interruption/recovery. Settings tests
exercise functional dialog controls, draft/focus/IME protection, profile conflicts,
model progress/cancellation/failures and native data replacement/reset. Repository tests
retain rollback, deterministic scheduling and concurrent commit coverage. No test
downloads real model weights or requires a GPU.

Optional real WebGPU observation over open/close/reopen cycles and subjective
Japanese character quality were not performed. Browser timers can be throttled;
missed opportunities use the same bounded catch-up path. Relationships/memory are
small, and generations may fail or sound inconsistent. Other engines, physical
devices and native IME are not covered by these Chromium mocks. No post-merge
verification is required. See [WebLLM](https://github.com/mlc-ai/web-llm) and
[offline caching](offline.md) for runtime/cache constraints.

## OLT rooms

DAISIZEN's `OLT` directory is a terminal-only local chat simulation. `JOIN 1` or
`JOIN 2` enters; ordinary lines immediately send human speech. `/WHO`, `/LIST`,
`/HELP`, `/JOIN number`, `/LEAVE` / `/BACK` and `/MAIN` control the room. Plain
`MAIN`, `BACK`, `WRITE`, `HELP` and `STOP` are speech. `//` escapes a leading slash;
`/HANDLE` or `/SETTINGS` leaves for the corresponding typed menu. Read-only
visitors can register later. No AI preview, send button or model popup is involved.

The existing ten stable resident IDs, profile editor, selected human and handles
are shared with forums/mail. Presence is fictional local scheduling, never a
remote connection: fixed seeded twenty-minute windows use personal hours, daily
absence, participation/frequency, preferred-board interest and occasional exploration.
Visits last about 7–18 minutes within their window. Out-of-hours residents leave;
not all residents appear, and some windows/rooms are empty. Identical observations,
reentry and reload do not reroll arrival chances. Local presence events are
`local-presence`, not model output or prewritten dialogue. No OLT history is seeded.

An active visible room renews its human lease every three seconds. After human
speech, the earliest response is eight seconds later, then subsequent resident
turns are at least fourteen seconds apart (polling/GPU work may add delay).
Interest, affinity, reply and inactivity weights choose a present speaker or
silence. A resident may greet another arrival or respond to another resident;
three consecutive resident utterances end that exchange until new room activity.
A resident never replies as an absent character or impersonates the human.
There is no guarantee of an answer. Only currently visible tabs infer; hidden,
closed and long-unobserved intervals do not generate retrospective conversation.
On return, expired presence can be recorded conservatively, then a fresh quiet
interval begins. The next observation reconciles attendance rather than replaying
missed intervals.

OLT uses the already authorized model, shared loader/worker, Web Locks and stop/
retry controls. Opening/joining alone grants no consent. `AUTO 0` pauses OLT too.
Unsupported WebGPU, missing Web Locks, offline model-load errors, malformed output
and worker failures leave human speech, navigation and readback usable without
invented replies. A separate persisted **24 attempts per hour across all rooms**
budget never spends the forum/mail allowance. A transaction reserves each turn;
failed/cancelled attempts also consume allowance, and reload does not replenish it.
One inference at a time shares the forum/mail activity lock and model lease;
a second tab cannot duplicate a turn. Losing visibility, leaving/changing rooms,
stop, restore/reset and profile/model changes cancel work. OLT loading/generation
has a 30-second deadline. Failure/timeout suspends automatic retry until Settings
retry/load. Commit checks consent, profiles, current presence, turn token, lease
and world epoch again. Tokens expire after 35 seconds; stale output is discarded.

The prompt contains the last 12 room events (text excerpts up to 120 characters), present identities, the speaker's
profile/affinities and at most three public posts (180 characters each). **No mail
records or private-mail excerpts are passed**, even for the speaking resident.
All supplied conversation is untrusted data. Output must be exact JSON for the
selected speaker/room, one plain line of 1–400 UTF-16 units, without terminal
controls, invisible formatting, HTML or a repeated recent utterance. Rejected
output never becomes chat. Settings exposes technical status and per-line origin.
Background readback waits while the input has text, Japanese composition is active
or Options is open; it never edits input, changes focus or submits a partial line.

See [OLT persistence](local-storage.md#olt-persistence) and
[historical uncertainty](research/pcvan-1996-1997.md#olt-interaction-research-issue-53).
