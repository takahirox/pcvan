# Local electronic mail

MAIN `1 電子メール`, MAIN `X 旧電子メール`, and DAISIZEN `MAIL` retain
separate entry screens and return paths. They project the same local mailbox for
the selected human member. This shared storage, every mail command, short resident
address and display layout is a **category D reconstruction**, not a verified
1996–1997 host protocol. See [the research record](research/pcvan-1996-1997.md#electronic-mail-research-issue-52).

## Terminal commands

| Command | Behavior |
| --- | --- |
| `INBOX` / `SENT` | Select the received/sent projection; switching boxes preserves the entry context. |
| `LIST` | Refresh the current directory or mailbox from IndexedDB. |
| `MEMBERS` | List the ten familiar residents' stable short addresses and current handles. |
| `READ number` | Read a letter in the current box; mark only that received letter read for its human recipient. |
| `WRITE address` / `COMPOSE address` | Start a private letter to an existing resident. An omitted address prompts in the same input. |
| `REPLY number` | Reply to received mail in INBOX, preserving its parent ID and prefilling `Re: subject`. |
| `HANDLE` | Choose/register the existing local human identity. An unregistered composition resumes after inline registration. |
| `HELP` / `BACK` / `MAIN` | Redisplay, return to the entry directory/parent, or return to MAIN. During a draft these commands keep it and explain cancellation. |

An address is the exact current resident handle, stable short ID such as
`hoshimori`, or full local member ID such as `fictional-ai:hoshimori`. No domain,
PC-VAN-era account format, remote address or other human recipient is accepted.
Ambiguous handles require a stable ID. Resident profile edits retain IDs and
existing conversations. Added SIGs and OLT use the same member IDs
without creating another identity registry.

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
sends. `N`, `CANCEL` or `.CANCEL` discards. `EDIT` supports `TITLE text`,
`LINE number text`, `DELETE number`, `APPEND`, and `REVIEW`; `.TEXT text` in body
input inserts command-shaped text literally. IME Enter confirms conversion without
submitting. A failed transaction keeps the draft editable/retryable; a successful
send consumes it. Draft IDs also make an uncertain acknowledgement retry idempotent.
Draft input is excluded from persistent command recall, but appears in the
in-memory transcript and a downloaded terminal log. Reload discards unsent drafts.

Numbers are stable, ascending local mail numbers shared across boxes, with gaps
when letters belong to other handles or have been deleted. They are not forum
numbers. Reading displays subject, both handles, the shared historical JST date
and the reply reference;
listings show the correspondent, subject, date and individual unread/read marker.
No starter letters or archived/private source material are seeded.

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

This is original fiction generated and stored entirely within this browser's
local world. Nothing is sent to actual PC-VAN members, other browser users,
email servers or an external inference API. Model files may be downloaded only
after authorization. Ordinary reading keeps provenance out of letter headers;
Settings → Details/About explains the simulation, origins and limitations.

Private means separated from public forums and unrelated prompt contexts inside
the simulation. It is **not encryption or isolation from someone with access to
the same browser profile/device**. Switching local handles changes projections,
not device access permissions. JSON backups contain all private letters and read
timestamps; terminal logs can contain read/drafted letters. Protect exported files
accordingly. Browser eviction can erase the world; keep backups outside it.

[IndexedDB and JSON backups](local-storage.md#mail-records-and-migration) cover
atomic sends, parent/member validation, monotonic numbering, read markers,
notifications, old-backup migration and reset/restore generation fences. Reset
removes all mail. Restoring replaces mail alongside the rest of the world and
invalidates open drafts/model work in other tabs. Prior forum records are never
converted, rewritten or used as a mail store.
