# pcvan

A browser-only Japanese text terminal prototype, built with Vite, TypeScript, and
plain DOM. MAIN uses the provenance-tagged circa-1996 retrospective transcription
in `data/pcvan/main-1996.json`, including its original Japanese labels. It is
provisional and **not confirmed for all of 1997**. The two-column layout, colors,
font, and fluid terminal width are reconstructed presentation choices. See the
[historical evidence and limitations](docs/research/pcvan-1996-1997.md).

## Run locally

Use Node.js 20.19+ in the 20.x line, or 22.12+ (Node 24 is supported), and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite (normally `http://127.0.0.1:5173`).
No environment variables, API keys, AI models, WebGPU, hosted database, login service,
or telemetry are needed. There are no runtime dependencies or external font
requests. Local content, settings, session timestamps, and command history use
IndexedDB in this browser profile. The transcript and input draft remain in memory.

## Use the terminal

- Enter submits the command; Japanese IME composition confirmation is guarded
  against submission. MAIN accepts `1`–`21`, `X`, `Q`, and `J MITI`.
- MAIN `13` opens a visibly reconstructed Communication bridge: its convenience
  selector `1` leads to MITI, but is not a historical submenu number. Other MAIN
  entries except `Q` remain safe, unimplemented selections that report their
  fixture labels without changing screens.
- From MAIN, `J MITI` → `3` → `9` follows the documented 1996 route to 未知の世界,
  フォーラム, and 資料室. Only these route steps are verified; the displayed
  screens/prompts are reconstructed placeholders, not complete SIG menus.
  Numbers apply only to the current screen. Unknown commands preserve state.
- `HELP` redisplays the active screen; `MAIN` returns from the bridge/MITI
  screens. These helpers, case-insensitive input, and whitespace tolerance are
  explicitly reconstructed conveniences. No ECOM or generic BBS shortcuts are
  assigned global meanings.
- `Q` ends the simulated connection only at MAIN. `RECONNECT` starts again at
  MAIN after disconnecting; it is a reconstructed convenience. Commands never
  navigate the browser or connect to an external service.
- Up/Down recall commands and restore the draft when returning past the newest.
- PageUp/PageDown scroll the transcript while the command input keeps focus.
- Shift+Tab from the input focuses the output. Use the browser's scroll keys
  (including Left/Right for long lines), then Tab to return to the input.
- Output preserves spaces and newlines. Long output scrolls horizontally;
  the single-line input scrolls to its caret. Text is selectable and copied as
  plain text, without interpreting HTML or escape sequences.

## Local data and backups

Use **JSON バックアップを保存** below the terminal to download all local data.
Select a JSON file with **復元ファイル**, then **全データを置き換えて復元** to
validate it and confirm replacement of the entire local world. Restore does not
merge data; export the old world first if you want to keep it. Invalid files or
failed writes leave existing data intact. Storage errors appear below the controls.

A clean profile starts with empty content; only session metadata is created on
opening. Data persists across reloads but browser retention is not guaranteed.
Changing the origin/profile, clearing site data, private browsing, or browser
eviction may make data unavailable. Keep downloaded backups outside the browser.
See [the local repository API and versioned backup format](docs/local-storage.md)
for the storage contract used by future SIG/forum controllers.

## Build static assets

```sh
npm run build
npm run preview
```

`build` type-checks the application and writes `dist/index.html` plus bundled
CSS/JavaScript in `dist/assets/`. Deploy the contents of `dist/` to any static
HTTP/HTTPS host, including a subdirectory; asset URLs are relative. The preview
command serves the built files locally for checking. Production requires only
static file hosting, with no server-side application process.

## Structure

- `index.html`, `src/main.ts`: page entry point and application wiring.
- `src/terminal.ts`, `src/style.css`: DOM rendering, keyboard interaction, and
  presentation. `mountTerminal` accepts submit/history callbacks and returns
  `append(...text)`, which appends literal text without replacing or focusing the
  input. It follows new output only if the transcript was already at the bottom.
- `src/session.ts`, `src/history.ts`: transcript and command recall, independent
  of the DOM. `main.ts` restores/persists recalled commands through the repository.
  `session.append(...text)` records additional output;
  pass its return value to `terminal.append(...)` to display it.
- `src/controller.ts`: the small `TerminalController` interface (`welcome` and
  `submit(line)`) and the original synthetic controller retained for isolated
  shell tests.
- `src/navigation.ts`: `PcvanController`, with per-session screen state and
  screen-scoped commands. MAIN labels and MITI route steps come directly from
  the JSON fixtures, without combining historical menu variants. `screen` is a
  read-only state identifier; `main.ts` wires a fresh controller to the terminal.
- `src/storage/`: typed IndexedDB repository, backup validation, and download/restore
  controls. Content creation currently uses the repository API while later Issues
  add SIG/forum interactions.
- `tests/`: controller/session checks and browser interaction checks.

## Validation

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` builds the application, starts a local preview, and runs Playwright
against the production assets. Tests cover exact Japanese output and whitespace,
literal HTML, submission/focus, history/drafts, simulated IME events, keyboard
scrolling, a 320px viewport, offline interaction, and controller replacement.
Storage tests use real IndexedDB for CRUD, two-tab post numbering, reload
persistence, JSON round-trip, validation and rollback; UI checks cover download,
confirmation/cancellation, restored history, and storage-error reporting. Source
module tests also start a Vite server on port 14374; both test ports must be free.
Navigation checks cover every MAIN mapping, the two-column fixture rendering,
MITI steps, reconstructed Communication bridge, screen-scoped numbers, invalid
commands/jumps, disconnect/reconnect, and absence of browser navigation.
See [the implementation validation record](docs/validation.md) for commands
actually run and browser checks not performed.

## Contributing

- [Development flow and English collaboration convention](docs/development-flow.md)
- [Review and merge guidelines](docs/review-guidelines.md)
- [Issue template](.github/ISSUE_TEMPLATE/issue.md)
- [Pull request template](.github/pull_request_template.md)

AI agents should start with [AGENTS.md](AGENTS.md).
