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
numbers. Reading displays subject, both parties' tokens and safe handles, the
shared historical JST date and the reply reference; listings show the
correspondent, subject and date. INBOX retains its individual unread/read marker.
Resident-addressed human SENT rows show `既読確認なし` or `既読確認あり`;
sent-letter READ shows `既読確認：確認なし` or the confirmation's historical JST time.
Absence means **unknown/unconfirmed**, never proven unread.
No starter letters or archived/private source material are seeded.

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
status. There is no member token, remote delivery/receipt/read evidence, generated
reply or reply-parent relationship. External letters appear only in their human
sender's SENT projection, never INBOX or another human's mailbox. They create no
resident acquaintance, pair memory, generation target or correspondence-limit
usage; addresses, subjects and bodies stay out of mail/forum/OLT prompts. This
journey initiates no network request, email lookup, `mailto` handoff or model load.

External addresses and letters survive reload and JSON export/import with the
rest of mail. Read/drafted text also appears in terminal logs. Unsent drafts are
not backed up; reset/restore invalidate them across tabs. No inbound Internet
mail, mailbox migration, remote transport, attachments, delivery simulation or
multiple recipients are implemented. Historical `INET#` addressing has high
confidence for November 1996; these controls, limits, local-save status and layout
are category D product choices. See the [dated evidence and unresolved mailbox
relationships](research/pcvan-1996-1997.md#outbound-internet-mail-issue-93).

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
after authorization. Ordinary reading keeps provenance out of letter headers;
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
