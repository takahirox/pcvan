# Complete public forum starters (Issue #131)

Validated on 2026-10-25 against the current Issue's new-world/reset-only scope.

- `npm ci`: passed, zero reported vulnerabilities; dependencies unchanged.
- Final `npm test`: **522 passed in 4.1 minutes**, no failures, retries or skips.
  Both configured servers built/served production assets and repository modules.
- Standalone `npm run build`: passed TypeScript checking and Vite production build.
  Existing large-chunk and color-environment warnings remain informational.
- `git diff --check`: passed; local Markdown targets and new linked headings checked.
- The first full run had 521 passes and one failure in the new empty-restore
  browser test: a live clock advanced the scheduler timestamps between snapshots.
  Fixed its clock so the preservation assertion is deterministic.

The explicit 15-route production oracle covers anonymous fresh startup and
confirmed factory reset, every LIST/READ path (including MAIN 16 → 1), exact
per-board/total/thread counts, all 72 established posts plus ten new originals,
stable identities, ordered same-board replies and historical display dates.
It checks for page errors, external requests and unexpected forum controls.
No model setup, WebGPU or human registration is needed to read the content.
The route inventory separates public posting boards from quiet collections,
mailboxes, OLT, search, NetNews and retained conference content.

Repository/browser regressions cover partial older worlds with human/AI posts,
separate human read markers, customized SIGs/empty boards and private settings;
reopening and backup restore preserve their content exactly. Restoring intentionally
empty forums leaves Wakaba empty. The existing reset confirmation retains its
backup/export option and destructive warning. No recovery scanner, migration or
additional population UI is introduced by this feature.

Bootstrap and reset quota failures now occur at the 78th post, within the new
fixture writes, to verify rollback of the complete world. Concurrent bootstrap
connections must produce exactly 82 unique posts. Existing lifecycle, backup,
read-state, consent/scheduler and service regressions remain part of the full suite.

No real model download, hardware inference, optional subjective signoff or
post-deployment check was performed; these are not required for this change.
No post-merge verification is required.

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

## News reading from MAIN 3 (#77)

Validated on 2026-10-24 in the assigned worktree after reading the live open
Issue #77 and repository development/review instructions:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities. Existing
  Chromium was available; no browser installation or model download was needed.
- `npm test -- tests/news.spec.ts tests/navigation.spec.ts tests/sections.spec.ts`:
  **59 passed (58.2s)** using three workers. Both configured servers started;
  TypeScript checking and the production build passed.
- Documented `npm test`: **272 passed (1.4m)** using the normal eight-worker
  configuration and both configured servers, including TypeScript checking and
  production bundling. No failures, retries or skips in either run. Existing
  Vite chunk-size and Node color-environment advisories remain non-failing.
- Controller checks cover all three complete briefs, normalized command case
  and whitespace, malformed/unsafe/out-of-range read numbers, invalid provider
  selectors, contextual service errors and unchanged views after errors/HELP.
  LIST, BACK, direct/index parents, MAIN at each depth, repeated reads/visits,
  independent controllers and transitions from other services are checked.
  Every news view has no forum, mailbox, conference, OLT or content-load context.
- Production browser journeys run at 320px in registered populated, registered
  restored-empty and anonymous restored-empty worlds. They exercise each full
  brief, errors at every news depth, direct/index returns, repeated/replaced
  reads, fresh visits and MAIN at every depth. Terminal Settings/About returns
  to each brief; modal Details preserves an unsent Japanese draft and focus.
  Simulated composition events guard READ submission. Literal `<照会中>` remains
  text, all briefs appear in the downloaded log, input fits the viewport and
  long output remains keyboard-scrollable without widening the document.
- Automatic activity is paused and model consent disabled in each restored
  fixture. Before/after IndexedDB snapshots and exported backups preserve
  members, SIGs, forums, posts, mail, read markers and every setting, including
  conference/OLT, consent, activity scheduling and calendar settings. Empty
  collections remain empty. Brief bodies stay outside backups; ordinary command
  history continues. All three journeys observe zero external requests.
- Existing functional, storage/import/reset, consent, historical-calendar,
  composition/IME, offline, terminal pacing/skip and service regressions pass.
  No real-model execution was needed; existing inference stubs remain in use.
- README, research and on-demand About record the supplied Issue research's
  2026-10-24 inspection date, source URLs, historical scope, confidence and access
  limits. Earlier provider evidence and snippet-only continuity remain separate
  from authored controls, layouts, errors, returns and original undated fiction.
  No new historical source inspection or successful page-image access is claimed.
- Reviewed the complete diff against #77. All **60** local Markdown links and
  heading anchors across README, research and this validation record resolve.
  Working-tree and staged whitespace checks pass.

Optional subjective visual review, authenticated historical-session comparison
and physical/native-IME testing were not performed. No push, PR, merge, comment
or deployment was performed; no post-merge verification is required.

## Separate stable OLT identity and handle (#79)

Validated on 2026-10-24 in the assigned worktree after reading the live open
Issue #79 and repository development/review guidance:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities.
- Focused OLT/forum/calendar development runs preserved the existing regressions.
  New fixtures initially assumed the forum timestamp format, accepted complete
  HTML speech, and no presence writes during HANDLE navigation. Those assertions
  were corrected to preserve the actual OLT timestamp, existing markup validation
  and ordinary leave/rejoin writes. No production validation was weakened.
- Final focused presentation/production journey run:
  `npm test -- tests/olt.spec.ts --grep 'production OLT|presentation reuses' --workers=2`:
  **2 passed (11.0s)**, with no retries or skips.
- Final documented `npm test`: **276 passed (1.7m)** using the normal eight-worker
  configuration and both configured servers. Includes TypeScript checking and
  production bundling; no failures, retries or skips. All 272 existing checks
  remain, with four new checks. Existing Vite chunk-size and Node color-environment
  advisories remain non-failing.
- Presentation fixtures cover human/resident tokens, duplicate and unusable
  handles, both renames, full Unicode/UUID/DEMO member IDs, unresolved members,
  all three line kinds, room/directory attendance and literal markup/key text.
  Record comparisons verify no projection mutations or invented members. A
  source comparison confirms the shared algorithm/name rules match the original
  forum implementation, apart from exports and defensive unknown-member handling.
- Production checks cover mocked resident speech/attendance and a fake-time
  speak → WHO → HANDLE rename → LIST → reload/reordered JSON restore journey at
  320px. Tokens agree with forum READ for human and resident authors. Original
  attribution/text/timestamps survive; old scrollback retains the old handle.
  Literal rendering, UTF-8 log export, keyboard scrolling, input focus/viewport
  bounds, quiet visits and anonymous zero-attendance reading pass. Existing
  strict invalid-reference restore, atomic storage/reset, privacy, consent,
  scheduling, cancellation, cross-tab, calendar, IME and forum regressions pass.
