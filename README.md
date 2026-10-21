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
or telemetry are needed for ordinary use. Optional local AI uses a lazily loaded
WebLLM runtime; model downloads start only after an explicit user action. There
are no external font requests. Local content, settings, session timestamps, and
command history use IndexedDB in this browser profile. The transcript and input
draft remain in memory.

On the first visit, a new local world already has 30 original Japanese posts by
ten fictional regulars: eight conversations in MITI 資料室 and DAISIZEN
自然の森／ＦＲＥＥ. Read them immediately, before creating a human member or
allowing a model download. They are bundled fiction, never historical archives
or claims of live network activity.

## Use the terminal

- Opening the app or using `RECONNECT` shows a reconstructed connection greeting
  for 1.2 seconds, then returns to MAIN. **接続演出をスキップ** or submitting a
  command ends the wait immediately; that command is processed normally. Input
  echo and history remain immediate. This uses no modem, device, or network API, and
  does not claim to reproduce the unknown 1996 login greeting.
- Enter submits the command; Japanese IME composition confirmation is guarded
  against submission. MAIN accepts `1`–`21`, `X`, `Q`, and `J MITI`.
- MAIN `13` opens a Communication bridge: its convenience
  selectors `1` and `2` lead to MITI and DAISIZEN; neither is a historical submenu
  number. Every other numbered selection and `X` opens the corresponding
  collection or index described in the menu map below.
- From MAIN, `J MITI` → `3` → `9` follows the documented 1996 route to 未知の世界,
  フォーラム, and 資料室. Only these route steps are verified; the displayed
  screens/prompts are reconstructed, not complete SIG menus. 資料室 lists posts.
  Numbers apply only to the current screen. Unknown commands preserve state.
- Reach DAISIZEN with `13` → `2` → `FORUMS`, then select `1`–`7`.
  Its archived section names and seven numbered boards retain provisional
  evidence metadata in Settings and fixtures: their applicability to 1996–1997 is unresolved. The bridge,
  `FORUMS`, number selection behavior, and prompts are reconstructed. The archive
  guide names the jump code DAISIZEN but does not show the exact `J DAISIZEN`
  input/context; that command remains unsupported.
