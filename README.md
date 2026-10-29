# pcvan

A browser-only Japanese text terminal prototype, built with Vite, TypeScript, and
plain DOM. MAIN uses the provenance-tagged circa-1996 retrospective transcription
in `data/pcvan/main-1996.json` for its Japanese labels and full-width typography.
A preserved walkthrough dated July 26, 1996 corroborates the paired-row structure;
its damaged Japanese text does not verify those labels. The selected menu remains
provisional: July evidence establishes neither November continuity nor availability
**throughout 1997**. Exact column spacing, colors, font, and fluid terminal width
are reconstructed presentation choices. See the
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
command history use IndexedDB in this browser profile. The terminal display and input
draft remain in memory; OLT room history is persisted.

On the first visit, a new local world already has 82 original Japanese posts by
100 fictional residents: twenty-six conversations across nature, mysteries, PCs,
games, everyday life, beginner questions, public notices, SIG organization,
botanical sketching and mountain walks, plus three retained electronic-conference
contributions.
Read them immediately, before creating a human member or
allowing a model download. They are bundled fiction, never historical archives
or claims of live network activity.

## Use the terminal

PC-VAN service participation uses only the transcript and persistent command input.
The compact **設定 / Options** button in the header opens the modern application
Settings dialog for display, AI, local data, offline storage and technical help.
It is outside the simulated service; handle registration, navigation, reading and
posting, mail and OLT remain terminal-only. Type a line and press Enter. Use
`HELP` (or `/HELP` in an OLT room) for the current screen. Japanese IME
confirmation never submits. Escape reveals queued output and skips the remaining
connection presentation; it does not cancel drafts or approve confirmations.

Initial entry and `Q` → `RECONNECT` automatically show connection status, service
identification, a fixed fictional `LOCAL-DEMO` ID/password presentation, previous
logout/current login, a scripted profile decline, an original welcome notice,
then the unchanged MAIN. These are output stages: no credentials, authentication,
account creation or profile-editor interaction. The reconstructed pacing is six
400ms intervals (about 2.4 seconds after local startup data is ready), separate
from character reveal speed, including Instant/reduced-motion display. Escape or
a submitted command skips the rest. The optional local handle invitation runs
only at this handoff under its existing first-use rules.

