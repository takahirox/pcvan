# Issue #4 implementation validation

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.

## Commands and results

- `npm install`: initial dependency installation completed; npm reported no
  vulnerabilities. Exact versions are recorded in `package-lock.json`.
- `npm ci`: clean installation from the lockfile completed successfully.
- `npx playwright install chromium`: completed successfully.
- `npm test`: **6 tests passed**. Playwright first ran `npm run build`
  (`tsc --noEmit` and `vite build --base=./`), then served the generated static
  assets through `npm run preview -- --port 14373 --strictPort`. This covered
  controller replacement, exact transcript text, history boundaries/drafts,
  keyboard and button submission, input focus, simulated IME composition,
  offline use, keyboard scrollback, and narrow viewport horizontal scrolling.
- `npm run dev -- --port 14374 --strictPort`: started successfully. A one-off
  `node --input-type=module` Playwright smoke script loaded this server, submitted
  Japanese input, and found no page errors. It also imported `mountTerminal`
  in the browser and directly verified that appending output preserves input
  text, caret, and focus; follows the bottom when already there; preserves
  scrollback when scrolled up; and leaves focus on the log when reading output.
  Desktop (1280×720) and narrow (320×568) screenshots were inspected.
- `git diff --cached --check`: passed for the staged implementation and docs.
- A Python local-link check validated all 14 Markdown file links and heading
  anchors in the README and development/review/validation documentation.

The initial test invocation stopped because port 4173 was occupied. The test
configuration now uses port 14373 and refuses to reuse an unrelated server;
the complete suite passed after that change.

## Browser checks not performed

Native Japanese IME candidate selection on a physical keyboard, screen-reader
announcements, Safari/Firefox, and physical mobile keyboard behavior were not
tested. Composition events and a narrow viewport were exercised in Chromium;
those checks do not establish native IME or assistive-technology compatibility.
No published deployment was tested. Issue #4 requires no post-merge verification.

# Issue #5 implementation validation

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.

The assigned GitWeave checkpoint predated the prerequisites. Following the source
Issue's dependency-resolution comment, fetched `main` at
`426411d75dbcdc3511b2e06e22fadb5302535707` and imported its merged #3/#4 files
into the assigned worktree in a separate prerequisite commit. The historical
JSON fixtures are unchanged by #5; no alternate MAIN variant is combined with
the circa-1996 menu.

- `npm ci`: passed; npm reported no vulnerabilities.
- `npm test`: **35 tests passed**, including the production type-check/build
  (`tsc --noEmit` and `vite build --base=./`) and Chromium checks against the
  generated static assets. New coverage checks all 23 MAIN selector-to-label
  mappings, complete two-column fixture rendering and provenance, the MITI
  `J MITI` → `3` → `9` route, the visibly reconstructed Communication bridge,
  per-screen numeric interpretation, invalid commands and jumps preserving
  state, MAIN-only Q, reconnect, and independent controller instances.
  The browser journey runs offline after loading and checks that commands never
  trigger frame navigation or change the browser URL. Existing terminal tests
  still cover literal text, history, focus, IME events, scrolling, and narrow
  viewports with the new controller.
- The first suite attempt stopped before running tests because Node requires
  JSON import attributes. Added explicit `with { type: 'json' }` imports; the
  complete suite then passed.
- Inspected a 1280×900 Chromium screenshot of the production preview: all MAIN
  entries, X/Q, provenance, and prompt are visible, with aligned numbered columns.
- Reviewed the final diff; staged whitespace checks passed, and a Python check
  validated all 15 local documentation links and anchors in the README and
  development/review/validation documentation.

Historical accuracy remains bounded by the fixture provenance: MAIN is a
provisional retrospective transcription, MITI evidence verifies only the stated
route, and the Communication bridge and convenience commands are visibly
reconstructed. The earlier browser/device limitations above still apply.
No deployment was performed; Issue #5 requires no post-merge verification.

## Issue #6 local storage validation

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
The assigned checkpoint did not include #4's prerequisite shell. Fetched `main`
at `426411d` and merged it into this worktree as directed by #6's dependency
comment; this includes the shell merge `b3c2ac5` and #3's historical fixtures.
The implementation adds no dependencies or changes to the lockfile.

