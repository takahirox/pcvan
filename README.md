# pcvan

A browser-only Japanese text terminal prototype, built with Vite, TypeScript, and
plain DOM. The welcome text and `help`, `demo`, and `echo` exchanges are synthetic;
they are **not verified historical PC-VAN screens**. The colors, font, and fluid
terminal width are presentation choices, not historical claims.

## Run locally

Use Node.js 20.19+ in the 20.x line, or 22.12+ (Node 24 is supported), and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite (normally `http://127.0.0.1:5173`).
No environment variables, API keys, AI models, WebGPU, database, login service,
or telemetry are needed. There are no runtime dependencies or external font
requests. Session data lives in memory and is lost on reload.

## Use the terminal

- Enter submits the command; Japanese IME composition confirmation is guarded
  against submission. Try `help`, `demo`, or `echo  こんにちは　ｶﾅ`.
- Up/Down recall commands and restore the draft when returning past the newest.
- PageUp/PageDown scroll the transcript while the command input keeps focus.
- Shift+Tab from the input focuses the output. Use the browser's scroll keys
  (including Left/Right for long lines), then Tab to return to the input.
- Output preserves spaces and newlines. Long output scrolls horizontally;
  the single-line input scrolls to its caret. Text is selectable and copied as
  plain text, without interpreting HTML or escape sequences.

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
- `src/session.ts`, `src/history.ts`: in-memory transcript and command recall,
  independent of the DOM. `session.append(...text)` records additional output;
  pass its return value to `terminal.append(...)` to display it.
- `src/controller.ts`: the small `TerminalController` interface (`welcome` and
  `submit(line)`) and the replaceable synthetic command controller. Swap the
  controller in `main.ts` to change command behavior.
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
See [the implementation validation record](docs/validation.md) for commands
actually run and browser checks not performed.

## Contributing

- [Development flow and English collaboration convention](docs/development-flow.md)
- [Review and merge guidelines](docs/review-guidelines.md)
- [Issue template](.github/ISSUE_TEMPLATE/issue.md)
- [Pull request template](.github/pull_request_template.md)

AI agents should start with [AGENTS.md](AGENTS.md).
