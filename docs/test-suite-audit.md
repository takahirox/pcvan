# Playwright test-suite audit (Issue #129)

Audit date: 2026-10-25 JST. Source: [Issue #129](https://github.com/takahirox/pcvan/issues/129).

## Verdict and scope

Keep the suite's current coverage. **519 discovered cases are reasonable for this
application's persistence, asynchronous ownership and browser interaction risks.**
There is evidence of repeated test code and excessive browser placement, especially
large invalid-command matrices inside historical-service journeys. There is no
evidence supporting a wholesale reduction to an arbitrary case count or runtime.
The observed **8m16s full run is reasonable for a pre-acceptance regression check**
given that 360 cases use real browsers and protect durable state, destructive
operations, scheduling and input ownership. It is expensive for every edit; use
focused feedback loops while addressing demonstrated repetition. No whole case is
recommended for immediate removal as obsolete or redundant.

The useful next changes are independently reviewable: strengthen an inaccurately
scoped mail assertion, shorten repeated browser matrices while retaining their
controller coverage, share a few board fixtures, and investigate a separate fast
logic feedback loop. This audit changes no application code, tests, fixtures,
dependencies or test configuration. Follow-ups below are recommendations, not
implementation or permission to delete coverage.

## Baseline and method

The assigned worktree was clean at
`663c2a4d113687a4e5b0df80834f5f12d3bef27f`. Its source tree is identical to the
Issue's filing baseline, `23576a5dbd97b143f95448538ab54d5e93f4494e`:
`git diff 23576a5dbd97b143f95448538ab54d5e93f4494e HEAD` was empty. The four
intervening commits are GitWeave workflow checkpoints, not added feature coverage.
These SHAs identify the audited snapshot; this is not a claim about future `main`.

After `npm ci`, both normal and JSON Playwright discovery reported **519 tests in
59 spec files**, one Chromium project. `tests/` has **64 files: 59 specs and five
helpers**. [The complete inventory](test-suite-inventory.md) records every expanded
case, its spec/declaration line, nested describe path and placement. It is a
discovery snapshot, not a second handwritten list inferred from filenames.

There are **159 cases without a browser fixture** and **360 with a page, context
or browser fixture**. The former already execute logic/controllers in Node under
Playwright. The latter include production journeys, real IndexedDB transactions,
and source-module checks using Vite; calling all 519 cases end-to-end is misleading.
In particular, `calendar.spec.ts` creates its own timezone-specific browser contexts,
and `scheduled-mail.spec.ts` has 20 cases, including nested repository and route
suites. Counting only top-level JSON `specs` would incorrectly produce 509.

Review combined expanded discovery with source setup/assertion inspection,
comparisons of related test bodies and their shared production code, and local
profiling. Similar names alone were not treated as duplication. This is a static
coverage audit plus observed execution, not statement/branch coverage, mutation
testing or proof that every possible regression is covered.

## Coverage and distinct value by area

N means Node logic/controller checks; R means source modules in a real browser,
including IndexedDB repositories; J means application/DOM journeys (normally the
production preview; some mocked-adapter cases intentionally use the dev server).
The inventory's broader B label includes both R and J.

| Area and cases | Specs (individual discovered counts) | Intended distinct behaviors and layers to retain |
| --- | --- | --- |
| Core navigation/session: 74 | `session` 3; `connection` 22; `navigation` 30; `sections` 19 | N: exact transcript, bounded history/draft recall, MAIN fixture/paired typography, screen-local selectors, index parents, every connection stage and idempotent completion. J: actual staged entry, delayed IDB startup, skips/IME, logout/reconnect writes, responsive MAIN and log export. A controller's empty mailbox is different from a populated application mailbox. |
| Terminal/Settings: 31 | `terminal` 4; `immersive` 4; `progressive-output` 5; `settings-dialog` 18 | R: controlled frame/grapheme/timing/backlog checks and unpainted-log export. J: literal HTML/Unicode, history, keyboard scroll/focus, narrow viewport, reduced motion, persistence, nested settings returns, modal focus trap, IME deferral, all profile fields, consent/cancellation, import/reset/offline and cross-tab dialog conflicts. Typed Settings and the modal are separate entry points. |
| Persistence/world lifecycle: 34 | `repository` 12; `community` 2; `expanded-community` 3; `factory-reset` 8; `storage-controls` 6; `offline` 3 | R: real transactions, unique monotonic numbers, failed final-counter writes, references, schema version changes, concurrent seed/expansion, conservative migration, reset atomicity and old-connection fences. J: native picker/download, refusal/approval, races after a confirmation snapshot, late file callbacks, caches retained by reset, service-worker offline reload/read/write and denied storage APIs. |
| Forums/public boards: 49 | `forums` 19; `composition` 8; `wakaba` 7; `wakaba-repository` 3; `bulletin` 9; `bulletin-repository` 3 | N: evidence/mapping, current names/stable tokens, gapped unread selection and all board parents. R: lazy board creation, same-board references, concurrent numbering, seed rollback and no refill after deletion/import. J: registration, literal multiline editing, consumed sends, rapid queued NEXT, monotonic per-human/per-forum markers, refresh/write failures hiding content, stale replacement without notifications. Bulletin adds route isolation and production duplicate-mapping rejection. |
| Collections/OSL: 25 | `services` 12; `osl-download` 9; `osl-registration` 2; `osl-repository` 2 | N: service/collection evidence, scoped categories, read-only library, current authored OSL catalog and pinned selection/parents. R: command ownership across awaits, one-use approvals, atomic numbering/collision/rollback and strict backup validation. J: actual exact UTF-8 downloads, both writable categories, IME/review/edit/retry, refreshed cross-tab catalog and replacement of pending downloads/drafts. |
| Historical read/search/postal services: 67 | `archie` 8; `biz` 8; `ecom` 7; `eic` 6; `ftp` 7; `gopher` 8; `news` 7; `publications` 7; `telnet` 9 | N: service-specific parsing and exact parent stacks; Archie filename-only matching/multiple locations, BiZ retained search sets/cap, Gopher title/body literal search, news/provider and publication/contents trees, EIC gateway, FTP pinned files, TELNET remote mailbox separation, ECOM volatile draft/receipt. J: keyboard/IME/literal rendering, unchanged protected world, absence of network/model/socket work, exports, explicit downloads and per-visit invalidation on restore/reset. These services have different ownership models despite similar journeys. |
| NetNews: 14 | `netnews` 8; `netnews-posting` 3; `netnews-repository` 3 | N: bundled groups, header search and fixed historical headers versus projected local dates/tokens. R: group-local numbers, message IDs, ordered References chains, immutable parent/group/author, strict direct writes/imports and stale connections. J: new posts/public follow-ups, filtered reading, IME/edit/retry, cross-connection refresh, reload/restore and discard of owned drafts. Reading tests are not superseded by posting tests. |
| Conference: 11 | `conference` 8; `conference-repository` 3 | N: safe attribution, fixed source records and service context. R: separately stored conference contributions, idempotent/concurrent allocation, strict parent/author validation and import rollback. J: rename/reordered-member restoration, registration/reply/edit, missing versus explicitly empty state, failed save and removed parent. These are not forum-record transactions. |
| Mail: 114 | `mail` 21; `mail-repository` 36; `mail-presentation` 8; `mail-file` 14; `mail-file-controller` 1; `scheduled-mail` 20; `mail-autonomy` 14 | N/R: resident versus Internet addressing, incoming samples versus local external saves, independent recipient read/confirmation evidence, multi-copy atomicity, byte/name/format limits, v1 DB/pre-mail backups, global numbering, due-time validation and cancellation locking. J: all three mailbox routes, IME/private command recall, native picker/exact-byte acquisition, boundary files, reload/offline/restore, cross-tab stage fencing, scheduled release and delayed mocked resident replies. Consent, public capacity and pair privacy are independent invariants. |
| OLT: 35 | `olt` 14; `olt-repository` 6; `wakaba-olt` 12; `wakaba-olt-repository` 3 | N: presentation and stale controller context/reentry. R: bounded chronological lines, same-identity leases, one reserved AI turn, shared budget, room-scoped context, legacy two-room normalization and atomic restore. J: attendance across tabs, anonymous no-presence browsing, quiet/expired residents, delayed speech, timeout/hide/leave cancellation, model failure and identity through rename/restore. Wakaba's selector/context and migration require their own checks. |
| AI planning/consent/adapter: 34 | `activity` 6; `ai-adapter` 3; `ai-controls` 2; `ai-generation` 5; `ai-setup` 4; `autonomy` 12; `residents` 2 | N/R: pinned offered models, trusted historical setting, bounded untrusted prompts/output IDs, deterministic diverse schedules, quiet periods, per-resident pause, quotas/status atomicity and interrupted recovery. R/J: real adapter protocol with fake workers, missing cached weights, explicit download consent, Web Locks/model lease, visible timers, bounded catch-up/retries, hidden-page deferral and model changes. Mocking weights preserves these contracts without real inference. |
| Public resident profiles: 21 | `resident-profile` 21 | N: four-field public projection, precedence/ambiguity, safe bounded names, restored absences and late context/reentry results. R: command ownership versus composer input. J: three mail routes, two OLT contexts, registered/anonymous readers, literal output/log and zero attendance/model side effects. Lookup must never become a private-data export. |
| Production smoke/recovery: 3 | `journey` 3 | J: connected MAIN mappings plus human post/reply/reload/backup; persisted tokens through real human/resident rename; recovery after tab loss with a committed and a running AI action. This is the existing `test:e2e` subset, not the entire integration suite. |
| Historical display calendar: 7 | `calendar` 7 | N: independently specified JST rollover/leap/year boundaries and deterministic legacy source anchoring. R: atomic migration/reset. J: Tokyo/Los Angeles contexts, live/replayed OLT and imports at different operational times. Modern timestamps in stored records and projected historical output must remain separate. |

Spec names in this table refer to `tests/<name>.spec.ts`; the
[inventory](test-suite-inventory.md#cases-by-spec) links every declaration.

### Edge cases that should survive any cleanup

- Transaction rollback is not just validation: `repository.spec.ts:99,227` fails
  after clears/inserts; `mail-repository.spec.ts:298` includes quota/abort after
  parent-confirmation writes; `:761` fails after an earlier multi-mail copy.
  A mocked repository cannot establish native IndexedDB atomicity.
- Cross-tab UI refresh and storage fencing are different: `forums.spec.ts:387`
  refreshes content/identity/markers, whereas `:491` misses notifications and queues
  stale commands. `storage-controls.spec.ts:57` injects a write after the readonly
  approval precheck, immediately before the destructive transaction.
- IME at a title, body, review approval, file selection or literal OLT speech
  invokes different command owners. Keep those stage checks even if repeated
  markup/focus/invalid-number permutations are shortened.
- `scheduled-mail.spec.ts:85` deliberately holds an IDB lock while advancing the
  clock to the due boundary. `:104` checks delayed multi-release rollback/order;
  `:393,407` check focus wakeup beyond the AI window and delivery while inference
  is indefinitely pending. A catch-up scheduler test does not replace delivery.
- `mail-file.spec.ts:75` keeps both **0 and 262144 bytes**; `:87` rejects 262145,
  unsafe names and read failures. These protect exact binary transport, unlike
  FTP/OSL text download tests. File metadata/bytes must stay out of AI prompts
  (`mail-repository.spec.ts:892`).
- `olt-repository.spec.ts:84` exercises two room IDs; the Wakaba migration suite
  retains legacy room fields and shared attempt budgets. Similar same-room and
  across-room races protect different scopes.
- Consent tests cover refusal, lease exclusion, withdrawal during work and stale
  world approval. A ready mock model must never silently authorize real downloads.
- Historical-source/provenance checks test the product's disclosure obligations;
  they do not verify the external sources' historical truth or availability.

## Overlap decisions with matching evidence

References below identify declarations in the audited source. Parameterized
instances and full titles are in the inventory. Classification applies to the
specified overlap, not every assertion in the referenced case.

| Candidate/comparison | Matching setup and assertions; distinct remainder | Decision |
| --- | --- | --- |
| News `:33` versus `:108`; publishing `:36` versus `:110`; BiZ `:76,95` versus `:153` | Controller and browser checks feed the same `malformed`/`readingErrors` or `invalidFind`/`invalidShow` arrays, then assert error text and retained HELP/detail. Browser journeys repeat them for worlds and direct/index paths. BiZ also repeats 20 successful FIND sets and capacity/no-eviction checks. DOM escaping, IME, real command dispatch, history, protected stores, export and actual parent returns remain browser responsibilities. | **Replace with a faster lower-level check**, specifically the exhaustive browser matrix portions; retain the existing exhaustive controller cases and representative production invalid/context commands in each affected journey. Eight browser cases are candidates for shortening, not eight deletions. |
| EIC `:21`/`:98`; NetNews `:39`/`:181`; Gopher `:34,77`/`:136`; Archie `:47,70`/`:114`; TELNET `:26`/`:115` | Both layers enumerate service items, invalid selectors/commands and repeated parent returns using the same controller/corpus. Browser journeys additionally observe real escaping, dialogs, logs, storage isolation, and no external work; NetNews has filter-specific selection and TELNET remote state. | **Needs more evidence** before extending matrix shortening to these 12 browser cases. Do not infer identical parser behavior across services. Start with the measured news/publishing/BiZ comparison, then map retained assertions per service. In particular, NetNews `:39` checks retained HELP after reading errors without asserting every error response; preserve/strengthen those exact lower-level error assertions before trimming its production matrix, and retain WRITE/REPLY dispatch ownership checks. |
| Four mail route triplets (`mail.spec.ts:17,205,306,397`), file mail `mail-file.spec.ts:27`, autonomous replies `mail-autonomy.spec.ts:41` | Within each triplet, MAIN 1, X and SIG MAIL repeat the same restore/compose/verify/reload/restore workflow; the route/title/parent changes. Shared identity confirmation, retries and private data assertions recur. Internet composition additionally varies WRITE/COMPOSE/prompt entry; this difference must remain covered. Each feature has a different save/ownership path. | **Consolidate** repeated workflow portions: retain one full integration workflow per feature and two smaller route/parent smokes (18 current cases, 12 candidates to shorten). Preserve all route mappings, Internet input modes, shared-storage visibility and SIG return paths. Do not collapse six different features into one test. |
| Scheduled route triplet `scheduled-mail.spec.ts:245` compared with mail route triplets | Similar edit/reload/restore/return assertions, but each scheduled route uses a different timezone (Tokyo, Los Angeles, Kiritimati); the suite also checks absolute due instants and private history. | **Keep** the three timezone/route combinations. Route-only similarity is insufficient evidence to remove them. |
| Wakaba/bulletin repository `:88`/`:92` lazy-first-send cases; pristine `:8`/`:9` and legacy `:64`/`:68` | Same two repository connections, four invalid drafts, injected `forums.put` quota, concurrent numbers `[1,2]`, next counter 3, same-board reply and duplicate SIG/forum rejection. Seed tests likewise delete their board, reopen/import/reset and compare protected state. Differences include target keyword/origin and exactly which seed write fails; bulletin also protects Wakaba starter content. | **Consolidate** fixture/setup/assertion code for six cases, preserving two target-specific executions of each contract and both origin-specific failure injections. This is maintenance duplication, not six redundant executions. |
| Wakaba `:64,131,153,199` versus bulletin `:75,157,179,238` and forums `:269,307,387,424` | Both board fixtures adapt `unreadFixture()` (gaps 1/4/9, high-water 3); controller checks are read-only, UI rapid NEXT persists exactly 4 then 9, refresh sees another human/name and quota hides body. Generic forums use the same underlying read invariant. Bulletin has different routing/protected sibling boards and extra ambiguity/replacement journeys. | **Keep** route-specific persistence/failure cases; optionally share the fixture/protected-record projection. Do not remove a board's integration checks merely because generic forum storage is shared. |
| `ai-generation.spec.ts:6` (two cases), `:107`; `activity.spec.ts:42,72`; `residents.spec.ts:6`; `progressive-output.spec.ts:121` | These seven cases navigate to dev Vite and evaluate deterministic prompt/planner/routine/display-cost functions. Their asserted results require neither a DOM nor IDB; production functions accept supplied content/times. Other Node controller tests already import the same application module graph. | **Replace with a faster lower-level check** using direct imports under the existing Playwright runner, keeping seven cases/assertions. Keep adapter/worker, real IDB and renderer frame/DOM checks in browsers. Verify Node/browser results agree before moving. |
| `session.spec.ts:45`, `repository.spec.ts:212`, `terminal.spec.ts:34` | All mention history bounds/drafts, but N tests history navigation/editing, R tests persisted newest-100/concurrent appends, and J tests keyboard bindings plus composition events. | **Keep** all three layers. They would fail for different regressions. |
| `storage-controls.spec.ts:20,41,57`, `settings-dialog.spec.ts:193,227,293`, reset/feature draft suites | Both typed and modal operations use a native JSON picker, confirmation, rollback and restoration. Modal tests additionally check focus/transcript ownership and whether failure preserves a draft; typed tests check serialized commands and transaction-time approval races. Feature suites verify each owned draft/acquisition is invalidated. | **Keep** separate UI entry points and stale-owner checks. A shared action implementation does not test its callers. |
| `connection.spec.ts:241` versus `progressive-output.spec.ts:135` | Both export UTF-8 and exclude unsent input. The former goes through production LOG with Instant output; the latter freezes painting and checks the logical log includes accepted but unpainted graphemes. | **Keep** both. The unpainted branch is an independent failure mode. |
| `journey.spec.ts:79` versus `activity.spec.ts:214` | Both recover committed/running actions without duplicate posts. R closes/reopens a repository and uses an injected runner/adapter; J loses the tab, resumes through production worker/bootstrap and compares persisted statuses and synthetic identities. | **Keep** both. Native lifecycle wiring and transaction idempotence are not interchangeable. |
| Whole-case obsolete/removal search | Empty-service controller tests were compared with new mail/SIG/OLT features; record/date assertions were checked against calendar and restored-world policies; typed Settings remains a supported interface. No inspected case established the same preconditions, execution layer, failure mode and complete assertion set as another removable case. | **Remove as redundant/obsolete: none substantiated.** Keep current cases until a follow-up supplies an assertion-level coverage map. This is not a claim that undiscovered redundancy is impossible. |

The first two rows refer to `news.spec.ts`, `publications.spec.ts`, `biz.spec.ts`
and the named service specs, respectively; colon numbers are source lines, not
test counts.

### Fixtures and maintenance cost

The five non-spec files are:

| Helper | Reuse/value and maintenance observation |
| --- | --- |
| [terminal-helpers.ts](../tests/terminal-helpers.ts) | Shared start/command/settings/post/backup/restore/snapshot/UI checks and multi-recipient selection. `command()` waits for the newly appended echo/response rather than matching an earlier transcript. Reuse this behavior; it already avoids transferring the whole growing log on each poll. `snapshot()` reads eight stores in one transaction. |
| [backup-fixture.ts](../tests/backup-fixture.ts) | Small synthetic world plus intentionally gapped/out-of-time-order unread data; keep independent of the evolving first-visit seed. Wakaba/bulletin repeat adaptations and protected conference/OLT setup locally; a narrow shared fixture could reduce drift. |
| [ai-helpers.ts](../tests/ai-helpers.ts) | Production fake Worker, never-resolving Worker, and routed source-module adapter are different boundaries. The routed mock accepts Vite timestamp suffixes; the adapter spec checks this. Do not replace all with a stub above the worker protocol. |
| [autonomy-helpers.ts](../tests/autonomy-helpers.ts) | Deterministic public residents/due times, consent and generated-post projection. It arranges state; the app still plans, infers and commits. |
| [olt-helpers.ts](../tests/olt-helpers.ts) | OLT-specific epoch/window, room/context paths, deterministic visit seed and paced clock ticks with an IDB settling step. This is not interchangeable with forum catch-up time setup. |

Historical suites repeatedly construct a world, disable AI, restore it, navigate
both entry paths, visit Settings/About, inspect mobile bounds, export and compare
the same protected stores. The shared work is real maintenance cost, but one
universal scenario runner would hide service-specific state/parents. Start with
small shared world/projection helpers, not a new testing framework. Keep temporary
prototype monkeypatches isolated to fresh contexts; their purpose is to inject
otherwise difficult quota, abort and race failures. They are implementation-coupled,
but removing them would lose evidence of rollback after partial writes.

## Stale assumptions, weak assertions and gaps

- **A title promises more than its stale-operation check.** In
  [mail-repository.spec.ts](../tests/mail-repository.spec.ts#L564), the two
  `Internet sample/reply quota/abort rollback...` cases choose `save()` correctly
  for quota/abort, but after restore/reset both invoke
  `stale.loadInternetSample(human.id)`, including the `reply` variant. They establish
  the sample API's fence, not a stale Internet reply write in that variant. Keep
  both cases and make the stale operations match the selected API; assert no
  records or allocator advance after rejection. `mail.spec.ts:276` and
  `settings-dialog.spec.ts:342` give related production stale-reply protection,
  so this is an assertion gap, not evidence that the application fence is broken.
- **An old title/comment can overstate independence.**
  [terminal.spec.ts:8](../tests/terminal.spec.ts#L8) says “starts without services”
  and comments that no storage is needed, but `beforeEach` has already run
  `start(page)` against the real application/IndexedDB. It then goes offline after
  loading assets. Keep its literal-output/offline keyboard test; rename/clarify it
  to describe what it proves. It does not test startup with IndexedDB unavailable.
  A focused unavailable-IDB bootstrap check would be valuable if that behavior is
  intended; first establish the expected fallback instead of assuming a promise.
- **Exhaustive assertions are uneven across layers.** For example,
  [biz.spec.ts:153](../tests/biz.spec.ts#L153) accepts a generic `コマンド=` response
  for many invalid SHOW/unrelated commands; `:76` checks more specific errors and
  that HELP equals the previous view. The generic prompt alone would not catch a
  wrong error or lost selection. Preserve the controller assertions when trimming
  that browser loop, and assert a fresh retained detail after representative errors.
- **Seed counts are current but widely coupled.** Fresh initialization now has
  72 posts/12 boards; legacy explicit population has 66; original seed-origin
  subsets can still have 30. `expanded-community.spec.ts:12,59`, both new-board
  repository suites, `storage-controls.spec.ts:96` and README distinguish them.
  Those different numbers are not obsolete assumptions. Shared contract tests
  can own exact seed totals while feature tests assert their intended deltas and
  protected records, but do not derive every expected total from production data:
  that would make a broken seed and its oracle change together.
- **Empty mail in pure controllers is intentional.** `sections.spec.ts:14,62`
  has no live repository and tests empty projection/parents, whereas mail production
  suites supply identities and records. New features have their own suites:
  Internet samples, multi-mail, scheduled mail and native files are not aliases of
  the original resident-letter workflow. `services.spec.ts:36` also asserts which
  services now need content. Do not delete these as legacy “mail unimplemented” tests.
- **Calendar expectations have different inputs.** Some presentation unit fixtures
  deliberately have no historical-calendar setting and render modern stored dates;
  calendar tests cover projected JST and import migration, including 1997 rollover.
  Fixed 1996 bundled NetNews headers stay fixed while local contributions project
  dynamically (`netnews.spec.ts:315`). No stale fixed-year product assertion was
  substantiated by these comparisons.
- **Settings overlap is current behavior.** Typed display/model/profile/storage
  commands remain supported alongside the dialog; modal tests assert focus and no
  transcript chatter while typed tests assert terminal feedback. Neither interface
  is obsolete merely because the modern dialog was added.
- **Limits of browser realism remain.** Only Chromium is configured; simulated
  composition events are not native Japanese IME observation. Fake workers cover
  consent/protocol/timeout/privacy and recovery, not real WebGPU inference quality.
  These are known limits, not reasons to replace current tests with model downloads.
  Consider another engine only against a concrete support/regression requirement.

## Observed cost and reproducibility

The measurements below separate observed phases and document limitations. Historical
[Issue #125 validation](validation.md) reported 519 passed in 8.4 minutes with
three workers. It included server startup/build and is an observation, not a
controlled benchmark or proof of duplicated coverage.

### Host, conditions and results

Measured locally on macOS 26.6.2 / Darwin arm64, 16 logical CPUs, 64 GiB RAM,
Node 24.12.0, npm 11.6.2, Playwright 1.64.1 and bundled Chromium
156.0.8078.4 (revision 1248), headless. The existing browser installation was
reused. Dependencies were freshly installed with `npm ci`; the full run was the
first application run measured in this worktree, with new server/browser
processes and no deliberate build warmup. OS/npm/browser caches were not cleared,
so this is not a machine-cold benchmark. Subsequent standalone builds and sample
runs had warm dependency/Vite/filesystem caches, but new servers and browsers.
No AI weights or paid external services were used.

The [sanitized timing record](test-suite-timings.json) contains all 59 per-spec
case counts, summed/max durations, the ten slowest cases, phase measurements,
sample aggregates and limitations. Absolute host paths and full transcripts are
omitted. Application/test/configuration files stayed unchanged during profiling.

| Measurement | Actual result |
| --- | --- |
| Full `npm test -- --workers=3` with JSON + phase reporter | **519 passed, 0 failed/skipped/retries**, three executing workers; outer process **496.364s (8m16.4s)**, Playwright-reported duration 495.765s |
| Outer launch to reporter `onBegin` | **5.573s**: combined npm/collection/transformation/build/two-server readiness, about 1.1% of outer elapsed time |
| Reporter `onBegin` to `onEnd` | **490.729s**: execution, browser/fixture activity and end-of-run work; not a sum of individual durations |
| Sum of all test `result.duration` values | **1350.954s** across parallel workers; never interpret this as wall time |
| Sum of test durations by worker 0 / 1 / 2 | **426.169 / 489.284 / 435.501s**; consistent with an uneven per-file workload, not uniform scaling |
| Two subsequent standalone `npm run build` invocations | Both passed; **1.201s / 1.009s** outer process time, including TypeScript + Vite; warm, not subtractable from the first startup measurement |
| Same single news journey repeated twice | **1 passed** each, no retries/skips; three requested workers, only **one executing** because one case selected; test durations **21.549s / 21.290s**, outer elapsed **24.955s / 24.581s** |
| Repeated sample launch to `onBegin` | **2.904s / 2.873s** with warm dependencies and fresh processes |

Builds emitted the existing Vite warning about chunks above 500 kB; they completed
successfully. No test failures were hidden or repaired to obtain these timings.
One full run plus repetitions of one case is insufficient to estimate variance
for the whole suite or a cold CI host. No worker-count comparison was performed.

### Slow groups

These are **summed test durations within each spec** from the full three-worker
run. They identify substantial work, not projected speedups or standalone timings.

| Spec | Cases | Sum (s) | Slowest case (s) |
| --- | ---: | ---: | ---: |
| `netnews.spec.ts` | 8 | 161.022 | 53.544 |
| `mail.spec.ts` | 21 | 155.195 | 12.953 |
| `telnet.spec.ts` | 9 | 102.495 | 33.940 |
| `mail-file.spec.ts` | 14 | 82.448 | 7.790 |
| `news.spec.ts` | 7 | 62.944 | 21.589 |
| `settings-dialog.spec.ts` | 18 | 60.472 | 9.719 |
| `publications.spec.ts` | 7 | 56.338 | 19.459 |
| `connection.spec.ts` | 22 | 52.454 | 9.195 |
| `mail-autonomy.spec.ts` | 14 | 39.365 | 9.723 |
| `osl-download.spec.ts` | 9 | 37.733 | 9.893 |

The three NetNews production-world cases at line 181 take 51.649–53.544s each;
the three TELNET world cases at line 115 take 31.749–33.940s each. These six
cases alone sum to **255.356s**, about 18.9% of cumulative test duration. They
are better profiling targets than removing cheap parameterized menu checks.
The 159 Node cases account for only **16.468s**, about 1.2% of that same total.
The seven proposed browser-to-Node moves total only 0.861s in this run, so they
are low-priority for full-suite speed despite being cleaner placements.

### Representative action costs

The repeated registered/populated news journey at `news.spec.ts:108` used a
temporary `onStepEnd` reporter. Both runs recorded **372 fills, 382 presses,
1491 evaluations and 729 polling-expectation steps**. Press steps totalled
11.242/11.204s, fills 0.519/0.499s, evaluations 5.359/5.270s and polling
expectations 6.406/6.342s. Browser-fixture launch was 0.158/0.082s and the one
page navigation 0.075/0.036s. Nested expectations contain evaluations, so these
categories **overlap and must not be added** into an elapsed-time breakdown.
This is one read-only feature sample, not a measurement of every suite's IDB cost.

The sample supports repeated interaction/polling as a real cost, rather than
browser launch or repeated navigation being its dominant cost. It does not prove
that every command/poll is unnecessary, or establish the savings from any proposed
rewrite. Native write/restore/race suites need separate setup profiling before
fixture reuse or a browser harness change.

### Reproduction

Use the pinned lockfile and available Chromium installation, keep ports 14373/14374
free, and record worker count and cache state. Built-in JSON reproduces the
discovery, test outcomes and duration ranking without modifying tests:

```sh
npm ci
npx playwright test --list
npx playwright test --list --reporter=json > /tmp/pcvan-discovery.json
PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/pcvan-profile.json npm test -- --workers=3 --reporter=json
npm run build
npx playwright test tests/news.spec.ts --grep 'production news journey preserves registered populated' --workers=3
```

For the reported phase separation, a temporary reporter recorded `Date.now()`
in `onBegin` (after server readiness) and `onEnd`, plus
`onTestEnd(test, result)` fields `test.location`, `test.title`, `result.duration`,
`result.status`, `result.retry` and `result.workerIndex`. An outer Node process
recorded its start before `spawnSync('npm', ['test', '--', '--workers=3',
'--reporter=json,/tmp/pcvan-audit-reporter.cjs'], ...)` and elapsed time after exit.
This includes npm overhead; the built-in report's duration is slightly smaller.
For the two sample runs the reporter additionally aggregated
`onStepEnd(test, result, step)` by `step.category`, `step.title` and `step.duration`.
The standalone builds were timed around `spawnSync('npm', ['run', 'build'])`.
The JSON artifact records the resulting numbers; raw reporters/reports were
temporary profiling tools, not changes to the suite.

### Cost mechanisms visible in the source

The [configuration](../playwright.config.ts) defines one Chromium project and
two servers, **not two executions of every test**. Production preview runs
`npm run build && npm run preview`; dev Vite serves TypeScript modules/real IDB.
Both start even for a Node-only file selection because `webServer` is global;
`reuseExistingServer: false` prevents assuming a warm running app.

No worker count, retries, explicit serial mode or `fullyParallel` is configured.
The measured run explicitly chooses three workers. Files can run concurrently;
cases within an ordinary file run sequentially. More requested workers cannot
parallelize a single long file. For example, the 36-case mail repository file
has a per-case dev navigation, module import, `openActivity()` seed and human
creation (`beforeEach`, line 28), then its own transaction fixtures. This is
valuable isolation, but it also loads the full dev application before opening
the named repository. A minimal same-origin module harness might reduce this
setup; benchmark it and preserve IndexedDB origin/transaction behavior first.

Fresh browser contexts isolate each test's IDB/cache/patches; browsers are normally
reused within a worker. Browser launch therefore is not paid 519 times. The
measured phase totals do not separately identify browser launch, database work,
navigation and polling costs unless explicitly stated. Do not attribute all
elapsed time to IndexedDB or infer startup cost from case count.

Repeated `fill`/Enter/echo/response polling and navigation dominate the work done
by long historical journeys even when their bodies are read-only. The helper
uses two `expect.poll` assertions when a response is supplied; a response missing
the first probe can add polling delay. There is no per-command attribution in
the full-run reporter; the repeated sample above measures one feature, without
establishing the corresponding share of every other suite.
Reducing input permutations at the DOM layer is safer than reducing required
assertion waits or replacing them with fixed sleeps.

The only explicit `page.waitForTimeout` calls are in `connection.spec.ts`: five
stage variants at line 122, two waits in the queued-reconnect case at 137/154,
and two delayed-startup variants at 194. That is **nine executed 2700ms waits,
24.3 seconds of scheduled waiting** in one serial file, before entry/setup work.
They deliberately watch for late staged output. A controlled-clock replacement
could retain all six intermediate/early-command browser cases plus two delayed
startup cases (eight affected cases); keep at least one natural-pacing production
smoke. This is a ceiling on removable waiting, not a measured 24.3-second full-run
speedup. Other suites already advance clocks instead of sleeping real AI windows.

The deployment [workflow](../.github/workflows/pages.yml) installs and builds;
it does not run this Playwright suite. Local timings are not a cold CI SLA.

## Prioritized follow-ups ready for separate Issues

Each proposal can be accepted independently. Numbers overlap across proposals;
do not add them into a promised case reduction. Performance estimates are bounds
or hypotheses unless explicitly measured.

| Priority / proposed Issue | Cases affected and coverage retained | Benefit, risk and verification required |
| --- | --- | --- |
| P1: Make Internet rollback variants exercise their named stale APIs | Two existing parameterized repository cases; keep both sample/reply quota/abort and reset/identical-restore checks. | Improves diagnostic accuracy and direct API coverage, with no runtime saving promised. Invoke the respective stale API, assert `stale`, unchanged world and allocator, run mail repository + reviewed external-draft browser checks. |
| P1: Reduce historical-service browser invalid-command repetition | First pilot: eight browser cases across news (3), publishing (3), BiZ (2). Preserve exhaustive controller parsing/cap/parent assertions, each service's production dispatch/escaping/IME/paths, world isolation and download/log checks. | These eight full cases total **152.712s** of test duration; only their repeated portions are candidates. Exact benefit needs before/after timings. Retain at least one malformed, out-of-range and wrong-context command in appropriate browser owners, plus assertions that errors retain state. Deliberately break parsing and dispatch separately to demonstrate both layers still fail. Expand to the other 12 cases only after a service-specific map. |
| P2: Separate mailbox route smoke from repeated feature lifecycle | 18 existing cases across six triplets; retain six full scenarios and shorten the other 12, preserving all entry labels/parents and Internet WRITE/COMPOSE/prompt variants. Keep timezones, file boundary cases and cross-tab stage matrices. | These 18 cases total **147.635s** of test duration. Shortening 12 reduces repeated edits/browser work; no whole-case deletion is necessary. Risk: SIG-specific owner/return bugs. Run all mail/file/autonomy routes plus targeted scheduled/profile/restore checks; compare stored state and exact bytes before/after. |
| P2: Use controlled clocks for connection cancellation guards | Eight browser cases; retain cancellation at every stage, delayed-IDB queue ordering, draft/IME ownership and one natural entry smoke. | Up to 24.3 seconds of explicit serial waiting is exposed; actual wall saving is unmeasured. Risk: fake clock semantics can hide startup races. Demonstrate late callbacks would fail assertions, run connection + calendar + production smoke, repeat with natural startup. |
| P3: Move seven deterministic module checks to Node Playwright tests | Three prompt checks, two planning checks, one resident routine check, one display-cost check; keep all seven cases and complete edge matrices. | Saves seven contexts/navigations/import setups, but their combined measured test duration is only **0.861s**: primarily a placement/feedback improvement, not a material full-suite speedup. Keep actual frame/DOM/worker and repository tests. Run old/new placements against identical fixtures once, then focused tests + build. No new runner or mocking IDB is required. |
| P3: Share board contract fixtures without merging failure modes | Six Wakaba/bulletin repository cases; optionally shared gapped-world/protected-services builders for eight related board cases. | Lower maintenance duplication; test count and runtime can remain unchanged. Keep both target/origin executions, sibling-board preservation, per-origin seed failure injection and exact lazy-write assertions. Run both board specs/repositories and generic forum/composition checks. Avoid a universal scenario DSL. |
| P3: Establish a fast logic path and evaluate setup/worker choices | Existing 159 Node cases and selected feature suites; no full-suite cases removed. Investigate a config/file layout that can run logic checks without starting either server. | Removes fixed build/server overhead from short feedback runs. Measure 1/3-worker runs, per-file imbalance and a minimal module page before choosing parallelism/fixtures. Preserve full production assets/IDB coverage; do not enable global `fullyParallel` or share mutable worlds without isolation evidence. |

For immediate feedback with current tooling, use `npm run test:e2e -- --workers=3`
for the three connected production journeys, or a feature selection such as
`npx playwright test tests/mail-file.spec.ts tests/mail-file-controller.spec.ts tests/mail-repository.spec.ts --workers=3`
(51 discovered cases). A small logic-oriented selection such as
`npx playwright test tests/session.spec.ts tests/sections.spec.ts --workers=3`
has 22 Node cases, but still pays current global server startup. These commands
describe existing selection, not a claim that the subsets establish complete
acceptance or were all timed during this audit. Full-suite existence and fast
development feedback are separate decisions.

## Validation and handoff

- `npm ci`: passed, zero reported vulnerabilities, no lockfile changes.
- Normal and JSON Playwright discovery: 519 cases in 59 specs. All 519 expanded
  file/line/project/nested-title identities matched the executed full-run JSON;
  every result passed once. The inventory and 14 area totals were checked against
  discovery, including the 159/360 placement split and source declaration locations.
- Full three-worker profiling run, two warm standalone builds and two repetitions
  of the selected news case: passed with the actual outcomes and limitations above.
- Checked local Markdown links, heading/source-line anchors, table column counts,
  balanced code fences and details blocks; parsed the sanitized timing JSON and
  verified all 59 file counts and the 1350.954s duration sum.
- Reviewed the documentation diff, verified application/tests/configuration and
  lockfile unchanged from the baseline, and checked staged/unstaged whitespace
  with `git diff --check` and `git diff --cached --check`.

No additional application suites were required for the documentation edits.
Native IME, real GPU/model inference, other engines, cold CI and alternate worker
counts were not tested.

No implementation Issues were filed, and no push, PR, merge or GitHub comment was
made. The table supplies concrete follow-up scopes for a maintainer to accept or
reject independently. No post-merge deployment or runtime verification is required
for this documentation audit.