- At the DAISIZEN directory, `MAIL`, `LIBRARY`, `OLT`, `OSL`, and `CONFERENCE`
  open a mailbox directory, file lists, or empty rooms (see the map below).
  These helpers and screens are reconstructed conveniences (D); the historical
  names remain provisional (B). No reliable historical service command sequence
  was found, so these views do not claim to reproduce one. `BACK` returns to the
  SIG, `MAIN` returns to MAIN, and `HELP` repeats the current view. Unsupported
  input preserves the screen and local content. See the
  [service evidence and decision](docs/research/pcvan-1996-1997.md#olt-mail-library-and-related-services-issue-13).
- Within a forum, `LIST` shows posts in ascending post-number order and
  `READ number` shows a header and the exact stored local Japanese title/body.
  `BACK` returns to the forum directory. These reading/back commands are original
  demo controls, not verified PC-VAN commands. Missing numbers leave the screen
  unchanged. Headers use UTC dates; secondary display numbers have no assigned
  meaning, and the uncertain historical line-count field is omitted.
- Create a local human with **新しいハンドル** → **人間の利用者を作成**, or select
  an existing human under **ローカル利用者**, inside **利用者設定・新規登録**.
  In a forum, `WRITE` opens a title and multiline body editor; `REPLY number` prefills `RE#number` and retains the
  referenced post ID. **内容を確認** reviews the exact text; **編集に戻る** edits it,
  **この内容で投稿する** sends it, and **投稿をキャンセル** or Escape discards it.
  Enter in the title or Japanese IME confirmation never sends a post. Blank
  titles/bodies are rejected. Failed sends keep the draft for an explicit retry.
  The About section documents compose/confirmation/reply controls as
  reconstructions: the 1996–97 interactions remain unverified.
- Confirmed first send creates the local SIG/board if needed, with no demo-copy
  step. Local post numbers are allocated transactionally per forum. Demo posts
  cannot receive replies. Replies show `RE#number`; when reading a reply, the
  **返信先 RE#number を読む** link reads the referenced local post.
- Local lists show **未読** / **既読** for the selected human. Reading advances
  that member/forum's saved highest read number; lower-numbered posts are then
  considered read, including when reading out of order. Reading an older post
  never moves the marker backwards. Selection and markers survive reload and
  JSON backup/restore. Demo reading does not create read markers.
- `HELP` redisplays the active screen; `BACK` returns to the previous menu,
  including the index when entered through it; `MAIN` returns from all connected
  submenus and forums. These helpers, case-insensitive input, and whitespace
  tolerance are explicitly reconstructed conveniences. No ECOM or generic BBS shortcuts are
  assigned global meanings.
- `Q` ends the simulated connection only at MAIN. `RECONNECT` starts again at
  MAIN after disconnecting; it is a reconstructed convenience. Commands never
  navigate the browser or connect to an external service.
- The latest login and explicit `Q` logout times appear in
  **設定 / Options → 表示・速度** in UTC
  and persist locally. Opening/reloading and `RECONNECT` update login time;
  closing a tab is not recorded as a reliable logout.
- Up/Down recall the newest 100 nonblank commands, restored after reload, and
  restore the draft when returning past the newest. Edits to recalled commands
  survive moving away and back within that browsing pass; only submitted text
  is added to saved history.
- PageUp/PageDown scroll the transcript while the command input keeps focus.
- Shift+Tab from the input focuses the output. Use the browser's scroll keys
  (including Left/Right for long lines), then Tab to return to the input.
- Output preserves spaces and newlines. Long output scrolls horizontally;
  the single-line input scrolls to its caret. Text is selectable and copied as
  plain text, without interpreting HTML or escape sequences.
- **端末ログを保存 (.txt)** downloads the entire current transcript (including
  scrollback, reconnects and queued text awaiting display) as UTF-8 plain text
  with exact line breaks. The unsubmitted input draft is excluded. Download before reloading to keep the log;
  JSON backups contain local data/history but do not contain the transcript.

## Menu destinations and empty collections

| MAIN selector | Destination | Initial view |
| --- | --- | --- |
| `1` | 電子メール | Mailbox directory: inbox and sent, each 0 messages |
| `2` | 索引 | Working links to every other MAIN section and `J MITI` |
| `3` | ニュース | Article list, 0 articles |
| `4` | データベース | Database list, 0 entries |
| `5` | 公共情報と政治 | Article list, 0 articles |
| `6` | ビジネス | Article list, 0 articles |
| `7` | インターネット | Information article list, 0 articles |
| `8` | コンピュータ | Article list, 0 articles |
| `9` | ショッピングモール | Product catalog, 0 products |
| `10` | 電子出版 | Publication list, 0 publications |
| `11` | 趣味 | Article list, 0 articles |
| `12` | 生活 | Article list, 0 articles |
| `13` | コミュニケーション | Existing MITI / DAISIZEN bridge |
| `14` | ＰＣ－ＶＡＮ利用情報（無料） | Article list, 0 articles |
| `15` | ☆★☆ おすすめ ☆★☆ | Article list, 0 articles |
| `16` | ☆★☆ わかばマーク ☆★☆ | Article list, 0 articles |
| `17` | ＢＩＧＬＯＢＥガイド | Article list, 0 articles |
| `18` | インターサイト | Information article list, 0 articles |
| `19` | ＢＩＧＬＯＢＥイベント（無料） | Article list, 0 articles |
| `20` | ＢＩＧＬＯＢＥ情報誌ご案内 | Publication list, 0 publications |
| `21` | オリンピック特設コーナー | Article list, 0 articles |
| `X` | 旧電子メール | Separate legacy mailbox directory, 0 messages |
| `Q` | 終了 | Disconnect; `RECONNECT` starts again at MAIN |

At DAISIZEN (`13` → `2`), `MAIL` opens its own mailbox directory,
`LIBRARY` and `OSL` each open a named file list (0 files), and `OLT` and
`CONFERENCE` each open a named room (0 other participants). `FORUMS` retains
boards `1`–`7`; `J MITI` → `3` → `9` retains 資料室 and its existing reading,
posting, reply and unread behavior. A saved empty board stays empty.

All new collections are read-only and empty: counts describe this browser's
simulated collection, **not historical service activity**. Lists state what is
missing and accept `LIST` to redisplay. Mail directories accept `INBOX` and
`SENT`; inside either mailbox, `LIST` shows its empty message list and `BACK`
returns to that mailbox directory. `HELP`, `BACK` and `MAIN` work throughout the
hierarchy. The index uses the MAIN selectors except `2` (itself) and `Q`; `BACK`
from an indexed section returns to the index. `Q` remains scoped to MAIN.
There are no single-letter `B`/`M` aliases. These commands and collection layouts
are UI conveniences, not verified historic menu sequences.

There is no mail delivery, shopping transaction, file upload/download, internet
gateway or multi-user chat connection, and no fake remote content or participants.
Opening these screens makes no network calls, changes no stored content and
loads no model. Existing local forum posts/settings, JSON backup/restore and
explicitly enabled local AI remain available. Settings → **このシステムについて /
出典・制約** explains these limits, the empty counts and historical uncertainty
on demand; ordinary screens keep only their content and navigation.

## Terminal appearance and output speed

The terminal screen and prompt fill the ordinary viewport. **設定 / Options**
opens one accessible dialog with display/speed, member, AI, JSON backup,
offline/storage, keyboard help and **このシステムについて / 出典・制約** groups.
Escape or **閉じる** returns to the session without changing its draft. The post
editor remains a separate dialog. A compact AI setup/status strip beside the
terminal also shows progress and stop/retry. Detailed AI and storage errors stay
in Settings; background changes add a small notification dot and accessible status.

Ordinary output uses concise navigation and operational notices. About contains
the evidence categories, source links, era limitations, invented controls,
fictional identities and seed/AI provenance. Original fixtures and research are
preserved; local posts retain their exact text. Display offers white, green and
amber themes with optional static glow and scanlines, plus a compact local Japanese monospace stack. No font downloads are
required. These are reconstructed aesthetics, not authenticated PC-VAN screens.

**表示速度（シミュレーション）** offers 300/1200/2400/9600 bps and **Instant**.
The default is 2400 bps, or Instant with reduced motion. Effects default off.
**全文表示 (Esc)** reveals queued text; a submitted command also reveals earlier
text before its immediate echo. Changing speed reveals the current backlog.
Theme, speed and effects persist locally and travel with JSON backups; an explicit
choice overrides the motion-aware defaults. The animation uses UTF-8 byte costs
at nominal bps / 10 bytes per second, preserving whole Unicode graphemes. This is
a perception simulation, not a historical encoding or measured modem connection.
See [display controls, accessibility, timing and limitations](docs/terminal-display.md).

## Optional local AI

Open **設定 / Options → AIモデル・動作設定** to inspect and edit ten
original fictional residents. Their stable IDs include the existing `hoshimori`,
`kusabue` and `hankote`. Each has a job, routine, weekday/weekend hours (JST by
default, editable fixed UTC offset), interests, preferred boards, writing style,
activity level and reply tendencies. All profiles and settings survive JSON backups.

A new world defaults to automatic resident activity **ON**, with at most **4 posts
and 12 generation attempts (including manual previews) per page visit**. **No heavyweight files are downloaded
until you affirm the model confirmation.** A compact invitation beside the
terminal offers **AIモデルの準備** with **モデルを読み込む** and **あとで**.
The load action opens the existing model selector and an explicit
download/storage/WebGPU notice; **同意してモデルを読み込む** both
persists consent and starts loading. Settings' **モデルを読み込む（初回ダウンロード）**
uses the same confirmation. Visiting, declining, Escape and **あとで** never
start a model download. Initial files can total hundreds of MB to GB from the
model distribution hosts; inference and forum processing remain entirely local.

**あとで** saves a per-world deferral that survives reload and JSON backup/restore.
Use the subtle **モデルを読み込む** action beside the terminal to return, or use Settings.
Already-consented and globally paused worlds receive no new invitation. Unsupported
browsers get a compact WebGPU / HTTPS explanation. The strip shows real loading
progress, **AI を停止・解放**, errors/retry and successful model readiness;
**AIモデルの設定** opens schedule status and pause controls. The strip shrinks
when idle or ready. Expand **詳細・出自** for authorship, model origins and
timestamps. Consent, a loaded model and actual scheduled posts are separate states: readiness promises no
immediate posts. WebGPU on HTTPS/localhost is required.
The first-visit community is already stored before model setup. Later generated
posts can reply to its fictional history without an initial human post. Existing
profiles and restored/custom boards are preserved.

While the page is visible and connected, a minute timer checks independently due
residents. They may read, start topics, reply to humans or other residents, or stay
silent. Nothing runs while closed. Reopening reconstructs a bounded chronological
subset of up to 72 hours of missed activity; it never fabricates every missed hour.
Scheduled times are fictional and actual commit times remain inspectable. One
shared model worker serializes generation; a cross-tab Web Lock prevents competing
models. Missing Web Locks pauses automatic inference. The visit budget survives
`RECONNECT`. Set the cap to **0** to pause, or set an individual frequency to **0**.
**AI を停止・解放** cancels work, unloads the model and suspends automatic retries
until explicit recovery or another visit. Failures leave the terminal usable.

Manual AI preview/save/discard, optional model selection, cache checks and detailed
provenance remain available. Inference stays local, with no external AI API, key,
backend, remote participants or paid service. These residents are fiction, never
historical users. See [local AI behavior and limitations](docs/local-ai.md).

## Local data and backups

Open **設定 / Options → JSON バックアップ・復元** and use
**JSON バックアップを保存** to download all local data.
Select a JSON file with **復元ファイル**, then **全データを置き換えて復元** to
validate it and confirm replacement of the entire local world. Restore does not
merge data; export the old world first if you want to keep it. Invalid files or
failed writes leave existing data intact. Storage errors appear below the controls.

A truly pristine profile receives ten resident identities, two writable boards
and 30 prewritten posts from [the original fixture](data/pcvan/fictional-community.json)
in one transaction. The eight threads cover repairs, old PCs, stargazing,
experiments, gardening, birds and walks. Their dates are fixed once relative to
world creation, over the preceding roughly two weeks, with a quiet day and recent
activity; they are not dated as genuine 1996 material. `origin: local-seed:fictional`
and the `community-world` setting preserve provenance in Settings and JSON backups.
Subsequent model output uses `local-ai:webllm:<modelId>` instead.

Reloads, other tabs and app updates never refill deleted posts. Existing profiles
receive no unsolicited history. For a pre-feature profile with no posts and safe,
unambiguous board mappings, Settings offers **この内容で空のコミュニティを準備**
with a preview and confirmation. It preserves members, custom names and counters,
and can succeed only once. Imported worlds, including empty restores, are excluded.
Restoring an empty backup keeps the world empty; it also suppresses the old DEMO
fallback. Clearing all browser site data removes the initialization marker, so the
next visit creates a new world. Export first to retain your current world.

Stored SIGs map to the evidence directory by `keyword` (`MITI`/`DAISIZEN`, case
insensitive), and forums by `boardNo` (`9` for MITI, `1`–`7` for DAISIZEN).
Repository snapshots always take precedence over the legacy display-only demos,
including empty restores or missing boards. Ambiguous mappings are reported
without choosing arbitrary content.
Other local SIGs/boards are outside this historical directory. The app reads a
consistent repository snapshot before forum commands, including after restores;
read failures are reported without displaying stale posts. Reading local posts
updates the selected human's read marker without changing the posts. See the
[forum implementation notes](docs/local-storage.md#forum-reading).

Data persists across reloads but browser retention is not guaranteed.
Changing the origin/profile, clearing site data, private browsing, or browser
eviction may make data unavailable. Keep downloaded backups outside the browser.
To start over, open **設定 / Options → JSON バックアップ・復元 → 初期状態に戻す**.
Save **JSON バックアップを保存** first if you want to recover the current world.
The separate confirmation **すべて削除して初期状態に戻す** irreversibly deletes local
posts, members, read markers, resident edits, AI activity/consent, display settings
and history. Cancel, Escape or clicking outside the confirmation leaves them intact.
The app recreates the original ten residents and thirty posts in eight threads,
then reloads this and other open tabs into a fresh MAIN session. Check the restored
posts with `J MITI` → `3` → `9` → `LIST` / `READ 1`.
Reset needs no model, WebGPU or download. It preserves downloaded model weights,
the optional offline app-shell cache and unrelated origin data; AI still needs
fresh consent. Clearing browser site data is a separate browser operation that
can also delete those caches. An earlier JSON backup can restore the old world.
See [the local repository API and versioned backup format](docs/local-storage.md)
for the storage contract used by future SIG/forum controllers.

## Optional offline use and retention

On an initial online visit to a production build on HTTPS or localhost, expand
**オフライン保存・容量・バックアップ**, press **端末をオフライン用に保存**
and wait for **保存済み** before going offline.
The terminal, fixtures, local reading/posting and JSON backup/restore can then
reload without a backend or login. This opt-in saves only the small app shell;
it never downloads model weights. Development mode does not install a worker.
The panel shows the browser's online/offline signal, approximate site storage
usage, persistence status/request and a link to JSON backup/restore.

AI downloads require explicit setup consent. After consent, enabled resident
activity can automatically reload the selected model when work is due. **選択モデルの保存を確認** checks the
selected model's weight manifest and shards without downloading missing weights.
Cached weights alone do not guarantee offline AI: runtime, tokenizer, config,
compiled libraries and a supported GPU must also be available. No initial network
or model availability is implied by “browser-only.” Keep JSON backups outside the
browser; eviction or clearing site data can remove shell, weights and user data.
Persistence can reduce automatic eviction, but does not replace backups.

Updates wait for all app tabs to close, preserving unsaved editors while open.
After saving drafts, close all app tabs and reopen to use a pending release.
Only this deployment's obsolete shell caches are removed; user IndexedDB records
and model caches are not migrated or deleted by app-shell updates. See
[offline behavior and reproducible checks](docs/offline.md).

## Build static assets

```sh
npm run build
npm run preview
```

`build` type-checks the application and writes `dist/index.html`, a versioned
`dist/sw.js` and bundled CSS/JavaScript in `dist/assets/`. Deploy the contents of `dist/` to any static
HTTP/HTTPS host, including a subdirectory; asset URLs are relative. The preview
command serves the built files locally for checking. Production requires only
static file hosting, with no server-side application process.

## GitHub Pages deployment

Public URL: **[https://takahirox.github.io/pcvan/](https://takahirox.github.io/pcvan/)**.

The [Deploy to GitHub Pages workflow](.github/workflows/pages.yml) installs locked
dependencies with Node.js 24, builds `dist/`, and publishes it through the official
GitHub Pages actions on every push to `main`. For a manual deployment, open
**Actions → Deploy to GitHub Pages → Run workflow**, select **main**, and run it.
Other branches do not publish. Deployment runs are serialized. No application
secrets, backend, database service, or paid hosting are required.

One-time repository setup: in **Settings → Pages → Build and deployment → Source**,
select **GitHub Actions**. To diagnose failures, open the workflow in the
repository's **Actions** tab, select the failed run, and inspect the failing
step's logs. A Pages configuration failure may require the owner to select that
source before rerunning the workflow.

The existing relative asset base supports `/pcvan/`, including lazy WebLLM assets.
Offline saving remains opt-in and registers `sw.js` with scope `/pcvan/`; AI model
weights still require explicit opt-in. To reproduce the production subpath check
locally after installing dependencies and Chromium as described in
[Validation](#validation), run:

```sh
npm test -- tests/offline.spec.ts --grep 'production assets'
```

This checks entry scripts/CSS, all emitted assets including the lazy AI runtime
and worker, and the opted-in Service Worker URL/scope without a GPU or model
download. It does not establish successful public deployment.

After merge, verify the resulting `main` workflow succeeds, visit the public URL
over HTTPS, confirm the terminal renders and assets load without 404s, then opt
into offline saving and inspect the Service Worker scope under `/pcvan/` in
browser developer tools. Record the deployment run URL, published URL and actual
results for Issue #26. Publication verification remains pending until performed;
if Pages setup blocks it, record the precise owner-side blocker and retry after
it is resolved.

## Structure

- `index.html`, `src/main.ts`: page entry point and application wiring.
- `src/terminal.ts`, `src/style.css`: DOM rendering, keyboard interaction, and
  presentation. `mountTerminal` accepts submit/history callbacks and returns
  `append(...text)`, which appends literal text without replacing or focusing the
  input. It follows new output only if the transcript was already at the bottom.
- `src/output-renderer.ts`: bounded progressive display queue and independent logical
  log, with UTF-8 grapheme costs and batched animation frames.
- `src/session.ts`, `src/history.ts`: transcript and command recall, independent
  of the DOM. `main.ts` restores/persists recalled commands through the repository.
  `session.append(...text)` records additional output;
  pass its return value to `terminal.append(...)` to display it.
- `src/connection.ts`: reconstructed connection/reconnection step around the
  navigation controller; the entry point schedules its cancellable completion.
- `src/controller.ts`: the small `TerminalController` interface (`welcome` and
  `submit(line)`) and the original synthetic controller retained for isolated
  shell tests.
- `src/navigation.ts`: `PcvanController`, with per-session screen state and
  screen-scoped commands. MAIN labels and MITI route steps come directly from
  the JSON fixtures, without combining historical menu variants. `screen` is a
  read-only state identifier; `main.ts` wires it through `ConnectionController`
  to the terminal.
- `src/forums.ts`: resolves evidence-backed boards to repository posts or original
  demo fixtures, and renders headers without trimming or reflowing post text.
- `src/composer.ts`: local human selection and the reconstructed edit/review/send
  dialog. Drafts remain in memory and are excluded from backups and command history.
- `src/ai/`: ten editable fictional residents, deterministic scheduling, bounded generation and validation,
  optional settings/inspection controls and the lazy WebLLM worker adapter.
- `src/storage/`: typed IndexedDB repository, backup validation, and download/restore
  controls. Composition and reading use the existing v1 backup schema.
- `src/offline/controls.ts`, `vite.config.ts`, `scripts/service-worker.js`:
  offline/retention panel and build-generated app-shell worker.
- `tests/`: controller/session checks and browser interaction checks.

## Validation

```sh
npm ci
npx playwright install chromium
npm test
```

For the connected MAIN → MITI → reading → human post/reply → reload and backup
journeys, plus mocked production AI recovery/failure checks, run
`npm run test:e2e`. See the [E2E evidence checklist](docs/e2e.md) for acceptance
coverage, isolated-profile behavior and historical/hardware limitations. These
tests need no backend, API key, real GPU or model download.

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
Forum checks cover all seven DAISIZEN boards, MITI reading, optional header
fields, whitespace, gaps, empty/missing/ambiguous forums, and live restore reads.
Composition checks cover edit/review/cancel/send, blank drafts, Japanese multiline
text, reply navigation and missing parents, transactional initialization/numbering,
failed writes, and read markers across members, forums, connections and reloads.
Section/service checks cover every MAIN and index destination, all five service views,
mailbox browsing, empty collections/rooms, preserved fixture evidence, scoped helpers,
unsupported input, return paths, offline keyboard use without network requests,
and unchanged local content after visiting services and returning to forums.
Immersion checks cover clean ordinary output, hidden settings, About/source discovery,
modal focus/Escape/IME, missing-member handoff, Japanese cell widths and menu
alignment with fallback fonts, mobile layout and text scaling.
Connection checks cover skip/automatic completion, command cancellation, timestamp
persistence, no network/modem API calls, bounded history with recalled edits, and
byte-for-byte UTF-8 transcript download.
Offline checks cover a real service worker under a deployment subpath, offline
reload/post/backup/restore, missing AI assets, failed installs and updates,
cache eviction/repair, multi-tab update waiting and IndexedDB retention.
See [the implementation validation record](docs/validation.md) for commands
actually run and browser checks not performed.

## Contributing

- [Development flow and English collaboration convention](docs/development-flow.md)
- [Review and merge guidelines](docs/review-guidelines.md)
- [Issue template](.github/ISSUE_TEMPLATE/issue.md)
- [Pull request template](.github/pull_request_template.md)

AI agents should start with [AGENTS.md](AGENTS.md).