- `npm ci`: successful; npm reported zero vulnerabilities.
- `npx playwright install chromium`: successful.
- `npm run build`: successful application type-check and static production build.
- `npm test`: **19 tests passed**, including the 6 existing shell/session checks.
  The suite builds the production assets and serves them on port 14373; a second
  Vite server on 14374 exposes the repository module to real Chromium IndexedDB.
  Both servers refuse to reuse unrelated processes and are stopped by Playwright.
- Repository checks cover an empty world; all entities/settings/session JSON
  round-trip with IDs, timestamps, relationships, Japanese text and allocation
  gaps intact; created-post reload persistence; pagination; CRUD/reference
  protection; rejected imports with unchanged prior state; confirmation required
  by the API; and database connection closure on a version upgrade.
- Two pages with independent connections concurrently created 40 posts in the
  same forum. All IDs and per-forum numbers were unique; another forum allocated
  independently, and deletion did not reuse a number.
- A native unique-index request failure injected during replacement rolled back
  earlier clears/inserts. Simulated quota exceptions also rolled back replacement
  and a post insertion whose following counter update failed. The replacement
  test verifies that no unhandled page errors escape.
- Production UI checks cover actual JSON downloads; persisted command recall
  after reload; file selection; confirmation/cancellation of replacement; restored
  history and content after reload; invalid-file error reporting; and continued
  terminal/backup use after simulated quota failure. Unavailable IndexedDB is
  reported with no claim of successful persistence or unhandled page error.
- `git diff --cached --check`: passed for all staged changes. Local Markdown
  file links and heading anchors in the README and affected documentation checked.

The first storage test run exposed delayed terminal output/history and unhandled
request rejections when an injected synchronous write failure interrupted a batch
of import writes. Fixed immediate rendering with queued persistence and awaited
each import request inside the transaction; the full updated suite passed.

### Browser checks not performed for #6

Actual disk exhaustion, browser-driven eviction, private-profile shutdown,
OS/browser crash durability, and Safari/Firefox were not exercised. Quota tests
inject `QuotaExceededError`; they do not exhaust the host's storage. Reload and
concurrency checks ran in Chromium. Native IME, screen-reader, and physical-device
checks remain unperformed as described above. No published deployment was tested.
Issue #6 requires no post-merge verification.

### Integration with current main before PR publication

Merged `main` at `27fd8108dd105cad0d452f9af4fd1f6b59c05e2c`, including #5's
navigation controller. Resolved the entry-point conflict by retaining that
controller with the storage/history wiring; combined both documentation updates.
The simulated disconnect remains separate from repository session timestamps as
documented in the local-storage contract.

- `npm ci`: passed, with zero reported vulnerabilities.
- `npm test`: **48 tests passed** in Chromium, including the production
  type-check/build and all navigation, terminal, repository, and backup controls
  checks. No test changes were needed for the integration.
- A Python check validated all 19 local Markdown links and heading anchors in
  the README and development/review/storage/validation documentation.
- Reviewed the final changes and checked staged whitespace with
  `git diff --cached --check`: passed.

The browser checks not performed above remain unperformed; this integration
adds no required post-merge verification.

# Issue #7 SIG directories and forum reading validation

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.

The assigned checkpoint contained only the earlier collaboration documentation.
Fetched and merged `main` at `e867c028b8e3d11f32878d6905630ae5e145d8b8`,
which includes merged #3–#6, into the assigned worktree before implementation.
The historical evidence fixtures and v1 repository/backup schema are unchanged.

- `npm ci`: passed, with no reported vulnerabilities.
- `npm run build`: passed the TypeScript check and production Vite build.
- `npm test`: **58 tests passed**, including the production build and all
  existing navigation, terminal, repository, and backup checks in Chromium.
  Ten new tests cover the provisional DAISIZEN section directory and all seven
  boards, MITI's verified route into reading, numbered ordering independent of
  timestamps/IDs, optional header fields, exact Japanese whitespace, synthetic
  demo provenance, empty/missing/ambiguous forums, missing post numbers and
  invalid commands, offline reading, literal HTML, live restore and reload,
  rapid commands, and failed reads with usable return commands.
