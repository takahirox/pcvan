# Terminal display and simulated timing

The browser terminal uses a single screen with an integrated, native command
input. The header, status strip, bezel, white/green/amber palettes and optional
static glow/scanlines are original presentation reconstructions, not evidence of
a particular PC-VAN terminal. Historical menu labels and evidence categories
remain sourced from `data/pcvan/` and the
[1996–1997 research record](research/pcvan-1996-1997.md).

## Controls and accessibility

Under **設定 / Options → 表示・速度**, the
**表示速度（シミュレーション）** selector offers 300, 1200,
2400 and 9600 bps plus **Instant（即時）**. These are nominal display simulations;
no modem, serial port or line-speed measurement is involved. The default is
2400 bps. **全文表示 (Esc)** reveals all currently pending text. Escape works
within the terminal, including its input and transcript, except during IME
composition. Skipping only changes presentation; future output still uses the
selected speed. Changing speed reveals the old queue immediately and applies the
new speed to subsequent output.

A submitted command reveals pending output before its immediate echo. Completing
the connection during submission also reveals MAIN before the echo. Later
responses animate in the order accepted by the append pipeline. Async command,
reconnect and AI-related output use that same pipeline; animation never blocks
the controller or IndexedDB queue. Rapid submissions retain the app's existing
acceptance order: command echoes are immediate, while responses wait for the
serialized command controller. This does not reorder already accepted text.

**設定 / Options** opens one named native modal dialog containing display/speed,
member, local AI, JSON backup, offline/storage, help, and About groups. None of
these groups or their summaries appear beneath the terminal. Display contains
palettes, optional effects, session timestamps and the transcript download;
**操作ガイド** contains keyboard help. The small **全文表示 (Esc)** button
remains beside the terminal status. Effects default off and never blink, move or
cover the caret.

Settings supports pointer/keyboard opening, visible focus, cyclic Tab order,
Escape and a close button. Closing restores the previous focus synchronously;
IME confirmation does not close it. Writing without a local human opens member
settings and focuses the handle input. The post editor is a separate sibling
modal, never nested inside Settings. The offline backup link expands the existing
backup controls. Control nodes and their original event handlers are reused;
preferences, member data and JSON formats are unchanged.

Detailed AI progress and storage success/errors remain in Settings. Changes while
it is closed add a dot to the trigger and a short polite status directing users
to Settings. Opening clears that indication without clearing the underlying
message. Repeated unchanged statuses and disabled activity do not create noise.

Ordinary connection, menus, HELP and article navigation omit provenance paragraphs,
URLs and evidence tags. **このシステムについて / 出典・制約** preserves the
browser-only scope, differing eras, verified routes versus provisional labels,
invented bridge/helper commands, header uncertainty, fictional demo IDs and local
AI provenance, with links to original sources and research. Demo reading uses
short excerpts without explanatory paragraphs; the original fixture text and
metadata remain unchanged and linked from About. Stored user/AI posts are rendered
verbatim. No display filter is applied to imported or user-authored content.

Enter submits; IME confirmation does not. Up/Down browse history and retain the
draft. PageUp/PageDown scroll output from the input. Shift+Tab focuses the
transcript; browser scroll keys, including Left/Right, work there; Tab returns to
the input. Long lines use horizontal scrolling without reflow, retaining menu
columns, spaces, full/half-width text and newlines. The input scrolls to its real
caret. Visible text remains selectable in every theme, including with effects.
The terminal uses 14px-equivalent text at the default root size with a 1.4 line
height, scaling with browser zoom or text enlargement. The local stack prefers MS Gothic and
Osaka-Mono, then Noto Sans Mono CJK JP, BIZ UDGothic and the browser's monospace.
Kerning, ligatures and proportional kana/alternate spacing are disabled on output.
These are presentation choices, not a verified original PC-VAN font. No font is
bundled, downloaded or extracted. Fallback glyph coverage still depends on the OS;
tests measure Japanese/full/half-width cells and MAIN alignment with available
fonts and forced monospace fallback at desktop/mobile sizes and enlarged text.

With `prefers-reduced-motion: reduce`, the default is Instant with effects off.
Changes to this media preference are followed until a display preference is
explicitly chosen or loaded. An explicit selection overrides that default,
including on later reloads. Animated transcript mutations have `aria-live="off"`;
a separate polite status announces a complete batch when the pending queue drains
or is revealed, rather than announcing each character/frame. Native labels,
focus outlines and the real input caret remain available. Actual screen-reader
announcement scheduling depends on the browser and assistive technology.

## Display-cost model

The simulation uses a deterministic **UTF-8 byte cost**, not an emulated historical
encoding. A nominal 8N1 serial framing approximation budgets ten line bits per
byte: 300/1200/2400/9600 bps provide 30/120/240/960 display-cost bytes per second.
Elapsed `requestAnimationFrame` time accrues byte credits; complete extended
Unicode grapheme clusters are revealed only when their full cost is available.
Each frame paints at most one text batch. Background-tab throttling can cause a
larger catch-up batch on return.

ASCII characters, spaces and line breaks cost one byte each. Japanese kanji,
full-width kana and half-width katakana generally cost three UTF-8 bytes each;
most individual emoji cost four. Combining marks and joined emoji cost the sum
of their UTF-8 bytes but are painted as a whole grapheme. This is an explicit
Unicode fallback for **all** text: nothing is converted to Shift_JIS, substituted,
normalized, interpreted as HTML/control sequences or discarded. For example,
`日` costs 3 and `👩🏽‍💻` costs 15. UTF-8 differs from period Japanese encodings;
this approximates perceived text arrival and does not claim historical throughput,
control-sequence overhead, handshaking, retransmission or terminal emulation.

The animation backlog is bounded to 65,536 UTF-16 code units (a memory bound,
separate from the byte timing model). An append exceeding the remaining capacity
reveals the entire backlog plus the new text immediately. No text is dropped;
subsequent appends animate normally. Consumed queue entries are released during
streaming. Transcript retention remains unbounded in memory, as before; download
and reload for very long sessions. Animation is not a transcript size limit.

## Persistence and transcript integrity

The existing IndexedDB settings store contains an optional `terminal-display`
record with `{ version: 1, theme, speed, effects }`. Its speed values are strings
`300`, `1200`, `2400`, `9600`, or `instant`; themes are `white`, `green`, or `amber`;
effects is boolean. Versioned validation runs on writes and backup imports.
The existing database and JSON backup versions stay at 1: older backups without
this optional record use current motion-aware defaults and retain all other data.
JSON export/import carries explicit preferences; restore applies them immediately.
Failed persistence reports the existing local storage error and leaves the
terminal usable. Other open tabs should reload after restore, as before.

The logical transcript records every accepted append independently of painted
text. **端末ログを保存 (.txt)** exports all accepted output, including pending
animation, with the original line breaks in UTF-8. Unsent drafts are excluded.
Selection/copy uses only visible text. The transcript remains in memory and is
excluded from JSON backups; download before reload to retain it.

No new dependencies, remote assets, backend or command vocabulary were introduced.
WebLLM, local posting/reading, JSON backups and the optional app-shell worker still
use the existing paths, including GitHub Pages under `/pcvan/`.
