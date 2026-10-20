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