- A first attempt stopped before testing because port 14373 was occupied; a
  scoped listener check found no remaining listener and the next run started
  normally. That run passed 56/57 checks; the old navigation browser helper
  assumed immediate responses. Updated it to wait for the response now queued
  with local storage reads. The final complete run passed all 58 checks.
- Reviewed the implementation diff, checked local documentation links and
  anchors, parsed the demo fixture with duplicate-key rejection, and checked
  staged whitespace with `git diff --cached --check`.

The DAISIZEN source was accessible and its directory agrees with the existing
fixture. Optional manual header comparison with the external archived sample
was not completed because that URL was inaccessible through the browsing tool;
MITI's HTTPS source also returned 403. Header structure and route provenance
therefore reuse #3's documented evidence, without copying archived bodies or IDs.
Historical secondary-number meanings and line-count rules remain unknown; the
app omits line count rather than inferring one. Demo seeds remain in memory and
do not modify local backups. The earlier native IME, physical-device,
assistive-technology, Safari/Firefox, and deployment limitations still apply.
No post-merge verification is required for #7.

## Connection sessions, command history and terminal logs (#9)

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2, using the merged
#4/#5/#6 interfaces from `main` at `e867c028b8e3d11f32878d6905630ae5e145d8b8`.
The assigned worktree initially contained the earlier documentation-only baseline;
the merged prerequisites were brought into this worktree before implementation.

- `npm ci`: passed, with zero reported vulnerabilities.
- `npx playwright install chromium`: passed.
- `npm run build`: passed TypeScript checking and static production build.
- `npm test`: **54 tests passed** in Chromium, including the production build.
  New checks cover the reconstructed connection greeting, skip and automatic
  completion, immediate command handling during the effect, explicit logout and
  reconnect timestamps, timestamp survival after reload, and offline operation.
- The connection test rejects calls to fetch, XHR, WebSocket, EventSource,
  WebRTC, WebTransport, beacon and Web Serial APIs; it observes no API calls or
  network requests during the local connection/navigation sequence.
- History checks cover the newest 100 nonblank commands, bounds on both startup
  and concurrent repository appends, restoration after reload, draft recovery,
  recalled edits, and keeping those unsubmitted edits out of saved history.
- The downloaded `.txt` file matches the entire displayed transcript byte for
  byte in UTF-8, including Japanese, full/half-width characters, spaces, embedded
  line breaks and literal HTML. The draft is preserved and excluded from export.
- Inspected a full-page screenshot at 320 × 568: connection skip, transcript
  export and command input remain usable. Automated narrow-viewport checks pass.
- Validated all 11 local Markdown links/anchors in the README and affected
  storage/validation documentation. Reviewed the final diff and passed
  `git diff --cached --check` for all staged changes.

The initial test run had three failures: a new test assumed the wrong MAIN prompt,
the navigation test expected immediate MAIN on reconnect, and the scrollback test
used a Control+Home shortcut that does not scroll the focused log on this macOS
Chromium host. Tests now use the fixture prompt, explicitly skip the reconstructed
reconnect effect, and use native Home on macOS (Control+Home elsewhere). The final
full suite passes without retries.

Rendering remains immediate; no optional slow-rendering mode was added. Historical
comparison was not performed because no new dated login evidence was available.
Safari/Firefox, native IME and screen-reader checks remain unperformed. Browser
tab close/crash is deliberately not treated as a reliable logout. No deployed
site or real modem/device was used. Issue #9 requires no post-merge verification.

## Issue #7 integration with session/history/log behavior

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
Merged `main` at `e6356a30575185ebddbdec8af2e80c5a131c857e` to resolve the
reviewed conflicts in the entry point, README, and validation record. Retained
both forum reading and #9's connection presentation, session timestamps, bounded
history, and transcript download. The connection wrapper forwards forum content;
command processing and timestamp transitions use the serialized screen state.
Input echo/history and cancellation of an active connection effect stay immediate.

- `npm ci`: passed, with zero reported vulnerabilities.
- `npx playwright install chromium`: passed.
- `npm test`: **65 tests passed**, including the production TypeScript/Vite build
  and the combined navigation, forum, connection, terminal, repository, and backup
  suites in Chromium. A new integration test submits forum reads, logout,
  reconnect, and further reading in one turn while offline. It verifies login
  and logout timestamps, exactly one history entry per command, recall, and a
  byte-for-byte transcript download containing the rendered posts.
