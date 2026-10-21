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

## Output pacing and export

`OutputRenderer` retains the complete accepted logical text separately from the
painted stream. It spends UTF-8 grapheme costs at nominal bps/10 bytes per second,
paints batches once per frame and bounds pending work. It never splits Japanese
characters, combining clusters or joined emoji. Escape, a new submitted line or a
speed change reveals earlier text. This is a perception simulation, not a modem
connection or historical encoding emulation.

`LOG` downloads all accepted transcript text, including output waiting for paint,
as UTF-8 with exact line breaks. It includes submitted draft lines but excludes
the unsent input. JSON backups contain world data and command history, not the
transcript or in-memory draft. Save a log before reloading if it matters.

Chromium tests cover literal Unicode, controlled frame/grapheme pacing, keyboard
focus/scroll/history, IME events, responsive layout, terminal-only participation
and the modern Settings dialog.
Physical Japanese keyboards, native IME candidate windows, mobile devices and
screen-reader speech quality remain optional manual observations.
