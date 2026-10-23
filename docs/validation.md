# Issue #69: environmental gateway and EIC NET readings

Validated on 2026-10-23 with Node.js 24.12.0 on macOS.

- `npm ci`: passed, zero reported vulnerabilities; no dependency/lockfile changes.
- `npm test -- tests/eic.spec.ts tests/sections.spec.ts`: **30 passed** in
  18.1 seconds, including TypeScript checking and the production build.
- Initial `npm test`: **253 passed, 1 failed**. The remaining MAIN mapping test
  in `tests/navigation.spec.ts` still expected MAIN 5's old empty collection.
  Updated that obsolete expectation to the separately identified EIC gateway.
- Final `npm test`: **254 passed** in 1.2 minutes, with no failures, retries or
  skips. The configured servers performed TypeScript checking and the production
  build; all existing functional, storage/import/reset, consent, shared-calendar,
  composition/IME, scrolling and progressive-output/skip checks passed.
- Reviewed the final diff against Issue #69. Local Markdown targets/heading
  anchors and balanced code fences in README, research and this record pass;
  `git diff --check` and the staged whitespace check include the new files.
- Existing Vite large-chunk and Node `NO_COLOR`/`FORCE_COLOR` warnings remain
  informational. No new test framework, model download or real inference was used.

Six focused checks cover both original Japanese readings, every new controller
depth, direct/index entry and actual parents, LIST/HELP/BACK/MAIN, switching
articles, repeated visits and prior service contexts. Invalid selectors, malformed
and missing read numbers and unrelated service commands preserve their views.
The new views expose no forum, mailbox, conference or OLT participation context.

Two production browser journeys at 320×640 exercise every reading through direct
and index routes, invalid commands including WRITE/REPLY, mail composition and
room-entry attempts, Settings/About return to the current article, modal draft
and focus preservation, literal text, input/page bounds and terminal-log inclusion.
A fixed operational clock and explicitly paused automatic activity make protected
record comparisons deterministic. Anonymous browsing uses a restored world with
empty members/SIGs/forums/posts/mail/read markers/conference; registered browsing
retains the seeded community. Both preserve all protected collections and settings
(including conference/OLT records, consent and historical calendar), while normal
command history continues. No external requests were observed in either journey.

