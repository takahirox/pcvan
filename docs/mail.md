# Local electronic mail

MAIN `1 電子メール`, MAIN `X 旧電子メール`, and DAISIZEN `MAIL` retain
separate entry screens and return paths. They project the same local mailbox for
the selected human member. This shared storage, composition commands, short resident
addresses and display layout is a **category D reconstruction**, not a verified
1996–1997 host protocol. See [the research record](research/pcvan-1996-1997.md#electronic-mail-research-issue-52).

## Terminal commands

| Command | Behavior |
| --- | --- |
| `INBOX` / `SENT` | Select the received/sent projection; switching boxes preserves the entry context. |
| `LIST` | Refresh the current directory or mailbox from IndexedDB. |
| `MEMBERS` | Associate each available resident's stable short address with their forum/OLT synthetic token and safe current handle. |
| `READ number` | Read a letter in the current box; mark only that received letter read for its human recipient. |
| `WRITE address` / `COMPOSE address` | Start a letter to an existing resident or explicit `INET#address`. An omitted address prompts in the same input. |
| `WRITE-MULTI` | Select distinct existing local residents, one per line; `.END` after at least two, then compose once and explicitly approve separate copies. |
| `REPLY number` | Reply to received mail in INBOX, preserving its parent ID and prefilling `Re: subject`. |
| `HANDLE` | Choose/register the existing local human identity. An unregistered composition resumes after inline registration. |
| `HELP` / `BACK` / `MAIN` | Redisplay, return to the entry directory/parent, or return to MAIN. During a draft these commands keep it and explain cancellation. |

An address is the exact current resident handle, stable short ID such as
`hoshimori`, or full local member ID such as `fictional-ai:hoshimori`. Bare
Internet addresses, PC-VAN-era account formats and other local human recipients are rejected. Internet destinations require an explicit `INET#` prefix.
Ambiguous handles require a stable ID. Resident profile edits retain IDs and
existing conversations. Added SIGs and OLT use the same member IDs
without creating another identity registry.

Resident mail lists, both parties in letter headers, and the resolved recipient
in new and reply drafts show `(SYN-…) handle`, using the unchanged shared forum/OLT
identity and safe-name helpers. `MEMBERS` shows `short-address / (SYN-…) handle`;
the token is a display label, not an address or authentication. Stable addresses
take precedence over handles, and duplicate handles require a stable address.
This makes same-name correspondents distinguishable across all three mail routes.

Tokens depend only on the complete member ID, surviving human/resident renames,
member ordering, reload and JSON restore. Re-rendered lists and details use the
current safe name; existing scrollback stays as printed. Drafts retain the
recipient ID and display label selected at creation through review, editing and
save retry. Unusable names show `名無し`; unresolved renderer references show
`(不明) 名無し`, without the forum-only DEMO exception. Invalid reference imports
still fail validation. Display calculation adds no writes or stored fields and
does not mark resident recipients as having read mail.

This extension is a [category D reconstruction](research/pcvan-1996-1997.md#mail-identity-and-handles-issue-83).
Sources inspected 2026-10-24 support an identity/name distinction with moderate
historical confidence, not a recovered 1996 header. Token placement, delimiters,
short addresses and current-name refresh are product choices. The local-only
scope does not imply that historical PC-VAN lacked Internet mail; November 1996
documentation separately describes its `INET#` addressing.

```text
1
MEMBERS
WRITE hoshimori
窓から見えた星
  星守さん、あの観察を試しました。
次の晩も見てみます。
.END
EDIT
TITLE 観察のお礼
LINE 2 また様子を書きます。
REVIEW
Y
SENT
READ 1
INBOX
```

Subject length is 1–200 UTF-16 units; body length is 1–20000, preserving
Japanese text, indentation, blank lines and trailing spaces. Terminal controls
and invisible direction controls are rejected. `.END` reviews; only review `Y`
saves the letter. `N`, `CANCEL` or `.CANCEL` discards. `EDIT` supports `TITLE text`,
`LINE number text`, `DELETE number`, `APPEND`, and `REVIEW`; `.TEXT text` in body
input inserts command-shaped text literally. IME Enter confirms conversion without
submitting. A failed transaction keeps the draft editable/retryable; a successful
send consumes it. Draft IDs also make an uncertain acknowledgement retry idempotent.
Draft input is excluded from persistent command recall, but appears in the
in-memory transcript and a downloaded terminal log. Reload discards unsent drafts.

Numbers are stable, ascending local mail numbers shared across boxes, with gaps
when letters belong to other handles or have been deleted. They are not forum
numbers. Reading displays subject, resident parties' tokens and safe handles (or
the external correspondent's address), the shared historical JST date and reply
reference; listings show the
correspondent, subject and date. INBOX retains its individual unread/read marker.
Resident-addressed human SENT rows show `既読確認なし` or `既読確認あり`;
sent-letter READ shows `既読確認：確認なし` or the confirmation's historical JST time.
Absence means **unknown/unconfirmed**, never proven unread.
No private mail is added automatically. Settings can explicitly add the fictional
Internet sample described below; no archived/private source material is seeded.

## Multiple local recipients (Issue #119)

From MAIN `1`, MAIN `X` or DAISIZEN `MAIL`, enter `WRITE-MULTI`. The existing
human registration/selection flow applies. Enter one existing resident's short
address, full local ID or exact handle per line, for example `hoshimori` then
`kusabue`. `.END` requires at least two distinct residents and starts the ordinary
subject/body composer. Selection is bounded by the available local roster, not
by a claimed historical capacity. Unknown/ambiguous handles, humans, Internet
addresses and duplicate aliases are rejected without dropping accepted selections.
`SYN-…` display labels are not addresses. `HELP`/`MEMBERS` retain selections;
attempted navigation explains `CANCEL`/`.CANCEL`, which discards the entire selection.

Opening and every review list each pinned safe label distinctly. Renaming or
reordering members cannot retarget the draft. `.TEXT`, literal Japanese/blank
lines, limits, `.END`, `EDIT` and explicit review `Y` behave as in single-recipient
composition. Text editing retains recipients; to change recipients, cancel and
restart. No empty line, unrelated command or IME confirmation approves delivery.

Approval saves **one ordinary local letter per recipient in one transaction**.
Each has its own stable ID, monotonic global number, correspondent, reply chain
and confirmation. Success identifies every number and recipient; `SENT` then
`READ number` inspects each copy. Every copy contains the same exact approved text
and only its own correspondent context. Failure rolls back the complete set and
number allocation, retaining the draft for retry. Identical concurrent retries
return the complete saved set; conflicting reuse fails. A committed draft is
consumed even if refresh or rendering fails. Saved copies survive reload and
JSON export/import without a new group-message format or backup version.

Resident prompts remain pair-specific: another recipient's private letters or
copy never become context. A resident reply confirms only its explicit parent
copy. Common text intentionally sent to both pairs may appear independently.
Sending does not load a model or guarantee replies, change consent/budgets, send
external mail or open a mail client. This is separate-copy correspondence, without
authenticated BCC, CC, reply-all or group conversations. `WRITE`/`COMPOSE` retain
single-address parsing, including handles with spaces or punctuation; Internet
recipient lists remain unsupported.

Selection and unsent text live only in the current tab's memory, are excluded
from command history and JSON backups, and disappear on cancellation, reload,
reset or restore. World replacement invalidates drafts across tabs, even for an
identical JSON restore. Entered/reviewed text can remain in scrollback and exported
terminal logs; saved letters are included in JSON. Local handles do not provide
device-level isolation or encryption.

The NEC office account documents up to 100 simultaneous recipients in March 1993
(high confidence); continuity into late 1996 is a moderate-confidence inference.
This bounded local journey, command, controls, recipient visibility and copy
layout are **category D reconstruction**. The Issue's 2026-10-24 investigation did
not recover a qualifying target-year session. See [sources, access limits and
unresolved questions](research/pcvan-1996-1997.md#multiple-local-mail-recipients-issue-119).

## Browser-local Internet destinations (Issue #93)

From any of the three mail entries, `HELP`/mailbox guidance introduces `INET#`;
`MEMBERS` and the omitted-address prompt show the original fictional example
`INET#observer@letters.example.invalid`. This example is not a member or a real
contact. Use `WRITE INET#Observer.Notes+Autumn@Letters.Example.invalid` or
`COMPOSE INET#Observer.Notes+Autumn@Letters.Example.invalid`, or enter that
destination at `宛先=`. The prefix is case-insensitive; the address's spelling and
case are preserved exactly, without lowercasing, trimming, lookup or normalization.
An explicit prefix always takes precedence over any resident handle, even when
its address is invalid. Local stable-address precedence and ambiguous-handle
rejection remain unchanged.

The accepted **reconstructed ASCII single-address subset** is bounded to 254
characters, with exactly one `@`. The local part is 1–64 characters: nonempty
runs of ASCII letters, digits, `_`, `+` and `-`, separated by single dots.
The domain is at most 253 characters and has at least two dot-separated labels.
Each label is 1–63 ASCII letters/digits/hyphens, starting and ending in a letter
or digit; its final label is 2–63 ASCII letters. Empty parts, leading/trailing or
consecutive dots, whitespace/control characters, Unicode, quoted names, comments,
angle brackets, IP literals, multiple recipients and other unsupported syntax
are rejected consistently by composition, repository writes and imports. This is
not full email-standard support or a historical PC-VAN validation rule.

The existing literal Japanese multiline composer, `.TEXT`, review/`EDIT`, explicit
`Y` approval and cancellation apply unchanged. Opening and review say that the
letter saves only in this browser and sends nothing to an email server; success
uses local-save wording. The destination remains pinned through editing and save
retry. Failure rolls back both letter and number, keeping the draft retryable;
committed saves consume the draft even if refresh fails. Concurrent identical
submissions share one record; changed content or destination with the same draft
ID fails. Numbering is shared with resident letters and remains monotonic.

SENT and READ display `INET#` plus the original address and truthful local-save
status. There is no external member token, remote delivery/receipt/read evidence
or generated reply. Outgoing Internet letters appear only in their
human sender's SENT projection; an explicit reply can retain its incoming parent.
They create no resident acquaintance, pair memory, generation target or correspondence-limit
usage; addresses, subjects and bodies stay out of mail/forum/OLT prompts. This
journey initiates no network request, email lookup, `mailto` handoff or model load.

External addresses and letters survive reload and JSON export/import with the
rest of mail. Read/drafted text also appears in terminal logs. Unsent drafts are
not backed up; reset/restore invalidate them across tabs. No mailbox migration,
remote transport, arbitrary incoming-message editor, attachments, delivery simulation or
Internet recipient lists are implemented. Historical `INET#` addressing has high
confidence for November 1996; these controls, limits, local-save status and layout
are category D product choices. See the [dated evidence and unresolved mailbox
relationships](research/pcvan-1996-1997.md#outbound-internet-mail-issue-93).

## Opt-in incoming Internet sample and replies (Issue #97)

In modern **Settings / Options → Internetメールの創作サンプル**, choose
`創作メールをローカルに追加`, inspect the selected human recipient, then approve
`創作メールを追加する`. Without a human, use terminal `HANDLE` to register or
select one first; the action creates no identity. This adds one original Japanese
letter about an autumn walk, a secondhand astronomy book, radio and photographs,
from the fictional `observer@letters.example.invalid`. Its address is independent
of the member directory. The action is a local demonstration, never network reception.

Each human may explicitly add their own copy. Repeated activation, retries and
concurrent tabs retain the existing sample and its read marker. Startup,
registration, reload, reset and restore never load it. An empty restored mailbox
stays empty until this action is explicitly approved.

Enter any existing mail route, then `INBOX`, `READ number`, and `REPLY number`.
INBOX/READ show the sender address, selected human, original text, historical JST
date and personal unread/read state, with a local fictional-sample label. Another
human cannot select that letter in their mailbox. No synthetic sender, historical
gateway account or functioning address is invented.

REPLY pins `INET#observer@letters.example.invalid` and the incoming parent's ID.
The existing literal-text composer prefills `Re: subject`; `.END`, `EDIT`,
`REVIEW`, cancellation, retry and explicit review `Y` work as above. Only that
approval saves the reply locally, with no transmission or recipient-read evidence.
SENT/READ retain the external destination and parent reference. A valid parent is
an earlier incoming external letter to the same human from exactly the same
address; missing, later, cross-human, different-address and resident/external
mismatches fail on writes and imports. Ordinary outbound Internet letters may
still omit a parent. Incoming samples cannot contain resident simulation or
recipient-confirmation fields. Both directions stay outside resident memory,
acquaintance, prompts, scheduling and mail-activity budgets.

Samples, external addresses, provenance, replies, parent IDs and human read
markers are included in JSON backups; viewed and entered text is included in
terminal logs. All share the existing atomic number allocator, rollback, reload
and reset/restore fences. These PC-VAN letters are separate from TELNET's two
bundled, read-only remote-mail demonstration letters.

Text reception and `INET#` addressing have high historical confidence. Sample
loading, fictional correspondence, sender presentation, destination selection,
editor behavior, shared mailbox projection and browser-local persistence are
**category D reconstruction**, not a recovered host session. See the
[dated source evidence and limitations](research/pcvan-1996-1997.md#incoming-internet-mail-issue-97).

## Sender-visible recipient confirmation (Issue #89)

A newly committed, validated and currently authorized resident reply confirms
only its explicit parent letter. This is a conservative **category D fictional
event**, not a recovered PC-VAN read-event mechanism. Planning, bounded prompt
excerpts, incidental context letters, public follow-ups, initiation, rendering
and reading without replying establish no confirmation. A reply does not prove
that the model examined every line. There is no independent reading scheduler.

The first confirmation stores its operational commitment timestamp, reconstruction
provenance and confirming reply ID atomically with the reply, number allocation
and completed run. A backwards clock is clamped to at least the parent's creation
time (and the new reply's creation time). It never uses catch-up `simulatedAt`.
The existing calendar projects this instant for display; no 1996 string is saved.
Retries, concurrent commits, duplicate-parent suppression, reload and restore
do not refresh it. Older reply pairs remain unconfirmed without backfilling.
Invalid/failed/cancelled work, consent withdrawal, pause, stale worlds, quota
failure and abort before transaction completion create no new evidence.
Human-recipient `readAt` remains separate and unchanged.

Sources inspected 2026-10-24 support the capability, with limits: the
[NEC office account, March 1993, p. 231](https://www.jstage.jst.go.jp/article/jkg/43/3/43_KJ00002959297/_pdf/-char/ja)
documents checking when a recipient read sent mail (high confidence for 1993;
moderate confidence in continuity into late 1996). The
[Windows 95 client-author description](https://www.vector.co.jp/soft/win95/net/se024554.html)
independently lists checking sent-mail reading (high confidence in the statement;
release date and target-year applicability unresolved). Neither supplies a
target-year host sequence. Labels, placement and reply-commit timing are
reconstructed. The earlier retention policy is not adopted. See the
[research record](research/pcvan-1996-1997.md#sender-visible-mail-confirmation-issue-89).

## Resident activity and context

Reading and human sending need neither a model nor network/GPU access. After the
existing explicit model-download consent, enabled residents may send letters at
their own scheduled visits, without a generate button or human draft approval.
A human letter is eligible after at least 20 minutes. A direct public reply
between the human and resident may lead to a first private follow-up after at
least one hour, within fourteen days. Mere presence in a SIG does not establish
an acquaintance. Public exchanges increase derived familiarity; the same profiles,
interests, affinities and routines also drive public discussion and characterize
private letters. Silence, failed generation and long delays are possible.

Mail shares the consent, worker, model lease, per-resident due times, persisted
batch, 72-hour catch-up bound, six-hour save cap and twelve-attempt budget of
[local AI](local-ai.md#private-mail). At most two mail actions, and at most half
the cap when the cap is two or more, may be saved within six hours across batches;
recently saved resident letters reduce the next batch's mail allowance, including
catch-up letters with older simulated dates. A cap of one permits either
kind of action. At most one queued letter per resident per batch and one letter
per pair per simulated day are planned. First contact is one per pair; replies
deduplicate by parent. Mail leaves save capacity for public posts when the cap is two or more.

Prompts contain only bounded mail between the two correspondents (last four
letters plus a selected received target) and up to four public posts authored by
those two on boards both have used. Catch-up filters future material before
prompting. No other human's mail, other resident's mailbox, complete backup,
settings, history or global transcript enters the mail request. Profiles, names
and excerpts are explicitly untrusted discussion data. The model returns only
strict JSON with pinned sender/recipient/parent IDs and bounded plain text.
Invalid output, extra fields, wrong routing, HTML/control characters and exact
copies of existing pair letters fail without delivery. These checks constrain
routing and context; they cannot guarantee model truthfulness or perfect tone.

## Privacy, persistence and maintenance

Letters and original resident fiction are stored entirely within this browser's
local world. Nothing is sent to actual PC-VAN members, other browser users,
email servers or an external inference API. Model files may be downloaded only
after authorization. Resident reading keeps storage provenance out of letter headers;
Settings → Details/About explains the simulation, origins and limitations.

Private means separated from public forums and unrelated prompt contexts inside
the simulation. It is **not encryption or isolation from someone with access to
the same browser profile/device**. Switching local handles changes projections,
not device access permissions. JSON backups contain all private letters, including
external Internet addresses, subjects and bodies, read timestamps and confirmation
evidence; terminal logs can contain read/drafted letters. Protect exported files accordingly. Browser eviction can erase the
world; keep backups outside it.

[IndexedDB and JSON backups](local-storage.md#mail-records-and-migration) cover
atomic sends, parent/member validation, monotonic numbering, read markers,
notifications, old-backup migration and reset/restore generation fences. Reset
removes all mail. Restoring replaces mail alongside the rest of the world and
invalidates open drafts/model work in other tabs. Prior forum records are never
converted, rewritten or used as a mail store.
