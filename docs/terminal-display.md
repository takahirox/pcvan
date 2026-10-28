# Terminal display and accessibility

The transcript and persistent, labelled `コマンド` input are the sole controls for
PC-VAN participation: handles, navigation, reads, posts and replies. No compose/
registration dialog, clickable parent reference or navigation helper is rendered.
The full-height terminal preserves horizontal scroll and literal text rendering.
The discreet **設定 / Options** header button opens modern application Settings.

Settings → **表示・端末** directly configures white/green/amber, simulated speed
300/1200/2400/9600/instant, static CRT effects, session times and log download.
Other panels cover AI, local data, offline/storage and About/provenance. Optional
`SETTINGS` → `1` → `THEME` / `SPEED` / `EFFECTS` shortcuts share the saved actions.

The accessible native modal enters on its close button, traps Tab/Shift+Tab and
closes with Escape or 閉じる, returning focus to `#command`. Opening is always
deliberate and deferred during terminal IME composition. Opening during an active
title/body/review preserves the state and unsent input; closing cannot submit it.
Dialog IME Enter/Escape never submits a form or closes the modal. Destructive
replacement/reset explicitly warn that drafts will be discarded. Cross-tab world
replacement invalidates model work and dialogs through the existing reload fence.

Preferences persist in `terminal-display` and version-1 JSON backups. The default
is white, 2400 bps and effects off; reduced motion defaults to instant. Explicit
saved choices override the motion default. The local monospace font stack is a
modern presentation choice, not an authenticated PC-VAN font. No font download
is required. Japanese cells and ASCII spacing are preserved without reflow.

## Keyboard and prompts

- Enter submits a line. IME composition Enter, `isComposing` and legacy keycode
  229 are guarded; conversion confirmation cannot post or authorize an operation.
- Up/Down browse the newest 100 nonblank commands and restore the input draft.
  Prompt responses and draft lines are excluded from persisted command history.
- PageUp/PageDown scroll the transcript while preserving input focus and text.
- Shift+Tab focuses the transcript; browser scroll keys and Left/Right move through
  its text. Tab returns to input. No mouse is required.
- Escape reveals accepted output and skips the connection presentation. It never
  approves a confirmation or silently discards a composition.
- `HELP` describes the current menu or prompt; Settings → 操作案内・詳細・出自
  (or `SETTINGS` → `8`) gives the keyboard guide.

First-run registration can be skipped. Posting without a handle resumes its
intent after registration. Composition owns the input until explicit cancellation
or save: title → body lines → `.END` → review (`Y` / `N` / `EDIT`). `CANCEL` or
`.CANCEL` discard. `BACK` and `MAIN` keep drafts and explain the active commands.
Body `.TEXT text` preserves reserved command words literally. In confirmations,
only a typed literal `Y` executes the advertised operation. Blank input never
approves; `N`, `BACK`, `MAIN`, `CANCEL` cancel. Menus/details return using `BACK`.
See the [complete command guide](../README.md#use-the-terminal).

The transcript is a focusable `role=log`, with live streaming disabled. A visually
hidden polite, atomic status announces complete drained batches rather than every
character. Prompts and state changes are present as ordinary log text. Appending
output preserves focus, input contents and text selection. Output follows the
bottom only when already there. Native file selection returns focus to its
Settings action or to the terminal input when invoked by a typed command.
Application model/storage status stays in Settings; requested typed application
menus also show their results. Background model messages never interrupt a human
prompt. Ordinary terminal output contains service content and prompt feedback.

## Service dates

Entry, forum headers, mail lists/details, conference contributions and live or
replayed OLT lines use one world calendar in fixed JST. Forum headers retain
`YY/MM/DD  HH:mm`; other services show `YY年MM月DD日 HH:mm:ss` and identify JST
where a timezone label is present. Missing logout says `記録なし`, including after
reload without Q. The fictional week starts November 18–24, 1996; elapsed time
can carry it into later months/years. Titles, bodies and OSL catalogue dates are
literal. Settings session times remain actual UTC. The [storage policy](local-storage.md#historical-display-calendar-issue-67)
explains durable anchoring and legacy imports; [research](research/pcvan-1996-1997.md#shared-historical-calendar-issue-67)
separates evidence from reconstructed formatting.

## Output pacing and export

`OutputRenderer` retains the complete accepted logical text separately from the
painted stream. A limited Shift-JIS-oriented approximation sums one timing unit
per ASCII code point (including LF), half-width kana/punctuation U+FF61–U+FF9F,
yen U+00A5 and overline U+203E; every remaining code point costs two. Thus
`A=1`, `ｶ=1`, `日=2`, `あ=2`, `カ=2`, Japanese punctuation/full-width space=2,
and empty text costs zero. The two-unit modern fallback applies even to
supplementary characters and combining marks: `😀=2`, `e\u0301=3` and
`👩🏽‍💻=8`. It never tests exact Shift-JIS representability, transcodes, replaces
or normalizes transcript text.

Nominal bps/10 remains the timing-unit budget per second. At nominal 300, fresh
streams reveal 30 ASCII or half-width kana characters, or 15 repeated `日`, in
one second. Each complete grapheme waits for its summed cost, preserving Japanese
characters, combining clusters and joined emoji. Painting stays batched once per
frame; pending work is bounded separately by UTF-16 string length. Escape, a new
submitted line or a speed change reveals earlier text. These are reconstruction
choices for perceived arrival timing, not exact wire bytes, CRLF framing,
compression, host delays or measured modem throughput. See the
[historical evidence and fallback policy](research/pcvan-1996-1997.md#japanese-character-pacing-issue-73).

`LOG` downloads all accepted transcript text, including output waiting for paint,
as UTF-8 with exact line breaks. It includes submitted draft lines but excludes
the unsent input. JSON backups contain world data and command history, not the
transcript or in-memory draft. Save a log before reloading if it matters.

Chromium tests cover literal Unicode, controlled frame/grapheme pacing, keyboard
focus/scroll/history, IME events, responsive layout, terminal-only participation
and the modern Settings dialog.
Physical Japanese keyboards, native IME candidate windows, mobile devices and
screen-reader speech quality remain optional manual observations.

OLT diagnostics in Options include the elapsed time until a newly appended reply
has actually painted in the terminal. `表示キュー` includes the existing output
backlog and configured reveal speed; `表示完了` is recorded after that reply's
last character reaches the DOM, independently of later appends. Enter still
reveals preceding output, and Escape/Instant settles the queue. Reading, typing
and Japanese composition retain their existing focus/input ownership. The roughly
ten-second warm-model reply target includes display time and does not override
slow reveal preferences. See [OLT rooms](local-ai.md#olt-rooms).
