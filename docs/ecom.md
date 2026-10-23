# Browser-local ECOM postal letters

Issue [#101](https://github.com/takahirox/pcvan/issues/101) adds a keyboard-operated
postal-letter demonstration, separate from ordinary member/Internet mail.
Historical ECOM arranged printing and physical posting. This application only
simulates acceptance in browser memory: no postal submission, payment, delivery,
recipient reading, external address lookup or print/PDF generation occurs.

## Keyboard journey

From MAIN or the index, type `J ECOM`. Existing numbered MAIN entries are unchanged.
`1` opens service guidance; `2` starts an application; `E` departs to the actual
entry parent. This limited menu distinction is supported by qualified indexed
observations; the controls below and their behavior are category D reconstruction.

Use fictional information, for example recipient `空想 花子` and postal address
`〒123 空想県こもれび町1-2 架空荘`. No real personal information, credentials,
registration, model or payment is needed. Anonymous and registered visits work.
One recipient is an intentional demonstration subset, not a historical limit.

1. Enter the recipient, then the address, each on one line.
2. Enter the letter one line per Enter. Empty lines are retained. `.TEXT text`
   enters command-shaped text literally, including `.TEXT MAIN`, `.TEXT .END`
   and `.TEXT .CANCEL`. This escape also works for recipient/address entry.
3. `.END` displays every field and the exact letter for review.
4. `EDIT` enables `NAME text`, `ADDRESS text`, `LINE number text`,
   `DELETE number`, `APPEND` and `REVIEW`. `LINE number` replaces a line with an
   empty line. APPEND resumes body entry; `.END` returns to review.
5. Only `Y` at review accepts that reviewed version. Edits require `REVIEW` or
   `.END` before acceptance. Empty input and unrelated commands never approve.
   `N` at review or `CANCEL` / `.CANCEL` at any draft stage explicitly discards
   the application. A cancelled later application retains an earlier receipt.
6. `RECEIPT` redisplays the latest simulated acceptance's recipient, address and
   exact body. It works at the service menu and in guidance; a later acceptance
   replaces it. Receipts are original presentation with no historical identifier.

HELP and attempted navigation during a draft explain retention and cancellation;
they neither submit nor discard it. For command-shaped field/body content, use
`.TEXT`. Typed SETTINGS/ABOUT during a draft also give retention help. The modern
header Settings dialog and its About panel can be inspected at any time without
changing the draft or unsent input; closing the dialog never approves. Outside a
draft, typed SETTINGS/ABOUT return to the current ECOM view with BACK.

Outside a draft, guidance BACK returns to the service menu, menu BACK and E return
to the actual MAIN/index parent, MAIN clears the path, and Q disconnects. HELP
redisplays the current menu/guidance. A draft must be explicitly cancelled before
service departure. No forum, ordinary-mail, NetNews, OLT, conference, TELNET or
download context is exposed by ECOM.

## Product limits and lifetime

The recipient permits 1–200 characters, the address 1–1000, and the complete body
1–20000 including LF separators. Counts use JavaScript UTF-16 string length.
Each field must contain non-whitespace text; invalid input retains the field and
draft without appending or replacing text. These bounds and the field order are
product reconstruction, not historical address-validation rules. No seven-digit
postcode is mandatory. Japanese, case, indentation, blank lines, full-width and
half-width characters and literal markup are preserved without normalization.

Drafts, approval state and the latest receipt belong to a single ECOM visit in
memory. Leaving, disconnecting/reconnecting, reloading, resetting or successfully
restoring/replacing the world clears them. This includes identical-JSON same-tab
restore and cross-tab replacement. Queued commands from a departed or replaced
visit cannot revive its application; repeated approval yields only one receipt.
The acceptance owner consumes the reviewed draft synchronously before returning.
Failed restore or merely inspecting/closing Settings does not clear the draft.

Postal fields, body and receipt never enter IndexedDB, durable command history,
JSON backups or resident generation/context paths. ECOM inputs are excluded from
both in-memory recall and durable command history throughout the visit, including
its typed application menus. The ordinary `J ECOM` entry command can be recorded.
Normal session/activity bookkeeping continues. Displayed text does remain in the
in-memory transcript and any explicitly exported terminal log; such a log contains
what was displayed, including echoes, reviews and receipts.

No mailbox/outbox, schema, scheduler, transport, worker/model load, popup or mail
client handoff is added. Community records, mail and read evidence, conference,
OLT, NetNews, consent and settings are preserved, including restored empty
community collections. Activity initialization also respects missing resident
members in restored worlds instead of recreating them on a timer or reconnect.
See the [historical evidence](research/pcvan-1996-1997.md#browser-local-ecom-postal-letters-issue-101)
and [validation record](validation.md#browser-local-ecom-postal-letters-101).
