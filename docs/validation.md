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