The three readable HTML research sources were rechecked; the biodiversity PDF
remains snippet-only evidence from the Issue research, with extraction/image
limitations retained. About and the
[research record](research/pcvan-1996-1997.md#eic-net-environmental-information-issue-69)
distinguish evidenced purposes/gateway availability from reconstructed placement,
controls and undated fiction, retain chronology uncertainty, and record continued
text operation alongside the web service in January 1997. No persistence,
migration or storage-schema changes were made. Optional visual/historical
screenshot comparison was not performed; no post-merge verification is required.

# Issue #65: retained DAISIZEN conference contributions

Validated on 2026-10-23 with Node.js 24.12.0 on macOS.

- `npm ci`: passed, zero reported vulnerabilities; no dependency/lockfile changes.
- `npm run build`: passed TypeScript checking and the production build.
- `npm test -- tests/conference.spec.ts tests/conference-repository.spec.ts tests/services.spec.ts`:
  **20 passed** in 21.2 seconds, with no failures or skips.
- `npm test`: **242 passed** in 1.1 minutes, with no failures or skips. This
  includes TypeScript checking, the production build and all existing regression
  checks against production assets and the repository-module Vite server.
- After updating the reset explanation to include the three conference examples,
  `npm test -- tests/factory-reset.spec.ts tests/settings-dialog.spec.ts tests/storage-controls.spec.ts`:
  **29 passed** in 41.8 seconds, including another type-check and production build.
- Added local Markdown links and the conference heading anchor resolve. Reviewed
  the final implementation/content/documentation diff against Issue #65;
  `git diff --check` and `git diff --cached --check` pass, including new files.
- Vite's existing large-chunk warning and Node's existing `NO_COLOR`/`FORCE_COLOR`
  warning remain informational. No model download or real inference was used.

New controller/repository/production-browser coverage exercises anonymous reading,
three original Japanese starter contributions with two existing resident authors
and reply relationships, writing with optional registration, reply/edit/review,
cancellation at every composer stage, retained drafts on BACK/MAIN, IME guards,
exact Japanese whitespace/literal markup, invalid commands/numbers, list/read,
Settings return context at 320px, leave/reentry/reload and JSON round-trip.
Older missing and intentionally empty conferences stay empty, can accept their
first human contribution, and remain empty again after restoring the earlier
backup. Browsing and cancellation preserve community collections.

Repository checks cover concurrent numbering, idempotent sends, invalid authors,
missing/forum/forward reply references, identity changes/deletes, quota rollback
and retry, strict import validation and atomic restore failure, stable stored
timestamps, reset/reseed and stale import/reset fences. Existing seeded, legacy,
imported and explicitly forum-populated worlds receive no conference examples.
AI planning is identical with and without conference storage; forum/mail records
and resident scheduling settings remain independent.

Documentation, About and evidence metadata distinguish high-confidence general
retained-message semantics from unresolved DAISIZEN-specific configuration. The
three starter contributions and all conference controls/topic organization are
original reconstruction, with source inspection dates and limitations recorded.
No historical prose, poem, real identity or image was copied. No human/hardware
or real-model check is required; none was performed. No post-merge verification
is required.

# Issue #59: distinct DAISIZEN library and OSL journeys

Validated on 2026-10-23 with Node.js 24.12.0 on macOS.

- `npm ci`: passed, zero reported vulnerabilities; no dependency or lockfile changes.
- `npm run build`: passed (`tsc --noEmit` and the Vite production build).
- `npm test -- tests/services.spec.ts tests/sections.spec.ts`: **37 passed**
  after correcting a test expectation. The initial run had 35 passes and two
  failures: the new browser journeys expected a generic command notice for
  `WRITE`, while the existing dispatcher correctly returned its forum-target
  guidance. The assertion now checks that actual guidance; no dispatcher change
  was needed. The successful focused rerun took 11.4 seconds.
- `npm test`: **213 passed**, no failures or skips, in 45.6 seconds. The existing
  configuration first type-checks and builds the production app, then runs
  Chromium against production assets and the repository-module Vite server.
  Existing MAIN/MITI, composition/reply, mail, OLT, consent/storage, backup/import/
  reset, IME, literal rendering, scrolling, output pacing and skip checks passed.
  Vite reported its existing large-chunk warning; Node reported the existing
  `NO_COLOR`/`FORCE_COLOR` warning. Neither prevented checks from passing.
- A Python check of added local Markdown links passed for all four links,
  including heading anchors. Reviewed the implementation, bundled Japanese
  content, provenance and documentation diff against Issue #59.
- `git diff --check` and `git diff --cached --check`: passed, including the two
  new bundled collection files in the staged check.

New controller coverage visits all five library and six OSL categories in order,
including empty destinations; reads both original articles and both text files;
checks catalog metadata and UTF-8 sizes using an independent Node byte count;
and exercises invalid inputs, HELP/LIST, nested BACK, repeated reads, service
switching, MAIN at each depth and command scoping. Service-entry evidence
metadata and existing mail/conference/OLT assertions remain protected.

Two production browser journeys at 320×640 cover both services and every category,
with and without a human handle. They open/close both modal Settings and terminal
Settings/About while viewing content, preserving the modal's input draft and
transcript and returning to the same content. Unsupported composition, mail,
OLT and transfer commands cannot acquire those contexts. Snapshots before and
after browsing are identical for members, SIGs, forums, posts, mail, read states
and settings; only ordinary command history/session bookkeeping is allowed.
Restored empty boards stay empty, including the separate ダーウィン図書館
forum and MITI 資料室. No model download or real inference was needed.

The memorial's undated category configuration remains provisional for 1996.
Interactions and bundled content are reconstructed; assigned 1996 file dates
are fictional and displayed UTF-8 bytes are local preview sizes. No historical
transfer UI or binary transfer is claimed. Physical IME/device checks and
additional period manuals were not performed and are not Issue #59 gates.
No push, PR, comment or deployment was performed. No post-merge verification
is required.

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
  added. See [the reconnect activity contract](local-ai.md#scheduling-discussion-and-bounds).

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

## Issue #29 terminal display and progressive output

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.
Read the current open Issue #29 through GitHub and reinspected application wiring,
storage validation, historical fixture boundaries and the existing test setup.

- `npm ci`: passed, zero reported vulnerabilities.
- `npm run build`: passed (TypeScript and production Vite assets). The existing
  advisory about large optional WebLLM chunks remains; no new dependency or asset
  download was added.
- Final `npm test -- --workers=2`: **119 tests passed** (26.1 seconds), no retries.
  Includes the production build, all previous forum/navigation, composition, AI,
  backup/restore and offline `/pcvan/` checks. Functional journeys use the reduced
  motion Instant default; the new display suite explicitly enables animation.
- Six new tests cover controlled frame timing at all four nominal speeds, exact
  UTF-8 costs, Japanese/full/half-width text, combining marks and joined emoji,
  batched paints, interleaved asynchronous appends, queue overflow, skip and later
  output, speed changes, commands and IME during animation, logical transcript
  downloads with queued text and excluded drafts, persisted/versioned preferences,
  old and invalid backups, reduced motion and explicit overrides. Responsive
  checks cover 320×568 and 1280×800, native prompt visibility, selectable text in
  all three themes, optional effects, collapsed settings and horizontal scroll.
- Earlier targeted checks passed 19 existing regressions and six display tests.
  Initial display integration failures used exact raw-label lookups that included
  nested text/options; the checks now use accessible roles/names. A later full
  run found an existing journey assertion that assumed random-ID backup order
  equaled creation order. It now identifies parent/reply by forum post number;
  the journey's separate browser context also explicitly requests reduced motion.
  No production storage ordering or test assertions were removed to accommodate it.
- Inspected local Chromium screenshots at desktop 1280×900 and mobile 320×568.
  Moved timestamps into appearance settings and increased narrow-screen terminal
  height so the transcript and prompt retain most of the viewport. Screenshots
  were temporary inspection artifacts, not added runtime assets.
- Changed Markdown files passed balanced-fence and local link/heading-anchor
  checks. `node --check scripts/service-worker.js`, `git diff --check` and
  `git diff --cached --check` passed.

See [display controls and implementation limits](terminal-display.md) for the
UTF-8/8N1 approximation, explicit Unicode fallback, bounded pending queue,
command/reveal ordering, accessibility behavior and optional v1 settings record.
Historical fixtures and command meanings remain unchanged. Real GPU/model loading,
physical devices, native IME, assistive technology and other browser engines were
not tested. No deployment, push, PR, merge or GitHub comment was performed. No
post-merge verification is required for #29.

## Issue #31 immersive terminal and consolidated Settings

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.
Read the current open Issue #31 through GitHub, then inspected the current controls,
connection/navigation copy, fixtures, persistence and production browser tooling.

- `npm ci`: passed, zero reported vulnerabilities.
- `npm run build`: passed (TypeScript and production assets). The existing large
  optional WebLLM chunk advisory remains. No font asset, CDN, dependency or model
  download was introduced.
- Final `npm test -- --workers=2`: **125 tests passed** (32.3 seconds), no retries.
  Includes the production build, all earlier regression checks and six added
  checks for clean connection/reconnect, directory/forum/article/help/service
  output, default-hidden settings, About discovery, keyboard/pointer modal use,
  focus return, cyclic Tab/Escape, guarded IME, member creation and a queued WRITE
  handing focus from Settings to the separate editor. Background stubbed model
  loading verifies visible progress, notification after closing Settings, later
  inspection and actionable inference failure without terminal replacement.
- Character measurements cover ASCII, spaces, full-width kanji/kana/punctuation,
  half-width kana and MAIN's ten paired columns at 320px and 1280px widths, with
  default, missing-font and generic monospace fallback configurations. Enlarged
  text, horizontal scrolling and selection remain usable. These checks establish
  metrics for the fonts available to this Chromium installation, not every OS.
- Updated existing journeys to open/close Settings explicitly while retaining
  posting/reply/IME, model cancellation, theme/speed/skip, transcript download,
  old v1 preferences and JSON round-trip, data errors and real offline worker
  coverage under `/pcvan/`. Fixtures, research documents, storage schema and
  persistence logic are unchanged. Demo reading shows concise excerpts; About
  identifies the fictional IDs and links to the intact original fixture.
- Earlier runs exposed a delayed focus-return race, hidden-control assumptions
  in the previous tests, and collapsed-details descendants being included in Tab
  boundaries. Focus restoration is now synchronous, the editor is a sibling
  modal, and visible controls define the Tab boundaries. A new AI failure check
  initially tried to click a stop button that is correctly disabled after failure;
  it now checks the enabled model-reload recovery action. Repeated unchanged
  storage failures remain inspectable without repeating a notification already
  read. No assertions were skipped and no automatic retries were enabled.
- Inspected temporary Chromium screenshots at 1280×900 and 320×568 plus the About
  overlay. The terminal fills the ordinary viewport and source explanations stay
  inside Settings. Screenshots are inspection artifacts, not runtime assets.
- Changed Markdown files passed balanced-fence and local link/heading-anchor
  checks. `node --check scripts/service-worker.js`, `git diff --check` and
  `git diff --cached --check` passed.

Real GPU/model downloads, native IME, screen readers, other browser engines,
physical devices and nostalgic feedback were not tested. No deployment, push,
PR, merge or GitHub comment was performed. No post-merge verification is required
for #31. See [terminal controls and limits](terminal-display.md).

## Issue #33: navigable menus and empty collections

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- `npm ci`: passed; 0 vulnerabilities reported.
- `npm run build`: passed TypeScript checking and the production build. The
  existing optional WebLLM chunk-size advisory remains.
- Final `npm test -- --workers=2`: **151 tests passed** in 32.0 seconds, with no
  retries or skipped tests. This command also builds and serves production assets.
  The first run passed 150 tests and failed one journey assertion that still
  expected the old unavailable-service notice; that assertion now checks the
  corresponding empty mailbox/file/room view and the complete rerun passed.
- Added 26 checks for destination-specific empty counts, every MAIN collection,
  working index links, complete BACK paths (including indexed SIG routes),
  HELP/LIST, scoped invalid/external-operation commands, three mailbox contexts,
  Settings preserving the mailbox/input draft/transcript, and saved empty boards
  staying empty after service exploration. Updated existing MAIN/service/journey
  coverage to require useful destinations instead of implementation notices.
- Browser request listeners observed no requests while exploring indexed
  sections/mailboxes online or DAISIZEN services offline. Service exploration
  preserves saved content and returns to saved post reading. No service adds a
  network operation, credential, storage migration or automatic model download.
- Existing checks passed for MITI and all seven DAISIZEN boards, saved posts,
  human composition/replies/unread state, optional AI recovery, offline shell and
  backup/restore, disconnect/reconnect, simulated IME, progressive output/skip,
  Settings focus and responsive/monospace layout. Historical fixtures and storage
  schema are unchanged.
- Changed Markdown passed balanced-fence and local link/heading-anchor checks.
  `git diff --check` and `git diff --cached --check` passed.

Native IME, real GPU/model downloads, other browser engines, physical devices
and optional nostalgic-flow feedback were not tested. No post-merge verification
is required for #33. The new service collections are intentionally read-only and
empty; real mail, commerce, file transfer, internet gateways and multi-user chat
remain outside scope. See the [menu map and commands](../README.md#menu-destinations-and-collections).


## Issue #35: independently scheduled local residents

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- `npm ci`: passed, with 0 vulnerabilities reported.
- `npm run build`: passed TypeScript checking and the static production build.
  The existing optional WebLLM chunk-size advisory remains.
- Final `npm test -- --workers=4`: **157 tests passed** in 22.4 seconds, without
  retries or skips. This command also builds and serves production assets.
- Fixed-clock/seed tests exercise all ten distinct profiles, weekday/weekend and
  offset boundaries, active quiet hours, deterministic bounded catch-up, open-tab
  visits, 20-minute-minimum response delays and both AI-to-AI and human replies.
- Mocked model checks verify explicit first-use download consent, empty-board
  setup without a human, one shared model, cross-tab model leases, page-visit
  budgets shared with manual previews and surviving reconnect, pause/resume, cancellation, GPU/load/validation
  failures and missing Web Locks without automatic retry loops.
- Real IndexedDB checks cover legacy settings/backup migration, original resident
  IDs and saved posts, edited profiles and handles, pending-run preservation,
  atomic invalid restore/quota rollback, concurrent duplicate commits through
  separate connections, interrupted generation and production tab-loss recovery.
- Existing terminal, navigation, composition, provenance, responsive Settings,
  offline shell, cache probes and JSON backup journeys pass with the new defaults.
- Earlier runs exposed old empty/default-off assumptions, nested disclosure
  selectors, fake-clock timer alignment, exploratory-board choices in a focused
  reply scenario and insertion-order assumptions for IndexedDB exports. These
  assertions now match the new behavior or use explicit deterministic fixtures.

Real GPU/model downloads, subjective character consistency over real open/close
cycles, other browser engines, physical devices and native IME were not tested.
No deployment, push, PR, merge or comment was performed. No post-merge verification
is required. See [resident behavior and limits](local-ai.md).

## Issue #37: first-visit fictional community history

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- `npm ci`: passed; 0 vulnerabilities reported.
- `npm run build`: passed TypeScript checking and the production build. The
  existing optional WebLLM chunk-size advisory remains.
- Final `npm test`: **165 tests passed** in 15.4 seconds, without retries or
  skips. This command also builds and serves the production assets.
- Focused `npm test -- tests/community.spec.ts`: **5 passed** in 5.8 seconds
  after keeping the author-distribution assertion compatible with Node 20.
- Fixed-clock Chromium checks cover 30 original Japanese posts, ten authors,
  eight threads, both boards, chronological numbering, ordered reply references,
  varied JST hours, a quiet day, recent dates and the persisted world anchor.
- Fresh simultaneous tabs, independent concurrent connections, reloads, deleted
  posts and seeded backup/restore retain one history. A simulated quota failure
  after seven inserts rolls back posts, residents, boards, settings and anchor;
  invalid provenance settings also leave backups unchanged.
- Existing populated profiles receive no seed posts. Empty legacy opt-in requires
  confirmation, preserves human members/custom directories/counters, is harmless
  when repeated, rejects ambiguous/identity collisions and rechecks eligibility
  after a human post arrives. Settings preview/cancel/confirm is exercised.
- Empty and legacy-marker imports never seed, including after consent, another
  restore or reopening. Their missing boards remain empty instead of showing DEMO
  fallback posts. Human replies/read markers and mocked autonomous AI selection,
  target context and own-message memory work with distinct seed origins.
- Production offline posting/backup/restore, model-consent boundaries, scheduler
  limits, cancellation, two-tab model leases, tab-loss recovery and the existing
  terminal/Settings/service-worker update suites pass. No model, GPU or backend
  is used. Earlier runs exposed obsolete DEMO/count assumptions and transcript
  checks that sampled before queued responses; those checks now await responses.
- `git diff --check` and `git diff --cached --check`: passed. Local Markdown
  file links were checked; the fixture contains no archived user text or real
  historical identities.

Optional subjective first-use review of the published app, real GPU/model output,
other browser engines, physical devices and native IME were not tested. No
post-merge verification is required for #37.

# Issue #39 implementation validation

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- `npm ci`: passed; npm reported no vulnerabilities.
- `npm test -- --workers=4`: **177 tests passed (26.7s)**, including the
  production TypeScript/static build and existing AI, activity, community,
  navigation, posting, backups and offline checks. Twelve new mocked-browser
  checks cover first-use invitation, no-load visit/decline/Escape/IME, persisted
  deferral and re-entry, explicit confirmation, shared model selection, real
  adapter-start counts, progress/cancel/late results/failure/retry/readiness,
  unsupported/consented/paused/legacy profiles, cross-tab changes, stale
  transactions, restores during download and narrow viewport layout. No real
  model files were downloaded.
- `npm run build`: passed separately. Vite retains the existing large optional
  WebLLM runtime/worker chunk advisory; the app entry remains separate.
- Inspected production Chromium screenshots at 1280×720 and 360×640, including
  the mobile confirmation. The invitation and command input remain visible;
  terminal text keeps its existing horizontal scrolling and is not overlaid.
- `git diff --cached --check`: passed. README/local-AI instructions describe the
  confirmation boundary, persisted deferral, re-entry, progress and pause controls.

Development checks caught and corrected a setup read advancing the schedule.
A full run also exposed an existing scheduling fixture that fixed its seed but
left initial due times random; that fixture now initializes both consistently.
Later runs observed dev-page reload timeouts, an adapter execution context lost
on navigation, and one transient scrollback assertion. The affected 30-check
subset passed in isolation. Explicitly prebundling the installed WebLLM JS in
Vite prevents late dependency-optimizer reloads; the final full run passed without
retries. Prebundling neither downloads model weights nor imports AI into a page.

Optional real WebGPU download/stop/resume, physical-device/native IME and
screen-reader observation were not performed. No post-merge verification is
required by Issue #39.

## Issue #41: unobtrusive model setup and deliberate provenance inspection

Validated on 2026-10-21 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- Inspected Issue #41 and current `main` (`d34ecb4`), matching the application
  beneath this Run's upstream checkpoints. No source Issue comments were present.
- `npm ci`: passed; 0 vulnerabilities. `npx playwright install chromium`: passed.
- `npm run build`: passed TypeScript checking and production asset generation.
  Vite retains the existing optional WebLLM chunk-size advisory.
- Final `npm test -- --workers=4`: **181 passed (22.0s)**, without retries or
  skips, including a fresh production build and the connected production journeys.
- Setup checks exercise neutral accessible names, first-use consent disclosures,
  no imports/downloads on visit/decline/Escape/deferral, focus/IME behavior,
  progress/cancel/failure/retry, compact readiness, paused/unsupported states,
  fresh consent for another model, cross-tab invalidation and restore/reload.
- Renderer and browser checks cover human, prewritten, generated, legacy and demo
  authors, missing/empty authors, profile renames, literal markup, reply integrity
  and simulated display times. Ordinary MAIN/SIG/list/read output excludes the
  intrusive generation labels and internal author keys.
- Expanded Details / provenance retains artificial authorship, all ten profiles,
  local-only/no-multiuser explanations, download sources, model origins and both
  stored generation/post times and simulated display times. Production JSON
  download after restore/reload retains the original posts, IDs and provenance.
- `git diff --check` and `git diff --cached --check`: passed. Local Markdown
  file links in the updated documentation resolve.
- The initial focused run passed 28/29; the remaining assertion sampled before
  READ completed after its old technical-ID wait was removed. The initial full
  run passed 172/181; failures were stale copy/selector expectations and a new
  assertion assuming input ordering in IndexedDB exports. These test assertions
  were corrected; the final full run passed.

No real GPU/model download, physical-device/native IME, screen-reader observation
or optional subjective visual review was performed. No post-merge verification is
required by Issue #41. No push, PR, merge or comment was performed.


## Terminal-only interaction migration (#45)

This section supersedes the earlier button/dialog interaction descriptions above.
Latest GitHub `main` was inspected at `23802091c207a6d6207e239d16b6aed746a3c4c5`
and Issue #45 was read before implementation. Historical fixtures, seeded
conversations, ten-resident profiles and the version-1 public backup schema remain
unchanged. Reconstructed prompts are documented separately from historical evidence.

Validation performed in the assigned worktree:

- `npm ci`: passed; 24 packages audited with no vulnerabilities.
- `npm test -- --workers=4 --reporter=line`: **150 passed** in Chromium (25.9 s),
  against the production build and source-module test server. No real model/GPU
  download was used. Production WebLLM adapter tests replace its Worker; source
  tests inject adapters. Native file choosers/downloads are driven after commands.
- `npm run build`: passed TypeScript and Vite static production compilation.
  The existing large WebLLM bundle warning remains; the adapter stays lazy-loaded.
- `git diff --check`: passed. Documentation local paths/anchors checked.

The tests complete first-run handle registration/skip, pending WRITE handoff,
seeded READ, line-by-line WRITE/REPLY, preview/edit/cancel/confirmation, exact
Japanese whitespace, transactional saves, read tracking, reload and JSON recovery.
They cover malformed/oversize/blank drafts, IME events, duplicate input, quota
rollback/retry, deleted parents, missing-board creation, multiple human identities,
model consent refusal/acceptance, deferral, leases, progress/cancellation and late
results, profile validation, generation budgets and autonomous interruption/recovery.
Import/reset require context-bound typed approval; stale tabs are fenced even when
notifications are missed. Reset preserves shell/model/unrelated caches. Offline
checks run the real service worker and exercise reload, human posting, backup and
storage persistence request outcomes. DOM checks reject dialogs, helper links,
buttons, selects, textareas and floating panels; the sole visible input keeps focus.
Existing controller, repository, renderer and scheduling tests remain alongside
the migrated command-only browser tests. See [the current coverage map](e2e.md).

Earlier failing development runs exposed mutable activity watermarks in confirmation
contexts, self-delivered restore notifications and old test connections invalidated
by the stronger restore generation fence. Those were corrected; the complete suite
above passed afterward. Physical desktop/mobile keyboards, native Japanese IME
candidate windows, screen-reader speech quality and real WebGPU model execution
were not manually tested. These are optional observations, not pre-merge gates.
No post-merge verification is required.

## Terminal participation and application Settings (#47)

This section supersedes #45's removal of application dialogs. PC-VAN handle
registration/selection, navigation, reading and human composition remain entirely
in the terminal. Modern display, AI/activity/resident, data, offline/storage and
About controls are available through the header's **設定 / Options** dialog.
Legacy typed application menus use the same persisted actions and consent loader.

Validation performed in the assigned worktree:

- Read GitHub Issue #47 and the repository development/review guidance.
- `npm ci`: passed; 24 packages audited, no vulnerabilities.
- `npm test -- --workers=4`: **168 passed** in Chromium (47.4 s), including
  15 new Settings browser tests and the existing terminal/controller/repository,
  production worker, scheduler, renderer and offline suites.
- `npm run build`: passed TypeScript and production bundling. The existing large
  lazy WebLLM bundle warning remains.
- `git diff --check`: passed; changed documentation's local file links resolve.
- Inspected desktop (1280 × 800) and mobile-width (320 × 640) screenshots of the
  production Settings dialog. Browser tests check width, focus entry/trapping,
  Escape, IME guards, draft preservation and restoration to the terminal input.

Settings tests execute display persistence, model selection, explicit informed
consent/refusal, deferral, progress/cancel/failure, cache inspection, generation/
preview/save and all ten profile/routine/frequency editors. They cover native JSON
export/import, refusal, invalid files, quota rollback, backup-before-reset, reload,
stale consent/file callbacks, atomic cross-tab profile conflicts, live display
refresh, reset during a pending model load and real service-worker offline use.
A failed import preserves a human draft; successful replacement clears it and
unsubmitted input. Generated preview text is cleared when its draft is invalidated.

Development runs identified test locator mismatches, an incorrectly injected
quota failure, native popup automation limitations and a pre-existing command
history assertion that ran before the queue accepted its command. Tests now use
accessible combobox roles, inject the actual replacement write, drive native
selection with Playwright and await the command response before recalling it.
Keyboard events exercise modal navigation, checkbox changes, applying settings
and close/focus behavior. The final complete run above passed.

No real model weights were downloaded. Real WebGPU quality, physical-device/native
IME and screen-reader speech testing were not performed; they remain optional.
No post-merge verification is required. No push, PR, merge or comment was made.

## Issue #49: autonomous activity after model setup

Validated on 2026-10-22 with Node.js 24.12.0 and npm 11.6.2 on macOS.

- `npm ci`: passed, with 0 vulnerabilities reported.
- Final `npm test -- --workers=4`: **172 tests passed** in 49.5 seconds,
  without retries or skips. The suite builds and serves production assets.
- `npm run build`: passed TypeScript checking and the static production build.
  The existing optional WebLLM chunk-size advisory remains.
- New fake-clock browser journeys use the production worker adapter with mock
  WebLLM, plus an injectable adapter for late output and load failures. They never
  call a manual AI-generation API: explicit model consent is followed by timer
  planning, validated automatic saves, delayed human and AI-to-AI replies,
  LIST/READ, long-open allowance renewal and bounded close/reopen catch-up.
- Checks cover quiet time, default enabled/unconsented activity, persisted global
  and individual pause, model changes requiring renewed consent, unavailable
  locks, cross-tab model contention/recovery, failed loads/output/inference,
  transactional quota rollback/retry, hidden/restored pages and approved backup
  recovery without reconnecting. Existing unsupported-GPU, seed/profile,
  IndexedDB idempotency, JSON/reset and human composition tests remain passing.
- Standard Settings and typed model help contain no manual posting controls.
  Background work preserves focused input, IME composition and transcript text;
  model errors remain in on-demand settings. All 30 initial posts stay intact.
- `git diff --check` and local link target checks for updated guides passed.

The automatic allowance now renews after six hours in a long-open page, retaining
conservative limits of four saved posts by default and at most twelve attempts
per window. Reconnecting does not replenish it. Individual schedules and the
72-hour catch-up horizon are unchanged; no closed-browser inference is claimed.

Optional real-GPU/model-download and subjective conversation checks were not
performed. No push, PR, merge, deployment or comment was performed. No post-merge
verification is required.

## Issue #52: local electronic mail with familiar residents

Validated on 2026-10-23 with Node.js 24.12.0 and npm 11.6.2 on macOS.
The assigned worktree descended from `a5e766a`; a read-only remote-head check
confirmed `main` still pointed to that same source commit.

- `npm ci`: passed; 0 vulnerabilities reported.
- Final `npm test -- --workers=4`: **188 tests passed** in 55.2 seconds,
  with no retries or skips. This includes 16 new mail tests and the complete
  existing terminal, storage, forum, settings, offline and autonomous resident suites.
- `npm run build`: passed TypeScript checking and production bundling. The
  existing optional WebLLM chunk-size advisory remains.
- Human browser journeys cover MAIN `1`, MAIN `X` and SIG `MAIL`, handle reuse/
  inline registration, address discovery, send/read/reply, subject/body editing,
  Japanese multiline/IME input, cancellation at every stage, invalid commands,
  failed-write draft retention/retry and a consumed successful send.
- Real Chromium IndexedDB tests cover strict mail fields/relationships, stable
  address precedence and ambiguous handles, atomic numbering, concurrent duplicate
  delivery, quota rollback, member-edit guards, independent human projections and
  individual read markers. Mail writes preserve all prior forum records.
- Mocked WebLLM plus fake clocks exercise the actual consent/startup/timer path:
  delayed private replies, a SIG acquaintance initiating mail as the same member,
  preserved active IME input/transcript, public posting capacity, quiet/unopened/
  unsupported AI, malformed output/inference failure, bounded retry, quota recovery,
  deduplicated reopening and a second tab reading the same mailbox.
- Mail prompt checks exclude other humans' and other recipients' letters, bound
  long pair history and public context, label profile/excerpt data untrusted and
  reject wrong identities/parents, extra fields, HTML and control characters.
  Deterministic catch-up retains the shared cap and 72-hour horizon.
- A real version-1 database upgrades by adding an empty mail store without
  changing posts/read states. Pre-mail JSON imports an empty mailbox. Mail-bearing
  backup round-trip, offline reload/read/restore, reset and stale-connection/draft
  fences are covered. No GPU/model/network is needed for stored reading or sending.
- An intermediate full run exposed a pre-existing timing assumption in the
  terminal echo test (immediate assertion before the asynchronous command queue).
  The assertion now waits for the echo; the final complete rerun passed.
- Documentation link checks (38 local links/anchors) and `git diff --check`
  passed. New commands, addresses, shared mailbox behavior and layouts are
  explicitly reconstructed; the mail-specific research record preserves evidence
  classifications and unverified host-menu/address details.

No real model weights were downloaded. Real GPU inference and subjective
character quality checks were not performed; historical terminal UI accuracy is
not claimed. These are
optional validation; mocked output verifies routing, scheduling and persistence.
No push, PR, merge, comment or deployment was performed. No post-merge verification
is required.

## Issue #51 — expanded SIG communities

Implemented against the selected worktree at `cba62b449ab130f030e74061e01d7d5ba55e083a`
(application upstream includes local mail, PR #54). Read the open GitHub Issue
and rechecked primary/operator sources; the research notes distinguish historical
names from reconstructed target-era layouts and the original game community.

The new baseline has five communities, ten populated boards, eighteen threads
and 66 authored posts. The original thirty posts/eight threads remain unchanged.
New tests cover shared identities, differentiated content, every additional SIG
board’s navigation/read/empty states, terminal human writes/replies and read
markers, reload, actual scheduled mocked-worker replies across two SIGs, bounded
board-specific context, and suppression of internal storage keys in composition.
Repository checks cover expansion rollback under injected quota failure,
concurrent connections, custom-board/counter/profile/read preservation, repeated
opens, pre-expansion JSON restore exclusion, deleted-original opt-out, and strict
expansion provenance validation. Existing reset, backup/restore, IME, focus,
consent, budgets, cross-tab locking, mail and MAIN mapping checks also pass.

Validation on 2026-10-23:

- `npm ci`: succeeded, 24 packages audited, zero reported vulnerabilities.
- `npm run build`: passed TypeScript and production bundling. The existing large
  WebLLM chunk warning remains; weights are not bundled or downloaded.
- Final `npm test -- --config .tmp-playwright.config.ts --workers=4`:
  **192 passed in 55.5 seconds**, no retries. Another independent worktree was
  using ports 14373/14374, so temporary copies of the unchanged tests/config
  substituted only ports 15373/15374. Both development-module tests and production
  browser tests ran against this worktree’s servers/assets. Temporary files were
  removed afterward; the normal repository configuration is unchanged.
- The first full regression run had 187 passes/two failures due to older test
  assumptions: an injected write fault could hit startup in another database,
  and the recovery fixture assumed a resident’s default preferred board stayed
  singular. Scoped the fault to its database and explicitly pinned that recovery
  fixture’s preferences. A focused new-content test also corrected an assertion
  that searched a body for a term present only in its title. Final runs passed.
- Local Markdown link/heading checks and `git diff --check`: passed.

No real model/GPU, deployment, push, PR, merge or external comment was used.
Subjective human walkthrough and further target-era archival research remain
optional; no post-merge verification is required by this Issue.

## Issue #53 — local terminal OLT rooms (2026-10-23)

Read the open GitHub Issue and repository flow/review guidance before coding.
The selected worktree already contains mail #52; upstream `main` was rechecked as
`35088332ddaf4aa8a809e751fd36352c8042ed23`. OLT reuses its human/resident identities,
authorization, model worker, locks and world-generation fences.

- Final `npm test`: **203 passed in 41.9 seconds**, no retries or skips. This
  includes 14 OLT tests plus the existing forum, mail, Settings, offline, storage,
  terminal and autonomous activity coverage. An intermediate run found one old
  service assertion expecting OLT not to load content; it was updated for the
  room directory. One final-suite startup encountered the prior preview server
  still closing its port; after checking the ports were free, the full run passed.
- `npm run build`: passed TypeScript and production bundling. The existing
  optional WebLLM chunk-size advisory remains.
- Terminal journeys cover directory/join/who/speech/list/help/leave/main,
  room changes and reentry, literal command words and slash escaping, IME Enter,
  history/focus, handle rename, transcript backup/import/reset and subsequent
  forum posting. No in-world buttons, dialog or second input is required.
- Fake clocks and mocked WebLLM exercise delayed human-to-resident and
  resident-to-resident speech, input/IME preservation, two-tab arbitration,
  same-member attendance, quiet residents, absent/off-hour departure, reload/
  catch-up, no-consent/no-WebGPU fallback, malformed output/worker failure,
  cancellation on leaving/hiding and a stalled generation deadline. Default
  evening profiles over 100 deterministic seeds include populated and empty visits.
- Real IndexedDB checks cover monotonic IDs and 200-line retention, leases,
  concurrent turn reservation/duplicate commit, independent persisted allowance,
  quota rollback, strict atomic restore, legacy pre-OLT/pre-mail backup compatibility,
  reset and stale-connection fencing. OLT does not edit forums or consume their
  generated-post budget. Prompt checks exclude private mail, bound public excerpts,
  and reject wrong speaker/room, coerced IDs, controls, HTML, oversized/repeated
  output and extra fields.
- README, local AI behavior, shared mail identity text, JSON contract, Settings
  provenance and OLT historical research are updated. Forty-one relative links/
  anchors in the changed research/product documentation pass local checks.
  The full staged diff passes `git diff --cached --check`.

No real model weights were downloaded. Compatible real WebGPU chat pacing,
subjective persona quality, physical Japanese IME/mobile keyboards and original
period OLT manual/screen comparison remain optional and unperformed. Mocked
models validate lifecycle, routing and persistence without claiming language
quality or authentic historical controls. No push, PR, merge, comment or deployment
was performed. No post-merge verification is required.

### Issue #51 integration before PR publication

Integrated `main` at `1cdf6d484d125e8d27eef01ea241d3cf89f9b093` (OLT PR #55)
before publishing #51. Resolved additive README/research/validation overlaps and
retained both SIG and OLT navigation imports. No new transport was implemented.

- `npm ci`: passed, 24 packages audited, zero reported vulnerabilities.
- Initial integrated `npm test -- --workers=4`: 204 passed, two failed. Updated
  OLT's reset assertion from thirty to 66 posts. Made the mail reset test await
  both page reloads and tolerate either tab claiming the shared welcome prompt;
  it still checks that an old draft cannot send after reset.
- Final `npm test -- --workers=4`: **206 passed (1.0m)**, no retries, using the
  normal configuration and ports 14373/14374. Includes production build,
  expanded SIGs, mail, OLT, shared identities, backup/reset and cross-tab checks.
- Separate `npm run build`: passed TypeScript and production bundling; the
  existing WebLLM chunk-size warning remains.
- All 60 local Markdown link targets in the six affected documentation files
  exist. Working-tree and staged whitespace checks passed.

Real-model quality, native-device checks, subjective walkthrough and deployment
remain unperformed. No required post-merge verification applies.

## Issue #57 — MAIN row grouping and display conventions (2026-10-23)

Read the live open Issue and development/review guidance. MAIN now uses the
selected reproduction's consecutive pairs through 21/X, standalone Q, PC-VAN
banner with `(MAIN)`, and full-width selectors/periods. Fixture labels, ASCII
inputs, all destinations, other screens and browser-local safeguards are preserved.
Research and fixture metadata distinguish supported grouping/typography from
reconstructed padding and unresolved historical geometry/date applicability.

- `npm ci` and `npx playwright install chromium`: passed; zero reported dependency
  vulnerabilities. No model weights were downloaded.
- Final `npm test -- --workers=4`: **208 passed (1.0m)**, no retries or skips, using
  the normal configuration and ports. Includes TypeScript checking and the
  production build; the existing optional WebLLM chunk-size advisory remains.
- Explicit assertions cover all eleven row pairs, Q, every fixture label once,
  banner/selector punctuation, display-cell alignment, helpers and final prompt.
  Production journeys verify identical MAIN text on initial entry, HELP/MAIN/BACK,
  return from a service via BACK/MAIN and Q/reconnect at 320px and 1280px, plus
  narrow keyboard horizontal scrolling, literal spacing and usable input.
  Existing mapping, MITI, storage, consent, IME/history, pacing and terminal
  regressions pass unchanged apart from the obsolete bare-heading assertion.
- The initial focused run had 32 passes/two failures in new assertions omitting
  the command echo's leading newline. An intermediate full run had 206 passes/
  two failures because the new reconnect assertions omitted the existing
  connection greeting. Corrected only those expectations; the final full run
  above passed.
- Rechecked the Paradise Army HTML, JIRCAS PDF text and institutional catalog.
  The source links resolve; the catalog required direct HTML retrieval after
  browser fetch failed. Sixteen local Markdown links/anchors in the changed
  research and validation documents pass. Reviewed the final diff and checked
  working-tree and staged whitespace.

Optional automated screenshot comparison, native hardware/IME testing and further
dated capture research were not performed. Exact historical cell offsets, terminal
width and unchanged 1997 availability remain unverified. No push, PR, merge,
external comment or deployment was performed; no post-merge verification is required.

## Staged session entry without credentials (#61)

Validation on 2026-10-23 in the assigned worktree, after reading the live open
Issue and repository development/review guidance:

- Added a reconstructed six-interval entry (400ms each) for initial visits and
  Q/reconnect, with service identification, fixed fictional ID/password output,
  actual UTC session dates, scripted profile decline and original welcome notice.
  The existing MAIN fixture is unchanged. No credentials, authentication,
  profile-editor branches, member records or schema migration were added.
- Completion, timers and commands share the application queue. Timer cancellation
  invalidates queued callbacks; optional first-use registration completes at the
  handoff before another command owns input. Startup supplies actual session
  records before automatic stages begin. Character reveal, IME guards and
  Settings focus continue through the existing terminal implementation.
- `npm ci`: passed, zero reported vulnerabilities. Existing installed Chromium
  was reused; no browser installation, model download or hardware check was needed.
- Initial focused `npx playwright test tests/connection.spec.ts --workers=2`:
  **21 passed (51.0s)**. Added one more delayed-startup natural-entry case before
  the full run; no failing checks or retries were encountered.
- Final documented `npm test`: **232 passed (1.1m)** using the normal production
  and source-module servers, no retries or skips. This includes TypeScript
  checking and the production build. The existing optional WebLLM chunk-size
  advisory and environment color warnings remain non-failing.
- Focused controller and production-browser checks cover natural unskipped entry,
  fresh/returning worlds, no fabricated logout on reload, exact saved dates,
  repeated Q/reconnect and history, completion/command cancellation at every
  stage, intermediate browser skips, repeated Escape, IME and pending input,
  early service commands, pending WRITE registration and composer ownership,
  rapid submissions before RECONNECT executes, Settings focus during entry and
  delayed IndexedDB startup with natural completion or queued skips/commands.
  No later entry text reaches a service or human prompt. Existing terminal,
  composition, mail, OLT, consent, activity, storage and backup suites also pass.
- MAIN browser comparisons at 320px/1280px still require the same complete menu
  after natural reconnect; only the expected preceding presentation changed.
  Existing startup skip helpers were retained, alongside explicit unskipped tests.
- Rechecked the preserved 1995 excerpt, Vector client-author description,
  retrospective's distinct 1992/1996 examples and NORMA PDF text (printed page 12).
  All four external research URLs resolve. README and on-demand About/Details
  disclose source dates/confidence, stage/timing assumptions, actual-date policy
  and NORMA's separate scope. Routine entry contains no source URLs or provenance
  paragraphs. Local Markdown links/anchors, final diff and whitespace were checked.

Optional screenshot capture, physical terminal/native IME testing, historical-user
feedback and further dated root-login research were not performed. Historical
sequence applicability remains reconstructed as documented in the
[entry research](research/pcvan-1996-1997.md#staged-session-entry-issue-61).
No push, PR, merge, external comment or deployment was performed. No post-merge
verification is required.

## Shared late-1996 resident setting (#63)

Validation on 2026-10-23 in the assigned worktree, after reading the live open
Issue and repository development/review guidance:

- `npm ci`: passed, 24 packages audited, zero reported vulnerabilities.
- Focused `npx playwright test tests/ai-generation.spec.ts --workers=2`:
  **5 passed (6.6s)**, including two new cases inspecting all three prompt builders
  with distinct residents and contrasting computer/social board cultures.
- Documented `npm test`: **234 passed (1.1m)**, no retries or skips, using the
  normal production/source-module server configuration and ports. Includes
  TypeScript checking and the production build. Existing optional WebLLM
  chunk-size and environment color advisories remain non-failing.
- Prompt checks cover shared trusted system guidance despite modern references
  and attempted year/role changes in profiles, board names and excerpts; fixed
  identity/output schemas; bounded context; archive and private-context exclusions;
  ordered OLT author/kind/text without absolute timestamps; and unchanged source
  records dated in 2026. Existing consent, scheduling/budgets, cancellation,
  cross-tab arbitration, backup/reset, mail/OLT privacy and terminal/IME tests pass.
- Rechecked the four linked period/community sources. Eighteen local Markdown
  links/anchors in the research and local-AI documents pass. Reviewed the final
  diff; working-tree and staged whitespace checks pass.

No real model weights were downloaded, and optional real-model sampling was not
performed. These checks establish prompt construction and existing lifecycle
behavior, not model obedience or historical authenticity. Stored/displayed dates
and scheduling retain their existing behavior. No push, PR, merge, external
comment or deployment was performed; no post-merge verification is required.

## Stable historical service calendar (#67)

Validation on 2026-10-23 in the assigned worktree, after reading the live open
Issue and repository development/review guidance:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities.
- Calendar-focused `npm test -- tests/calendar.spec.ts --workers=1`:
  **7 passed (32.1s)**, including TypeScript checking and the production build.
- Final `npm test -- --workers=4`: **249 passed (1.8m)**, with no failures,
  retries or skips. This includes TypeScript checking, production assets and the
  repository-module Vite server. All 242 existing checks remain in the suite.
- Development runs caught an unsupported model ID in the new pending-run fixture;
  it now uses a supported ID with a stub result, without loading a model. A live
  source edit also interrupted a Settings journey during an earlier run. The
  focused rerun passed that Settings check, and the final full run passed both.
- Independent literal expectations cover one controlled instant across entry,
  forum, mail lists/details, conference and live/replayed OLT; older catch-up
  event times; JST midnight; month/year rollover; a valid leap-day input;
  historical canonical instants; missing logout; and literal date-like text.
- Production journeys in Asia/Tokyo and America/Los_Angeles at 320px cover forum
  contribution/reading, local mail, conference and OLT, reload without Q,
  backup/restore, and another tab. Existing records retain their displayed dates
  while operational timestamps remain unchanged. Normal reads/session/OLT
  activity may still update their usual state.
- Repository and production import checks cover dated legacy and historical-only
  backups restored under different clocks, operational world provenance reuse,
  deterministic historical-only surrogate anchors, pending runs predating
  initialization, strict metadata validation, immutable mapping, calendar-write
  quota rollback, concurrent initialization and reset with a fresh mapping.
  Existing atomic-import, stale-world, empty-world, consent, scheduling, retention,
  composition/IME, scrolling, progressive output and skip regressions pass.
- Rechecked the preserved 1995 login excerpt and author-preserved course archive,
  including its 1996-08-07 header. Research/About disclose confidence, fictional
  epoch, fixed JST, legacy assumptions and operational/display-time separation.
- Reviewed the complete staged implementation, tests and documentation against
  Issue #67. Local Markdown targets/anchors resolve; `git diff --check` and
  `git diff --cached --check` pass, including new files.

The existing Vite large-chunk and Node color-environment advisories remain
non-failing. No model download, real inference, new framework or hardware check
was used. Optional manual readability review was not performed; narrow-width
journeys are automated. No push, PR, merge, external comment or deployment was
performed. No post-merge verification is required.

## Separate forum identity and pen name (#71)

Validated on 2026-10-23 after reading the live Issue and repository guidance:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities.
- Focused forum/production journey run: **12 passed (18.9s)** before adding the
  final legacy-import check. A development journey initially assumed IMPORT
  returned to MAIN; it now explicitly returns from the preserved forum context.
- Final documented `npm test -- --workers=4`: **257 passed (1.9m)**, with no
  retries or skips, including TypeScript checking and the production build.
  An earlier full run passed 256 checks and exposed one remaining obsolete
  handle-in-parentheses expectation in the cross-SIG journey; that assertion now
  checks the separate title-line pen name and synthetic token.
- Focused assertions cover stable original synthetic labels for humans, seeded
  residents and generated posts, human/resident renames, duplicate handles,
  reversed member order, UUID/DEMO member IDs, missing authors, unusable names,
  known DEMO fixtures, optional fields, exact Japanese whitespace and markup.
- A real IndexedDB legacy import/export/reopen/restore check verifies unchanged
  source records and backups, with no token fields or seeded content added.
  Production READ → HANDLE rename → READ → reload/reordered JSON restore checks
  preserve author IDs, post records, title/body whitespace and read markers.
  The existing profile editor renames a seeded resident without changing its
  token; mocked generated posts share their resident's seeded-post token.
- Existing composition, storage/rollback, consent, scheduling, calendar, mail,
  conference, OLT, IME, progressive output and terminal regressions pass.
- Rechecked both linked historical references. Research and About distinguish
  observed field separation from account interpretation, target-year limits,
  synthetic token assignment, exact spacing and unresolved nickname behavior.
  All **43** local Markdown links/anchors in README and research resolve.
- Reviewed the final implementation, tests and documentation against #71;
  working-tree and staged `git diff --check` checks pass.

Existing Vite chunk-size and Node color-environment advisories remain
non-failing. No model download, real inference or new framework was used.
Optional visual archive comparison was not performed. No push, PR, merge,
external comment or deployment was performed; no post-merge verification is
required.

## Japanese character display weights (#73)

Validated on 2026-10-23 in the assigned worktree after reading the live open
Issue and repository development/review guidance:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities.
- Focused `npm test -- tests/progressive-output.spec.ts --workers=1`:
  **5 passed (6.6s)**, including configured TypeScript checking and production
  build. No failures, retries or skips.
- Final `npm test -- --workers=4`: **259 passed (1.9m)**, with no failures,
  retries or skips, including TypeScript checking, production build and both
  configured production/source-module servers. All 257 existing checks remain.
- Independent literal cost expectations cover empty input, ASCII/LF and its
  upper boundary, both half-width range boundaries and adjacent code points,
  kanji, hiragana, katakana, Japanese punctuation/full-width space, yen,
  overline, supplementary emoji, combining marks and joined emoji.
- Fresh controlled-frame renderers at nominal 300 reveal 30 ASCII, 30 half-width
  kana or 15 repeated Japanese characters after one second. Mixed text waits
  for sufficient Japanese-character credit. Separate combining/emoji checks
  preserve complete graphemes, original logical text and drained announcements.
  Existing per-speed ASCII budgets, asynchronous ordering, batched painting,
  reveal, speed-change flushing and overflow assertions remain intact. A Japanese
  backlog verifies the UTF-16 pending-work bound independently of timing costs.
- A real UTF-8 download through the terminal logical-log accessor and existing
  download helper includes accepted but entirely unpainted Unicode, literal
  markup and whitespace, while excluding the unsent draft. Existing production
  export, preferences, reduced-motion, IME, scrolling, storage, consent, offline,
  reconnect and service journeys pass. OSL preview sizes and forum identity
  hashing retain their original UTF-8 implementations.
- Rechecked the two new research-source links: the 1993 NEC office article's
  extracted PDF text and the WHATWG encoder section. PDF page-image retrieval
  failed; no page-image inspection is claimed. Research records target-year
  continuity confidence, modern fallback and throughput limitations.
- All **60** local Markdown links/anchors across README, terminal-display,
  research and this validation record resolve. Reviewed the final diff against
  #73; working-tree and staged whitespace checks pass.

Existing Vite chunk-size and Node color-environment advisories remain
non-failing. No real inference, model download, encoding dependency or storage
migration was used. Optional subjective pacing, historical hardware and native
IME observation were not performed. No push, PR, merge, external comment or
deployment was performed; no post-merge verification is required.

## Telecon BiZ database retrieval (#75)

Validated on 2026-10-23 in the assigned worktree after reading the live open
Issue and repository development/review guidance:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities. Existing
  Chromium was reused; no browser installation or model download was needed.
- `npm run build`: passed TypeScript checking and production bundling.
- Focused `npx playwright test tests/biz.spec.ts tests/sections.spec.ts tests/navigation.spec.ts --workers=4`:
  **61 passed (25.9s)**, with no failures, retries or skips.
- Documented `npm test`: **266 passed (1.3m)** using the normal eight-worker
  configuration and both configured servers. Includes TypeScript checking and
  the production build. No application checks failed, retried or skipped.
  Existing Vite chunk-size and Node color-environment advisories remain
  non-failing. The obsolete MAIN 4 empty-collection check is replaced by BiZ
  coverage; all other destination and existing regression coverage is retained.
- Controller checks cover zero/single/multiple matches, all four full articles,
  case-insensitive commands and Latin matching with preserved query spelling,
  retained earlier sets, repeated searches, the 20-set limit without eviction,
  zero hits at capacity, malformed syntax and invalid/unsafe/out-of-range
  numbers. Invalid requests and HELP preserve views/results. Direct/index
  entry, every MAIN depth, repeated FIND/SHOW without duplicate parents,
  set-relative article selection/returns, fresh re-entry, independent controller
  state and absent forum/mail/conference/OLT contexts are checked.
- Production journeys with and without a handle run at 320px against built
  assets. They cover direct/index parents, all articles, retained/repeated sets,
  limits, invalid commands, FIND IME confirmation, terminal Settings/About and
  modal Details returns with an unsent Japanese draft, literal article/query
  markup, keyboard horizontal scrolling, usable input and UTF-8 terminal logs.
  Simulated IME events exercise the existing guards; native hardware IME testing
  remains optional and unperformed.
- With automatic activity paused and consent disabled, snapshot and exported
  backup comparisons preserve members, SIGs, forums, posts, mail, read markers
  and every setting, including conference/OLT, consent and historical calendar.
  The anonymous fixture restores an empty world; browsing does not repopulate
  it. Normal session/history updates remain allowed and verified. Articles and
  result sets stay outside storage/backups. Both journeys observed no remote
  requests. Existing storage/import/reset, composition, mail/OLT, consent,
  calendar, IME, terminal pacing/skip and offline regressions pass.
- Rechecked the five historical PDF source URLs and extracted text. The 1995
  report's page-image retries for PDF pages 72 and 75 both returned internal
  errors, so no page-image inspection is claimed. README, research and on-demand
  About distinguish documented earlier semantics from moderate-confidence
  November 1996 continuity and authored matching, layouts, spacing, lifecycle,
  limits and return controls. All four articles are original undated fiction.
- Reviewed the complete implementation, tests and documentation against #75.
  All **58** local Markdown links/anchors across README, research and this
  validation record resolve. Working-tree and staged whitespace checks pass.

No framework, storage migration, real inference, model download, remote service,
credentials or billing was added. Optional RUKIT manual research, historical
session comparison and physical-device validation were not performed. No push,
PR, merge, external comment or deployment was performed; no post-merge
verification is required.