- Rechecked all three linked historical sources. README, research and shared
  terminal/Settings About disclose access date, confidence, original/annex and
  release-date limits, continuity assumptions and reconstructed placement. No
  source explanations enter routine chat. See the
  [OLT identity research](research/pcvan-1996-1997.md#olt-identity-and-handles-issue-79).
- Reviewed the complete diff against #79; local Markdown targets/anchors and
  working-tree/staged whitespace checks pass.

No real inference, model download, storage migration or new tooling was needed.
Optional additional dated-capture comparison, subjective layout review and
physical/native-IME checks were not performed. No push, PR, merge, external
comment or deployment was performed; no post-merge verification is required.

## NetNews reading and header search (#81)

Implemented in the assigned worktree on 2026-10-24 after reading the live open
Issue #81 and repository development/review guidance. The supplied Issue research
is recorded in the [NetNews research section](research/pcvan-1996-1997.md#netnews-reading-and-header-search-issue-81);
no new historical-source or page-image inspection is claimed.

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities.
- Initial focused command:
  `npm test -- tests/netnews.spec.ts tests/sections.spec.ts tests/navigation.spec.ts --workers=2`:
  **57 passed, 1 failed (2.2m)**. All seven new NetNews checks passed. The failure
  was the old MAIN 7 mapping assertion expecting the generic `section` screen;
  it now explicitly checks the Internet directory and NetNews selection. The
  obsolete empty MAIN 7 collection check is replaced by dedicated coverage,
  retaining all other destination checks. The final full suite below includes
  the correction and an added production literal-query check.
- Final documented `npm test`: **282 passed (2.7m)** with eight workers,
  both configured servers, TypeScript checking and production bundling. No
  failures, retries or skips. Existing Vite chunk-size and Node color-environment
  advisories remain non-failing. Existing functional, storage/import/reset,
  consent, calendar, composition/IME and terminal pacing/skip regressions pass.
- Controller coverage reads all six articles, verifies every header and linked
  References, fixed authored November 1996 dates and distinct fictional `.invalid`
  identities. Subject/From searches cover Japanese, Latin case, doubled internal
  whitespace, query-end trimming, zero/one/multiple results, literal regex/Boolean
  text, header-versus-body exclusion, complete-corpus replacement, group isolation,
  stable numbers and active-result-only READ. Missing queries, unknown fields,
  malformed/unsafe/absent numbers and unrelated service commands preserve views.
  Direct/index parents, HELP, LIST, repeated reads/searches, MAIN at every depth,
  fresh visits and isolation from forum/mail/conference/OLT contexts pass.
- Production keyboard journeys cover registered populated, registered restored-empty
  and anonymous restored-empty worlds at 320px. Automatic activity is paused and
  consent disabled before record/backup comparisons. All six articles are read
  through both entry paths; settings shortcuts and the modern About panel preserve
  detail/filter context and unsent input. Simulated composing Enter, literal
  headers/prose/query rendering, UTF-8 LOG export, keyboard horizontal scrolling,
  viewport bounds and input focus are verified. Each journey observes zero
  external requests. Before/after IndexedDB and exported backups preserve members,
  SIGs/forums/posts, mail, read markers and every setting, including conference/OLT,
  consent, scheduling and calendar. Empty collections stay empty; article bodies
  remain outside backups, while ordinary command history continues.
- README, research and Settings/About disclose the source URLs and supplied
  2026-10-24 inspection date, confidence, historical scope and inaccessible-source
  limits. They distinguish 1995 restrictions from the January 1996 reading/posting
  comparison, general fj existence from reconstructed PC-VAN carriage, and original
  fixed-date fiction from historical articles. Selectors, matching, commands,
  errors and returns are explicitly reconstructed; this reading subset does not
  imply that historical 1996 posting was unavailable.
- Reviewed the complete diff against #81 and verified local Markdown targets and
  heading anchors across README, research and this validation record. Working-tree
  and staged whitespace checks pass.

No framework, schema migration, real-model execution or model download was added.
Optional physical/native-IME tests, authenticated historical-session comparison
and subjective screenshot matching were not performed. No push, PR, merge,
external comment or deployment was performed; no post-merge verification is
required.

## Stable mail correspondent identity (#83)

Implemented Issue #83 in the assigned worktree, following the development and
review guidance. The unchanged shared token/name helpers now render INBOX/SENT
correspondents, both READ parties, new/reply draft opening and review, and MEMBERS
alongside each available resident's existing short address. No routing, storage,
identity algorithm, namespace, schema or read lifecycle changed.

Validation performed for this change:

- Added two focused presentation/controller checks for cross-service token
  matching, duplicate handles, safe-name and unresolved-reference fallbacks,
  absence of the forum DEMO exception, literal Japanese/markup/whitespace,
  timestamp preservation, source immutability, member reordering and failed
  import validation. New/reply draft checks rename both parties after resolution,
  edit after a simulated save failure, retry with the same ID/recipient and
  confirm the original recipient label remains visible.
- Added three production keyboard journeys, one each for MAIN `1`, MAIN `X`
  and SIG `MAIL`. Each uses two existing residents with duplicate handles and
  a valid received-letter fixture: MEMBERS → stable-address WRITE → review/EDIT
  → send → SENT/READ, plus received READ → REPLY → recipient review/send.
  They verify ambiguous-handle and display-token address rejection, both header
  parties, ordinary human read marking with no resident-read events, unchanged
  mail records after human/resident renames, entry/return contexts, reload and
  JSON restore with reversed member ordering. No external request is observed;
  no real inference, model download, GPU or remote delivery is used.
- Updated the three obsolete handle-only assertions while retaining existing
  IME, quota rollback/retry, idempotent send, cancellation, offline, import/reset,
  consent, private-context and activity tests.
- `npm ci` succeeded (24 packages audited, no vulnerabilities). Initial targeted
  validation exposed test-only assumptions about IndexedDB key ordering and
  the command controller's Vite browser environment. Corrected both; the targeted
  rerun passed all four affected checks.
- Reopened all four historical source URLs on 2026-10-24. PDF text was readable;
  page-image requests for both PDFs failed. README, mail documentation, research
  and Settings/About distinguish observed ID/name concepts from reconstructed
  token placement, delimiters, short addresses and current-name refresh, and
  acknowledge historical Internet mail separately. See
  [mail identity research](research/pcvan-1996-1997.md#mail-identity-and-handles-issue-83).
- Final documented `npm test`: **287 passed (2.7m)**, with no failed or
  skipped checks. Its Playwright web-server setup completed TypeScript checking
  and production bundling before testing production assets. The existing Vite
  chunk-size advisory and environment color warnings remain non-fatal.
- Reviewed the complete application, test and documentation diff against Issue
  #83. All **74** local Markdown links/anchors across README, mail documentation,
  research and this validation record resolve. `git diff --check` and staged
  `git diff --cached --check` pass, including the new presentation test file.

No post-merge verification is required. Optional dated-transcript, native-IME,
hardware and subjective historical-layout comparison are not completion gates.

## Stable conference author identity (#85)

Implemented in the assigned worktree on 2026-10-24 after reading the live open
Issue and repository development/review guidance. Conference READ now resolves
the existing member once and uses the unchanged shared identity/name helpers
in its existing author line. No token algorithm, namespace, schema, stored
record, list, composition or other service behavior changes.

Validation performed for this change:

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities. Existing
  Chromium was available; no browser installation or model download was needed.
- Initial focused command:
  `npm test -- tests/conference.spec.ts tests/conference-repository.spec.ts --workers=2`:
  **10 passed, 1 failed (26.6s)**. The new production journey incorrectly assumed
  both residents had forum posts on board 1. Corrected that test fixture lookup
  to use each resident's existing board; no application validation was weakened.
- Focused corrected journey:
  `npm test -- tests/conference.spec.ts --grep 'production conference identity' --workers=1`:
  **1 passed (11.8s)**, with no retries or skips.
- Final documented `npm test`: **290 passed (2.8m)** using eight workers and
  both configured servers, including TypeScript checking and production bundling.
  No failures, retries or skips. All 287 existing checks remain, with three new
  checks. Existing functional, storage/import/reset, consent, composition and
  cancellation, failed-save retry, IME, literal rendering, scrolling and terminal
  pacing/skip regressions pass. The existing Vite chunk-size advisory and Node
  color-environment warnings remain non-fatal.
- Two renderer/controller checks cover duplicate human/resident handles,
  cross-service tokens, both renames, reversed members, Unicode/UUID/DEMO IDs,
  safe-name and unresolved-author fallbacks, absence of the forum DEMO exception,
  literal Japanese/markup/whitespace, date/reply output and unchanged input
  records. Missing references are exercised directly at the renderer boundary;
  a valid backup with an author subsequently removed still fails validation.
- The production keyboard journey runs at 320px with fixed time, automatic
  activity paused and consent disabled. A valid deterministic fixture exercises
  conference entry → same-handle resident READ → human WRITE and REPLY → READ →
  human/resident rename → reread → reload → reordered-member JSON restore →
  reread. Tokens match actual forum READ headers. Old scrollback retains the
  original names. Contribution data stays intact, and presentation-only reads
  preserve members, SIGs, forums, posts, mail, read markers and every setting.
  Legitimate sends, renames, forum read markers and normal session/history
  bookkeeping remain allowed. No external request is observed; literal markup
  remains text and the terminal retains keyboard input focus.
- Reopened all four linked historical-source URLs on 2026-10-24. The course
  archive, memorial and client description were readable; the earlier conference
  archive lead still returned HTTP 502. README and shared Settings/About explain
  source dates, confidence and limits, and distinguish the observed ID/name
  concept from reconstructed token generation, author-line placement, delimiters
  and current-name refresh. See the
  [conference identity research](research/pcvan-1996-1997.md#conference-identity-and-handles-issue-85).
- Reviewed the complete application, test and documentation diff against #85.
  All **73** local Markdown links/anchors across README, research and this
  validation record resolve. `git diff --check` and staged
  `git diff --cached --check` pass.

No real inference, model download, storage migration, identity registry or new
framework was needed. No push, PR, merge, external comment or deployment was
performed. No post-merge verification is required; optional dated-transcript,
native-IME, hardware and subjective historical-layout checks were not performed.

## Durable local NetNews participation (#87)

Validated on 2026-10-24 with Node.js 24.12.0 on macOS. Read the live source Issue
and repository development/review guidance. The implementation adds browser-local
human articles and public followups in the two existing example groups, with
validated transactional storage and the shared composer/calendar/identity policies.

- `npm ci`: passed, zero reported vulnerabilities; no lockfile/dependency changes.
  The first standalone build attempt preceded installation and failed because
  `tsc` was unavailable. `npm run build` passed after installation.
- First focused run,
  `npm test -- tests/netnews-repository.spec.ts tests/netnews-posting.spec.ts tests/netnews.spec.ts --workers=2`:
  **6 passed, 6 failed (43.7s)**. Repository/controller checks passed. Test fixes
  accounted for changed malformed-WRITE guidance, a deliberately extra `Y` after
  commit being a recordable command, and a second-connection fixture initially
  opening a different origin's database.
- Second focused run with the same command: **9 passed, 3 failed (2.9m)**.
  Remaining test fixes selected the transcript scroll container rather than its
  text node and opened the Settings maintenance disclosure before its file picker.
  The original three production reading/isolation journeys passed.
- Updated focused run,
  `npm test -- tests/netnews-posting.spec.ts tests/netnews-repository.spec.ts tests/netnews.spec.ts --grep-invert 'production NetNews preserves' --workers=2`:
  **11 passed (25.9s)**, including TypeScript checking and production build.
- Final documented `npm test`: **297 passed (3.6m)** with the default eight
  workers, no failures, retries or skips. Both configured servers ran TypeScript
  checking and the production build. Existing functional, storage/import/reset,
  consent, calendar, composition/IME, terminal pacing/skip, mail/conference/OLT
  and protected-record coverage passed.
- Reviewed the complete implementation/test/documentation diff against Issue #87.
  Local Markdown links, heading anchors and code fences in all four changed
  documentation files pass, as do working-tree and staged `git diff --check`
  (including the two new test files).
- Existing Vite large-chunk and Node `NO_COLOR`/`FORCE_COLOR` warnings remain
  informational. No dependency, lockfile or storage-version change was needed.

Repository checks exercise both groups' initial #4 allocations, concurrent and
idempotent saves, conflicting IDs, distinct Message-IDs, replies to bundled
originals/followups and saved local parents, and a multi-generation References
chain. Invalid authors, text, groups, provenance, counters, timestamps, dangling,
cyclic, future and cross-group parents/chains are rejected on direct writes and
restore. Quota failures preserve state/allocation and permit edited retry;
quota-failed restoration preserves the entire prior world. Member-reference
safeguards, legacy absence, explicitly empty state, reset and stale connections
are covered. A command harness pins author/group/parent through independent
selection changes and consumes committed sends even when refresh/render fails.
Forum prompt output is identical before/after NetNews contributions; review also
confirmed mail/OLT prompt builders select their existing service records only.

Production journeys in both groups exercise anonymous reading/registration
refusal, registration into a pending followup, new articles, review/edit/cancel,
explicit submission, bundled and local multi-generation parents, Subject edits,
active-result restrictions, Subject/From searching, immediate complete-list return,
Settings/About context, literal Japanese/whitespace/blank lines/command-like body,
headers and downloaded logs, IME title/body/review guards, reload and JSON restore.
At 320px the input remains visible and scrollback works. Automatic activity is
paused for protected-world comparisons; successful posting changes only NetNews
state after registration, and cancelled drafts leave records untouched. These
journeys observe no external requests or model loading. An independent repository
connection's committed article becomes readable without a notification/focus
refresh. Settings import/reset discard open drafts and reset retains bundled
examples. Existing six article bodies, identities and authored dates remain
unchanged; shared safe-name/token behavior and durable local Date projection are
checked, including legacy calendar input and preserved historical timestamps.

Historical source limits and category D choices are documented in the
[participation research](research/pcvan-1996-1997.md#netnews-local-participation-issue-87),
README, storage documentation and Settings/About. The RFC, fj appendix and
November 2 glossary were also readable during implementation; direct opening of
the October 22 article again failed, so its snippet-only status remains explicit.
No archival prose/identities, new framework, model download or real inference was
used. No post-merge verification is required.

## Conservative sender-visible mail confirmation (#89)

Validated on 2026-10-24 with Node.js 24.12.0 on macOS using the existing
Playwright Chromium configuration, controlled clocks, real browser IndexedDB
and mocked inference. No dependency, lockfile, database-version or backup-version
change was needed.

- `npm ci`: passed, zero reported vulnerabilities.
- Initial focused repository/presentation run: **7 passed, 17 failed (13.8s)**.
  The new shared test fixture supplied equal batch endpoints, which existing
  schema validation correctly rejected. Corrected the fixture's end time.
- First four-file focused run: **39 passed, 3 failed (55.3s)**. Corrected three
  test expectations/injections: an installed clock advances before being fixed,
  existing pause reconciliation withdraws retained runs, and a quota injection
  must allow the runner to persist its subsequent failed status. No product
  change was needed for these failures.
- Corrected focused run,
  `npm test -- tests/mail-repository.spec.ts tests/mail-presentation.spec.ts tests/mail-autonomy.spec.ts tests/mail.spec.ts --workers=2`:
  **42 passed (51.6s)**, including TypeScript checking and production build.
- Final documented `npm test`: **317 passed (3.5m)** with the default eight
  workers, no failures, retries or skips. The configured servers ran TypeScript
  checking and the production build. This includes the final concise
  `既読確認なし` / `既読確認あり` labels and strengthened protected-record and
  public-work assertions. Existing functional, storage, consent, calendar,
  composition/IME, terminal, mail, conference, OLT and other-service suites pass.
- Reviewed the full implementation/test/documentation diff against Issue #89;
  58 local Markdown links and their heading anchors, fenced blocks across the
  four changed documents, and working/staged `git diff --check` pass.
- Existing Vite large-chunk and Node `NO_COLOR`/`FORCE_COLOR` warnings remain
  informational. No post-merge verification is required.

Repository coverage checks the selected parent against another letter included
in bounded prompt context; exact preservation of literal text, identities,
creation/simulation dates, forums, posts, other settings and all mail apart from
the intended parent metadata/new reply; concurrent/idempotent commitment;
immutable first timestamps; duplicate-parent suppression with and without old
evidence; backwards-clock clamping; strict evidence shape, canonical timestamps,
provenance and same-correspondent reply references; protected deletion;
invalid-import atomicity; old backup compatibility without backfill; and exact
reload/export/restore timestamps. Invalid routing/output, cancelled/failed/pending
runs, withdrawn consent, resident pause, quota failure, pre-abort, abort after
the parent write, and reset/restore stale connections leave no new confirmation.
Rollback also preserves number allocation. Existing tests reset a confirmed world
and retain individual human-recipient read markers and replacement fences.

Production keyboard journeys use all three entry routes: MAIN `1`, MAIN `X` and
SIG `MAIL`. They exercise WRITE/review/send, SENT/READ unconfirmed, scheduled
authorized mocked reply commitment, confirmed SENT/READ with projected time,
human INBOX read marking, reload and JSON backup/restore. Background reply
commitment preserves an active draft, IME composition, terminal input and printed
output. Existing identity/name/return-context, consent and save-budget journeys
remain covered. Planning, prompt construction, public activity and resident
initiation leave unrelated letters unconfirmed.

The [mail contract](mail.md#sender-visible-recipient-confirmation-issue-89),
[schema/storage documentation](local-storage.md#mail-records-and-migration),
[historical research](research/pcvan-1996-1997.md#sender-visible-mail-confirmation-issue-89)
and Settings/About describe the accepted category D event, unknown
reading-without-reply case, source URLs, inspection date, confidence and limits.
All three historical sources were readable in text during implementation;
screenshots of the cited PDF pages failed, and no fresh page-image/layout check
is claimed. Native IME, subjective historical layout, hardware and real-model
checks were not run; these are optional, and no model was downloaded.

## Confirmed browser-local OSL acquisition (#91)

Validated on 2026-10-24 with Node.js 24.12.0 on macOS using the existing
Playwright Chromium configuration. Read the live Issue and repository
contribution/review guidance before implementation. No dependency, lockfile,
storage-schema, backup-version or bundled-content change was needed.

- `npm ci`: passed; 24 packages audited, zero reported vulnerabilities.
- `npm run build`: passed TypeScript checking and production bundling.
- Initial focused run,
  `npm test -- tests/osl-download.spec.ts tests/services.spec.ts --workers=2`:
  **14 passed, 3 failed (4.2m)**. Two new tests dispatched synthetic keydown
  events, which do not trigger the terminal form's native submission; corrected
  them to submit the actual form for the rapid queued-confirmation check. The
  third expected restore status in a dialog that correctly closes on success;
  corrected it to assert closure. No application validation was weakened.
- Corrected focused run with the same command: **17 passed (21.5s)**, with no
  failures, retries or skips, including TypeScript checking and production build.
- Final documented `npm test`: **322 passed (3.7m)** using the default eight
  workers, with no failures, retries or skips. Both configured servers ran;
  TypeScript checking and production bundling passed. All existing functional,
  storage/import/reset, consent, calendar, composition/IME, terminal pacing/skip,
  mail, conference, OLT and other-service regression checks passed.
- Reviewed the complete implementation, test and documentation diff against #91.
  All **83** local Markdown links/heading anchors and fenced blocks across README,
  research and this record pass. Working-tree and staged `git diff --check` pass,
  including the new test file. Existing Vite chunk-size and Node color-environment
  advisories remain non-failing.

New controller coverage checks OSL-only scope, every invalid number class,
malformed/trailing input, empty categories, exact payload selection, pinned file
and navigation parents despite an independent selection change, HELP, cancellation
and MAIN/re-entry. Invalid/empty confirmation cannot enter another command owner.
Approval is consumed before the await and browser action, including concurrent
Y, synchronous browser failure, invalidation and invalidation during the read.
Settings/About retain the request; MAIN from Settings or its handle-registration
excursion cancels it.

Production journeys with and without a handle run at 320px with fixed time,
automatic activity paused and consent disabled. Actual browser download events
supply both suggested filenames and filesystem bytes, independently compared with
the bundled JSON fixtures via Node UTF-8 encoding. NOTEINFO.TXT and HARU96.CSV
match exactly, including final LF and no BOM. Both category and preview returns,
invalid commands, HELP, all cancellation controls, queued repeated confirmation,
IME acquisition/approval guards, modal unsent-input/scrollback preservation,
typed Settings/About, synchronous initiation failure, reload, modal restore and
reset pass. Non-acquisition operations emit no OSL download events, and the
journeys observe no external requests. Literal Japanese terminal output remains
text, and the input stays visible and focused.

IndexedDB snapshots and actual JSON exports preserve members, SIGs, forums,
posts, mail (including real fixture recipient-confirmation evidence and individual
read timestamps), read markers and all settings, including conference, activity,
consent and calendar state. An anonymous restored world stays empty. Catalog
bodies and pending approval remain absent from backups; ordinary command history
may continue. No real inference, model download or new framework was used.

README, shared Settings/About/Details and the
[acquisition research](research/pcvan-1996-1997.md#browser-local-osl-acquisition-issue-91)
distinguish modern DOWNLOAD/Y/browser conventions from historical evidence.
Three linked primary HTML sources were readable again; indexed catalog excerpts
were readable but direct opening failed, and CROCUS remained inaccessible.
Earlier failed research paths and unresolved dates/encoding/protocols/charges
remain explicit. Optional native IME, other browser engines, dated-session and
historical-user observations were not performed. No post-merge verification is
required. No push, PR, merge, external comment or deployment was performed.

## Browser-local outbound Internet mail (#93)

Validated on 2026-10-24 with Node.js 24.12.0 in the assigned implementation
worktree, against the Issue read live from GitHub.

- `npm ci`: passed; zero reported vulnerabilities and no dependency/lockfile changes.
- `npm run build`: passed TypeScript checking and production bundling.
- `npm test -- tests/mail-repository.spec.ts tests/mail-presentation.spec.ts tests/mail.spec.ts --workers=2`:
  **38 passed** in **1.4 minutes**, with no failures, retries or skips.
- Final `npm test`: **331 passed** in **3.7 minutes**, with no failures, retries or
  skips. Both configured servers ran, including TypeScript checking and the
  production build. Existing functional, storage, consent, private-context,
  simulated-IME, terminal, calendar, OSL download and other-service checks passed.
- Reviewed the complete implementation, test and documentation diff against #93;
  local Markdown links/heading anchors, code fences, `git diff --check` and the
  staged whitespace check passed. No new framework, real model, inference API
  or hardware/human gate was used.
- The existing optional WebLLM large-chunk advisory and Node color-environment
  warnings remain informational; no check failed.

New repository/controller cases exercise the same accepted/rejected ASCII address
table through WRITE, COMPOSE, the omitted-address prompt and record validation,
including exact length boundaries, case preservation, malformed/multiple/control/
Unicode/unsupported destinations and an invalid explicit prefix matching a
resident handle. Bare Internet addresses remain meaningfully rejected. Stable
local-address precedence and ambiguous-handle coverage is retained unchanged.
Mixed resident/Internet concurrent allocation, identical concurrent submission,
changed-content/kind/address collisions, quota rollback after record insertion,
delete/restore numbering, strict forged imports, member/provenance checks,
recipient-read rejection and exact JSON/reopen round-trips passed. Failed imports
preserve the complete world; external saves create no member or public record.

Production keyboard journeys cover MAIN `1`, MAIN `X` and SIG `MAIL`, with their
own contextual returns, discoverable fictional example, direct WRITE/COMPOSE or
prompted addressing, literal Japanese multiline/blank/indented text, simulated
IME at title and approval, review/EDIT, explicit local approval, rollback/retry,
SENT/READ local-save status, no reply/read evidence, another human's empty mailbox,
reload and real JSON download/restore. Cancellation at every draft stage and
cross-tab reset/restore invalidate reviewed external drafts. Request observation
found no external requests, model loading, address lookup or mailto handoff.
A controller fixture verifies that a committed save consumes the pinned draft
even when subsequent refresh fails.

Deterministic privacy fixtures show that external letters leave scheduling and
resident correspondence allowances unchanged, establish no acquaintance or mail
target, and contribute no address/subject/body to resident pair memory, mail,
forum or OLT prompts. Explicitly forged external reply targets fail. Existing
resident reply confirmation and human-recipient read semantics remain covered.

README, Settings/About, the [mail contract](mail.md#browser-local-internet-destinations-issue-93),
[storage contract](local-storage.md#mail-records-and-migration) and
[historical research](research/pcvan-1996-1997.md#outbound-internet-mail-issue-93)
distinguish dated `INET#` evidence from reconstructed controls/ASCII limits,
local-save status, fictional examples and unresolved mailbox relationships.
The November 1996 and October 1994 publisher PDF texts were rechecked; the earlier
January 1994 paper's damaged extraction remains contextual only. External letters
and addresses are documented as included in JSON backups and terminal logs.
No post-merge verification is required by #93.

## Browser-local outbound TELNET (#95)

Implemented the Issue's MAIN/index → 7 → 2 → bundled host → automatic fictional
login → remote MAIL → two original Japanese letters → logout and parent returns.
Historical capability, chronology, confidence and category D controls are recorded
in [the TELNET research section](research/pcvan-1996-1997.md#browser-local-outbound-telnet-issue-95)
and existing Settings/About. No storage schema, network transport or model work
was added.

Validation on 2026-10-24 in the assigned worktree after reading live Issue #95:

- `npm ci` and `npx playwright install chromium`: passed.
- `npm run build`: passed TypeScript checking and production build. Vite reported
  the existing large WebLLM chunk warning; no build error.
- Initial focused run,
  `npm test -- tests/telnet.spec.ts tests/netnews.spec.ts --workers=2`:
  **15 passed, 1 failed (3.1m)**. The new controller isolation assertion incorrectly
  expected the Internet directory itself to be a TELNET view during service
  switching. Corrected the test to assert isolation after entering TELNET. All
  three TELNET production journeys and all eight NetNews checks passed that run.
- Final documented `npm test`: **340 passed (3.7m)**, using the unchanged
  Playwright configuration and eight workers. This includes all nine new TELNET
  checks and all 331 existing checks, plus configured TypeScript checking and
  the production build. Functional, storage/import/reset, consent, mail privacy,
  IME and terminal reveal/pacing/skip coverage passed.
- Local Markdown links/heading anchors across README, research and this validation
  record resolve. Working-tree and staged `git diff --check` pass.

The nine TELNET checks cover both actual MAIN/index parents, both full letter
bodies, strict host/number validation, unsupported service/composition/OLT input,
all BACK/MAIN/LOGOUT depths, repeated reads/logout/re-entry and NetNews afterward.
Production keyboard journeys cover anonymous restored-empty, registered empty and
registered populated worlds, Settings/About returns at every TELNET depth,
application log/backup, canceled model preparation/import/reset, confirmed
restore/reset, native restore rollback and successful/cross-tab invalidation,
reload, literal Japanese and angle-bracket text/log export, composing Enter guards,
and keyboard scrolling/input at 320px.

Protected comparisons pause automatic activity and retain members, SIGs, forums,
posts, mail, read states and settings exactly, including empty restored
collections. Session command history, activity bookkeeping and terminal logs may
change; this is not a claim of complete backup equality. Bundled letters never
appear in exported world records, and host/account/mailbox state is not stored as
community content. OPEN commands may appear in ordinary command history and logs.
The production tests observe no external requests, model asset requests, workers,
WebSockets, popups or DNS-prefetch/preconnect links caused by the journey. Static
review confirms that the TELNET module only renders bundled data and dispatches
local commands; it contains no resolver, fetch, transport or external handoff.

Reviewed the complete implementation/test/documentation diff against #95.
No real model, additional browser engine, native IME/hardware check or recovered
outbound historical session comparison was used. Those optional checks are not
completion gates. No required post-merge verification applies. No push, PR,
comment, merge or deployment was performed.

## Issue #97 — opt-in incoming Internet mail and local replies (2026-10-24)

Implemented the [Issue #97 contract](mail.md#opt-in-incoming-internet-sample-and-replies-issue-97)
against the assigned worktree. Modern Settings explicitly adds one fictional
incoming letter per existing selected human. External sender identity and
fictional provenance stay in the existing mail/JSON architecture; replies pin
that address and the earlier incoming parent through the existing literal editor
and explicit browser-local save. The three entry/return contexts are retained.

Validation performed:

- `npm ci`: completed, zero reported vulnerabilities. An initial build before
  installing dependencies could not find `tsc`; installation resolved this.
- `npm run build`: passed configured TypeScript checking and production bundling.
- `npm test -- tests/mail-repository.spec.ts tests/mail.spec.ts tests/mail-presentation.spec.ts`:
  **46 passed (1.8m)**, including all three new production keyboard journeys.
- `npm test -- tests/settings-dialog.spec.ts tests/mail-autonomy.spec.ts tests/mail-repository.spec.ts`:
  **59 passed (1.1m)**, including subsequent collision, Settings and prompt-boundary
  coverage. No test failures occurred in either focused run.
- Initial full `npm test` (default eight workers): **347 passed, 5 failed
  (4.8m)**. Three existing news journeys exceeded their 30-second test timeout;
  the existing MAIN X resident-mail reload check waited five seconds for MAIN
  while the connection stages were still advancing. An existing NetNews
  restored-empty-world comparison found resident member records had returned
  during its long journey. These observations alone do not establish root cause.
  The full suite was rerun with three workers to assess concurrency sensitivity,
  without changing assertions, timeouts, test selection or application behavior.
- Final complete `npm test -- --workers=3`: **352 passed (5.8m)**, including
  configured TypeScript checking/production bundling, all 340 baseline checks and
  all 12 added checks. All five initially failing checks passed in this run.
  Lower concurrency passed the complete unchanged suite; it does not establish
  that the default eight-worker run is reliable in this environment.
- Reviewed the complete implementation/test/documentation diff against #97.
  All **118 local Markdown links/heading anchors** across the five changed
  documents resolve. Working-tree and staged whitespace checks pass.

The new checks cover absent/selected/different humans, opt-in loading and
cancellation, repeated/concurrent insertion and saves, ID collisions, shared
monotonic numbering, quota/abort rollback without partial records or consumed
numbers, strict malformed/forged imports, parent routing, recipient isolation,
read markers, literal Japanese/whitespace/blank lines/command-shaped text,
review/EDIT/cancellation and failure retry, committed-draft consumption,
SENT/READ, reload/JSON round-trip and legacy/pre-mail compatibility. Reset/restore
invalidate pending Settings actions and reviewed replies across tabs, including
replacement with identical JSON at the repository fence. Empty restored mailboxes
stay empty after reload.

With activity paused, the production journeys compare members, SIGs, forums,
posts, public read states and settings while allowing intended mail/read updates
and existing session/activity bookkeeping. No resident simulation or recipient
confirmation is fabricated. Deterministic context checks compare resident
scheduling and mail/forum/OLT prompts with and without both external directions;
external targets are rejected and pair memory stays unchanged. Request observation
finds no external/model/address-lookup/mailto requests caused by the journey.

The build emits the existing large-chunk advisory; Node also reports the existing
NO_COLOR/FORCE_COLOR warning. No real model, additional browser engine,
native-IME/hardware validation or subsequently recovered historical incoming-mail
session comparison was used. Those optional checks are not completion gates.
No required post-merge verification applies. No push, PR, comment, merge or
external deployment was performed.

## Restricted browser-local FTP acquisition (#99)

Implemented in the assigned worktree on 2026-10-24 after reading live Issue #99
and the repository's contribution/review guidance. MAIN/index → 7 → 3 now opens
restricted `info.mac` examples. The two original Macintosh documents share OSL's
pinned payload, explicit confirmation, single-use browser handoff and existing
world-replacement fences. No framework, dependency, storage-schema, backup-version,
transport or real-model work was added.

Validation used Node.js 24.12.0 and the existing Playwright Chromium configuration:

- `npm ci`: passed, 24 packages audited, zero reported vulnerabilities.
- `npm run build`: passed TypeScript checking and production bundling.
- Initial focused command,
  `npm test -- tests/ftp.spec.ts tests/osl-download.spec.ts tests/netnews.spec.ts tests/telnet.spec.ts --workers=3`:
  **28 passed, 2 failed (3.1m)** with three workers. Both failures were in new FTP
  tests: the registered mail fixture lacked canonical millisecond timestamps and
  fictional AI provenance; the same-tab restore assertion expected MAIN instead
  of the existing OSL behavior (retain browsing view, invalidate approval).
  Corrected the fixture and assertion without changing product behavior. All
  existing OSL, NetNews and TELNET checks passed that run.
- Corrected focused command,
  `npm test -- tests/ftp.spec.ts tests/osl-download.spec.ts --workers=3`:
  **13 passed (29.1s)**, no failures, retries or skips. Playwright used two workers
  for these two files under the requested three-worker limit; configured
  TypeScript checking and production build passed.
- Final complete `npm test -- --workers=3`: **360 passed (6.3m)** with three
  workers, no failures, retries or skips, including configured TypeScript checking
  and production bundling. All 352 baseline checks and eight added checks pass.
  Existing functional, storage, consent, composition, NetNews/TELNET, OSL and
  terminal pacing/skip regressions pass. The default eight-worker run was not
  repeated; this success does not resolve the earlier eight-worker reliability
  question recorded under #97/#98.
- Reviewed the complete implementation/test/documentation diff against #99.
  All **102 local Markdown links/heading anchors** and fenced blocks across the
  three changed documents resolve; working-tree and staged `git diff --check`
  pass, including all new files.

Controller cases cover both actual MAIN/index parents, repeated visits, both
files and previews, stable numbers, purposes, fictional authored dates and
independently checked UTF-8 byte counts. Invalid/malformed/unsafe/out-of-range
input preserves the view. A pinned selection survives independent navigation to
another file/service and restores the exact parent path. FTP has no forum, mail,
conference, OLT, TELNET or NetNews composition context. MAIN clears every depth.
Only eligible OSL and FTP views can select downloads.

The shared command-owner test runs for both OSL and FTP: explicit Y only, empty
and unrelated input blocked, pending-history exclusion, HELP, cancellation,
Settings/About returns, concurrent approval consumed before asynchronous work,
synchronous handoff failure, fresh-request requirement, direct invalidation and
invalidation during an awaited read. Production tests cover reload, factory reset,
modern Settings restore of identical JSON and cross-tab replacement of the same
world, with no pending approval reused. Same-tab restore preserves the bundled
browsing view while discarding approval, as for OSL; cross-tab replacement reloads.

Anonymous restored-empty and registered production journeys run at 320px with
automatic activity paused and AI consent disabled. Actual browser downloads match
`MACDOC.TXT` (413 bytes) and `MACCOMM.TXT` (433 bytes), independently compared to
Node UTF-8 encoding of the bundled bodies. One acquisition returns to preview,
one to list. Japanese, indentation, blank lines, literal markup and final LF
remain exact in preview, log export and download. Cancellation, queued triple Y,
typed Settings/About with and without approval, modal unsent-input preservation,
composing-Enter guards at request and approval, keyboard scrolling, visible input
and parent returns pass. Browser status reports initiation, not completed saving.

IndexedDB snapshots and real JSON backups preserve members, SIGs, forums/posts,
mail/read timestamps, read markers and all settings, including calendar, consent,
scheduling, conference and populated retained OLT/NetNews records. Anonymous
restored community collections stay empty. Bundled bodies and pending selection
are absent from backups; ordinary session/history behavior continues. Request and
worker observation finds no external requests, model assets or model workers.

README, Settings/About and the
[FTP research record](research/pcvan-1996-1997.md#restricted-browser-local-ftp-acquisition-issue-99)
distinguish the dated historical restriction, moderate-confidence November
continuity assumption, unknown endpoint mapping and category D controls/examples.
The four historical source assessments are attributed to the Issue investigation
of 2026-10-24. Implementation-time HEAD checks returned HTTP 200 for the three
publisher PDFs; Info-Mac returned HTTP 403, so no new inspection of its content is
claimed. No new page-image or dated-session comparison was obtained.

The existing Vite optional-WebLLM large-chunk advisory and Node color-environment
warnings remain informational. Additional browser engines, native IME, hardware,
real-model and historical-user checks were not run; they are optional. No required
post-merge verification applies. No push, PR, comment, merge or deployment was
performed.

## Browser-local ECOM postal letters (#101)

The #101 implementation was validated locally on 2026-10-24. An initial
`npm run build` before dependency installation reported `tsc: command not found`.
`npm ci` resolved the missing local dependencies using the existing lockfile,
without changing the dependency manifest or lockfile. The first focused invocation
stopped at production-server startup on a TypeScript exhaustiveness error after adding the ECOM screen; the explicit
screen comparison was corrected before browser tests ran. The subsequent
`npm test -- tests/ecom.spec.ts --workers=3` passed all **7 tests** in **39.7s**.
Playwright used one worker for that single test file despite the three-worker cap.

The first full `npm test -- --workers=3` run completed with **365 passed and
2 failed in 7.2m**. Both failures were existing long NetNews empty-world
preservation checks: the minute activity refresh recreated ten missing resident
members after restore. The existing activity initializer added absent members
unconditionally. It now respects imported membership, including absent residents;
bootstrap and explicit resident edits retain their existing paths. ECOM's
production preservation journeys explicitly trigger the same visible-page
activity refresh, and the imported-empty community test checks membership too.
That run had no timeouts; no assertions were removed to mask the failures.

Diff review also corrected empty-letter guidance to suggest continued body input
before entering the editor. The focused follow-up adds assertions for that
message, ECOM history-key isolation and failed JSON import preserving the reviewed
draft and unsent approval text.

The follow-up command
`npm test -- tests/ecom.spec.ts tests/community.spec.ts tests/residents.spec.ts tests/activity.spec.ts tests/mail-autonomy.spec.ts --workers=3`
passed **30 tests in 41.4s**, including all seven ECOM checks and the affected
community/resident/activity/mail-autonomy behavior. The strengthened imported-empty
assertion also checks membership after a second restore/open.

A second full three-worker run completed with **365 passed and 2 failed in
7.0m**. All three long NetNews preservation journeys passed, including registered
and anonymous restored-empty membership. The anonymous news journey instead
exceeded the existing default 30-second whole-test timeout (the other exhaustive
news journeys took roughly 25 seconds), and an OLT reset test raced the expected
page reload while polling for an approval echo in the old transcript. The news
journeys now use the existing NetNews journey's 90-second budget; no response
expectations were relaxed. OLT reset approval is entered directly and the test
waits for the reset notice and checks the resulting records, rather than requiring
an echo that can disappear on reload. These narrow test corrections retain the
behavioral assertions and do not change application behavior.

The final `npm test -- --workers=3` run passed **all 367 tests in 6.6m**,
with **three workers, zero failures, zero retries and zero skipped checks**. The
existing configuration runs TypeScript checking and production bundling before
Chromium tests against production assets; the separate Vite server supports
existing repository/controller tests. No default/eight-worker reliability claim
is made from a three-worker run.

The new controller/service checks cover MAIN/index discovery, unchanged numbered
mappings, actual parent returns, isolated contexts, field bounds and nonblank
validation, exact Japanese/case/spacing/blank lines/full-width/half-width/markup,
.TEXT escapes, review/editing every value, explicit cancellation at every stage,
renewed review after editing, repeated approval, receipt inspection in guidance,
receipt replacement and visit invalidation. Existing MAIN display expectations
include the new discovery line without changing fixture selectors.

Anonymous restored-empty and registered production keyboard journeys use the
existing 320px viewport with automatic activity paused and AI consent disabled.
They verify contextual rejection, field limits, literal review/editing, queued
triple approval with one success, latest-receipt inspection/replacement,
cancellation retaining the earlier receipt, typed Settings/About returns, modern
Settings/About draft and unsent-input preservation, simulated composing-Enter
protection, departure/disconnect/reconnect lifetime and visible terminal input.
A separate production journey covers same-tab identical-JSON restore, cross-tab
replacement, reload, reset and stale queued commands after departure, with both
an existing receipt and an active reviewed draft.

Protected IndexedDB snapshots and actual JSON backups compare members, SIGs,
forums/posts, ordinary mail/read evidence, read markers and all settings,
including calendar, consent, scheduling, conference and populated OLT/NetNews.
Restored empty community collections remain empty. Postal fields and unique body
text are absent from snapshots/backups and durable command history; the actual
exported terminal log retains the exact displayed letter. Requests, workers and
popups are observed with no ECOM external requests, model workers or handoffs.
Normal session/activity bookkeeping continues.

The [focused ECOM guide](ecom.md), README, modern Settings storage description,
keyboard help, About and [historical research record](research/pcvan-1996-1997.md#browser-local-ecom-postal-letters-issue-101)
explain the local simulation, lifetime/privacy boundary, source dates/access and
confidence, fee contradiction, provisional continuity and reconstructed controls.
The historical assessments are attributed to the Issue investigation of
2026-10-24; implementation fetched the source Issue but did not recover or claim
new source access, dated transcripts or page images.

The full staged diff and affected documentation links were reviewed; all eight
ECOM local links/anchors resolve. `git diff --check` and
`git diff --cached --check` pass, including the new files. No new dependency,
backup schema or delivery scheduler was added.

The existing optional-WebLLM large-chunk advisory and Node color-environment
warnings remain informational. Additional browser engines, native IME, real-model,
hardware and historical-user checks were not run; they are optional. No required
post-merge verification applies. No push, PR, comment, merge or deployment was
performed.

## Browser-local Gopher browsing and search (#103)

Implemented against live open [Issue #103](https://github.com/takahirox/pcvan/issues/103)
and evaluation baseline `0da2372dcb7640898f990b8e5d8914203bf301a6`, after reading
repository development/review guidance. Historical scope, confidence, source URLs,
access dates and category D choices are recorded in the
[Gopher research section](research/pcvan-1996-1997.md#browser-local-gopher-browsing-and-search-issue-103),
README and discoverable About. No new dependency, persistence/schema, endpoint,
transport or model work was added.

Validation on 2026-10-24 used Node.js 24.12.0, npm 11.6.2 and the existing Chromium
production Playwright setup:

- `npm ci`: passed, 24 packages audited, zero reported vulnerabilities.
- `npx playwright install chromium`: passed (existing browser available).
- `npm run build`: passed TypeScript checking and production bundling. Existing
  large WebLLM chunk warnings remain; no worker was launched by Gopher browsing.
- First `npm test -- tests/gopher.spec.ts --workers=3`: test collection failed
  because the new test's direct JSON import lacked Node's `type: 'json'` import
  attribute. Corrected the test import. Configured build had passed.
- Second identical focused command: **7 passed, 1 failed (31.8s)**, using one
  worker for this file. Both 320px production worlds and all controller checks
  passed. The lifecycle test tried to cancel an unattended native file picker
  after Chromium had already cancelled it. Corrected the test to use the existing
  import helper to reach replacement confirmation before explicitly cancelling.

- Broader command,
  `npm test -- tests/gopher.spec.ts tests/navigation.spec.ts tests/connection.spec.ts tests/netnews.spec.ts tests/telnet.spec.ts tests/ftp.spec.ts tests/journey.spec.ts tests/storage-controls.spec.ts tests/repository.spec.ts tests/composition.spec.ts tests/terminal.spec.ts tests/progressive-output.spec.ts tests/ai-controls.spec.ts tests/settings-dialog.spec.ts --workers=3`:
  **141 passed, 1 failed (4.2m)**, with three workers. All 134 existing checks
  passed. The one failure was the new lifecycle test using the transcript-slicing
  helper across a reset/reload, which clears the transcript. Corrected the test
  to assert the fresh output directly, following existing reset checks. No product
  behavior or existing behavioral assertion was weakened.

- Corrected `npm test -- tests/gopher.spec.ts --workers=3`: **8 passed (27.5s)**,
  using one worker for this file, with no failures, retries or skips. Configured
  TypeScript checking and production build passed.

- Final complete `npm test -- --workers=3`: **375 passed (6.8m)** with three
  workers, no failures, retries or skips. All 367 existing checks and eight added
  checks pass, including configured TypeScript checking and production build.
  Existing Internet/navigation, functional, storage, consent, composition, IME,
  terminal, offline and mocked model regressions pass. This does not establish
  default/eight-worker reliability.
- Reviewed the complete implementation, corpus, tests and documentation diff
  against #103. Checked all five historical source URLs through read-only opens
  and all **112 local Markdown targets/heading anchors** across README, research
  and this record. Final working-tree and staged `git diff --check` pass.

The eight new checks exercise both actual MAIN/index entry parents, root and
nested directory openings of the same document, both original document bodies,
search from both menu depths, exact result/query/order returns, repeated
selection, replacement queries, zero results, strict selector validation,
malformed/empty queries, case-insensitive title/body matching and preserved
internal double spaces. Regex/Boolean-looking queries are literal, and corpus IDs
and renderer guidance are not searched. All Gopher depths reject unrelated
forum/mail/OLT/conference/TELNET/FTP/BiZ/composition/download commands without
acquiring another context. Connection forwarding and MAIN/re-entry are checked
at every depth; ordinary MAIN → Q → RECONNECT returns cleanly.

Production journeys use a restored-empty anonymous world and a registered world
with protected posts, mail/read markers, conference, OLT and NetNews settings.
Before/after snapshots and downloaded JSON compare members, SIGs, forums, posts,
mail, read states and all settings exactly, allowing ordinary session/history
updates. Missing imported records remain missing. Both worlds exercise 320px
keyboard reading, synthetic composition events (including `isComposing`),
Settings/About returns, unsent input through modern Options, literal Japanese,
indentation/double spaces/blank lines/full-width/half-width/markup, exact document
bodies in exported UTF-8 terminal logs, scrolling and focus. No service command
requests a browser download; only explicitly requested JSON and log exports do.
With AI consent disabled, observers see no external/model requests, workers or
popups. Lifecycle checks retain query after cancelled restore/reset and discard
visits after identical same-tab restore, cross-tab world replacement and reset.

Native Japanese IME, other engines, historical-user feedback and real-model or
hardware validation were not performed; the first three are optional and the
last two are unnecessary for this bundled service. Default/eight-worker
reliability is unresolved and is not inferred from three-worker success. No
post-merge verification is required.

## Browser-local Archie filename and location search (#105)

Coordinator pre-merge evidence for Issue #105, **2026-10-24**. The source Issue
was read through the GitHub connector and matched the supplied snapshot. This
extends #103's deliberately deferred coverage, rather than repairing a proven
regression. The
[research record](research/pcvan-1996-1997.md#browser-local-archie-filename-and-location-search-issue-105),
[README](../README.md) and discoverable About qualify the historical capability,
unknown host/client access, deliberate substring/default-exact distinction and
category D controls. The four index rows are original authored metadata, with
three filenames and two distinct locations for `river-notes.txt`.

Commands and outcomes:

- `npm ci`: passed, 23 packages added, zero audit vulnerabilities.
- `npx playwright install chromium`: passed, existing browser available.
- `npm test -- tests/archie.spec.ts --workers=3`: **8 passed (29.2s)** using one
  worker for this file. Configured TypeScript checking and production build
  passed. No failures, retries, skips or test corrections. Existing WebLLM bundle
  size and NO_COLOR/FORCE_COLOR environment warnings remain.
- Broader command,
  `npm test -- tests/archie.spec.ts tests/gopher.spec.ts tests/navigation.spec.ts tests/connection.spec.ts tests/netnews.spec.ts tests/telnet.spec.ts tests/ftp.spec.ts tests/journey.spec.ts tests/storage-controls.spec.ts tests/repository.spec.ts tests/composition.spec.ts tests/terminal.spec.ts tests/progressive-output.spec.ts tests/ai-controls.spec.ts tests/settings-dialog.spec.ts --workers=3`:
  **150 passed (4.2m)** using three workers, including all 142 existing checks in
  these files. No failures, retries or skips; configured type checking/build
  passed. During review, added Archie-only forwarding of blank lines at the app
  boundary and explicit blank-input guidance/assertions. The final full run below
  validates this additional change. No existing behavioral assertion or selector
  expectation was changed.
- Final complete `npm test -- --workers=3`: **383 passed (7.1m)** using three
  workers, including all 375 existing checks and eight Archie checks. Configured
  TypeScript checking and production build passed. No failures, retries or skips.
  This includes the blank-input refinement and existing Internet/navigation,
  functional, storage, consent, composition, IME, terminal, offline and mocked
  model coverage. It does not establish default/eight-worker reliability.
- Reviewed the final implementation, index, integration, tests and documentation
  diff against #105. All **118 local Markdown targets/heading anchors** across
  README, research and this record passed the read-only link check. Working-tree
  and staged `git diff --check` passed, including newly added files. No mandatory
  check was skipped, and no existing test assertion was weakened.

The eight new controller/production checks cover actual MAIN/index entry parents,
all five Internet selectors remaining visible, duplicate locations and metadata,
mixed-case filename matching, filename-only negative controls (host, directory,
bytes, date and guidance), literal punctuation/Boolean-looking text, internal
double spaces, Japanese/markup rendering, malformed/empty queries and zero
results. Replacement queries do not add return steps. HELP/LIST preserve the view;
BACK restores query → Internet → actual parent. MAIN/re-entry and normal
disconnect/reconnect start cleanly. Both query/results reject unrelated selectors,
forum/mail/OLT/conference/Gopher/TELNET/FTP/BiZ/composition/acquisition commands,
without acquiring another context or download target. Connection forwarding is
explicitly checked.

Production journeys run at 320px with AI consent disabled, in a restored-empty
anonymous world and a registered world containing protected posts, mail, read
states, conference, OLT and NetNews settings. Exact before/after snapshots and
downloaded JSON compare members, SIGs, forums, posts, mail, read states and all
settings, allowing normal session/history updates. Missing imported records stay
missing; metadata is not seeded or exported as index records, and no schema or
backup keys are added. Submitted query text can appear in ordinary input history.
Observers see no external/model requests, workers, popups or unsolicited downloads.
Explicit JSON and UTF-8 terminal-log exports remain available; logs retain result
metadata, query spelling, double spaces and Japanese/markup text literally.

The browser checks cover Settings/About returns, discoverable modern About and
unsent input through Options, synthetic IME events and `isComposing`, terminal
scrolling, keyboard focus and input bounds. Cancelled restore/reset preserves
results; identical same-tab restore, cross-tab restore, same-tab reset and the
other tab's reset notification discard visits through existing safeguards.

All three historical source URLs were opened read-only; relevant extracted
White Paper, Magazine and RFC passages were checked. No usable White Paper page
image comparison was obtained or claimed. Source-Issue research limitations remain
explicit; implementation checks do not authenticate PC-VAN syntax.

Native Japanese IME, additional browser engines and historical-user feedback were
not performed and remain optional. No real-model/hardware validation is needed.
Default/eight-worker reliability remains unresolved; three-worker success does
not resolve it. No post-merge test or deployment verification is required.

# Forum unread listing and next-unread reading (Issue #107)

Validated on 2026-10-24 with Node.js 24.12.0 on macOS.

- `npm ci`: passed, 23 packages added, zero reported vulnerabilities; no
  dependency or lockfile changes.
- `npx playwright install chromium`: passed; existing browser available.
- `npm run build`: passed TypeScript checking and the production build.
- Initial focused run: **35 passed, 6 failed (38.6s)**. New restored fixtures
  violated existing mail provenance/recipient validation, and the anonymous
  fixture removed a reply parent. Corrected the fixtures to use a valid outgoing
  local Internet letter and preserve reply relationships.
- Forum-only rerun with `--workers=3` (one worker for the file): **16 passed,
  2 failed (18.5s)**. Corrected new expectations for HANDLE's existing Settings
  return path and the composer's numbered preview lines.
- Expanded focused rerun: **41 passed, 1 failed (26.9s)**. Corrected the new
  terminal-log expectation to include the echo prefix's space in addition to
  both literal leading command spaces. Existing behavioral assertions were
  not changed or weakened.
- Final focused command,
  `npm test -- tests/forums.spec.ts tests/composition.spec.ts tests/journey.spec.ts tests/repository.spec.ts --workers=3`:
  **42 passed (27.8s)** using three workers, including configured type checking
  and production build. No failures, retries or skips.
- Final complete `npm test -- --workers=3`: **392 passed (7.7m)** using three
  workers, including all 383 existing checks and nine added checks. Configured
  TypeScript checking/build passed, with no failures, retries or skips. Existing
  functional, storage, consent, composition/IME, terminal pacing/skip and offline
  regression coverage passed. Real model inference was not used.
- Reviewed the complete final diff against #107. All **139 local Markdown
  targets/heading anchors** across README, storage, SIG navigation, research and
  this record passed, along with balanced code fences and the Settings research
  anchor. Working-tree and staged whitespace checks passed. No existing test
  expectation was weakened. Existing WebLLM large-bundle and
  NO_COLOR/FORCE_COLOR environment warnings remain informational.

Nine added controller/production checks cover the gapped 1/4/9 fixture with marker
3, ascending unread numbers independent of timestamps/storage order, parent
references outside the unread list, exact current name/date/body rendering,
absent and exhausted markers, full LIST/HELP, malformed/blank commands, every
existing forum route and actual BACK/MAIN parents. The production journey passes
through the connection wrapper; queued NEXT reads 4 then 9 exactly once, and
instrumented read-state writes prove exhaustion, lists/help and invalid commands
write nothing. Protected comparisons include all members, SIGs, forums, posts,
mail and settings; only the expected selected human/forum marker plus normal
session/history bookkeeping changes in these inactive fixtures.

Additional production coverage exercises numbered READ high-water behavior,
human/forum isolation, another tab's content/name/selection/new post/marker
changes without notifications, monotonic older reads, marker quota failure and
retry, refresh failure, reload/downloaded JSON restore, anonymous reading,
restored-empty collections, and unavailable/ambiguous controller mappings.
Disabling BroadcastChannel verifies stale-world generation checks stop queued
NEXT after another tab's replacement. Same-tab restore and reset discard old
markers. Composition owns literal UNREAD/NEXT input; mail, conference and NetNews
reject these forum commands. Simulated IME guards, literal Japanese/markup,
focus, terminal log export and discoverable typed/modern About are checked.
The observed reading journey makes no external requests and needs no model
consent, download or inference.

The client-author page and publisher PDF text were rechecked. ATPMAC/catalog
direct retrieval and publisher page images failed; their access limitations and
Issue-research snippet status remain explicit in the
[research record](research/pcvan-1996-1997.md#forum-unread-reading-issue-107).
No historical PC-VAN unread command sequence is claimed. Native Japanese IME,
additional browser engines and former-user feedback remain optional.
Default/eight-worker reliability remains unresolved; three-worker success does
not resolve it. No post-merge or deployment verification is required.

## Wakaba beginner board (Issue #109)

Validated in the assigned worktree on 2026-10-24 with Node.js 24.12.0 on macOS.
The implementation uses the Issue's research assessment; it does not claim a new
period directory/session recovery or newly successful catalog metadata retrieval.

- `npm ci`: passed, 23 packages added, zero reported vulnerabilities; no dependency
  or lockfile changes.
- `npm run build`: passed TypeScript checking and production build.
- `npx playwright install chromium`: passed with the existing browser available.
- First focused run with `--workers=3`: **102 passed, 5 failed (45.0s)**.
  Corrected existing MAIN 16 and aggregate recovery-count expectations; new tests
  incorrectly compared an entry echo to a returned screen, reused a stale
  connection after restore, and dispatched keydown instead of form submission.
- Second focused run with `--workers=3`: **106 passed, 1 failed (37.4s)**.
  Corrected an overbroad test cleanup edit that referenced the reopened connection
  variable in a different repository test.
- Third focused run with `--workers=3`: **106 passed, 1 failed (42.6s)**.
  Added protected welcome-input coverage expected a prompt after global WRITE's
  existing no-destination guidance; corrected that expectation to the actual
  guidance. No runtime behavior or existing safeguard was weakened for these fixes.

- Fourth focused run,
  `npm test -- tests/wakaba.spec.ts tests/wakaba-repository.spec.ts tests/navigation.spec.ts tests/sections.spec.ts tests/forums.spec.ts tests/composition.spec.ts tests/community.spec.ts tests/expanded-community.spec.ts tests/repository.spec.ts tests/journey.spec.ts --workers=3`:
  **107 passed (39.7s)**, with configured TypeScript checking/production build and
  no failures, retries or skips. Subsequent review strengthened the new protected
  fixtures with saved conference and OLT content; these test-only additions receive
  a separate targeted check after the complete suite. No runtime code changed.

- Complete `npm test -- --workers=3`: **401 passed (7.5m)**, including configured
  TypeScript checking and production build, with no failures, retries or skips.
  The previous 392 checks become 391 applicable checks (MAIN 16 leaves the generic
  empty-article parameterization) plus ten dedicated Wakaba checks. Existing
  functional, storage, consent, IME, terminal pacing/skip and offline coverage pass.

- Final strengthened-fixture check,
  `npm test -- tests/wakaba.spec.ts tests/wakaba-repository.spec.ts --workers=3`:
  **10 passed (16.5s)** with configured TypeScript checking/production build and
  no failures, retries or skips. This explicitly retains saved conference/OLT
  content during browsing, reading and lazy submission, and excludes it from
  beginner prompt data.
- Reviewed the complete diff against #109, including new files, unchanged original
  fixture content, scope and aggregate assertions. All **160 local Markdown
  targets/heading anchors** and **five Settings research anchors** passed; code
  fences are balanced. Working-tree and staged whitespace checks passed. Existing
  Vite large-bundle and NO_COLOR/FORCE_COLOR warnings remain informational.

Ten new controller, production-terminal and IndexedDB checks cover MAIN/index
welcome/return through the connection wrapper, no welcome composition destination,
invalid selectors, pristine original question/reply/greeting, identity/date/parent
rendering, numbered and gapped unread reads, exact queued NEXT candidates,
per-human marker isolation, anonymous HANDLE guidance, current cross-tab
content/name/selection and new posts, failed marker/refresh saves, WRITE/REPLY
review/edit/save/cancel and lazy first submission rollback. They cover concurrent
initialization/allocation, seed-write rollback, absent/empty/ambiguous mappings,
legacy population and eligible old-world expansion, deletion/consent/reopen,
reload/JSON round-trip/restored-empty/reset, Japanese/markup, simulated IME,
composer ownership of NEXT/UNREAD, focus, log export, typed and modern About.
Inactive-fixture comparisons protect members, posts, mail, directories, read
states, unrelated settings (including conference/OLT settings when present),
preferences and consent, with only intended post/counter/missing directory or
read-marker changes and normal session/activity watermark bookkeeping permitted.
Existing fixture preservation assertions remain, including all original thirty
and expansion thirty-six records. Aggregate assertions now include three Wakaba
posts, while legacy opt-in remains at 66. Public beginner prompt culture uses
only the existing board context, without private-mail or OLT context.

The journey requires no real inference, model download or external service.
Native Japanese IME, former-user feedback and dated manual/session comparison
remain optional. Default/eight-worker reliability remains unresolved;
three-worker success does not resolve it. No required post-merge verification.

## Electronic publishing (Issue #111)

Validated in the assigned worktree on 2026-10-24 with Node.js 24.12.0,
Playwright 1.64.1 and Chromium on macOS.

- `npm ci`: passed, 23 packages added, zero reported vulnerabilities; no
  dependency or lockfile changes.
- Initial focused run,
  `npm test -- tests/publications.spec.ts tests/news.spec.ts tests/sections.spec.ts tests/navigation.spec.ts --workers=3`:
  **60 passed, 3 failed (1.4m)**. The three new production tests expected error
  guidance for an empty Enter. The application intentionally echoes blank input
  without navigating. Corrected the tests to preserve that existing behavior;
  missing READ operands still require guidance. No runtime safeguard was changed.
- Final focused run with the same command and three workers: **63 passed (1.4m)**,
  including configured TypeScript checking and production build, with no failures,
  retries or skips. Strengthened populated-fixture checks retain an imported
  private letter and read marker; only the requested terminal log and backup are
  downloaded.
- Complete `npm test -- --workers=3`: **407 passed (8.3m)**, including configured
  TypeScript checking and production build, with no failures, retries or skips.
  The 401 baseline checks become 400 applicable checks (MAIN 10 leaves the generic
  empty-collection parameterization) plus seven dedicated publishing checks.
  Existing functional, storage, consent, calendar, mail, OLT, composition, IME,
  terminal and offline regressions pass. Existing Vite large-chunk and Node
  NO_COLOR/FORCE_COLOR warnings remain informational.
- All **130 local Markdown targets/heading anchors** in the changed documents
  and **six Settings research anchors** resolve; code fences are balanced.
  Working-tree and staged whitespace checks pass, including the new source/test
  files. Reviewed the complete diff against #111: no schema, dependency, model,
  network subsystem or unrelated service behavior changes.

Seven dedicated checks cover MAIN and index entry, both complete original bodies,
stable contents numbers/titles, repeated and different READ selections, HELP,
LIST/BACK/MAIN at every depth, actual callers, invalid/missing/malformed/oversized
selectors, re-entry, separate controllers and previous service contexts. Existing
MAIN mapping and empty-collection tests now distinguish selector 10 from selector
20 and other unaffected destinations.

Three production journeys at 320×640 use restored populated registered,
restored-empty registered and populated anonymous worlds, disabled consent and
a fixed operational clock. They compare all protected members/SIGs/forums/posts,
mail, read markers and settings before/after and against exported backups,
allowing ordinary session/history changes. They verify literal Japanese bodies
and line breaks in rendered output and downloaded logs, including `<連絡待ち>`
as text; simulated IME Enter guards; typed Settings/About/HANDLE/STOP return;
modal Settings return with unfinished Japanese input and focus; narrow-terminal
horizontal scrolling and page/input bounds. Unsupported write/reply, acquisition,
purchase and connection attempts leave reading intact. No external requests or
unintended downloads occur, and neither the publication title nor body text
enters backups. Static review confirms generation prompts use persisted world
records rather than bundled readings; no new storage or inference path exists.

The NEC PDF text, retrospective MAIN reproduction and Vector client description
were re-opened. The white paper timed out again; ASCII retrieval again failed.
The [research record](research/pcvan-1996-1997.md#electronic-publishing-issue-111)
and Settings/About retain source dates, scopes, confidence, access failures,
unknown Journal/earlier-magazine relationship and category D choices. No new
historical session or page-image recovery is claimed. Native Japanese IME,
former-user feedback and a subsequently recovered dated manual/session remain
optional. No model download or real inference was used. Default/eight-worker
reliability is not assessed by three-worker checks. No post-merge verification
is required.

## Wakaba beginner OLT (Issue #113)

Validated in the assigned worktree on 2026-10-24 with Node.js 24.12.0,
Playwright 1.64.1 and Chromium on macOS.

- Initial standalone build could not find `tsc` because dependencies were absent.
  `npm ci` then passed (23 packages, zero reported vulnerabilities), and the
  standalone TypeScript check/production build passed. No dependency or lockfile
  change was needed.
- Initial focused coverage with three workers: **98 passed, 1 failed (58.5s)**.
  An existing inactive Wakaba board fixture still treated welcome `2` as invalid;
  changed that invalid-input case to `3`, preserving its protection assertions.
- Expanding two repository checks across both contexts exposed a test harness
  error: **97 passed, 4 failed (56.6s)**. Browser `page.evaluate` callbacks cannot
  capture the outer room variables. Passing the room ID/index explicitly fixed
  all four ReferenceErrors; no runtime safeguard was relaxed.
- Two subsequent focused runs passed **103 checks** with three workers (57.0s
  and 56.1s), including stronger populated protected-record coverage. Review then
  improved invalid in-room selector guidance to suggest slash commands.
- Final focused run after the slash-guidance correction: **103 passed (57.2s)**
  with three workers, configured TypeScript checking and production build, and no
  failures, retries or skips.
- Complete `npm test -- --workers=3`: **424 passed (8.4m)**, including configured
  TypeScript checking and production build, with no failures, retries or skips.
  The 407 baseline checks plus 17 new/expanded checks pass together. Existing
  functional, storage, consent, IME, terminal, calendar, mail, offline and service
  regressions pass. Existing Vite large-chunk and Node NO_COLOR/FORCE_COLOR
  warnings remain informational.
- Reviewed the complete staged diff against #113: one new context and room,
  bounded version-1 compatibility, shared OLT safeguards and affected tests/docs;
  no database version, dependency, backup format or model subsystem redesign.
- Local Markdown validation: all **168 local links** and **seven Settings
  research anchors** resolve; code fences are balanced. The staged whitespace
  check caught an extra blank line at the new helper file’s end; removed it.
  Working-tree and staged whitespace checks now pass, including all new files.

The focused command includes the two new specs alongside the Issue's requested
controller, OLT, Wakaba and storage checks:

```sh
npm test -- tests/olt.spec.ts tests/olt-repository.spec.ts tests/wakaba.spec.ts tests/wakaba-repository.spec.ts tests/navigation.spec.ts tests/connection.spec.ts tests/storage-controls.spec.ts tests/wakaba-olt.spec.ts tests/wakaba-olt-repository.spec.ts --workers=3
npm test -- --workers=3
```

New checks cover MAIN/index entry and exact parents, the untouched board route,
context-local WHO/JOIN/LIST/HELP and invalid cross-context selectors, anonymous
and registered quiet/speaking visits, literal commands and escaped slashes, IME,
handle rename/Settings transitions, departures, re-entry and JSON readback.
Two tabs share deduplicated human attendance and commit each resident turn once.
Pending mocked workers are cancelled by departure, handle settings and hidden
tabs. Delayed unit-level mock output is fenced both when the navigation context
changes without a new submission and when the same room is revisited. Existing
DAISIZEN terminal identity, bounded replay, input/focus, log and pacing/skip
coverage remains applicable through the shared implementation.

IndexedDB checks cover missing OLT settings, valid legacy version-1 pairs, pure
repeated normalization, concurrent connections, reopen/reload, new-state JSON
round trips, malformed legacy/new imports and write/import quota rollback.
Legacy transcripts, IDs, sequence counters, timestamps, pending reservations and
budget windows/attempts are preserved by normalization. Populated inactive
fixtures compare all protected records before/after compatibility and visits:
Wakaba/SIG posts and counters, private mail/replies/read confirmations, read
markers, conference contributions, NetNews, unrelated settings, resident
preferences and consent. Only the intended OLT setting changes in repository
visits; browser visits also permit ordinary session/history/activity bookkeeping.

Shared-cap coverage sets 23 attempts, arbitrates the last available Wakaba turn
across two connections, then rejects further claims in all three rooms at 24.
Both old-room and Wakaba repository checks reject stale/duplicate commits,
activity-zero output and output following model-consent withdrawal. Prompt/output
checks enforce the current room and present speaker, bounded public memory,
beginner guidance, no private mail or other OLT transcripts, and rejection of
wrong speakers/rooms, invalid text and duplicate utterances. Assertions establish
prompt construction, not real-model cultural quality.

The four historical sources were re-opened: client-author capability description,
participant reference, NEC PDF text (including printed page 232) and the circa-1996
MAIN reproduction. A PDF screenshot attempt returned an internal tool error;
no new page-image confirmation is claimed. Upstream research's inaccessible
package metadata and unsuccessful target-year secondary-menu search remain
qualified in the research record. Native Japanese IME, former-user feedback,
dated manual/session comparison and real generated-language assessment remain
optional. No model download, GPU inference or external inference service was used.
Default/eight-worker reliability remains unresolved; three-worker success does
not resolve it. No required post-merge verification.

## Resident profile lookup (Issue #115)

Validated in the assigned worktree on 2026-10-24 with Node.js 24.12.0,
Playwright 1.64.1 and Chromium on macOS.

- `npm ci`: passed, 23 packages added, zero reported vulnerabilities; no
  dependency or lockfile changes. `npx playwright install chromium` passed with
  the existing browser available.
- `npm run build`: passed TypeScript checking and the production build.
- First new-spec run: **14 passed, 6 failed (42.4s)**. Corrected a nonexistent
  assertion matcher, an overly strict repository-access mock during existing
  Settings navigation, and four new expectations that skipped the mailbox's
  intermediate BACK parent. These were test-harness corrections.
- New-spec rerun: **20 passed (23.6s)**. Then strengthened protected fixtures
  with private mail/read markers and checked literal profile text in log export.
- First expanded focused run: **72 passed, 1 failed (1.9m)**. The new OLT help's
  literal `SYN-` placeholder conflicted with an existing assertion that an empty
  room renders no invented participant identity. Changed that help label to
  “display ID”; the existing regression assertion remains unchanged.
- Second expanded run: **72 passed, 1 failed (1.8m)**. An existing composition
  source-module evaluation lost its browser execution context during navigation.
  No application or test change was made for that failure; the unchanged rerun
  passed the entire focused set.
- Final focused command below: **73 passed (1.9m)** using three workers, including
  configured TypeScript checking/production build, with no failures, retries or
  skips.
- Complete `npm test -- --workers=3`: **444 passed (8.6m)**, including all 424
  existing checks and 20 added checks, configured TypeScript checking and the
  production build. No failures, retries or skips. Existing functional,
  storage/backup, consent, mail-addressing, OLT, composition/IME, terminal
  rendering/logging and offline regressions passed.

```sh
npm test -- tests/resident-profile.spec.ts tests/mail.spec.ts tests/mail-presentation.spec.ts tests/olt.spec.ts tests/wakaba-olt.spec.ts tests/composition.spec.ts --workers=3
npm test -- --workers=3
```

New checks cover current/old MAIN and SIG mail, anonymous and registered reading
without model consent, both OLT directories/rooms, retained mailbox selection
and actual BACK parents, continued quiet reading/speech and composition, plain
and escaped PROFILE speech, and input ownership in recipient entry, registration,
confirmation and the resident editor. They check deterministic key/token/handle
precedence, duplicate safe names independent of member order, human/unsupported/
unknown/external identities, missing operands and restored absences, current
renamed/customized fields, safe-name fallback and unusually long imported
handles. Exact four-field assertions exclude internal instructions and settings;
markup remains literal in terminal text and exported logs.

Paused browser clocks control background timing. Protected-record comparisons
retain every member, SIG, forum, post, private letter, read marker and setting,
including consent, scheduling, conference and OLT state; only ordinary session/
command-history bookkeeping is excluded. Mocked worker load counts stay zero.
Source-module checks reject repository calls during lookup and verify that it
never observes attendance; delayed output is suppressed on reset/restore,
context replacement, re-entry and intervening commands, including invalidation
before the first asynchronous ownership check completes. Background OLT behavior
and its cancellation/allowance coverage remain unchanged.

Reviewed the final diff against #115. All **136 local Markdown links** and
**eight Settings research anchors** resolve; code fences are balanced. Working-
tree and staged whitespace checks pass, including the new source/test files.
No existing test expectation was weakened. No dependency, schema, identity-token,
mail-addressing, model or persistence subsystem changes. Existing Vite large-
chunk and Node NO_COLOR/FORCE_COLOR warnings remain informational.

The client-author capability description and participant archive introduction
were re-opened as text. LOGBOY and catalog retrieval failed again; the
[research record](research/pcvan-1996-1997.md#resident-profile-lookup-issue-115)
and About retain snippet-only status, dating/access limits and category D
qualifications for controls, public-field selection and anonymous access. No
archived identities, profiles or messages were copied. No real model download,
GPU inference or external inference service was used. Native Japanese IME,
additional browser engines, dated-manual comparison and former-user feedback
remain optional and were not performed. Default/eight-worker reliability remains
unresolved; three-worker success does not resolve it. No required post-merge
verification.

## General public bulletin board (Issue #117)

Implemented MAIN/index → 13 → 6 一般掲示板 → 募集とお知らせ through the
existing refreshed forum/composer/repository path. The three original examples
are pristine-only `local-seed:bulletin-v1` records. Starter totals are now 72 posts,
22 threads and 12 boards with the same ten fictional residents; legacy population
remains at most 66. Existing regression assertions changed only for these totals
and the pre-expansion fixture filter; reset copy now states 72. No database, backup or
resident scheduling format changed.

Validation performed in the assigned worktree on 2026-10-24:

- `npm ci`: succeeded, zero reported vulnerabilities.
- `npm run build`: TypeScript and production build passed. Vite emitted the
  existing large-chunk advisory; Node emitted NO_COLOR/FORCE_COLOR warnings during
  Playwright runs.
- Initial focused run: 72 passed, six failed. Four existing composition checks
  needed the new total after one human post (73 instead of 70). The two new-test
  failures came from an unfinished connection wrapper setup and an About check
  run before the new provenance copy existed. Corrected those expectations/setup;
  the next focused run passed all 78 checks.
- Expanded focused command below: **120 passed (58.3s)**. Final review also
  corrected a copied deletion test to target `LOCAL-BULLETIN`, added explicit
  deletion assertions, and strengthened the pristine protected-record comparison;
  these refinements are included in subsequent validation.
- The first full-suite attempt was stopped to fix a final-review freshness gap:
  communication must request content before selector 6 renders its initial list.
  At interruption it reported 117 passed, one failed, three interrupted and 336
  not run. The failure was the existing pre-expansion fixture deleting board
  records while retaining the new bulletin posts. Its seed-removal filter now
  includes the new origin; migration assertions remain intact. A focused regression
  now changes another tab's heading/human before entry and fails the entry refresh
  once, confirming that failure displays neither stale headings nor bodies.

```sh
npm test -- tests/bulletin.spec.ts tests/bulletin-repository.spec.ts tests/navigation.spec.ts tests/connection.spec.ts tests/sections.spec.ts tests/forums.spec.ts tests/wakaba.spec.ts tests/wakaba-repository.spec.ts tests/composition.spec.ts --workers=3
```

Final focused run, adding `tests/expanded-community.spec.ts` to the command
above: **123 passed (57.4s)**, including the entry freshness fix and all review
refinements.

The first completed final-code `npm test -- --workers=3` run reported
**455 passed, two failed (9.6m)**. The existing registered BiZ 320px journey
exceeded its 30-second whole-test timeout. The existing identity journey timed
out after five seconds waiting for MAIN during reload (the transcript was still
advancing through connection stages). Every new-board check passed. Assertions
and timeouts are unchanged; failed-journey rechecks and the final full rerun are
recorded below.

```sh
npm test -- tests/biz.spec.ts tests/journey.spec.ts --grep 'production BiZ journey.*資料検索の人|production READ → HANDLE' --workers=3
```

Both failed journeys passed unchanged: **2 passed (27.2s)**. BiZ took 24.5s;
the identity journey took 6.1s. The earlier interrupted run had also passed the
registered BiZ case in 26.3s. Final unchanged-code rerun of `npm test -- --workers=3`: **457 passed (9.0m)**.
Both previously failing cases passed within the full run (registered BiZ 23.8s,
identity journey 5.7s). No assertions, timeouts or test selection were changed.
The earlier timing failures remain evidence of timing sensitivity even with
three workers; this successful rerun does not establish default-worker reliability.

The twelve focused new-board checks cover actual MAIN/index callers, preserved
selectors 1–5, HELP/BACK/MAIN and re-entry; all examples and their reply link;
current pen names, literal markup, dates, gapped/monotonic unread and exact rapid
NEXT candidates; cross-tab selection/content refresh and fail-closed marker/read
errors; title/body/review/edit/submit/cancel, IME input ownership, new posts and
replies; Settings/About return, log export and JSON/reload; anonymous and empty
restores, registration cancellation, missing-board lazy save/retry/rollback,
concurrent numbering, cross-board reply rejection and duplicate mappings;
pristine seed atomicity/concurrency, existing-world/legacy/expansion exclusion,
reopen/consent/deletion/restore/reset; and a 320px keyboard replacement journey
with stale drafts/queued commands fenced out. Public notice prompt coverage
excludes private mail, conference and OLT content.

With activity controlled, protected-record comparisons allow only the intended
board/post/read-marker changes and ordinary session/activity bookkeeping. They
preserve unrelated SIG/Wakaba posts, mail, conference/OLT state, consent,
residents and budgets. Anonymous and pristine no-consent journeys assert no
external requests; all model-related regression coverage uses existing stubs.
No real model download or inference was performed.

The five evidence URLs were reopened. PDF screenshot requests failed with cache
misses; text and publisher metadata were available. Original screen geometry is
not claimed. All **12 added local Markdown links/anchors** resolve; changed Markdown fences
are balanced. Final working-tree/staged whitespace checks and diff review pass,
including the new fixture, source and test files. See [research scope](research/pcvan-1996-1997.md#general-public-bulletin-board-issue-117).
Default/eight-worker reliability remains unresolved: the required three-worker
run does not establish it. Optional native Japanese IME, other browser engines,
former-user feedback and dated manual/session comparison were not performed.
No required post-merge verification remains.

## Multiple local mail recipients (Issue #119)

Coordinator validation on 2026-10-24 used the assigned worktree and Chromium.
`npm ci` installed the locked dependencies (23 packages, zero audit findings).
The initial build attempt before installation could not find `tsc`; the build
passed after installation. All Playwright commands below requested `--workers=3`.
The configured web servers perform TypeScript checking and production bundling;
the existing optional-runtime large-chunk warning remained.

The first new-case run selected `mail-repository.spec.ts` and `mail.spec.ts` with
`--grep 'multi-mail|WRITE-MULTI'`: **8 passed, 2 failed (51.7s), actual 2 workers**.
Two fixtures violated existing safeguards: deleting a resident still referenced
by public posts, and an AI run ID outside its batch namespace. The eligibility
case now simulates an out-of-band missing roster entry; the mocked run uses its
valid batch-prefixed identity. Product validation was preserved.

```sh
npm test -- tests/mail.spec.ts tests/mail-repository.spec.ts tests/mail-presentation.spec.ts tests/mail-autonomy.spec.ts tests/composition.spec.ts tests/terminal.spec.ts --workers=3
```

An intermediate run had **83 passed, 1 failed (2.8m), actual 3 workers**. The
existing Internet prompt-isolation test lost its browser execution context during
a navigation while source edits were still in progress. After completing the
additional fence/rollback/mock-inference coverage, the unchanged-source rerun
reported **88 passed (2.8m), actual 3 workers**. The navigation's cause was not
established; it was not treated as a passing check.

The first complete `npm test -- --workers=3` run reported **469 passed, 4 failed
(9.7m), actual 3 workers**. MAIN `1` and `X` summary checks correctly rejected
provenance wording in their operational help. The command remains discoverable
there; its reconstruction qualification stays in selection, MEMBERS guidance,
About and documentation. Both existing 320px BiZ journeys also reached their
30-second test limit while polling growing transcripts. The shared command
helper now measures and slices newly added output inside the browser, avoiding
repeated transfer of the entire transcript. It retains the same exact echo and
response assertions, original literal output and existing timeouts.

```sh
npm test -- tests/mail.spec.ts tests/mail-repository.spec.ts tests/mail-presentation.spec.ts tests/mail-autonomy.spec.ts tests/composition.spec.ts tests/terminal.spec.ts tests/sections.spec.ts tests/biz.spec.ts --workers=3
```

This expanded run reported **114 passed, 1 failed (2.9m), actual 3 workers**.
Both BiZ journeys, the mailbox summary checks and every added case passed. The
existing `resident confirmation stays absent after parent` case was interrupted
in its `beforeEach` repository setup by another execution-context-destroyed
navigation. Its unchanged recheck passed:

```sh
npm test -- tests/mail-repository.spec.ts --grep 'resident confirmation stays absent after parent,' --workers=3
```

Result: **1 passed (4.3s), actual 1 worker** because only one case was selected.
The final complete run, with the corrections above and no further runtime/test
edits, passed:

```sh
npm test -- --workers=3
```

**473 passed (7.2m), actual 3 workers**, including TypeScript checking and
production bundling. No automatic retries, increased timeouts or relaxed existing
assertions were used. The earlier failures and navigation interruptions remain
part of this record; this run does not establish default/eight-worker reliability.

The sixteen added checks cover distinct/duplicate aliases, ambiguous and invalid
recipients, registration/cancellation, all three actual callers and returns,
pinned IDs/safe labels through renames/reordering/editing, exact Japanese/blank
lines and literal markup, simulated IME ownership, history exclusion, review and
queued approvals, SENT/READ, reload and JSON restore. Repository cases cover
complete-set concurrent retries/collisions, shared ordinary/Internet/multi-mail
numbering, quota/validation/abort rollback after an earlier copy write, partial
set rejection, legacy/empty imports, eligibility and identical-world epoch fences.
Controller checks cover invalidated pending reads/repository acquisition and
committed drafts consumed despite refresh/output failures. Existing mocked
inference verifies pair-only context and independent explicit-parent confirmation;
no real model was downloaded or run. Protected-record comparisons and existing
regressions cover unrelated forums, read states, conference/OLT, NetNews, resident
settings, consent, scheduling and public-work capacity. Production requests stay
within the local app origin.

The complete diff was reviewed. All six added local Markdown links/anchors and
changed Markdown fences pass; final working-tree/staged whitespace checks pass.
Historical provenance preserves the accepted Issue investigation's 2026-10-24
URLs, confidence and access limitations; no new live historical-source inspection
is claimed here. Optional native IME, other browser engines, hardware testing and
new dated host transcripts were not performed. No required post-merge check remains.

### Issue #119 review fix: keep batch identities out of resident prompts

The review identified that multi-mail copy IDs exposed the shared retry identity
and selection ordinal through both the reply prompt and its output schema.
Reply generation now uses the same fixed `reply-target` reference for ordinary
and multi-recipient letters. The repository still validates its stored target
and uses that target's actual ID for the saved reply and recipient confirmation;
complete-set retry identities and storage formats are unchanged.

The extended pair-isolation regression inspects the full prompt and schema for
both recipients, including the second selected copy, and checks that neither
copy ID, the batch prefix nor the shared retry identity appears. Existing mocked
scheduled inference and repository checks retain independent parent confirmations.
Output validation also rejects a stored parent ID in place of the prompt-local
reference.

Validation in the assigned worktree on 2026-10-24:

- The first test attempt could not find `playwright`; `npm ci` installed the
  locked dependencies (23 packages, zero audit findings).
- Before the source fix, the strengthened pair-isolation regression failed on
  the exposed `local-multi:invitation:0` identity as expected (one selected test,
  one actual worker with `--workers=3`).
- Focused command below: **93 passed (2.7m), actual 3 workers**, including
  configured TypeScript checking and production bundling, without retries or
  skipped tests.

```sh
npm test -- tests/mail.spec.ts tests/mail-repository.spec.ts tests/mail-presentation.spec.ts tests/mail-autonomy.spec.ts tests/composition.spec.ts tests/terminal.spec.ts tests/ai-generation.spec.ts --workers=3
```

The complete `npm test -- --workers=3` run passed **473 tests (7.5m), actual
3 workers**, including TypeScript checking and production bundling, with no
failures, retries or skipped tests. The existing optional-runtime large-chunk
warning remained. No real model download or inference was performed.

Reviewed the complete revision diff. All eight local Markdown links/anchors in
`docs/mail.md` resolve; changed Markdown fences and working-tree/staged whitespace
checks pass. Native IME and other browser engines were not tested in this review
fix; the existing simulated IME and Chromium regressions passed. No required
post-merge verification remains. No push or merge was performed.

### Issue #121: evidence-qualified browser-local OSL text registration

Implemented in the assigned worktree on 2026-10-24. Category 1/2 registration
reuses terminal composition and optional human registration, with filename/title/
purpose/body entry, complete review, editing, cancellation and explicit approval.
Authored files use optional validated `osl-local` state; fixtures remain intact.
Transaction tests cover category-local numbering, concurrent retries/name collisions,
quota rollback, author-reference protection, invalid direct writes/imports,
legacy/empty backups, atomic replacement/reset and stale repository connections.
Controller checks cover scoped selection, safe names, vanished restored entries,
draft ownership, literal Japanese/markup/command text, exact limits, retry and
consumed commits even when refreshing/output fails. Production keyboard tests
cover both categories, Settings/About returns, simulated IME Enter protection,
320px input and transcript scrolling, reload/restore, current cross-tab selection,
world-replacement invalidation and exact download filenames/UTF-8 bytes. Protected
world records and resident prompts are compared before/after OSL writes; no model
or external connection is needed for these journeys.

Dependencies were initially absent (`npm run build` could not find `tsc`).
`npm ci` installed the locked 23 packages with zero audit findings; subsequent
builds passed TypeScript checking and production bundling. During focused
validation, outdated bundled-only `needsContent` assertions, a quota-injection
hook aimed at `put` instead of restore's `add`, the wrong scroll-container selector
and a cross-tab test's assumption that same-tab restore returns to MAIN were
corrected. Those runs reported 18/20, 22/24 and 24/25 passing respectively; their
failures were not waived. Diff review also added a safe vanished-item rendering
fallback and retained draft context for MAIN from Settings subflows.

```sh
npm test -- tests/osl-download.spec.ts tests/osl-registration.spec.ts tests/osl-repository.spec.ts tests/services.spec.ts --workers=3
```

The final focused run passed **25 tests (37.7s), actual 3 workers**, including
configured type checking and production bundling. No retries or skipped tests.
The subsequent complete-suite run includes the final Settings-return helper and
Unicode format-control validation refinements.

The first complete `npm test -- --workers=3` run reported **479 passed, 1 failed
(8.4m), actual 3 workers**. The existing `multi save waiting for a repository
cannot write after controller invalidation` regression caught a newly surfaced
rejection: composer invalidation correctly prevented the stale write, but shared
`done` handling treated that cancellation like an output failure after commit.
The composer now distinguishes invalidation and quietly consumes that pending
rejection, retaining the controller's cancellation notice while preserving
committed-send consumption and output-failure behavior. The failure was fixed,
not skipped or retried automatically.

The affected composer regression run passed **29 tests (39.2s), actual 3
workers**, including configured TypeScript checking/build:

```sh
npm test -- tests/mail-presentation.spec.ts tests/composition.spec.ts tests/osl-registration.spec.ts tests/osl-repository.spec.ts tests/osl-download.spec.ts --workers=3
```

The final complete run passed with the fix and strengthened OSL cancellation
assertion, with no subsequent runtime/test edits:

```sh
npm test -- --workers=3
```

**480 passed (7.5m), actual 3 workers**, including TypeScript checking and
production bundling. No failures, retries or skipped tests. The existing optional
WebLLM large-chunk warning remains; no real model was downloaded or run.

Reviewed the complete diff, including the shared-composer cancellation fix. All
four added local/documentation links and anchors resolve; changed Markdown fences
balance, and final working-tree/staged whitespace checks pass. Historical source
links were checked on 2026-10-24: the CIARI listing, judgment transcription and
DAISIZEN memorial were readable; the paper's extraction remained damaged and
screenshot retrieval failed; CROCUS and the participation guide remained
inaccessible directly. The research/About record preserves the Issue's excerpt-only
evidence and confidence limits without claiming a recovered host workflow.
Optional native IME observation, other browser engines and historical-user feedback
were not performed. No required post-merge verification remains. No push, pull
request, merge or external comment was performed.

# Scheduled local resident delivery (Issue #123)

Validated on 2026-10-24 with Node.js 24.12.0 on macOS. The implementation uses
Issue #123's dated evidence record; historical retrieval was not repeated here.
No real model download or inference, external mail request, push, PR, merge or
external comment was performed.

The first build could not start because dependencies were absent (`tsc: command
not found`). `npm ci` installed the lockfile unchanged, reporting zero
vulnerabilities. Subsequent configured builds/type checking passed. Existing Vite
large-chunk and Node `NO_COLOR`/`FORCE_COLOR` warnings remain.

Validation and corrections during implementation:

- The initial scheduling-only selection requested three workers but used **one**
  (one test file): **5 passed, 7 failed (30.0s)**. Corrected browser-evaluation
  arguments, advancing versus fixed clock assumptions and contextual BACK
  expectations. These failures did not establish product regressions.
- The focused mail/composition/calendar/activity/terminal/progressive-output
  selection used **three workers**: **103 passed, 7 failed (2.9m)**. Six failures
  exposed an overly broad commit-time mail filter affecting legacy immediate
  letters/backwards-clock confirmation. Restricted the new commit filter to
  scheduled availability. The remaining failure used an invalid test AI run ID;
  corrected it to the existing batch prefix contract.
- Expanded scheduling plus existing mail repository selection requested three
  workers and used **two** (two files): **50 passed, 1 failed (36.2s)**. Corrected
  the test's handle registration syntax; a single-test rerun (**one worker**)
  then exposed the test's missing intermediate Settings return. Corrected that
  expectation. The next two-file run passed **51/51 (32.5s), actual two workers**.
- Review found that cancellation could capture its clock before waiting for a
  storage lock. Moved default submission/cancellation/reconciliation clocks inside
  their transactions and added a real IndexedDB lock held across the due boundary.
  Also rejected case-only pending-reference aliases to keep inspection unambiguous.
- Stopped an initial complete three-worker run to include that correction:
  **277 passed, 2 failed, 3 interrupted, 216 not run (3.3m)**. The two failures
  were existing autonomous timer checks (paused-resident and expanded-SIG reply);
  an isolated diagnostic selection passed **2/2 (17.4s), actual one worker**.
  No cause or default-worker reliability conclusion is inferred from that rerun;
  the temporary diagnostic wrapper was removed.
- The updated two-file selection passed **51, failed 1 (34.8s), actual two
  workers**: the new reset test waited for an echo in a document intentionally
  replaced by reload. Changed it to await both page loads and the approval key
  event directly, preserving the stale-approval assertions.

- A second complete three-worker run was stopped for the timing corrections:
  **322 passed, 2 failed, 3 interrupted, 172 not run (5.3m)**. The expanded-SIG
  timer opportunity was again missing; the long anonymous BiZ journey reached
  its 30-second test timeout while still processing commands. The active-minute
  handler now retains a boundary arriving during an earlier asynchronous refresh,
  then checks again after that pass. The two long BiZ production cases receive
  60 seconds each; assertions and worker configuration are unchanged.
- Final scheduling/autonomy/expanded-community selection:
  `npm test -- --workers=3 tests/scheduled-mail.spec.ts tests/autonomy.spec.ts tests/expanded-community.spec.ts`
  passed **34/34 (31.8s), actual three workers**. This includes the storage-lock
  deadline, reset reload synchronization and legacy arbitrary-mail-ID preservation.

- The next complete run used **three workers**: **496 passed, 3 failed (7.8m)**.
  Two mailbox-directory assertions rejected reconstruction commentary in routine
  help; removed that parenthetical while keeping the qualification in the time
  prompt, About and documentation. One Wakaba repository evaluation lost its
  browser context after I edited runtime source during the still-active dev-server
  suite. An overlapping focused launch also failed to start because those servers
  were still running; no checks ran in that launch.
- Review of the retained tick found that awaiting model work could postpone a
  later delivery pass. Each active boundary now queues delivery reconciliation
  independently of the coalesced AI check. Added a production test with inference
  intentionally held indefinitely; delivery still releases at the next boundary.
  Scheduling, affected autonomy, section navigation and Wakaba repository selection
  passed **57/57 (33.8s), actual three workers**, including that new test. Runtime
  and test files are held unchanged for the final complete run.

The scheduling coverage includes all three entry routes in Tokyo, Los Angeles
and Kiritimati timezones; inverse JST dates/ranges and rollover; registration,
literal text/editing/queued input/private recall; pinned recipient renaming;
pending inspection by selected human; confirmed cancellation; exact due boundaries
and lock waits; concurrent retry/release/numbering; quota rollback/recovery;
reload/JSON/empty legacy restore and identical-world stale handles; cross-tab
reset/restore of drafts/cancellation approvals; late focus resume; active IME and
output ownership during successful/failed release; AI-disabled deterministic
delivery; pre-due public/private prompt isolation; mocked catch-up contexts on
both sides of availability; scheduled-parent response-delay commitment checks;
and consumed-save behavior after output failure.

Final complete run, with no subsequent runtime/test edits:

```sh
npm test -- --workers=3
```

**500 passed (8.1m), actual three workers**, including TypeScript checking and
production bundling. No failures, retries or skipped tests. This retains the
existing functional, storage, consent, privacy, IME and terminal regressions.
The new scheduling file contributes twenty checks.

Reviewed the complete diff against Issue #123, including the independent delivery
boundary, legacy IDs, composer consumption, scheduled-parent chronology and test
time allowance. All **182 local documentation links/anchors** in the five affected
Markdown documents resolve; their code fences balance. Final `git diff --check`
and staged whitespace checks pass, including the new test file. The dependency
lockfile is unchanged. Optional native IME observation, other browser engines and
new historical manual recovery were not performed. No required post-merge
verification applies.

## PR #124 review correction: shared-clock OLT arbitration (Issue #123)

Validated on 2026-10-24 with Node.js 24.12.0 on macOS. `npm ci` passed
without lockfile changes or reported vulnerabilities.

The review's two-tab failure reproduced with **19 passed, 1 failed (43.2s)**
over twenty repetitions. A temporary diagnostic run produced **27 passed,
3 failed (57.7s)** over thirty repetitions. These used **three workers**.
Diagnostics showed distinct consecutive turns, with the second prompt containing
the first saved speech: the test compared an older one-line snapshot with a later
two-generation count. Playwright's clock is shared by the browser context;
advancing it from both tabs doubled the elapsed time and allowed another turn.

The test now installs and pauses that clock once, advances it once for both tabs,
and verifies both clocks reached exactly 21 seconds. It requires exactly one
saved speech line, no pending turn, unique line IDs and an equal total inference
count across both tabs, retaining attendance and departure assertions. The paused
prototype initially waited on the second tab's connection presentation timer:
**9 failed, 3 interrupted, 18 not run** before stopping it. Entering through the
existing MAIN command completes that connection explicitly. No runtime arbitration
or scheduling code was changed; the temporary diagnostics were removed.

- `npm test -- tests/olt.spec.ts --grep 'two tabs share' --repeat-each=30 --workers=3`:
  **30 passed (34.4s), actual three workers**.
- First `npm test -- --workers=3`: **499 passed, 1 failed (8.5m)**. The OLT
  check and all twenty scheduling checks passed. The existing factory-reset
  pending-generation test read the old document during reload and reported
  `Execution context was destroyed`; its captured new document showed a completed
  reset. No unrelated test or runtime change was made.
- `npm test -- tests/factory-reset.spec.ts --grep 'reset invalidates pending production generate' --repeat-each=5 --workers=3`:
  **5 passed (5.6s), actual three workers**.
- Final `npm test -- --workers=3`: **500 passed (7.9m), actual three workers**,
  with no failures, retries or skips. Both complete runs included configured
  TypeScript checking and production bundling, with test/runtime files unchanged
  between them. Existing Vite chunk-size and Node color warnings remain.

Reviewed the revision diff and checked whitespace with `git diff --check` and
`git diff --cached --check`. No documentation links were added. No real model
execution, native IME observation, other browser-engine checks, push or merge was
performed. No required post-merge verification applies.

## PR #124 review correction: reload-safe mail reset approval (Issue #123)

The review reported **499 passed, 1 failed (8.2m), actual three workers**.
All twenty scheduling checks passed. The existing multi-mail reset test used
`command(page, 'Y')`, which waited for an approval echo in the document that reset
replaces. The replacement document showed successful reset, but that wait prevented
the test from reaching its stale-approval assertions. Five isolated repetitions
passed during review, demonstrating the intermittent synchronization failure.

Reset approval now fills `Y` and presses Enter directly while awaiting both tabs'
load events, matching the scheduling tests. The subsequent queued-command and
empty-mail assertions remain unchanged. No runtime code was changed.

Validation on 2026-10-24 with Node.js 24.12.0 on macOS:

- The first focused launch could not start because Playwright dependencies were
  absent (`playwright: command not found`); no checks ran. `npm ci` then passed
  with no reported vulnerabilities or lockfile changes.
- `npm test -- tests/mail.spec.ts tests/scheduled-mail.spec.ts --workers=3`:
  **41 passed (2.7m), actual two workers** for the two selected files. Both
  corrected reset cases and all twenty scheduling checks passed.
- `npm test -- --workers=3`: **500 passed (7.9m), actual three workers**,
  with no failures, retries or skips. Both runs included configured TypeScript
  checking and production bundling. Existing Vite chunk-size and Node color
  warnings remain. Test/runtime files were unchanged throughout the full run.

Reviewed the complete revision diff; `git diff --check` and
`git diff --cached --check` passed. No documentation links were added, and Markdown
code fences remain balanced. No real model execution, native IME observation,
other browser-engine checks, push or merge was performed. No required post-merge
verification applies.

## PR #124 review correction: cold startup and reset registration (Issue #123)

The review reported **496 passed, 4 failed (7.9m), actual three workers**:
timestamped Vite module requests bypassed the adapter mock, one startup lost its
registration prompt, and a reset test navigated while welcome registration still
owned input. Warm repetitions did not resolve those findings.

The adapter mock now matches the module pathname regardless of query parameters.
A regression check imports both bare and timestamped URLs and verifies mocked
cache/load/disposal behavior. Reopened mock state and its initial failure mode
are initialized together, removing dependence on two init scripts' execution
order. The reset test completes connection/welcome handling and dismisses any
invitation in both tabs before navigation; its reset and stale-restore assertions
are preserved.

Startup inspection found that welcome persists its invitation flag before
printing the prompt, so a dev-server reload can lose that visit's invitation.
Vite now explicitly optimizes the sole bare runtime dependency with
`noDiscovery: true`. Its installed optimizer implementation completes that work
during initialization and does not perform later discovery-triggered reloads.
A cold four-case diagnostic before the changes passed; the exact cause of the
review's missing prompt was not reproduced. No application startup code changed.

Validation on 2026-10-24 with Node.js 24.12.0 on macOS:

- Before changes, `DEBUG=vite:deps` with the four affected autonomy/Settings/reset
  cases: **4 passed (12.7s), actual three workers**, after `npm ci` using an empty
  temporary npm cache. This diagnostic is not the acceptance result.
- `npm test -- --workers=3 tests/ai-adapter.spec.ts tests/autonomy.spec.ts tests/factory-reset.spec.ts tests/settings-dialog.spec.ts`:
  **41 passed (1.1m), actual three workers**.
- Reinstalled with `npm ci` using a second empty temporary npm cache. Both
  installs reported zero vulnerabilities and left the lockfile unchanged;
  reinstalling also removed Vite's generated dependency cache.
- `DEBUG=vite:deps npm test -- --workers=3`: **501 passed (8.0m), actual three
  workers**, with no failures, retries or skips. The cold-start log shows explicit
  dependency optimization finishing before tests begin, with no discovery reload.
  All twenty scheduling checks and all four previously failing cases passed.
  Test/configuration files remained unchanged throughout this complete run.

Both post-change runs included configured TypeScript checking and production
bundling. Existing Vite chunk-size and Node color warnings remain. Reviewed the
complete revision diff; unstaged and staged whitespace checks pass. No
documentation links were added, and Markdown code fences remain balanced. No
real model execution, native IME observation, other browser-engine checks, push
or merge was performed. No required post-merge verification applies.

# Issue #125: browser-local native file mail

Implementation and validation on 2026-10-24 with Node.js 24.12.0 on macOS.

- `npm ci`: passed, zero reported vulnerabilities; no dependency/lockfile changes.
- `npx playwright install chromium`: completed. No model download or real inference.
- `npm run build`: passed TypeScript checking and production bundling.
- `npm test -- --workers=3 tests/mail-file.spec.ts tests/mail-repository.spec.ts`:
  **50 passed (1.4m), actual two workers** because these are two serial test files.
- Broader focused run over mail/file mail, scheduled mail, OSL downloads,
  storage controls, composition and terminal tests: **118 passed, 1 failed (2.7m),
  actual three workers**. The new controller fixture omitted `openActivity()`,
  so no resident existed and no picker was installed. Corrected initialization.
- Isolated controller rerun: **1 failed, actual one worker**, because its delayed
  read assertion ran before the picker promise callback. Added an explicit
  microtask wait and an explicit repository-entry signal for the save-await fence.
  Corrected rerun: **1 passed (3.0s), actual one worker**. No acceptance criteria
  were removed or relaxed.
- Final `npm test -- --workers=3`: **519 passed (8.4m), actual three workers**,
  with no failures, retries or skips. The configured servers performed TypeScript
  checking and production bundling. Application and test files were unchanged
  throughout this complete run; only documentation was edited while it ran.
- Reviewed the final diff against Issue #125. All seven new local Markdown
  links/heading anchors resolve; changed documentation has balanced code fences.
  Unstaged and staged whitespace checks pass, including all new files.

New coverage compares actual downloaded bytes against synthetic NUL/all-byte-value,
invalid-UTF-8 and mixed-line-ending fixtures, including 0 and 262144 bytes. All
three production keyboard routes exercise explicit picker, optional registration,
review/edit, simulated IME, duplicate approvals, SENT/READ, confirmed acquisition,
reload and JSON restore with contextual returns. Rejected names/oversize/read
failure/empty selection/cancellation and quota rollback preserve empty mail.
Real IndexedDB checks cover canonical encoding, malformed/legacy restore,
unsupported combinations/references, rollback/retry collisions, shared concurrent
text/file/scheduled numbering and prompt/parent isolation. Controller checks cover
uncertain save acknowledgement, pinned renamed resident, changed human, late-read
cancellation, repository/read await invalidation, deleted saved mail and repeated
or failed acquisition. Cross-tab production checks cover reset and identical
restore during picker, read, review and acquisition.

Optional native IME observation and another browser engine were not performed.
Historical sources are the Issue's 2026-10-24 evidence record, not a new manual
recovery or an independent historical re-verification. Existing Vite large-chunk
and Node color warnings remain. No push, PR, merge or comment is performed by this
implementation node, and no required post-merge verification applies.

## Issue #133 community scale

Measured locally on 2026-10-25 in the same macOS/Node 24 worktree and Playwright
Chromium 156 environment. Browser metadata is emulated Desktop Chrome; no real
WebGPU/model download was performed. `community-performance.spec.ts` warms each
operation and reports per-operation means (100 planning / 200 OLT and navigation /
1,000 profile-lookup iterations). The two sizes use identical 82-post content.
IndexedDB hydration measures JSON validation/replacement plus `openActivity`;
this is the supported legacy-ten versus new-hundred comparison, not a claim to
run the old binary's pristine bootstrap. Pristine 100-person bootstrap is measured
separately.

| Operation | 10 profiles | 100 profiles |
| --- | ---: | ---: |
| Profile lookup | <0.001 ms | <0.001 ms |
| 72-hour deterministic planning | 0.137 ms | 0.553 ms |
| Fresh OLT observation (all rooms) | 0.0075 ms | 0.0405 ms |
| Nine-command controller navigation | 0.0185 ms | 0.0165 ms |
| JSON/IndexedDB hydration and open | 11.1 ms | 21.3 ms |
| Serialized UTF-8 roster | 6,673 bytes | 60,363 bytes |
| Serialized UTF-8 backup | 55,067 bytes | 114,683 bytes |

Pristine 100-person bootstrap took 48.9 ms. Chromium reported about 24.5 MB used JS
heap after both workloads, including the harness/module graph; this is a coarse
whole-page observation, not isolated per-roster retained memory. Another warmed
run measured 57.2 ms bootstrap and 19.3 MB heap; GC/timing differences are expected.
The test uses generous regression bounds: planning <100 ms/pass, OLT and controller
navigation <20 ms/operation, hydration/bootstrap <2 seconds. These are local CI
bounds, not low-end hardware or inference latency promises. The optional synthetic
1,000-profile trial was not run; actual authored content remains exactly 100.

Week sampling in `community-scale.spec.ts`: seven days × 24 JST hours × eight
seeds × three rooms = **4,032 room visits**. **3,484 (86.4%)** had residents and
**548** were empty. The minimum hourly aggregate encounter rate was **72.6%**;
maximum simultaneous population across rooms was **17**, and all **100** identities
appeared. Thirteen people appeared overnight without appearing in the sampled
noon group. Weekday totals ranged 1,274–1,311 resident observations across the
seeds, versus 1,123 Saturday / 1,092 Sunday. Same-time observations were identical
and every person appeared in at most one room. Gates are >70% populated overall,
>45% in every hour aggregate, real quiet rooms, >85 identities and >12 night-only
participants; individual rooms/visits can still be empty. Measurements involve
metadata only and never create a model worker.

Focused browser checks use authorized mock inference and controlled time for a
human forum reply at two minutes with an active Japanese IME draft; slower organic
continuation remains eligible after twenty minutes. OLT planning checks 03:00,
08:00, 13:00 and 22:00 JST with an actually present interested resident and a
nine-second opportunity; intervening arrivals do not consume unanswered speech.
Representative repository/browser checks cover persisted independent allowances,
shared leases, atomic commit/retry, strict restore/reset, quiet/absent speakers,
consent, hide/leave cancellation and bounded prompts excluding private mail.
Real-model latency/Japanese quality and lower-end hardware checks remain optional
and were not performed. No post-merge verification is required by this Issue.

Final verification: `npm test -- --workers=8` completed with **533 passed** in
4.9 minutes, with no failures or runtime skips. `npm run build` passed TypeScript
and the Vite production build; Vite retains the existing large-WebLLM-chunk
warning. `git diff --cached --check` passed, and all 153 local file links checked
in the affected README/AI/storage/SIG/E2E/validation documentation resolved.
Earlier development runs exposed outdated count/timing/consent and fixed-seed
fixtures; these were corrected and are included in the passing full run.