- Reviewed the combined diff, validated all 14 local Markdown links and heading
  anchors in the README and affected documentation, and passed
  `git diff --cached --check`. No unresolved merge entries remain.

The earlier browser/device and historical-evidence limitations remain applicable.
No deployment was performed; no post-merge verification is required for #7.

## Forum composition, replies and read tracking (#8)

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
Read Issue #8 and its readiness comments, verified that PR #18 (#6) and PR #20
(#7) were merged, then fetched and merged `main` at
`75b5606989d9f0e64aac8e486894b73b075af7df` into the assigned worktree. Reused
the existing directory, v1 schema, transactional allocation and command queue.

- `npm ci`: passed, with zero reported vulnerabilities.
- `npx playwright install chromium`: passed.
- `npm run build`: passed TypeScript checking and the static Vite build.
- `npm test`: **73 tests passed** in Chromium, including the production build.
  Eight added tests cover create/review/edit/cancel/Escape, Japanese multiline
  text and exact whitespace, simulated IME confirmation, blank fields, replies
  and clickable parent references, missing/deleted/cross-forum parents, local
  member selection, read-state reload persistence and member/forum isolation,
  monotonic concurrent reads, concurrent first-send initialization and numbering,
  separate board counters, and atomic rollback with retained drafts on failure.
  The existing navigation, offline reading, session/history, log download,
  backup/restore and narrow-viewport checks all pass.
- Earlier runs exposed two new test/UI issues: the new helper could match an
  earlier identical command's output, and the member selector needed an explicit
  label association distinct from its enclosing section. Both were corrected;
  the final complete run passed without retries.
- Reviewed the implementation diff, checked local documentation links/anchors,
  and passed `git diff --cached --check` including the new files.

The referenced [forum archive index](https://www.rumic.org/forum/) was accessible.
No historical compose prompts, confirmation sequence or shortcut keys were
inferred from it. The editor and commands are explicitly reconstructed; existing
header evidence remains unchanged. Read tracking uses the existing per-member,
per-forum highest read number, as disclosed in the UI and storage documentation.
Demo messages remain read-only, outside local backups and read tracking.

Optional native Japanese IME composition and manual multiline paste were not
performed; automated composition events and exact multiline fills were checked.
Safari/Firefox, screen-reader and physical-device testing were not performed.
No deployment or post-merge verification is required for #8.

Before PR publication, integrated `main` at
`83733e73bddc56b9eaa555c07580ea0d86bb7c69` (Issue #13). Resolved overlapping
README validation text, validation records and controller member/service fields
by preserving both changes. Re-ran `npm ci` (zero reported vulnerabilities) and
`npm test`: **81 tests passed**, including the TypeScript/Vite production build,
with eight workers and no retries. Whitespace checks passed. Optional native IME
and manual paste checks remain unperformed.

## Issue #13 service evidence and unavailable entry points

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
The assigned checkpoint predated the application prerequisites; incorporated
merged `main` at `75b5606989d9f0e64aac8e486894b73b075af7df` before implementing
this Issue. Reused its SIG fixtures, screen-scoped controller, terminal, storage
and forum navigation.

- Inspected the DAISIZEN memorial and its linked participation guide, the
  preserved 1996 ECOM session, and the CROCUS/秀Term description on Vector.
  Recorded source eras, period documentation versus retrospective material,
  library/OSL category variants and unresolved commands in the
  [research record](research/pcvan-1996-1997.md#olt-mail-library-and-related-services-issue-13).
  No service has sufficiently evidenced interactive command semantics; all
  five new routes therefore end in explicitly reconstructed unavailable notices.
- `npm ci`: passed, zero reported vulnerabilities.
- `npx playwright install chromium`: passed.
- Final `npm test`: **73 tests passed** with the default eight workers and no
  retries, including the TypeScript/Vite production build. Eight new service
  tests cover evidence labels, every placeholder, invalid/service/ECOM input,
  stable HELP/BACK/MAIN, scope, and SIG/forum regressions. The production browser
  check visits all five services with keyboard input while offline, verifies
  no network requests/browser navigation, then reads DAISIZEN and MITI posts.
  A downloaded backup confirms all content, read states and settings are unchanged.
- Before the final passing run, the full suite failed twice (default workers
  and two workers) in the existing scrollback test. An isolated run passed.
  It measured scroll position while serialized command responses were still
  arriving. The test now waits for the final uniquely identified command's
  response before scrolling; no terminal behavior or keyboard mapping changed.
- Parsed every JSON fixture with duplicate-key rejection; checked five unique
  reconstructed helpers and retained null historical section selectors.
  Validated 13 local Markdown links/anchors in the changed documentation and
  README. Reviewed the Issue-specific diff and passed staged whitespace checks.

Optional scanned-manual comparison, other browsers, native IME and screen-reader
checks were not performed. No copyrighted source snapshots, screenshots, posts
or software binaries were embedded. No deployment was performed; no post-merge
verification is required for #13.

## Issue #10 optional browser-local AI personas

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
The assigned checkpoint predated its merged prerequisites; fetched and merged
`main` at `ca0f3803c9da50c7056eb8a0d1d90302e8f5f973` (PR #22, following #6/#8)
into the assigned worktree before implementing the AI integration. Reused the
actual v1 IndexedDB records, transactional numbering and local-board interfaces.

- Added pinned `@mlc-ai/web-llm` 0.2.86 and verified both offered Qwen2.5 model
  IDs against that package's `prebuiltAppConfig`. No model weights are bundled.
- `npm ci`: passed, zero reported vulnerabilities.
- `npm test -- --workers=2`: **91 tests passed**, no retries, including the
  TypeScript/Vite production build. Ten new AI tests cover bounded persona/SIG/
  recent-local-post prompts, strict structured validation, atomic AI identity and
  post creation/rollback, backup round-tripping, explicit lazy loading, selectable
  models/personas, preview/save/discard, stale reply rejection, cancellation and
  restore, offline/inference failures, unsupported WebGPU and ordinary terminal/
  manual posting after AI failures. The real adapter's worker protocol is tested
  with a mocked transport, including progress, JSON schema requests, truncation,
  cancellation and worker failure. No test loads weights or needs a real GPU.
- Earlier new-test runs caught escaped-newline and MessageEvent errors in the
  mocks, incorrect command locators and test reply targets with existing children.
  Corrected the tests before the final passing suite; no assertions were waived.
- Vite reports its large-chunk advisory for the optional WebLLM runtime/worker
  (about 6 MB each). The ordinary entry JS is about 60 KB; a production browser
  check confirms the AI assets are not requested on ordinary unsupported use.
- Reviewed the Issue-specific diff, local documentation links and staged
  whitespace checks. Historical fixtures, menu definitions and command semantics
  are unchanged by the AI implementation. See [the AI contract](local-ai.md).

Optional real WebGPU/model-load and Japanese-quality evaluation was not performed;
GPU compatibility, available VRAM, caching and generated prose quality vary by
hardware/model. Other-browser and manual screen-reader checks were not performed.
No deployment was performed. No post-merge verification is required for #10.

## Issue #11 fictional activity between connections

Validated on 2026-10-20 with Node.js 24.12.0 on macOS. The assigned checkpoint
predated the prerequisites; fetched and merged `main` at
`bfaadddb97350eda740d29b1eb166d3b42eaa2a9` (PR #23, including #9/#10) into the
assigned worktree. Reused its WebLLM adapter, bounded prompts, strict output
validation and transactional local post allocator.

- `npm ci`: passed, zero reported vulnerabilities.
- `npm test -- --workers=2`: **99 tests passed** in 14.0 seconds, no retries,
  including the TypeScript/Vite production build and all existing terminal,
  composition, backup, session, navigation and AI tests.
- Eight new mocked-time/model browser tests cover 0/1/72-hour scheduling, varied
  deterministic targets, configured/hard caps, zero default work and explicit
  opt-in, fictional versus actual timestamps, backup round-trips, concurrent
  duplicate commits, quota rollback at the status write, interrupted/retried
  runs, tab closure, cancellation with late output, unsupported WebGPU, and
  load/inference/validation failures with the terminal still usable.
- The first full run exposed unwanted AI settings creation during ordinary
  disabled commands. Activity state now starts only on explicit configuration;
  default session metadata and existing backup behavior are preserved. The suite
  also exposed an IME test snapshot taken before a queued command response;
  the test now waits for that response before asserting composition is inert.
- Vite retains the existing large-chunk advisory for the optional WebLLM runtime
  and worker. Tests use mocks and never download weights or require a real GPU.
- Reviewed the Issue-specific diff, local documentation links and staged
  whitespace. No historical fixtures, backend or service-worker inference were
  added. See [the reconnect activity contract](local-ai.md#fictional-activity-on-reconnect).

Optional real-model conversation/coherence checks over manual reconnect cycles
were not performed. No deployment was performed; no post-merge verification is
required for #11.

## Issue #12 optional offline caching and retention safeguards

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
The assigned checkpoint contained the older documentation-only baseline. Fetched
and merged current `main` at `bfaadddb97350eda740d29b1eb166d3b42eaa2a9`
(merged #4/#6/#10 prerequisites), then reused the existing WebLLM cache API and
v1 JSON backup/restore rather than reimplementing them.

- `npm ci`: passed; zero reported vulnerabilities, no dependency changes.
- Final `npm test`: **98 tests passed**, no retries (8.2 seconds), including the
  TypeScript check and production Vite build. Seven added tests cover real
  service-worker installation under a subdirectory, offline reload, local reading
  and posting, JSON export/restore offline, missing AI runtime/weights, failed
  install retry, eviction/repair, failed and mixed-release updates, two-tab waiting,
  scoped cache cleanup and retained IndexedDB members/posts/read states/settings.
  Storage API grant/denial/error/unsupported states are exercised. The real pinned
  WebLLM probe checks missing manifest, partial and complete synthetic shards,
  selection changes and eviction without external model downloads. The real
  adapter rejects offline missing weights before issuing a model reload request.
- Production shell cache contains exactly HTML, main JS and CSS; lazy AI assets
  are absent until explicitly requested. Every allowed asset has a generated
  SHA-256 integrity value. A repair with a newer HTML file is rejected without
  overwriting the older complete cached shell. Updating does not touch model
  caches, other app scopes or the local database schema.
- Earlier runs found test assumptions about online automatic cache refill and
  explicit storage refresh, plus ambiguous generic status locators and terminal
  scrollback affected by an expanded utility panel. Corrected these checks,
  named the existing local-data status and collapsed secondary utility controls.
  The final full suite includes the existing scrollback and 320px viewport checks.
- The existing Vite large-chunk advisory remains for optional WebLLM JS/worker
  assets (about 6 MB each); these are excluded from shell pre-caching. No model
  weights were downloaded and no real GPU/inference was required.
- `node --check scripts/service-worker.js`, changed-document local link checks,
  Issue-specific diff review and `git diff --cached --check`: passed.

See [offline behavior and reproducible local checks](offline.md). Optional
second-browser and real-weight/GPU checks were not performed. No deployment,
publication or external writes were performed; no post-merge verification is
required for #12.

## Issue #26 GitHub Pages deployment

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- `npm ci`: passed, zero reported vulnerabilities; dependency files unchanged.
- `npx playwright install chromium`: passed.
- `npm test -- --workers=2`: **108 tests passed** (23.1 seconds), no retries,
  including the TypeScript check and production `vite build --base=./` build.
  The new deployment smoke check reuses the offline suite's local `/pcvan/`
  server: entry script/CSS URLs stay under that path, every emitted asset
  (including lazy WebLLM runtime and worker files) matches its built bytes and
  has the expected JavaScript/CSS MIME type, the real lazy cache-probe import
  works, and optional offline saving registers `/pcvan/sw.js` with `/pcvan/`
  scope while leaving the origin root uncontrolled. No worker is registered or
  AI chunk requested on initial load. No external browser requests or page errors
  occurred. The existing relative base therefore remains unchanged.
- `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/pages.yml`:
  passed workflow YAML, expressions and action checks.
- Python Markdown checks: README local links/anchors and balanced code fences
  passed. Final diff review and staged whitespace checks passed.
- The existing Vite advisory for large optional WebLLM chunks remains. No model
  weights were downloaded; optional second-browser and real GPU/model checks
  were not performed.

Required post-merge verification is **pending**: observe the resulting `main`
deployment run, confirm success, visit <https://takahirox.github.io/pcvan/> over
HTTPS, check terminal rendering and assets without 404s, and opt into offline
saving to confirm the Service Worker scope stays under `/pcvan/`. Record the run
URL, published URL and actual result. If deployment requires owner setup, record
the precise **Settings → Pages → Source: GitHub Actions** blocker and keep
publication verification pending until resolved. No live deployment or Pages
settings change was performed during pre-merge validation.

## Issue #11 integration with offline safeguards

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
Resolved conflicts with `main` at
`b78f2748f727e7de793dde3689dc3013467dab39` in the application startup,
AI controls and documentation. Retained reconnect activity planning and lifecycle
hooks alongside optional offline controls, cache inspection and offline model
load safeguards; preserved both Issues' validation records.

- `npm ci`: passed, zero reported vulnerabilities.
- `npm test -- --workers=2`: **107 tests passed** (18.9 seconds), including the
  TypeScript check and production build, reconnect scheduling/recovery,
  offline shell updates/retention and model-cache checks. No retries.
- `node --check scripts/service-worker.js`, local Markdown link checks and
  `git diff --cached --check`: passed.
- The existing Vite advisory for large optional WebLLM chunks remains. No model
  weights were downloaded; no real GPU, deployment or publication was used.

## Issue #14 connected browser journeys

Validated on 2026-10-20 with Node.js 24.12.0 and npm 11.6.2 on macOS.
Read Issue #14 and its current readiness confirmation through GitHub. Verified
the assigned checkpoint includes both final prerequisite merges, #11 at
`71012713a61970d1f6628d80453ef52b642ef29e` and #12 at
`b78f2748f727e7de793dde3689dc3013467dab39`. Reused the existing Playwright setup;
no dependencies, production behavior or historical fixtures were changed.

- `npm ci`: passed, zero reported vulnerabilities. The initial test command
  before installation stopped with `playwright: command not found`; installation
  resolved it. Chromium was already available, so no browser installation command
  was needed or executed during this work.
- `npm run test:e2e -- --workers=2`: **5 tests passed** (12.9 seconds), no retries.
  Each journey runs against production assets with real IndexedDB and UI-driven
  setup/backup/restore. Only the AI worker transport and WebGPU capability are
  mocked; the production adapter, validation and persistence remain active.
- `npm test -- --workers=2`: **112 tests passed** (27.9 seconds), no retries,
  including the final journey assertions, TypeScript check and Vite production
  build. Covers MAIN mappings, keyboard/errors, historical evidence boundaries,
  offline posting/replies/read markers/reloads/JSON round-trip, unsupported WebGPU,
  production AI recovery without duplicates and manual use after AI failures,
  alongside all existing regression tests. No model weights were downloaded.
- Earlier targeted runs exposed test assumptions: connection completion can
  render MAIN before HELP, opening the editor moves focus to its title input,
  and reply previews include the parent number. The next run caught a clock
  race: visible logout output precedes queued session writes. The recovery
  journey now waits for the UI backup queue to finish logout at the old time
  before advancing the test clock. All corrections were to tests; no assertions
  were skipped or retries enabled. The final full run passed after these fixes.
- The existing Vite advisory for the large optional WebLLM chunks remains.
  Ordinary unsupported/manual use requests no AI assets; request assertions
  allow only local static GETs and reject backend/external request attempts.
- Reviewed the Issue-specific diff, checked local Markdown links/anchors in the
  changed documentation, and passed `git diff --cached --check`.

The [E2E checklist](e2e.md) maps every acceptance criterion to repeatable evidence
and records provisional visual/era details. Real GPU/model loading, real-weight
cache reuse and Japanese generation-quality checks were not performed. Other
browser engines, native IME, assistive technology and physical devices were not
tested here. Former-user nostalgic review remains optional and was not performed.
Tab closure recovery is tested; OS/browser-crash durability and real eviction
are not established. No deployment was performed. No post-merge verification is
required for #14.