Entry, forums, mail, conference, OLT and local NetNews articles display their
actual stored operational timestamps in fixed **JST (UTC+09:00)**, with four-digit
years. The interface is inspired by 1996 PC-VAN; interactions happen in the
present day. Authored archival examples and historical source dates retain their
original dates. No reset or rewriting of posts, messages or pending deliveries is
needed for existing worlds. Only `Q` records a logout; reload without `Q` never
invents one. See the [calendar/import policy](docs/local-storage.md#historical-display-calendar-issue-67). The
[entry research](docs/research/pcvan-1996-1997.md#staged-session-entry-issue-61)
records the 1995-04-02 excerpt published 2010-09-22 (contents: high confidence;
independent authenticity/adjacent-year applicability: moderate), the undated
client-author announcement description, and the separate 1992 reproduction and
1996-11-25 NORMA gateway context. Exact 1996 applicability, stage arrangement,
notice wording and timing remain reconstruction. Sources and limitations are
also available in Settings → Details/About, outside routine terminal output.

On first use, answer the optional handle invitation with `Y`, enter a Japanese
handle, or use `N` / `SKIP` to read without registering. `HANDLE` lists only human
accounts: type a number to select, `NEW` to register, or `RENAME new name` to change
the selected handle. Selection and each human's read markers survive reloads.
Unregistered `WRITE` / `REPLY` requests resume after inline registration.

MAIN accepts `1`–`21`, `X`, `Q`, `J MITI`, and `J ECOM`. The verified route remains
`J MITI` → `3` → `9`. Numbers apply to the current screen. From MAIN,
`13` → `2` → `FORUMS` reaches DAISIZEN's seven boards. Its directory also accepts
`MAIL`, `LIBRARY`, `OLT`, `OSL`, and `CONFERENCE`. These bridge/service commands,
`FORUMS`, reading, settings, handles and composition are reconstructed conveniences;
they are not claims of verified 1996–97 PC-VAN commands. `J DAISIZEN` remains
unsupported. `ABOUT` provides evidence, source URLs and local fiction provenance
on demand. Historical fixture labels and MAIN mappings are preserved.

From MAIN or the index, `J ECOM` opens a [postal-letter simulation](docs/ecom.md):
`1` guidance → `2` application → fictional recipient/address → multiline letter →
`.END` → review, `EDIT` or explicit `Y` simulated acceptance. `RECEIPT` inspects the
latest accepted letter, including while visiting guidance; `E` returns to the
actual entry parent. No postal submission, payment or delivery occurs. Anonymous
visitors can use the fictional example without registration or personal data.
Drafts and the latest receipt stay in memory for that ECOM visit; departure,
disconnection, reload, reset and restore clear them. Postal text never enters
IndexedDB, durable command history, JSON backups or resident generation context.
Displayed text remains in the in-memory transcript and explicitly exported logs.
The [evidence record](docs/research/pcvan-1996-1997.md#browser-local-ecom-postal-letters-issue-101)
distinguishes qualified source observations from reconstructed controls and limits.

In a forum, `LIST` lists numbers and unread/read markers. `READ n` displays the
stored title/body literally, with one full-width space and the current pen name
appended to the title line. The parenthesized `SYN-…` token is a stable synthetic
member label, independent of renames and backup member order. Missing authors
show `不明` / `名無し`; known DEMO fixtures retain their synthetic tokens.
This is a [documented reconstruction](docs/research/pcvan-1996-1997.md#forum-identity-and-pen-name-issue-71),
without authentication. `返信先：#m` is plain text, followed by typing `READ m`
or `REPLY n`. Reading advances the selected human's per-forum high-water mark.
It never changes posts or moves the mark backwards. Missing numbers preserve state.
Dates use the shared historical JST calendar; secondary header numbers have no
assigned meaning and the uncertain historical line-count field is omitted.

Compose entirely through the same input:

```text
WRITE                  (or REPLY 1)
昔のパソコン通信        (title: 1–200 characters)
  日本語の一行目        (body: one line per Enter; whitespace is preserved)
二行目
.END
EDIT
TITLE 編集した題名
LINE 2 変更した二行目
REVIEW
Y
```

Body input accepts blank lines; `.END` requires a nonblank body of at most 20000
UTF-16 units. Review shows numbered lines and accepts `Y` (save), `N` (discard),
or `EDIT`. Editing accepts `TITLE text`, `LINE n text`, `DELETE n`, `APPEND`
(add more body lines) and `REVIEW`. `LINE n` replaces a line with an empty line.
`.TEXT text` in body input inserts reserved command text literally, such as
`.TEXT MAIN` or `.TEXT .END`. Validation errors keep the existing draft.
`CANCEL` / `.CANCEL` explicitly discard from every composing stage. `BACK`, `MAIN`
and `HELP` keep the draft and show its help. No draft line can navigate or send.
Sends use transactional numbering and parent validation; failures permit retry,
and a committed draft cannot be sent twice. Missing boards are created only on
successful send, never by cancelling.

Outside prompts, `BACK` returns one menu and `MAIN` returns to MAIN. Inside a
confirmation, only the advertised literal `Y` executes that operation; blank,
invalid input and `HELP` never approve it. `N`, `BACK`, `MAIN` or `CANCEL` cancel
confirmation. `Q` disconnects only at MAIN; `RECONNECT` starts again. Neither
navigation nor connection uses a remote service or modem API.

Settings groups the functional controls into **表示・端末**, **AIモデル・活動**,
**ローカルデータ・保守** and **操作案内・詳細・出自**. Use the controls directly;
no terminal commands are required for application configuration. Tab/Shift+Tab
stay in the dialog; Escape or 閉じる returns focus to `#command`. Deliberately
opening Settings preserves the active title/body/review prompt and unsent text.
Opening is deferred during terminal IME composition. Settings never opens itself.
Reset/import warn that replacement discards active drafts.

Optional keyboard shortcuts are retained. `SETTINGS` (alias `CONFIG`) exposes
the legacy numbered menus, using the same saved state and action implementation:

| Number | Commands and behavior |
| --- | --- |
| 1 Display | `THEME white/green/amber`, `SPEED 300/1200/2400/9600/instant`, `EFFECTS ON/OFF` |
| 2 Handles | Account number, `NEW`, `RENAME name` |
| 3 Models/activity | `MODEL 1/2`, `LOAD`, `LATER`, `STOP`, `CACHE`, `AUTO 0–12`, `RETRY`, `RESIDENTS` |
| 4 Data | `BACKUP`, `IMPORT`, `RESET`; eligible legacy empty worlds also offer `POPULATE` |
| 5 Offline/storage | `CACHE` (app shell), `STATUS`, `PERSIST` |
| 6 Session | Latest login and explicit logout in UTC; closing a tab is not a reliable logout |
| 7 Log | Download current UTF-8 terminal log |
| 8 Help | Keyboard and prompt guide |
| 9 About | Sources, evidence limits, resident profiles, post origins and timestamps |

`HANDLE`, `ABOUT`, `LOG`, `BACKUP`, `IMPORT`, `RESET`, and `STOP` are also available
outside active drafts/prompts. In-world controls have no compose/registration
dialogs or clickable parent links. Application Settings uses normal controls and
explicitly initiated native file selection/download/permission interfaces. `BACK` returns from details/help to their caller.

Up/Down recall the newest 100 nonblank commands and restore an unsent input draft.
Title/body, registration, profile-edit and confirmation responses are not saved as
commands. Submitted draft text does appear in the session transcript and `LOG`.
PageUp/PageDown scroll output; Shift+Tab focuses it, Left/Right scroll long lines,
and Tab returns to input. Literal HTML is never interpreted. `LOG` includes
accepted text still awaiting display, but excludes the unsent input. Export before
reloading; JSON backups contain world data/history, not the terminal display or
live drafts. OLT room history is included as world data.

Native browser-local file mail is available in all three mail routes:
`WRITE-FILE hoshimori` → subject → `PICK` → review → `Y`, then `SENT`,
`READ number`, and separately `ACQUIRE number` → `Y`. Files from 0 through
262,144 bytes retain exact bytes across reload and JSON restore. See the
[filename rules, privacy and complete journey](docs/mail.md#native-browser-local-file-mail-issue-125)
and [qualified historical evidence](docs/research/pcvan-1996-1997.md#native-file-mail-issue-125).

## Menu destinations and collections

| MAIN selector | Destination | Initial view |
| --- | --- | --- |
| `1` | 電子メール | Mailbox directory: inbox and sent, each 0 messages |
| `2` | 索引 | Numbered routes to every other MAIN section and `J MITI` |
| `3` | ニュース | Provider directory; `1` opens 時事通信ニュース with three briefs |
| `4` | データベース | Database directory; `1` opens 日経テレコン BiZ |
| `5` | 公共情報と政治 | Environmental gateway directory; `1` opens EIC NET's two readings |
| `6` | ビジネス | Article list, 0 articles |
| `7` | インターネット | Internet directory; `1` opens NetNews; `2` opens the local TELNET demo; `3` opens restricted FTP examples; `4` opens local Gopher; `5` opens local Archie |
| `8` | コンピュータ | Article list; `SIGS` opens the community directory |
| `9` | ショッピングモール | Product catalog, 0 products |
| `10` | 電子出版 | Publication directory; `1` opens 架空文芸誌「灯窓」 with two connected fiction installments |
| `11` | 趣味 | Article list; `SIGS` opens the community directory |
| `12` | 生活 | Article list, 0 articles |
| `13` | コミュニケーション | Five SIG destinations; `6` opens 一般掲示板 / 募集とお知らせ |
| `14` | ＰＣ－ＶＡＮ利用情報（無料） | Article list, 0 articles |
| `15` | ☆★☆ おすすめ ☆★☆ | Article list, 0 articles |
| `16` | ☆★☆ わかばマーク ☆★☆ | Beginner welcome → `1` はじめての広場 (board) / `2` OLT (beginner room) |
| `17` | ＢＩＧＬＯＢＥガイド | Article list, 0 articles |
| `18` | インターサイト | Information article list, 0 articles |
| `19` | ＢＩＧＬＯＢＥイベント（無料） | Article list, 0 articles |
| `20` | ＢＩＧＬＯＢＥ情報誌ご案内 | Publication list, 0 publications |
| `21` | オリンピック特設コーナー | Article list, 0 articles |
| `X` | 旧電子メール | Separate legacy entry to the same local mailbox |
| `Q` | 終了 | Disconnect; `RECONNECT` starts again at MAIN |

For electronic publishing, use MAIN or `2 索引` → `10` → `1 架空文芸誌「灯窓」`
→ `READ 1` / `READ 2`. The two short original Japanese installments tell one
connected story. The publication is fictional and undated, with no real byline;
it does not impersonate an authentic PC-VAN Journal issue. No handle, AI, model,
subscription or external service is needed.

`HELP` preserves the current view; `LIST` returns a body to contents (or repeats
the current directory/contents). `BACK` follows body → contents → publication
directory → actual MAIN/index caller. Repeated or different `READ` selections
replace the body without adding parents. `MAIN` clears the path and reopening
starts at the directory. Invalid selections and unrelated service commands leave
the view intact. Settings/About, HANDLE, STOP and terminal input keep their
existing behavior; Settings can return with unfinished input.

Readings are bundled application content, outside IndexedDB, world backups and
resident-generation context. Browsing preserves populated, imported, anonymous
and deliberately emptied worlds, without creating posts, mail, read markers,
subscriptions or schedules. Ordinary session/history recording continues and
terminal logs include the displayed bodies. Selector `20` retains its empty
publication list. The [publishing research record](docs/research/pcvan-1996-1997.md#electronic-publishing-issue-111)
and Settings/About explain the earlier online-magazine evidence, the uncertain
relationship to PC-VAN Journal and all category D controls and content choices.

For news, use `3` → `1 時事通信ニュース` → `READ 1`, `READ 2` or `READ 3`.
The three short, original Japanese briefs describe fictional places and events
suited to late 1996. They are undated fiction, not authentic 時事通信 reports,
recovered reporting or a live feed. No handle, AI or external service is needed.
`HELP` redisplays the current view. `LIST` repeats the directory/headlines or
returns a brief to its headlines. `BACK` follows brief → headlines → provider
directory → actual entry parent, including `2 索引` → `3`; `MAIN` clears the path.
Reading another brief replaces the detail without adding parents; re-entry starts
at the directory. Invalid selectors, read numbers and unrelated service commands
preserve the view. Existing application shortcuts, including Settings/About and
`LOG`, remain available and return to the current brief.

News content stays in application code, outside IndexedDB and backups. Browsing
leaves community, mail, read markers, conference/OLT, consent, AI scheduling and
calendar settings unchanged, including restored empty worlds. Ordinary session
and command-history recording continues; briefs are included in terminal logs.
The [news research record](docs/research/pcvan-1996-1997.md#news-reading-issue-77)
and Settings → Details/About distinguish early provider evidence, limited
snippet-supported continuity and the reconstructed selectors, layouts, errors,
returns and original prose. This is one implemented destination, not a complete
historical provider directory or authenticated 1996 host interaction.

For NetNews, use `7` → `1 NetNews` → `1 fj.questions.fj` or `2 fj.news.usage`
→ `READ 1`, `READ 2` or `READ 3`. Each group has three original Japanese articles
with fictional authors, `.invalid` addresses/identifiers and fixed, authored
November 4–7, 1996 dates. Full articles include Newsgroups, From, Subject, Date
and Message-ID; followups include References to an included original article.
These examples and selected-group carriage are reconstructions, not recovered
PC-VAN articles or an authenticated directory. Reading/searching is available
anonymously without AI consent, a model, credentials or external connections.

`SEARCH SUBJECT 質問` and `SEARCH FROM 風枝` search only that header in the
selected group's complete corpus. Matching is a literal substring with query-end
whitespace trimmed and Latin case ignored. Display preserves spelling and internal
whitespace. Regex and Boolean characters/words are treated literally; bodies are
never searched.
Each search replaces prior results and reports its field, query and count.
Numbers stay group-local and stable; `READ number` accepts only active results.
`HELP` preserves the view/filter; `LIST` clears the filter and opens the group's
complete list. `BACK` follows article → active list/filter → group directory →
Internet directory → actual entry parent, including index entry. Repeated reads
replace details; `MAIN` clears the path and transient search. Invalid input and
unrelated service commands preserve the view. Global shortcuts and Settings/About
remain available, returning to the current view.

The bundled corpus stays outside IndexedDB and JSON backups; terminal logs retain
literal headers and prose. Browsing does not seed or change protected world
records, consent, scheduling or calendar settings, including restored empty
collections. Normal session/history and activity lifecycle behavior continues.

`WRITE` starts a new public article; `REPLY number` follows up an article in the
active results (also from its detail). Posting asks for an existing local human
handle or registration, independently of AI consent. These articles stay in this
browser and are never delivered to Usenet; they are distinct from private mail.
The composer pins group, author and parent Message-ID. Enter a subject and literal
body lines, `.END` to review the group/parent, `EDIT` to revise, then explicit `Y`
to save or `N`/`CANCEL` to discard. `.TEXT` escapes command-like body text;
BACK/MAIN preserve the owned draft. Followups default to one `Re:` prefix and
retain the parent's References followed by its Message-ID, even after subject
editing. Successful submission opens the complete group list; cancellation keeps
the prior filter/view.

Only local contributions and allocation/reference metadata are backed up in
optional setting `netnews-local`. Numbers start at 4 independently in each group;
Message-IDs stay unique across groups. Transactions allocate and save atomically,
with idempotent draft retries and no consumed number on failure. Restores validate
human authors, same-group earlier parents and complete reference chains before
replacement. Older backups without the setting mean no local contributions.
Factory reset removes local articles and retains all six bundled examples;
import/reset invalidates open drafts. See [storage details](docs/local-storage.md#netnews-persistence).
Local From uses the current safe pen name plus the shared stable identity token,
lowercased, at `members.example.invalid`; no real email address is requested or
raw member key displayed. Local operational UTC timestamps are formatted in
fixed JST for an English RFC-style `Date` with seconds and
`+0900`. The address, format, commands, editor and local persistence are category D
reconstruction, not recovered PC-VAN session syntax.

Subscriptions/unread persistence, expiry, crossposting, thread navigation,
WWW and real remote access are outside this NetNews subset. The
[NetNews research record](docs/research/pcvan-1996-1997.md#netnews-reading-and-header-search-issue-81)
and [participation research](docs/research/pcvan-1996-1997.md#netnews-local-participation-issue-87),
with Settings/About, distinguish the 1995 restrictions, 1996 reading/posting report,
general fj evidence, assumed PC-VAN group carriage and reconstructed controls.

For restricted browser-local FTP, use MAIN or index `7` → `3 FTP` →
`READ 1` / `READ 2` → `DOWNLOAD number` → explicit `Y`. The documented restricted
collection label is `info.mac`; no hostname, credentials or connection sequence
is implied. Two original Macintosh-oriented documents, `MACDOC.TXT` (document
handling) and `MACCOMM.TXT` (communications checklist), have fictional authored
dates of November 1–2, 1996. List and preview show their purposes, dates and exact
UTF-8 byte counts. Downloads contain the literal bundled body, including Japanese,
indentation, blank lines, markup and final LF, with no BOM. Browser initiation is
reported; completed disk saving or remote transfer is not claimed.

`LIST` returns to the full list; `BACK` follows preview → list → Internet → the
actual MAIN/index parent. `HELP` preserves the current view, `MAIN` clears the
path. Confirmation accepts only `Y`; `N`, `BACK`, `CANCEL` or `.CANCEL` cancel to
the pinned view. Settings/About preserve confirmation. Approval is single-use,
excluded from input history and discarded on reload, restore, reset or another
tab's world replacement. A failed browser handoff requires a fresh request.

FTP works anonymously without registration, AI consent, model loading or external
requests. Examples and pending selection stay outside IndexedDB and JSON backups;
browsing, cancellation and acquisition leave community records and settings alone,
including restored empty worlds. Ordinary session/history behavior continues.
Arbitrary servers, network transport, uploads, executable/archive payloads,
protocol emulation and acquisition-history persistence are outside this subset.
The examples are authored fixtures, not recovered PC-VAN files or metadata, and
do not imply historical FTP carried only text. The
[FTP research record](docs/research/pcvan-1996-1997.md#restricted-browser-local-ftp-acquisition-issue-99)
and Settings/About explain the dated restriction, assumed November continuity,
unknown endpoint mapping and reconstructed controls.

For browser-local Gopher, use MAIN or index `7` → `4 Gopher` →
`1 [ディレクトリ] 紙野の読み物` → `1` or `2 [文書]`. The two original
Japanese readings, **川辺の小さな観察帳** and **星空と紙の地図**, were written
for this application; no archived messages, identities, screenshots or software
are copied. Root `2` opens the first document directly. Root or nested `3 [検索]`
opens guidance for `SEARCH <query>`; for example, `SEARCH 川辺` returns two
numbered, selectable documents. Unmatched text returns an honest zero-result menu.

Search examines only these bundled titles and bodies, using deterministic,
case-insensitive literal substring matching in corpus order. Outer whitespace is
trimmed; internal whitespace and Japanese text are retained. `SEARCH 水面  風`
(two spaces) matches, while one space does not. Regex/Boolean-looking text is
literal: `SEARCH .*` finds that exact text, while `SEARCH 川辺 OR 星空` finds
nothing. Empty/malformed queries retain the current view with guidance. This
small matching rule is reconstruction, not RFC search-expression support.

Numbered selection applies only to the displayed directory/results. `HELP`
redisplays the current view; document `BACK` and `LIST` restore its opening
directory or exact results, query and ordering. Results `BACK` restores the search
view, then its containing directory, root, Internet directory and actual MAIN or
index parent. Replacement searches replace the current results. `MAIN` clears
the path; re-entry starts at the root. Settings/About preserve the view and modern
Options preserves unsent input. Successful restore, reset, reload and cross-tab
world replacement discard the visit; cancelled operations retain it.

Gopher works anonymously without AI consent, models or network requests. Browsing
does not alter members, SIGs, forums, posts, mail, read markers or settings, or
seed missing imported records. Bundled documents and navigation add no storage
schema or JSON fields; ordinary session/input history and explicitly exported
terminal logs continue. There is no Gopher endpoint entry, transport, browser
download action, live retrieval, complete historical coverage or protocol
conformance claim. Archie has a separate local example below; host paging and
graphical clients are outside scope.

Sources accessed **2026-10-24**:
[Internet White Paper 1996 p.111](https://iwparchives.jp/files/pdf/iwp1996/iwp1996-ch04-01-p110.pdf)
reports PC-VAN Gopher capability in its January comparison (moderate-to-high
confidence), separately listing Navigator, Mosaic and WorldTALK. It includes
planned later changes and supplies neither an activation date nor a terminal
route. [Internet Magazine January 1996 p.229](https://iwparchives.jp/wp-content/themes/twentytwelve/bn/pdf/im199601-216-news.pdf)
describes Navigator launching Mosaic and client-specific software/Archie server
restrictions (high confidence in that account); it proves neither independent
terminal access nor a service-wide Gopher prohibition.
[RFC 1436](https://www.rfc-editor.org/rfc/rfc1436.html) supports hierarchical
directories, documents and distinct search items returning selectable menus
(high confidence), not PC-VAN controls.
[White Paper 1996 p.14](https://iwparchives.jp/files/pdf/iwp1996/iwp1996-ch01-01-p014.pdf)
provides general Japanese Gopher context;
[White Paper 1997 p.29](https://iwparchives.jp/files/pdf/iwp1997/iwp1997-ch01-06-p028.pdf)
offers limited BIGLOBE continuity context. Extending reported capability into
fictional November 1996 is a **moderate-confidence inference**. The original
host/client access path remains unknown. Selector `4`, every control/layout,
Japanese label, corpus organization and matching behavior are accepted
**category D reconstruction**; there is no `J GOPHER` jump. See the
[Gopher research record](docs/research/pcvan-1996-1997.md#browser-local-gopher-browsing-and-search-issue-103)
and discoverable `ABOUT` for the evidence boundaries.

For browser-local Archie filename/location lookup, use MAIN or index `7` →
`5 Archie` → `PROG river`. The bundled, original index has four illustrative
locations and three filenames: `river-notes.txt` appears at two distinct
locations, alongside `star  map[1].txt` (two spaces) and `andromeda.txt`.
All `.invalid` hosts, directory paths, byte sizes and August–October 1996
modification dates are authored examples, not historical files or recovered
metadata. No historical identities, messages or screenshots are imported.

`PROG <filename fragment>` searches **only filenames**, with deterministic
case-insensitive literal substring matching in index order. It trims outer
whitespace and preserves internal whitespace and the submitted spelling.
`PROG rIvEr` reports two locations with filename, host, directory, size and
modification date. `PROG star  map` matches; `PROG star map`, `PROG .*`,
`PROG river OR star`, hostnames, paths and dates do not. Japanese and markup
queries display literally. Unmatched queries report zero locations; empty or
malformed commands preserve the current view with guidance.

`HELP` and `LIST` redisplay the current view. Replacement `PROG` queries replace
results. `BACK` returns results → query view → Internet directory → actual MAIN
or index parent; `MAIN` and re-entry clear the query. Settings/About retain context,
and Options retains unsent input. Cancelled restore/reset retains the visit;
successful same-tab restore, cross-tab replacement and reset discard it.
Locations are informational: there is no numbered selection, download or FTP
handoff. The existing restricted FTP journey remains separate.

Archie is available anonymously, without AI consent, model loading or network
lookup. It changes no protected world records or settings, never seeds imported
records and adds no schema/backup fields. The index stays outside persistence;
ordinary session/input history may include submitted commands, and explicit log
exports include displayed results. No transport, endpoint entry, live index,
complete historical coverage or protocol conformance is claimed.

Sources accessed **2026-10-24**:
[Internet White Paper 1996 p.111](https://iwparchives.jp/files/pdf/iwp1996/iwp1996-ch04-01-p110.pdf)
reports PC-VAN Archie capability in its January comparison, separately listing
graphical clients and restricting FTP to info.mac (moderate-to-high confidence
in the extracted capability table). Later planned changes mean its label is not
an activation date; no usable page-image comparison was obtained.
[Internet Magazine January 1996 p.229](https://iwparchives.jp/wp-content/themes/twentytwelve/bn/pdf/im199601-216-news.pdf)
describes Navigator/Mosaic software and Archie-server selection restrictions
(high confidence in the passage), not a service-wide prohibition or November
behavior. [RFC 1580 §5](https://www.rfc-editor.org/rfc/rfc1580.html)
supports general filename/location lookup separate from acquisition and the
result metadata (high confidence). Its documented default is case-sensitive
**exact matching**; this example deliberately chooses the available alternative
of case-insensitive substring matching. These are general semantics, not
PC-VAN-specific authentication or commands.

Extending reported capability into fictional November 1996 is a
**moderate-confidence continuity assumption**. Original PC-VAN host/client
access remains unresolved. Selector `5`, Japanese presentation, controls,
`PROG <filename fragment>`, index, ordering and matching mode are **category D
reconstruction**. PROG is a disclosed local control inspired by general Archie
documentation, not authenticated PC-VAN syntax. Focused searches found no
qualifying host sequence; other-provider examples and an inaccessible later
announcement do not establish one. See the
[Archie research record](docs/research/pcvan-1996-1997.md#browser-local-archie-filename-and-location-search-issue-105)
and discoverable `ABOUT`. Host paging, graphical clients and other MAIN
destinations remain outside this Issue.

For a browser-local outbound TELNET journey, use `7` → `2 TELNET` →
`OPEN mail.demo.example.invalid` → `MAIL` → `READ 1` or `READ 2`. The single
fictional host automatically displays `demo@mail.demo.example.invalid`; it never
requests credentials, resolves a destination or opens a network connection.
Its shell-like `remote-demo$` and mailbox `remote-mail>` prompts keep the two
original Japanese letters separate from PC-VAN electronic mail. The letters use
fictional correspondents, `.invalid` addresses and fixed November 22–23, 1996
dates, and are bundled outside IndexedDB and community backups.

The TELNET directory accepts only `OPEN mail.demo.example.invalid`, `LIST`,
`HELP`, `BACK`, `MAIN`. The remote shell accepts `MAIL`, `LOGOUT`, `HELP`, `BACK`,
`MAIN`; its mailbox/detail accepts `LIST`, `READ number`, `LOGOUT`, `HELP`, `BACK`,
`MAIN`. HELP preserves the view and selection. LIST restores the complete mailbox.
BACK follows letter → mailbox → remote shell → TELNET directory → Internet
directory → actual MAIN/index parent. LOGOUT ends only the remote demonstration;
MAIN clears its state and returns directly to MAIN. Settings/About return to the
same view; reload, confirmed restore and reset clear remote login/selection.

Anonymous and registered users need no model, AI consent or registration. The
journey creates no community records, read markers, consent or schedules and
preserves restored-empty collections. Ordinary session history, activity
bookkeeping and terminal logs still operate. Arbitrary hosts/ports, general shell
commands, remote composition/sending, inbound access and downloads are excluded.

November 1996 documentation supports entering PC-VAN and using TELNET for mail
on a separate server. April 1995's incoming-only restriction describes an earlier
snapshot. Selector 2, host/account, prompts, commands, letters and returns are
category D authored controls, not authenticated PC-VAN gateway syntax or a
particular UNIX mail program. Exact historical controls remain unknown. See
[the TELNET evidence record](docs/research/pcvan-1996-1997.md#browser-local-outbound-telnet-issue-95)
and Settings/About for dates, confidence and source URLs. Existing terminal reveal
and skip behavior supplies pacing; there is no separate TELNET timer.

For database retrieval, use `4` → `1` → `FIND パソコン` → `SHOW P1 /1`
→ `SHOW P3 /1 1`. 日経テレコン BiZ searches four short, original, undated Japanese
example articles suited to late 1996, never recovered reporting or prose attributed
to a newspaper. No handle, AI, credentials, remote connection or billing is involved.

`FIND keyword` accepts one whitespace-free literal substring of a title or body;
Latin matching ignores case and the displayed query keeps its entered spelling.
Command words ignore case; whitespace between fields is normalized. Boolean words
(`AND`, `OR`, `NOT`), set references, expressions using `()&|=+*?"/`, multiple
keywords, date/media conditions and extra arguments receive guidance. No stemming,
tokenization, wildcard expansion or regular expressions are performed.
`FIND 通信` finds two articles, `FIND 省エネルギー` one, and `FIND 雪だるま` none.
Successful searches create `/1`, `/2`, etc., including repeated queries. Earlier
sets keep their original order and meaning. Zero hits create no set. Each visit
retains at most 20 successful sets; at capacity, existing sets remain available.
Leave for the database directory with `BACK` and select `1` to start fresh.

`SHOW P1 /n` lists that set's numbered titles; `SHOW P3 /n item` reads the full
article at that position in that set. Invalid syntax, absent sets and invalid or
out-of-range numbers preserve the active view and results. `HELP` redisplays it.
`BACK` follows article → that set's titles → search/results → directory → actual
entry parent, including `2 索引` → `4`; `MAIN` clears the path. Repeated FIND/SHOW
replace views without adding parents. Leaving BiZ clears all its transient sets.
Articles and sets stay outside IndexedDB and backups; browsing leaves community,
mail, conference/OLT, consent, read markers and calendar records untouched.
Normal session/history bookkeeping continues. Settings/About returns to the same
view. Queries and article markup remain literal terminal text, also in `LOG`.

The 1993 gateway evidence and 1995 FIND/SHOW semantics support this
[qualified reconstruction](docs/research/pcvan-1996-1997.md#telecon-biz-database-retrieval-issue-75).
Continuity into November 1996 is a moderate-confidence inference. Placement,
selectors, prompts, spacing normalization, matching, set lifecycle/limit and return
controls are authored choices, not authenticated host behavior or historical
limits. Source scope, failed PDF page-image access and limitations are available
in Settings → Details/About. No later Telecon21 web interface is imported.

For environmental information, use `5` → `1` → `READ 1` or `READ 2`.
EICネット (EIC NET) is a separate destination reached through the gateway,
with two short, original Japanese readings about finding reference material and
keeping a nature-observation notebook. `HELP` preserves the current view;
`LIST` repeats the directory/list or returns from an article to its list.
`BACK` follows article → EIC NET list → gateway → actual parent (MAIN or index);
`MAIN` clears the path. Browsing needs no handle, AI or external connection and
does not change community records. Gateway availability and information purposes
are evidenced; MAIN 5 placement, selectors, layouts and controls are reconstructed.
The undated readings are illustrative fiction, not archived articles or official
announcements. Settings → Details/About and the
[EIC NET research record](docs/research/pcvan-1996-1997.md#eic-net-environmental-information-issue-69)
provide source dates, confidence and unresolved chronology, including the 1997
confirmation that text operation continued alongside the web service.

At DAISIZEN (`13` → `2`), `MAIL` opens its own mailbox directory,
`LIBRARY` opens five reading categories and `OSL` opens six file categories.
Choose a category number, then `READ number` to read an original article or a
file description and text preview. Try `LIBRARY` → `2` → `READ 1` (seasonal
observations), `LIBRARY` → `5` → `READ 1` (an original digest), `OSL` → `1` →
`READ 1` (documentation), or `OSL` → `2` → `READ 1` (observation data).
Other categories are honestly empty. `HELP` repeats the current view; `LIST`
returns from content to its listing. `BACK` follows content → category listing →
service directory → SIG; `MAIN` clears that path. These controls and all examples
are reconstructed. Category labels/order follow an undated memorial and remain
provisional for 1996. Bundled OSL dates are fictional 1996 simulation dates; sizes count
the preview body's UTF-8 bytes (LF, no BOM), not historical transmission bytes.
From an OSL category listing or preview, `DOWNLOAD number` selects a file in
that category. Confirm with `Y` to request a browser download under its catalog
filename. Bundled `NOTEINFO.TXT` / `HARU96.CSV` and saved original text use
the exact body, including any entered final LF. `HELP` repeats the filename, byte
count and controls.
Empty/invalid input cannot approve; `N`, `BACK` or `CANCEL` cancels into the same
view, and `MAIN` cancels into MAIN. Success or initiation failure consumes approval
and returns to the requesting view; another attempt needs a fresh request.
Settings/About remain available; the Options modal preserves unsent input.
Approval is temporary and discarded on reload, restore or reset. The browser
controls saving; the app reports only the handoff, not disk-save completion.
Acquisition needs no handle, AI, account or network access and leaves community
records unchanged. Nothing executes or uploads. Commands, confirmation and browser
handoff are modern reconstruction, with historical encodings, protocols, rates,
charges and exact host prompts unresolved. See
[acquisition provenance](docs/research/pcvan-1996-1997.md#browser-local-osl-acquisition-issue-91)
and [collection provenance](docs/research/pcvan-1996-1997.md#library-and-osl-browsing-issue-59).

In OSL category **1** (original documents) or **2** (observation/tabular text),
`REGISTER` starts terminal composition with the selected category and human
handle pinned. If needed, the existing optional handle registration offers
`Y` / `N` / `SKIP`; declining creates no file. Enter filename, title, purpose,
then body lines. The reconstructed filename rule is 5–64 ASCII characters:
an alphanumeric first character, then alphanumerics, `_` or `-`, and a `.TXT`
or `.CSV` suffix (case insensitive), without paths or spaces. Title and purpose
are nonblank, at most 200 JavaScript string characters each; body is nonblank,
at most 20,000. Unsafe controls (including tabs), bidi/invisible control text
and metadata newlines are rejected. Japanese, markup and spaces remain literal.
Body lines join with LF: an empty final entered line preserves a final LF;
no final LF is added automatically. `.TEXT MAIN` / `.TEXT .END` enter command-like
body lines literally; `.END` reviews the complete body, metadata, author and
UTF-8 byte count. `EDIT` offers `FILENAME name`, `TITLE text`, `PURPOSE text`,
`LINE number text`, `DELETE number`, `APPEND` and `REVIEW`. Only review `Y` saves;
`N` there or `CANCEL` / `.CANCEL` discards. `HELP`, `BACK` and `MAIN` retain the
draft. Settings/About excursions preserve it and its category; return with `BACK`.

Successful registration is immediately browser-local: `LIST` / `READ number` /
`DOWNLOAD number` refresh saved entries after re-entry, reload, another tab's
registration or JSON restore. Bundled numbers remain intact; new numbers append
within the category. Case-insensitive filename collisions (including fixtures)
fail without overwriting, and failed writes retain editable input for explicit
retry. Dates retain operational timestamps in storage and display those actual
instants in fixed JST; author labels use the current safe handle
and synthetic identity. Saved entries are separate from forums, mail, conference,
OLT, NetNews and resident-generation context. JSON includes `osl-local`; older
backups without it and explicitly empty state mean no authored files. Reset
removes authored entries; world replacement discards drafts and pending acquisition.
Drafts are memory-only and excluded from command-history persistence. Viewing
and cancellation create no OSL state. No model, remote transfer, disk-file upload,
binaries or execution are involved. Registration capability has historical support;
applying it to DAISIZEN is a moderate-confidence cross-SIG inference. `REGISTER`,
the form, restrictions, immediate availability and UTF-8 sizing are reconstruction,
without historical approval, licensing, fee or protocol claims. See
[registration evidence and conventions](docs/research/pcvan-1996-1997.md#browser-local-osl-registration-issue-121).

`CONFERENCE` opens a retained electronic conference, separate from forums and OLT.
Use `LIST` / `HELP` for contributions, `READ number` for a body, `WRITE` for a new
contribution or `REPLY number` for a reply. Writing uses the selected local human
handle (registration is optional until writing). Enter a title and multiline body,
then `.END` → `EDIT` / `Y` / `N`; `.CANCEL` discards explicitly. `BACK` returns
to DAISIZEN and `MAIN` clears navigation. Drafts retain ownership until submitted
or cancelled. Reads need no handle, AI consent or model. Submissions remain in
this browser after return/reload and in JSON backups. New starter worlds include
three original Japanese contributions by 草笛 and こまどり; existing/imported or
intentionally empty conferences stay empty and accept their first human contribution.
No attendance or AI generation is attached to the conference. Topic organization,
commands and content are reconstruction; see [conference evidence](docs/research/pcvan-1996-1997.md#retained-electronic-conference-issue-65).

Conference `READ` separates the author's stable synthetic `(SYN-…)` identity
from their safe current pen name in the existing `発言者：` line. It uses the
same identity as forums, mail and OLT, distinguishes duplicate handles, and
survives renames, member reordering, reload and JSON restore. Rereading shows
the current name; earlier scrollback and stored contributions stay unchanged.
Unusable names show `名無し`; unresolved authors show `(不明) 名無し`, with no
conference DEMO exception. This adds no stored fields or writes on reads.
Sources inspected 2026-10-24 support distinct ID/name concepts with moderate
historical confidence; exact conference geometry has low confidence. Token
generation, author-line placement, delimiters and current-name refresh are
reconstruction; see [conference identity evidence and source limits](docs/research/pcvan-1996-1997.md#conference-identity-and-handles-issue-85).

`OLT` opens a local chat room directory. `FORUMS` retains
boards `1`–`7`; `J MITI` → `3` → `9` retains 資料室 and its existing reading,
posting, reply and unread behavior. A saved empty board stays empty.

MAIN or index `16` opens a short Wakaba welcome; `1` enters the single
original beginner board **はじめての広場**. Read with `LIST` / `READ number`,
select a human through `HANDLE` for `UNREAD` / `NEXT`, or try `WRITE` / `REPLY number`
→ title → body → `.END` → review/edit → `Y` to save or `N` / `.CANCEL` to cancel.
`BACK` follows board → welcome → actual MAIN/index caller; `MAIN` clears the path.
The welcome itself is not a composition destination. Missing/empty boards explain
how to begin; only a successful human save creates an absent board.

Only pristine initialization/reset adds [three original contributions](data/pcvan/wakaba.json)
by existing fictional residents 水玉 and タブストップ, including a question and linked
reply. Existing, legacy-populated, expanded, imported or deliberately emptied worlds
receive no Wakaba examples automatically. The existing scheduler may visit stored
boards under consent, resident preferences and normal budgets; no answer is promised.

The reproduction supports MAIN 16 provisionally, and retrospective participant/client
documentation supports beginner communication with moderate historical confidence.
Exact 1996 secondary screens/controls have low confidence. Board name, selector `1`,
`LOCAL-WAKABA:1`, wording, navigation, controls and conversation are **category D
reconstruction**, not an authenticated SIG directory or `J WAKABA` shortcut.
The welcome also offers `2 OLT` → `WHO 1` / `JOIN 1` → **はじめての談話室**
(stable room ID `wakaba`). Quiet reading and basic questions are welcome;
attendance and transcript are separate from DAISIZEN. `/LEAVE` or `/BACK` returns
to this directory, then `BACK` restores the welcome and the actual caller.
Welcome selector `2`, the room name/ID, local selectors, controls and presentation
are category D reconstruction. The client author explicitly describes Wakaba OLT
attendance/participation separately from retained messages (high capability
confidence, unresolved release date); a separate beginner synchronous experience
has moderate historical confidence, exact late-1996 configuration low confidence.
Sources rechecked 2026-10-24; see the [Wakaba OLT record](docs/research/pcvan-1996-1997.md#wakaba-beginner-olt-issue-113).
A full historical directory remains outside this subset. Settings →
Details/About and the [research record](docs/research/pcvan-1996-1997.md#wakaba-beginner-board-issue-109)
provide source scope, access dates and limitations.

The separate **一般掲示板** opens directly at MAIN or index → `13` →
`6` → **募集とお知らせ**. It serves general notices, hobby recruitment and
practical exchanges, alongside the five SIG destinations and outside Wakaba's
beginner purpose. `LIST`, `READ number`, `UNREAD`, `NEXT`, `WRITE` and
`REPLY number` reuse forum behavior. Anonymous visitors can list/read; personal
unread tracking and submission require `HANDLE`. Composition uses title → body →
`.END` → `EDIT` / `REVIEW` / `Y` or `N` / `.CANCEL`. `BACK` returns to
communication, then the actual MAIN/index caller; `MAIN` clears that path.
An absent board stays usable; only a successful explicit submission creates it.
A pristine world includes three original Japanese contributions by 水玉 and
タブストップ: sketch-circle recruitment, its linked response and a printing tip.
Existing/imported/deleted worlds receive no automatic examples.

Earlier NEC accounts (April 1989, p. 61; March 1993, p. 232) and the client-author
capability description support this distinct purpose. Continuity into late 1996
is an inference with moderate confidence. Selector `6`, placement, name,
`LOCAL-BULLETIN:1`, header, anonymous reading, replies and all controls are
**category D reconstruction**. No authenticated jump command, full directory or
exact 1996 workflow is claimed. Sources inspected 2026-10-24, including URLs,
era and confidence, are in [the research record](docs/research/pcvan-1996-1997.md#general-public-bulletin-board-issue-117)
and on-demand About. [The authored fixture](data/pcvan/bulletin.json) contains no
archival messages, identities or images.

The community directory (`13`, or `8` / `11` → `SIGS`) adds these routes.
Selectors below are reconstructed bridges; historical names and date limitations
are recorded in [the research notes](docs/research/pcvan-1996-1997.md#expanded-communities-issue-51).

| Directory route | Boards | Local practice |
| --- | --- | --- |
| `3` DOS/Vワールド | `1` パソコン相談室, `2` 工作机 | State machine/OS/conditions, report results; keep small failed experiments |
| `4` ゲーム談話室 | `1` 攻略と感想, `2` 週末スコア帳 | Hint before answer, warn about plot details; compare personal progress |
| `5` グローバル・ビレッジ | `1` ビレッジ・ボード | Monthly gatherings and brief introductions, reading-only visits welcome |
| `2` → `FORUMS` | DAISIZEN `3`, `5`, `7` gain histories | Book notes, observations without precise nest locations, optional neighborhood events |

Every board accepts `LIST`, `UNREAD`, `NEXT`, `READ number`, `WRITE`, `REPLY number`, `HELP`,
`BACK` and `MAIN`. The same human handle/member ID and the resident roster travel
between boards. AI remains optional and uses the existing consent and budgets.
See [SIG navigation](docs/sig-navigation.md).

For a reading round, enter a forum → `UNREAD` → `NEXT` → repeated `NEXT` →
the no-unread response → `BACK`. `UNREAD` lists existing numbers above the
selected human's marker; `NEXT` opens the lowest such number, skipping gaps.
`LIST` and `HELP` still show the complete list. These commands refresh content
and the selected human each time; `HANDLE` selects/registers a local reader,
while anonymous `LIST` / numbered `READ` remain available. NEXT saves the marker
before displaying the body and can be retried if saving fails.

The marker is a **high-water mark**: reading number N, including numbered READ,
marks everything through N read, even bodies never opened individually. It is
separate for each human/forum and survives reload and JSON restore. UNREAD/NEXT,
their spelling and one-post-at-a-time journey are **category D reconstruction**,
not authenticated PC-VAN host syntax or client autopilot emulation. Client
descriptions support unread retrieval, with unresolved release dating; the
1995 publisher comparison describes other services' unread controls. See the
[dated sources and access limits](docs/research/pcvan-1996-1997.md#forum-unread-reading-issue-107).

DAISIZEN OLT accepts `JOIN 1` / `JOIN 2`; Wakaba OLT accepts only `JOIN 1`
(or the local room number). Both support `WHO number`, `WHO`, `HELP` and `LIST`.
Selectors are resolved only within the current directory, including `/JOIN` and
`/WHO` inside rooms; Wakaba never exposes the other rooms through selector `2`.
Inside a room, ordinary lines are speech, including literal `MAIN`, `BACK`,
`WRITE` and `HELP`. Use `/HELP`, `/WHO`, `/LIST` (last 40 lines), `/JOIN number`,
`/LEAVE` / `/BACK`, or `/MAIN`. `//text` sends a leading slash literally.
`/HANDLE` leaves the room for terminal handle registration/selection. The same
human/resident IDs and current handles are used by forums, mail and OLT.
Speech, `/LIST`, attendance and member-attributed arrival/departure lines show
that member's forum `SYN-…` token separately from the current safe handle.
Renames refresh reread lines; earlier terminal scrollback keeps its original text.
Unusable names use `名無し`; unresolved members use `不明` / `名無し`, with no
OLT DEMO exception or saved identity field.

Sources checked 2026-10-24: the
[1997 judgment reproduction](https://www.law.co.jp/cases/pcvan.htm) distinguishes
transmitted IDs from optional handles (high transcription confidence, moderate
historical confidence; original/annex unavailable). The
[August 1996 forum archive](https://someya.sakura.ne.jp/poem/tansi/tansimain.html)
independently shows separate fields (high confidence), and the
[まいとーく description](https://www.vector.co.jp/soft/win95/net/se024554.html)
describes ID/handle lookup and OLT attendance (release date unresolved).
November 1996 continuity, token placement, attendance/notices and rename behavior
are reconstruction choices; commands and exact layout remain unverified.
See [OLT identity evidence](docs/research/pcvan-1996-1997.md#olt-identity-and-handles-issue-79).

The 100 fictional residents may visit, listen, greet, converse and depart according
to their configured hours and interests. After existing model consent, replies
can arrive after a short delay, without generation/approval commands. Quiet and
empty rooms are normal. No consent or usable WebGPU means no generated speech;
human chat, navigation and persisted readback still work. No remote users connect.
Presence reconciles on connection, visible resume and a bounded 15-second cadence,
including outside OLT, independently of model consent. Directory counts and JOIN
share that state; pre-existing residents are listed without replayed arrivals.
Visits end individually rather than at shared hourly cutoffs. Presence and bounded
transcripts survive reload and JSON backup; gaps reconcile current attendance
without a backlog of chat or historical arrival/departure notices. Prompts separate
speaker, addressee and speech from status; self-greetings and obvious echoes are
rejected before storage, with at most one corrective completion charged to the
persisted budget. Saved human speech immediately requests a reply. With a suitable
present resident and warm, authorized model, the goal is a displayed answer in
roughly **10 seconds or less**, not a guarantee. A single 94–98% reply decision
prioritizes active humans; personality-based spontaneous topics and short resident
exchanges retain quiet intervals. OLT-only prompts/output are shorter than forum
posts. Language quality remains limited by the small local model.
Setup, provenance and maintenance remain in Options. All three rooms share the shared 120-attempt hourly OLT cap
and inference lock. Valid version-1 two-room saves are checked before an empty
Wakaba room is added; existing lines, counters, timestamps, reservations and
budget remain intact, subject to normal presence/turn expiry and cancellation.
Normalization is lazy and idempotent, with no database/backup version change.
See [OLT behavior](docs/local-ai.md#olt-rooms) and
[storage contract](docs/local-storage.md#olt-persistence).

Mail directories accept `INBOX`, `SENT`, `MEMBERS`, `WRITE address` (or `WRITE`
then an address), `READ number`, and `REPLY number`. `LIST` refreshes the current
view. Use the existing human handle to write to the same 100 resident IDs/handles
used in SIGs, or an explicit Internet destination such as
`WRITE INET#observer@letters.example.invalid` (`COMPOSE` also works). Internet
letters save only in this browser and send nothing to an email server. Their
addresses retain spelling/case through review/edit, SENT/READ, reload and backup;
they create no external members, remote read evidence or resident AI context. See the
[bounded ASCII address subset](docs/mail.md#browser-local-internet-destinations-issue-93).
Compose subject/body, `.END`, then `EDIT` / `Y` / `N` through the single terminal
input. Sent and received letters have stable numbers, subjects,
actual JST display dates with four-digit years (stored as operational UTC), reply chains and
per-recipient read markers. Cancelled drafts do not send. [Mail commands and privacy](docs/mail.md) explain the full workflow.

`WRITE-MULTI` selects one existing local resident per line; `.END` after at least
two distinct recipients starts one draft. Review all pinned recipients and text,
then approve `Y` to save separate ordinary letters atomically, each with its own
number and pair-specific confirmation. `SENT`/`READ` inspect every copy; saved
copies survive reload and JSON restore. Unsent selections/drafts last only in the
current tab and are invalidated by world replacement. Internet recipient lists
remain unsupported. This roster-bounded command and copy layout are category D
reconstruction: the 1993 NEC account documents up to 100 simultaneous recipients,
with moderate confidence in continuity into late 1996. See [multi-recipient mail](docs/mail.md#multiple-local-recipients-issue-119)
and its [dated research](docs/research/pcvan-1996-1997.md#multiple-local-mail-recipients-issue-119).

Read a resident's public profile with `MEMBERS` → `PROFILE hoshimori` in any
mailbox, or `WHO` → `PROFILE identity` in either OLT directory. Inside a room,
use `/WHO` → `/PROFILE identity`; plain `PROFILE ...` remains speech and
`//PROFILE ...` speaks a leading slash. Reading preserves the mailbox, room and
navigation parent and needs neither registration nor model consent. It performs
no writes, attendance refresh or inference; ordinary background OLT activity and
command history continue independently.

Lookup accepts a resident destination key (also its full member key), then an
existing `SYN-...` display token (case insensitive), then an exact current safe
handle, retaining internal spaces. Keys take precedence even when the resident
is absent; duplicate matches are rejected. Tokens remain presentation only and
cannot address mail or authenticate. Only actual supported resident members
expose four public fields: current safe handle, synthetic token, fictional
occupation and interests from saved settings (defaults when no settings exist).
Humans, unsupported AI, unknown/missing residents and `INET#` addresses receive
unavailable feedback. Handles are locally bounded to 80 Unicode characters,
occupation to 80, interests to eight items of 40 each; stored values stay intact.
No private mail, instructions, routines, schedules or affinities are exposed.

The [profile research](docs/research/pcvan-1996-1997.md#resident-profile-lookup-issue-115)
and Settings → Details/About record inspected evidence and access limitations.
The general discovery experience has moderate historical confidence; exact
controls have low confidence. Command names, lookup rules, placement, four-field
selection and anonymous access are category D reconstruction.

Resident mail lists, both header parties and new/reply recipient confirmation
show the same stable `(SYN-…)` token used in forums and OLT, separately from the safe
current handle. `MEMBERS` matches each available resident's short address to
that token and name; use the short address for duplicate handles. Tokens are
display labels, not addresses. Renames, member ordering, reload and JSON restore
preserve tokens. Re-rendered views show current names, while drafts retain their
resolved recipient and opening label through editing and save retry. No stored
display fields or additional read events are introduced.

The [mail identity research](docs/research/pcvan-1996-1997.md#mail-identity-and-handles-issue-83)
records sources inspected 2026-10-24: moderate historical confidence in separate
IDs/names, low confidence in exact 1996 mail formatting. Placement and refresh
are category D choices. The [Internet-mail research](docs/research/pcvan-1996-1997.md#outbound-internet-mail-issue-93)
records high-confidence November 1996 `INET#` addressing separately from the
reconstructed local-save journey, address limits and unresolved new/old-mail
relationships. JSON backups and terminal logs include external letters/addresses.
Settings → Details/About carries the source URLs and qualifications.

Settings / Options → **Internetメールの創作サンプル** explicitly adds one
original fictional incoming letter to the selected human. Register/select a human
with `HANDLE` first. Loading is local, opt-in and idempotent per recipient; startup,
registration, reload, reset and restore do not load it. Enter any mail route,
`INBOX` → `READ number` → `REPLY number`, compose, `.END`, optionally `EDIT` →
`REVIEW`, then explicitly approve `Y` to save the reply in this browser. INBOX
shows the external address and sample label; SENT/READ retain the reply destination
and incoming parent. Neither direction uses resident AI context or sends external
requests. Address, fictional provenance, parent and read marker survive JSON
backup/restore. This is separate from TELNET remote mail. See the
[incoming-mail contract](docs/mail.md#opt-in-incoming-internet-sample-and-replies-issue-97)
and [historical evidence](docs/research/pcvan-1996-1997.md#incoming-internet-mail-issue-97).

All three mail entries also offer `WRITE-AT resident` → future simulated-JST
`YYYY-MM-DD HH:mm` → compose/review/edit → explicit `Y`. `PENDING`,
`READ-PENDING P-…` and confirmed `CANCEL-PENDING P-…` inspect/cancel the selected
human's pending letters before due. This reconstructed subset supports one existing
local resident and at most 30 elapsed days. Pending text stays outside delivered
mail and resident knowledge. Deterministic release needs no AI: active startup,
resume/refresh and minute boundaries process due letters exactly once. Nothing
runs while the browser is closed; overdue letters release on the next active visit.
Actual processing time and intended availability remain separate in JSON backups.
See [scheduling, retention and privacy](docs/mail.md#scheduled-local-delivery-issue-123)
and [dated evidence and confidence](docs/research/pcvan-1996-1997.md#scheduled-local-mail-issue-123).

Residents may privately initiate or reply at their scheduled visits after model
consent, with quiet periods and bounded shared generation budgets. They use only
bounded correspondence with the recipient and limited public context. Reading
and human sending need no model, GPU or network. Letters stay in IndexedDB and
JSON backups. Private within this fictional world does not mean encryption or
isolation from anyone using the same browser profile/device.

Other information collections remain empty. `HELP`, `BACK` and `MAIN`
work throughout; `BACK` from a mailbox returns to its own entry directory. The
index uses MAIN selectors except `2` and `Q`. `Q` remains scoped to MAIN, without
single-letter `B`/`M` aliases. Commands, mailbox sharing and layouts are reconstructed
conveniences, not verified historical sequences. There is no remote mail delivery,
shopping transaction, remote file transfer, internet gateway or multi-user chat. Opening
these screens loads no model and makes no network calls. Settings → Details/About
provides local fiction provenance and historical uncertainty on demand.

## Terminal appearance and output speed

The terminal screen and prompt fill the viewport below the discreet header.
Open **設定 / Options → 表示・端末** for theme, speed, effects, session times
and log download. Application status/errors appear in Settings; legacy typed
menus also show requested results. **操作案内・詳細・出自** contains sources
and provenance without adding commentary to ordinary reading.

Ordinary output uses concise navigation and operational notices. About contains
the evidence categories, source URLs, era limitations, invented controls,
fictional identities and seed/AI provenance. Original fixtures and research are
preserved; local posts retain their exact text. Display offers white, green and
amber themes with optional static glow and scanlines, plus a compact local Japanese monospace stack. No font downloads are
required. These are reconstructed aesthetics, not authenticated PC-VAN screens.

`SPEED` offers 300/1200/2400/9600 bps and **Instant**.
The default is 2400 bps, or Instant with reduced motion. Effects default off.
Escape reveals queued text; a submitted command also reveals earlier
text before the queued command response. Changing speed reveals the current backlog.
Theme, speed and effects persist locally and travel with JSON backups; an explicit
choice overrides the motion-aware defaults. Animation uses a limited Shift-JIS-oriented
cost model at nominal bps / 10 units per second: ASCII (including LF), half-width
kana/punctuation U+FF61–U+FF9F, yen and overline cost one unit per code point;
every other code point costs two. At nominal 300 this gives 30 ASCII/half-width
kana or 15 common full-width Japanese characters per second. Complete Unicode
graphemes wait for their summed cost; transcript text stays unchanged. Emoji and
combining marks use the explicit modern two-unit fallback. These are perception
choices, not exact wire bytes, framing, compression, host delays or measured modem
throughput. See the [evidence and reconstruction policy](docs/research/pcvan-1996-1997.md#japanese-character-pacing-issue-73).
See [display controls, accessibility, timing and limitations](docs/terminal-display.md).

## Optional local AI

Open **設定 / Options → AIモデル・活動**, or use the neutral **AIモデルの準備**
header cue. Opening either never downloads a model. Select a model, click
**モデルを読み込む**, read the hundreds-of-MB-to-GB download, storage, GPU and
local-generation disclosure, then explicitly consent. 中止 or closing never grants
consent. Progress, cancellation, errors and readiness appear in the dialog.
**あとで準備** records per-world deferral and hides the cue; Settings remains
available. WebGPU on HTTPS/localhost is required.

Current [Issue #143 validation](docs/validation.md#issue-143-resident-world)
records genuine WebGPU/Qwen chat, forum/mail and latency observations alongside
four ordinary production worlds. Captured copied phrases, unfinished replies,
profile text used as titles and promised-but-absent mail steps now have rejection
regressions. These lexical checks do not establish factual or conversational
quality. Further dialogue-quality improvements are tracked in
[Issue #145](https://github.com/takahirox/pcvan/issues/145), following the scope
clarification in #143; functional real-model validation remains required.
The compact output grammar prevents ASCII whitespace continuations from consuming
a mail generation; successful completion alone does not establish relevant advice.

New worlds default to an automatic cap of four saved posts and twelve generation
attempts per persisted six-hour window. Closing or reconnecting does not
renew that allowance. This does not authorize a model download. After consent, later visits may load the authorized model when
work is due, including fetching evicted assets. Readiness does not promise
immediate posts. The 82 prewritten posts exist before model setup.

Residents observe public posts, live room speech and their own delivered mail,
then independently decide whether to read, reply, start a topic or stay quiet.
Human and AI authors follow the same path. Reading needs no model; only selected
writings enter a bounded queue for the one consented worker and cross-tab lease.
A shared OLT contribution can attract several different residents. Forums and mail
follow personal reading visits, interests, routines and relationships, with no
universal twenty-minute reply delay or separate fast-human scheduler. Mail stays
private to its correspondents. [Data flow and bounds](docs/local-ai.md#scheduling-discussion-and-bounds).

The resident editor selects the 100 profiles with a handle/job/interest filter and edits handle, job,
routine, voice, interests, hours, UTC offset, frequency, weights and affinities.
Arrays use commas and affinities use JSON. Save validates; 変更を破棄 cancels.
Profiles retain their IDs and survive backups. Residents automatically select
their own topics, boards and reply targets; humans never need to press GENERATE
or SAVE for them. Model cache inspection never downloads missing weights. Details retain all provenance.
Legacy typed shortcuts in the table above use the same model and storage actions.

While the page is visible and connected, one world loop checks ready work and
live output each second and reconciles scheduled attendance/reading every fifteen
seconds, on MAIN and every service screen. Residents can start and answer OLT
conversations before a human joins; JOIN reveals their stored dialogue. They may read, start topics, reply to humans or other residents, or stay
silent. Nothing runs while closed. Reopening reconciles a bounded current state,
without inventing a backlog of conversations.
Scheduled times are fictional and actual commit times remain inspectable. One
shared model worker serializes generation; a cross-tab Web Lock prevents competing
models. Missing Web Locks pauses automatic inference. Set the cap to **0** to
pause, or set an individual frequency to **0**.
`STOP` cancels work, unloads the model and suspends automatic retries
until explicit recovery or another visit. Failures leave the terminal usable.

Settings distinguishes paused activity, missing initial authorization, loading,
processing, waiting for a due time or allowance renewal, and failures. Model load,
cache, GPU, validation and storage errors remain in these on-demand diagnostics.
OLT also shows the recent outcome and elapsed stages from Enter through actual
terminal display, including warm/cold readiness, busy work, no eligible resident,
intentional silence, rejected output, caps, timeout and display pacing. No chat
text or private prompts are logged. See the [resident architecture and validation
record](docs/local-ai.md#resident-world-issue-143). OLT readback continues during typing and IME
composition, preserving the draft, caret and focus. Live chat reveals immediately;
other output retains the selected retro speed. Load/retry the authorized model in Options after resolving
its reported blocker. A failed forum/mail batch is retained; retry it from
Settings after correcting the cause.
Model selection, cache checks and detailed provenance remain available.
Inference stays local, with no external AI API, key,
backend, remote participants or paid service. These residents are fiction, never
historical users. See [local AI behavior and limitations](docs/local-ai.md).

## Local data and backups

Open **設定 / Options → ローカルデータ・保守 → JSON を保存** for a validated
snapshot, including original OSL text entries. **JSON から復元** opens the native
file picker, validates the file and
requires explicit replacement confirmation. The warning offers a backup before
replacing all local data; there is no merge or automatic export. 中止, closing,
invalid data and transaction failures preserve the old world. Errors stay in the
dialog. Other tabs reload after replacement; stale connections cannot write into
the replacement world. `BACKUP` / `IMPORT` remain optional typed shortcuts.

A truly pristine profile receives 100 resident identities, fifteen populated boards
and 82 prewritten forum posts in twenty-six threads, plus three electronic-conference
contributions, in one transaction. The original
[30 posts/eight threads](data/pcvan/fictional-community.json) remain intact;
[36 additional authored posts](data/pcvan/expanded-community.json) add PC help,
games, books, bird observations, a small observation event and everyday
conversation; Wakaba adds three posts in two beginner threads, and the general
bulletin board adds three posts in two notice threads.
[Ten further original posts](data/pcvan/forum-starters.json) add four threads in
DAISIZEN boards 2, 4 and 6, completing all 15 public posting destinations.
See the [route-by-route inventory](docs/sig-navigation.md#public-forum-content-inventory-issue-131). Dates are fixed once
relative to creation (or the one-time expansion), over the preceding roughly
two weeks, with a quiet day and recent activity; they are not dated as genuine 1996 material. Origins
`local-seed:fictional`, `local-seed:authored-sigs-v1`, `local-seed:wakaba-v1`, `local-seed:bulletin-v1` and `local-seed:forum-starters-v1`,
plus the `community-world` setting, preserve provenance in `ABOUT` and JSON backups.
Subsequent model output uses `local-ai:webllm:<modelId>` instead.

Reloads and other tabs never refill deleted posts. Intact, locally seeded v1
worlds receive a one-time expansion into missing default boards; existing boards,
identities, settings and read markers are preserved. Imported or legacy worlds
receive no automatic history. See [migration eligibility](docs/local-storage.md#community-expansion-migration). For a pre-feature profile with no posts and safe,
unambiguous board mappings, Settings → ローカルデータ・保守 offers 初期会話を追加
with an explanation and explicit confirmation (`POPULATE` remains a typed shortcut). It preserves members, custom names and counters,
and can succeed only once. Imported worlds, including empty restores, are excluded.

Existing profiles keep their saved content; this feature adds no migration,
backfill or recovery control. To start again with the complete starter content,
export a JSON backup, then use Settings → ローカルデータ・保守 → 初期状態に戻す.
This existing confirmed action deletes the old world and creates the new baseline.
Restoring an empty backup keeps the world empty; it also suppresses the old DEMO
fallback. Clearing all browser site data removes the initialization marker, so the
next visit creates a new world. Export first to retain your current world.

Stored SIGs map by case-insensitive `keyword` and forums by `boardNo`. The
MITI/DAISIZEN routes remain stable; application keys `LOCAL-DOSV`, `LOCAL-GAMES`,
`LOCAL-GV`, `LOCAL-WAKABA` and `LOCAL-BULLETIN` identify reconstructed additions, never historical jump commands.
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
To start over, use Settings → ローカルデータ・保守 → **初期状態に戻す**.
The warning offers **先に JSON を保存** and requires explicit confirmation before
it irreversibly deletes local posts, mail, members, read
markers, resident edits, AI activity/consent, display preferences and history.
中止 or closing preserves them. `RESET` remains a typed shortcut with its own
explicit `Y` confirmation.
The app recreates the expanded baseline: 100 residents, 82 forum posts in twenty-six threads
and three electronic-conference contributions,
then reloads this and other open tabs into a fresh MAIN session. Check the restored
posts with `J MITI` → `3` → `9` → `LIST` / `READ 1`.
Reset needs no model, WebGPU or download. It preserves downloaded model weights,
the optional offline app-shell cache and unrelated origin data; AI still needs
fresh consent. Clearing browser site data is a separate browser operation that
can also delete those caches. An earlier JSON backup can restore the old world.
See [the local repository API and versioned backup format](docs/local-storage.md)
for the storage contract used by future SIG/forum controllers.

## Optional offline use and retention

In a production build on HTTPS/localhost, open Settings → ローカルデータ・保守
and click **端末をオフライン用に保存**; wait for the saved status. The terminal, fixtures, local reading/posting and JSON
backup/restore can then reload offline. This saves only the app shell, never model
weights. Development mode does not install a worker. **保存状態・容量を確認**
reports approximate site usage, browser connectivity and persistence;
**永続保存を要求** requests browser-native persistent storage. JSON export is
available in the same panel. Legacy `CACHE` / `STATUS` / `PERSIST` remain supported.

AI downloads require explicit setup consent. After consent, enabled resident
activity can automatically reload the selected model when work is due. `CACHE` in the model menu checks the
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
  log, with Shift-JIS-oriented grapheme costs and batched animation frames.
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
- `src/mail.ts`, `src/ai/mail.ts`: mailbox projections, letter rendering, scheduled
  private actions and correspondent-scoped prompts/validation. See [mail](docs/mail.md).
- `src/forums.ts`: resolves evidence-backed boards to repository posts or original
  demo fixtures, and renders headers without trimming or reflowing post text.
- `src/commands.ts`: terminal prompt ownership, handles, legacy settings shortcuts and confirmations.
- `src/settings-dialog.ts`, `src/settings-actions.ts`: accessible modern Settings
  presentation and actions shared with the typed application shortcuts.
- `src/composer.ts`: line-based composition/edit/review/send with in-memory drafts.
  Draft lines are excluded from persisted command history.
- `src/ai/`: 100 editable fictional residents, deterministic scheduling, bounded generation and validation,
  optional settings/inspection controls and the lazy WebLLM worker adapter.
- `src/storage/`: typed IndexedDB repository, backup validation, and download/restore
  controls. Composition and reading use the v1 backup envelope with an additive mail array;
  IndexedDB version 2 adds the mail store without rewriting prior posts.
- `src/offline/controls.ts`, `vite.config.ts`, `scripts/service-worker.js`:
  offline/retention panel and build-generated app-shell worker.
- `src/news.ts`: original fictional briefs and news directory/headline/detail rendering.
- `src/ftp.ts` and `data/pcvan/ftp-examples.json`: restricted info.mac list/preview and original bundled text files, outside persistence.
- `src/telnet.ts`: bundled fictional host/account/letters and browser-local TELNET views, outside persistence.
- `src/netnews.ts`: fixed-date NetNews examples, merged local articles, header matching and group/list/article rendering.
- `src/gopher.ts`: in-memory directory/search/document paths over two bundled original readings in `data/pcvan/gopher-documents.json`.
- `src/archie.ts`: visit-local filename lookup over original location metadata in `data/pcvan/archie-index.json`, outside persistence and acquisition.
- `src/biz.ts`: original database articles and BiZ rendering; navigation owns transient result sets.
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
fields, literal whitespace/markup, separate identity/pen names, human/resident
renames, duplicate handles, member order, missing authors, seeded/generated
reads, reload/backup stability, gaps and empty/missing/ambiguous forums.
Composition checks cover edit/review/cancel/send, blank drafts, Japanese multiline
text, reply navigation and missing parents, transactional initialization/numbering,
failed writes, and read markers across members, forums, connections and reloads.
Section/service checks cover every MAIN and index destination, all five service views,
mailbox browsing, news providers/headlines/briefs, NetNews groups/header
searches/articles and isolated browsing, local TELNET login/mail/logout and parent
returns, restricted FTP previews/exact confirmed downloads, Gopher directories,
literal title/body searches and exact document/result/query returns, Archie
filename-only searches, duplicate locations/metadata and query replacement,
BiZ search/sets/titles/articles and fresh visits, empty collections,
OLT conversation/presence, preserved fixture
evidence, scoped helpers,
unsupported input, return paths, offline keyboard use without network requests,
and unchanged local content after visiting services and returning to forums.
Command-only browser journeys cover handle handoff, composition/editing, IME,
confirmation refusal/acceptance, backup/import/reset, cross-tab interruptions,
model leases, mocked generation and offline reload, with no in-world secondary UI.
Settings browser tests cover keyboard/focus/mobile/IME, active drafts, display,
model consent/progress/cancellation/failures, a filtered 100-profile editor, native JSON
export/import/reset, stale confirmations and offline/storage controls.
Renderer tests retain controlled character-weight timing/grapheme/queue checks. Repository
and scheduler suites cover transactional rollback, references, deterministic
resident plans, budgets and concurrent commits. Mail suites cover all terminal routes,
IME/edit/cancel/retry, private replies and public follow-ups via mocked WebLLM,
context isolation, individual read markers, two-tab delivery, offline reading,
old database/backup migration, transactional rollback and reset fences.
See [the implementation validation record](docs/validation.md) for commands
actually run and browser checks not performed.
The [test-suite audit](docs/test-suite-audit.md) inventories the 519-case baseline,
compares overlapping coverage and records measured costs and proposed follow-ups.

## Contributing

- [Development flow and English collaboration convention](docs/development-flow.md)
- [Review and merge guidelines](docs/review-guidelines.md)
- [Issue template](.github/ISSUE_TEMPLATE/issue.md)
- [Pull request template](.github/pull_request_template.md)

AI agents should start with [AGENTS.md](AGENTS.md).
