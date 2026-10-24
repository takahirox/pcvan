# Local repository and JSON backups

The application stores its local world in IndexedDB, database `pcvan-local`,
database version **2**. Version 2 adds only the `mail` store/indexes;
upgrading version 1 preserves every existing store and record. The repository has
no runtime dependencies, network writes,
authentication, synchronization, or remote copies. Before starting the first
session, `openActivity()` initializes a pristine world with ten fictional residents,
eleven populated boards and 69 original static Japanese forum posts in twenty threads,
plus three electronic-conference contributions. Model consent remains
separate. The world anchor and fiction provenance live in `community-world`;
seeds use `local-seed:fictional` (original thirty) or `local-seed:authored-sigs-v1`
(additional thirty-six) or `local-seed:wakaba-v1` (three beginner contributions), while later inference uses `local-ai:webllm:`.
See [first-visit and population semantics](local-ai.md#setup-and-controls).

Storage belongs to the browser profile and origin (scheme, hostname, and port).
Changing the development port or moving hosts opens a different local world.
Reloading preserves committed data. Browser settings, private browsing, storage
pressure, and eviction can remove it; browser retention is not guaranteed. See
[MDN's storage quotas and eviction guide](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
Settings can request persistent-storage permission on explicit user action; it
does not promise unlimited space. Keep downloaded backups outside browser storage.

## User backup and restore

Use **設定 / Options → ローカルデータ・保守 → JSON を保存** to download a
UTF-8 snapshot of content, settings, provenance and command history. Keep it
outside browser storage. It contains personal data and is not uploaded anywhere.
**JSON から復元** opens a browser-native file picker. Validation precedes an
explicit, irreversible replacement confirmation. The warning offers a backup;
there is no merge or automatic backup. 中止, closing, picker cancellation, invalid
files and failed writes preserve the old world. Settings reports errors without
blocking terminal reading/posting. Successful replacement discards live drafts,
cancels model work and reloads other tabs. No localStorage fallback is used.

The optional `BACKUP` and `IMPORT` shortcuts retain their typed confirmation
behavior. They use the same export, validation and atomic replacement methods.
PC-VAN participation (handles, reads, posts and replies) remains terminal-only;
these application data controls are outside the historical service.

## Factory reset

Settings → ローカルデータ・保守 → **初期状態に戻す** explains irreversible
deletion of members, posts, mail, local NetNews articles, read markers, resident
edits, preferences, AI consent/deferral, history and live drafts. **先に JSON を保存** exports before approval.
Only the explicit reset confirmation executes deletion; 中止 or closing preserves
the world. Errors remain in Settings. `RESET` / typed `Y` remains an optional
shortcut to the same reset method.

Reset clears and recreates the normal first-visit world in one IndexedDB
transaction, using the same bootstrap as `openActivity()`: ten default residents,
eleven populated forums, 69 original forum posts/twenty threads, three electronic-conference
contributions and `community-world`
provenance. The default auto-activity cap is four, with no model consent or setup
deferral. No model, WebGPU or network is needed. Failure rolls back both clears
and inserts, preserving the previous world. Repeated explicit resets recreate the
fixture; ordinary reloads do not duplicate it. Reset does not restore an empty
backup: imported-empty worlds retain their intentional empty-post semantics.

The current tab cancels AI work before the queued reset and intentionally reloads
into a clean MAIN session, discarding transcript, drafts, composer/reply state,
loaded model and pending terminal confirmations. Other tabs receive a reset
notification
and reload. A private `session/world-generation` token also fences every repository
transaction: a suspended tab or one missing notifications gets a `stale` error
before it can write old data, then the app reloads. Focus checks cover missed
notifications; no cross-tab lock or database deletion is needed. The token is
internal metadata excluded from JSON exports. Reset and restore both rotate it;
old connections fail before they can write into the replacement world.

Downloaded WebLLM weights and optional service-worker/app-shell caches are
separate browser storage and remain intact, as does unrelated origin data.
A cached model still requires fresh processing/download consent. Browser-wide
site-data deletion is a separate operation and can remove these caches too.
After reset, check `J MITI` → `3` → `9` → `LIST` / `READ 1`. To recover the old
world, select its saved JSON file and use the existing confirmed restore action.

## Community expansion migration

No IndexedDB or JSON format bump is required. The reserved version-1
`community-world` setting accepts optional `expansion: 1` only with `seeded`
status and the original fixture ID. Old backups without it remain valid.

On first visit/reset, the original thirty posts and the expansion’s thirty-six
posts, boards, members, counters, marker and activity settings commit in the same
transaction. Existing locally seeded v1 worlds qualify only while all thirty
original seed IDs/origins and their AI author IDs remain present, the marker has
no expansion version, and the private `session/imported` guard is absent.
Deletion of originals is treated conservatively as customization/opt-out.

The migration adds only missing boards. An existing board with the same SIG
keyword/number is never renamed, renumbered or filled, even if empty. Ambiguous
SIGs, reserved record-ID collisions and reserved post-ID collisions skip that
place. Other independent missing places can still be added. The expansion marker
records completion even when places were skipped: later reload/deletion does not
refill them. Existing posts/authors, counters, human IDs, read markers, resident
preferences, consent and all other settings are preserved. Existing resident
preferences continue to allow occasional visits outside their preferred boards.

All writes, including the marker, serialize in one `allStores` transaction;
a quota/write/validation failure rolls everything back and permits a later retry.
Concurrent tabs cannot duplicate content. JSON restore preserves exported
provenance, but its private imported guard prevents a restored v1 seeded world
from acquiring unrequested new history. Legacy/imported/empty/opted-out worlds
stay unchanged. Explicit legacy empty-world population remains available only
under its existing eligibility/confirmation rules and now supplies the expanded
baseline (up to 66 posts when customized additional boards are skipped); reset
explicitly recreates the full baseline for any world.

## Wakaba initialization and lazy participation

MAIN/index `16` is a welcome screen, with no `forum` target. Selector `1` exposes
`LOCAL-WAKABA:1` through the same forum/content-refresh path and connection wrapper
as other boards; its name resolves explicitly without joining the SIG directory.
The welcome refreshes content before selecting its board. BACK keeps the actual
board → welcome → MAIN/index stack, and MAIN clears it.

Only `readActivity`'s pristine `bootstrap` branch inserts the authored directory,
board and three `seed:wakaba-v1:` posts from [wakaba.json](../data/pcvan/wakaba.json),
with `local-seed:wakaba-v1` provenance. Members already exist; dates use the same
creation anchor and JST day convention. The all-store transaction validates foreign
keys and ordered replies before commit. Failure rolls back the entire starter
world; competing tabs serialize and seed once. There is no new world marker,
database version or backup-format migration. The legacy population and v1 expansion
helpers never insert Wakaba records. Reopen, reconnect, consent and JSON restore
cannot infer eligibility from missing posts/boards. Reset explicitly recreates the
pristine 69-post baseline; legacy opt-in still supplies at most 66 posts.

Existing/imported/deleted/missing Wakaba boards stay empty and navigable. `WRITE`
uses `createForumPost`: only successful human submission can create an absent
local directory/board together with its first post. Draft opening, cancellation,
invalid input, foreign-board reply parents and failed writes allocate nothing.
Duplicate keywords or board numbers reject selection/submission rather than picking
an arbitrary board. Existing numbering, counter rollback and concurrent allocation
apply unchanged. JSON round-trips preserve posts, references, provenance and per-human
read markers. Public prompt data adds beginner culture via `boardCulture` and
recognizes this seed origin via `localConversation`; no private mail or OLT is added
and no consent, preference, budget or scheduling rule changes.

All names, controls and mapping here are
[category D choices](research/pcvan-1996-1997.md#wakaba-beginner-board-issue-109).

## Forum reading

The historical directory in `src/navigation.ts` uses the unchanged evidence
fixtures. The app supplies `PcvanController.setContent()` through the connection
wrapper with a consistent `exportBackup()` snapshot before forum commands.
Command echoes, prompt transitions, responses, writes and restores share the
existing queue, preserving prompt order during rapid input. Failed reads report
an error without showing cached posts;
`MAIN` and `BACK` work without a successful content read. Reading a local post
advances the selected human's read marker before displaying it; failed marker
writes report an error without displaying the post. Reading never mutates posts.

`UNREAD` lists only existing posts above the selected human/forum's
`lastReadNumber` (absent means zero), preserving ascending numbers and references
to parents outside that list. `NEXT` resolves the lowest existing unread number
from the refreshed snapshot, awaits the existing `markRead(memberId, postId)`
transaction, then forwards that exact number through the normal READ renderer.
It does not resolve a second candidate after changing the marker. Queued NEXT
commands each refresh after the preceding command completes. Cross-tab changes
to content, selection and markers become visible on the next command; stale-world
generation checks stop commands on replaced snapshots.

`LIST` and `HELP` retain the full forum view: UNREAD introduces no filtering mode
or reader cursor. Neither lists, guidance, invalid commands, blank input nor
exhausted NEXT write read state. Without a selectable human, UNREAD/NEXT give
concise HANDLE guidance; anonymous LIST/READ still work. Display-only demos
cannot acquire personal markers. Empty/restored-empty content stays empty, and
ambiguous mappings retain the existing unavailable message. No schema, backup
format, seed or subscription change is involved. Controls and high-water semantics
are [category D assumptions](research/pcvan-1996-1997.md#forum-unread-reading-issue-107),
not authenticated historical commands or tracking rules.

`src/forums.ts` maps stored SIGs by case-insensitive `keyword` (`MITI` or
`DAISIZEN`, `LOCAL-DOSV`, `LOCAL-GAMES`, `LOCAL-GV`, `LOCAL-WAKABA`) and stored forums by
`sigId` plus `boardNo`. See [SIG navigation](sig-navigation.md). Stored record IDs do not need to match fixture IDs. A matching SIG with a missing board, or an ambiguous mapping, reports unavailability;
an absent SIG offers an empty board for lazy first submission,
and an empty stored forum stays empty. Posts are sorted by ascending `number`;
allocation gaps and missing read numbers do not change the active screen.

A repository snapshot, even one with no SIGs/settings after an empty restore,
suppresses the old [display-only demos](../data/pcvan/demo-posts.json). Those
original DEMO fixtures remain for isolated controller demonstrations, never as a
second stored history or fallback for a restored world. No historical bodies or
real user IDs were imported. Other local SIGs and forums remain stored/exportable
but are outside this evidence-backed directory.

The post renderer preserves the exact title/body strings, including full-width
spaces, blank lines, trailing spaces, and literal HTML. Dates use the shared
historical JST presentation calendar described below. `displaySecondNumber` is
displayed only when present;
its meaning is unknown, and it is not a total, reply parent, or pagination limit.
The renderer accepts an optional explicit line-count display value, but the app
omits it because the v1 post schema has no such field. It never derives a count
from body lines: the historical counting rule (title, blank lines, wrapping,
etc.) is unverified. No schema/version change is needed for reading. See the
[header evidence and limitations](research/pcvan-1996-1997.md#synthetic-post-header-demonstration).

## Composition and read tracking

`WRITE` and `REPLY number` are reconstructed forum commands, not evidenced
1996–97 PC-VAN shortcuts. A terminal state machine accepts a title (1–200 UTF-16
units), then successive body lines (up to 20000 units total, preserving spaces and
blank lines). `.END` validates a nonblank body and shows a numbered preview.
Only `Y` at review saves. `N` or `CANCEL` / `.CANCEL` discard; `EDIT` accepts
`TITLE text`, `LINE n text`, `DELETE n`, `APPEND` and `REVIEW`. `LINE n` clears a
line. `.TEXT text` in body input inserts reserved command text literally.

`HELP`, `BACK` and `MAIN` during drafting keep the draft and explain cancellation;
they never navigate or save. Empty/oversize input and write failures preserve
accepted text. IME conversion Enter never submits a line. A successful transaction
consumes the draft before a second send can be attempted. Unsent drafts remain
in memory; submitted draft lines appear in the transcript/log but are excluded
from persistent command history and JSON backups.

The first connected visit optionally invites handle registration (`Y` then a name,
or `N` / `SKIP`). `HANDLE` lists human accounts only; a number selects, `NEW`
registers and `RENAME name` changes the active handle. Creation atomically saves
a human and `active-human-member`. Imported worlds without a valid selection use
the first human in database key order. A posting request without an identity
starts inline registration, then resumes the pending destination/reply intent.

Confirmed sends resolve the board by keyword/number inside the same transaction
as post allocation. A missing SIG or board is created there; failure rolls back
all initialization, the new post and its number increment. Ambiguous mappings
are rejected. Demo messages are never copied, persisted or used as reply targets.
Stored snapshots always take precedence over the legacy demonstration fallback.
Existing board counters and arbitrary stored IDs are retained.

Replies retain `replyToPostId` independently of the entered subject. Lists and reads
derive references from the current parent's ID, so editing the subject cannot
sever the relationship. Reads show a plain `返信先：#n` reference; type `READ n`
to read the parent. There are no reply links or comment trees. The repository
revalidates the parent on send, including
when another tab deletes it while the draft is open.

The v1 `lastReadNumber` is a **high-water mark**, not a set of individual opened
posts: reading number N marks all existing numbers up to N read for that human
and forum. `markRead()` takes the maximum inside a transaction, so older reads
and concurrent tabs cannot move it backwards. Demo reading never changes it.
Lists compare each number to this marker. Selection, references and read markers
are included in existing v1 JSON backups and survive reload/restore unchanged.
Other tabs refresh the selected human and content on their next forum command.

Additional repository methods (all resolve after transaction completion):

| Method | Behavior |
| --- | --- |
| `createHumanMember(handle)` | Save a human plus the active-member setting atomically; reject blank handles. |
| `createForumPost({ keyword, boardNo, name }, draft)` | Resolve/create the local board and insert a nonblank human-authored draft with the same allocation path as `createPost`; the draft omits `forumId`, `id`, `number`, and `createdAt`. |
| `openActivity(now?)` / `configureActivity(maxPosts, modelId, now?)` | Persist/resume independent resident due times and a bounded chronological plan; save the visit cap/model (0 pauses, preserving pending work). |
| `populateEmptyCommunity({confirmPopulate}, now?)` | Require literal `true`; atomically add starter posts only to an eligible empty legacy world. Preserve directories/counters and return false after completion or when ineligible. Imported worlds cannot opt in. |
| `authorizeModel(modelId, now?)` | Persist explicit download consent; community initialization is independent of consent. |
| `configureResident(profile, now?, expected?)` | Atomically reject a stale editor context, validate and save a profile/AI handle, recalculate its future due time and preserve existing posts/runs. |
| `touchActivity(now?)` | Advance an existing activity watermark monotonically without scheduling generation. |
| `setAiRunStatus(id, status)` / `commitAiRun(id, raw, signal?)` | Persist pending-run progress; validate and atomically save a unique AI result with its completed status, member and number. Repeated commits return the existing result. |
| `createAiPost(member, post)` | Register an AI member and allocate a post in an existing board atomically. Requires matching author ID, `actor: 'ai'` and `local-ai:webllm:` origin; rejects identity collisions. The AI caller validates generated content and selected IDs before this mutation. |
| `markRead(memberId, postId)` | Validate a human and local post, then advance their per-forum high-water mark atomically. |

Generic `createPost`/import still preserve empty titles and bodies for existing
data compatibility; the human compose path rejects them. No schema migration or
new storage dependencies are needed. The optional AI integration uses the same
v1 member/post records; see [local AI and provenance](local-ai.md).

## TypeScript repository API

Import from [src/storage/repository.ts](../src/storage/repository.ts). Record types
and validators live in [src/storage/schema.ts](../src/storage/schema.ts).
All data operations return promises and resolve only after transaction completion.
`close()` and `createRecordId()` are synchronous. Returned records are detached
copies; mutate them and call a write method to persist changes.

```ts
import { createRecordId, openRepository } from './storage/repository';

const repo = await openRepository();
const memberId = createRecordId();
const sigId = createRecordId();
const forumId = createRecordId();
await repo.put('members', { id: memberId, handle: '私', actor: 'human' });
await repo.put('sigs', { id: sigId, keyword: 'LOCAL', title: '個人の SIG' });
await repo.put('forums', { id: forumId, sigId, boardNo: 1, name: '広場', nextPostNumber: 1 });
const post = await repo.createPost({
  forumId, authorId: memberId, title: 'こんにちは', body: '最初の投稿', origin: 'local-human',
});
await repo.put('readStates', { memberId, forumId, lastReadNumber: post.number });
const unread = await repo.listPosts(forumId, { afterNumber: post.number, limit: 50 });
const json = await repo.exportJson();
// Only after the caller has obtained explicit replacement confirmation:
await repo.replaceFromJson(json, { confirmReplace: true });
repo.close();
```

| Method | Contract |
| --- | --- |
| `openRepository(name?)` | Opens/migrates version 1; alternate names isolate tests. No seeding. |
| `createRecordId()` | Generates a 128-bit random hexadecimal ID, independent of display numbers. Call once when creating a member, SIG, or forum; retain it on updates. Post IDs are generated internally. |
| `get(store, key)` | Returns the record or `undefined`. Read-state keys are `[memberId, forumId]`; other keys are string IDs. |
| `list(store)` | Returns all records in IndexedDB primary-key order. |
| `listForums(sigId)` | Queries the SIG index; sorts by `boardNo`, then ID. |
| `listPosts(forumId, {afterNumber?, limit?}?)` | Queries the unique forum/number index, ascending, strictly after `afterNumber` (default 0). Limit is an optional positive integer up to 2^32−1. |
| `put(store, record)` | Validated upsert for members, SIGs, forums, read states, and settings. Missing parents are rejected. Existing forum counters cannot decrease. |
| `createPost(input)` | Generates ID and current UTC timestamp, reads the forum counter, inserts the post, and increments the counter in one read/write transaction. Rejects missing author/forum or a reply parent outside this forum. |
| `updatePost(id, {title, body})` | Edits text; preserves IDs, numbers, author, timestamps, origin, and reply linkage. Missing posts are rejected. |
| `delete(store, key)` | Rejects deletion while referenced; delete children first. Missing records are a no-op. Deleted post numbers are never reused by normal creation. |
| `getSession()` / `setSession(sessionOrNull)` | Reads/replaces the singleton metadata record; `null` removes it. |
| `startSession()` / `endSession()` | Atomically updates the respective timestamp and retains the other timestamp; returns the session. Starting also bounds history to the newest 100 nonblank entries. |
| `recordCommand(line)` | Atomically appends nonblank input and retains the newest 100 nonblank entries; concurrent appends do not overwrite each other. Returns the session. |
| `exportBackup()` / `exportJson()` | Returns a document / formatted JSON string, from one consistent readonly transaction. |
| `replaceFromJson(text, {confirmReplace})` | Requires literal `true`; validates before writing, then clears and inserts every store in one atomic transaction. |
| `resetWorld({confirmReset}, now?)` | Requires literal `true`; atomically clears all world stores, runs the first-visit bootstrap and rotates the private generation token. Invalidates older repository connections. |
| `close()` | Releases the connection. Old connections also close on `versionchange`; reload before further use. |

Stores are `members`, `sigs`, `forums`, `posts`, `mail`, `readStates`, `settings`, and a
`session` store (out-of-line key `current` plus private import/generation markers). The generic methods exclude
session; generic `put` also excludes posts and mail so it cannot bypass allocation.
Indexes cover forums by SIG, posts by `[forumId, number]` (unique), author and
reply parent, and read states by member and forum. Relationship-sensitive writes
share a transaction scope across stores, preventing concurrent deletion/import
from invalidating references. Post-number uniqueness and counter allocation work
across independent connections/tabs without a JavaScript lock. Exhausted safe
integer counters are rejected; numbers are not wrapped.

`RepositoryError.code` distinguishes `validation`, `confirmation-required`,
`quota`, `blocked`, `unavailable`, `stale`, and `storage`; native errors are retained as
`cause`. A blocked open asks the user to close other tabs. A newer database version
is not downgraded or deleted. No automatic retry or destructive recovery occurs.

The shell calls `startSession()` on opening/reloading and on `RECONNECT`, calls
`endSession()` for an explicit MAIN `Q` logout, and persists submitted nonblank
commands. The latest timestamps appear in Settings → 表示・端末
(or `SETTINGS` → `6`) in UTC. A browser tab close is not recorded as a reliable logout event. Imported session records remain
exact until a subsequent start or command append applies the history bound;
in-memory recall is always limited to 100 nonblank entries.
The transcript, input draft and edits to recalled input remain in memory. The
terminal's `LOG` command downloads the displayed transcript, including
scrollback, as UTF-8 text without modifying local data; it is separate from JSON
backup/restore. The terminal display and unsubmitted drafts are excluded; the bounded OLT room
history is world data included in JSON backups.
Command echo, responses, writes, backup and restore are queued
in this tab. Repository methods perform no external awaits inside transactions; see
[the IndexedDB transaction lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction).

## Version 1 JSON document

The root object retains these required fields (empty arrays are valid). Current
exports also include optional `mail: []`; pre-mail v1 documents import with an
empty mailbox. Unknown root fields are still rejected. Older app versions reject
mail-bearing exports without writing; retain a backup before upgrading.

```json
{
  "format": "pcvan-local",
  "version": 1,
  "members": [],
  "sigs": [],
  "forums": [],
  "posts": [],
  "readStates": [],
  "session": null,
  "settings": []
}
```

| Entity | Required fields | Optional fields |
| --- | --- | --- |
| Member | `id`, `handle`, `actor: 'human' \| 'ai'` | — |
| Sig | `id`, `keyword`, `title` | — |
| Forum | `id`, `sigId`, `boardNo`, `name`, `nextPostNumber` | — |
| Post | `id`, `forumId`, `number`, `authorId`, `title`, `body`, `createdAt`, `origin` | `displaySecondNumber`, `replyToPostId`, `simulation` |
| Resident/outgoing mail | `id`, `number`, `senderId`, exactly one of `recipientId` / `internetAddress`, `subject`, `body`, `createdAt`, `origin` | `replyToMailId`; resident mail only: `readAt`, `simulation`, `recipientConfirmation` |
| Incoming Internet sample | `id`, `number`, `senderInternetAddress`, `recipientId`, `subject`, `body`, `createdAt`, `origin: 'local-sample:internet-letter-v1'` | `readAt` |
| ReadState | `memberId`, `forumId`, `lastReadNumber` | — |
| Session | `lastLoginAt`, `lastLogoutAt`, `commandHistory` | — |
| Setting | `id`, `value` | — |

IDs, handles, keywords, names, SIG titles, and origins are nonblank strings; post
title/body and history entries may be empty strings. IDs are unique **within each
entity collection**, not globally across types. Read states are unique by their
member/forum pair. Settings values may be any finite JSON value, including nested
arrays/objects. Opening the app seeds the strictly validated `ai-residents`
version-1 setting (exactly ten profiles) and `ai-activity` version 2. Activity holds
the visit cap, consent, seed, per-resident due times, watermark, bootstrap/truncation
flags and at most one batch of 12 stable runs/statuses. The default cap is four;
heavy model downloads still require explicit consent. Older version-1 activity
settings migrate on use, retaining explicit opt-in/out, model and pending runs.
`community-world` version 1 stores a canonical `createdAt`, `status` (`seeded`,
`legacy`, `imported`) and, for seeded worlds, `fixture: fictional-community-v1`.
It is strictly validated. Existing worlds without it are marked on first use;
only a completely empty, never-imported database with no session/settings is
seeded automatically. Restoring a legacy marker changes its status to `imported`
to prevent advertising the legacy opt-in; seeded backup provenance stays intact.
These additive settings remain inside the version-1 backup envelope. Mail uses
the same envelope with an explicitly optional `mail` array and IndexedDB version 2.
See [the resident activity contract](local-ai.md#scheduling-discussion-and-bounds).

A simulated AI post optionally includes `simulation: { runId, simulatedAt,
fictional: true }`. `runId` equals its stable post ID and `simulatedAt` is a
canonical timestamp explicitly labeled fictional. `createdAt` remains the actual
generation/commit time. Old v1 backups without this field still import normally;
older app versions that do not know it reject such new backups without writing.

`boardNo`, `nextPostNumber`, and post `number` are positive safe integers.
`displaySecondNumber` and `lastReadNumber` are nonnegative safe integers. The
optional second number is preserved as supplied, never derived or interpreted as
a reply count or historical counter. `origin` is a caller-defined nonblank
provenance label, not a closed vocabulary. No historical line count is computed.

Timestamps use the canonical UTC ISO representation with milliseconds, for example
`2026-10-20T01:02:03.000Z`; session timestamps may be `null`. Import preserves the
original IDs, strings (including whitespace/newlines), counters, relationships,
and timestamps. Array/property formatting is not preserved: exports use database
key order. A subsequent application session can intentionally update login metadata.

Validation rejects malformed JSON, unsupported format/version, missing/unknown
fields, wrong types, duplicate keys, duplicate post numbers within a forum,
missing parents, and counters not greater than all existing post numbers. Replies
must reference an earlier-numbered post in the same forum (also excluding reply
cycles). These are local schema invariants, not claims about historical PC-VAN.
Full validation precedes any writes, and native transaction failures (including
quota or constraint errors) roll back clears and inserts together. Future changes
must document migrations and update the format or explicitly validated additive
fields and database version as needed; never drop unknown content.

## Mail records and migration

`mail` is a dedicated IndexedDB store with unique global `number` plus sender,
recipient and reply-parent indexes. It never inserts into `posts` or allocates
forum numbers. Each resident letter has exactly one human and one of the stable ten
`fictional-ai:*` residents. An outbound Internet letter instead has one existing
human sender and an explicit `internetAddress`. INBOX/SENT are projections by
recipient/sender, not mutable duplicate copies. `readAt` belongs only to the human recipient; reading
one letter does not mark earlier numbers read. Subjects are nonblank single-line
text up to 200 UTF-16 units, bodies nonblank up to 20000; terminal/invisible
controls are invalid. Canonical timestamps, IDs, numbers, origins, simulations
and relationships are strictly checked. A reply references an earlier-numbered
letter with exactly reversed correspondents, excluding cycles/cross-recipient
parents. Human origins are `local-human`; generated resident mail uses
`local-ai:webllm:<modelId>` with a matching stable simulation run ID.

`createHumanMail({id, senderId, recipient, subject, body, replyToMailId?})`
resolves the exact existing resident ID/short address/handle or explicit `INET#`
Internet address, checks sender and parent, allocates the number and inserts in
one transaction. Stable draft IDs return the existing identical send on retry and reject changed-content collisions.
A private `session/mail-next-number` counter prevents reuse after deletion;
restore initializes it from the imported maximum on the next send. It is excluded
from exports. `markMailRead(memberId, mailId)` accepts only the human recipient
and keeps the first read time. Generic `put` cannot bypass mail allocation.
Member/parent deletion guards include mail references. Normal sends/read updates
notify tabs, whose commands refresh snapshots even when notifications are missed.

Generated mail uses `commitAiRun` and the same consent/model/pause/world checks as
public generation; run state, letter, number and provenance commit together.
Quota/constraint errors roll everything back. Duplicate run delivery returns the
existing letter. Reset/import rotate the existing generation fence, discard
live drafts and cancel in-flight output; old repository connections cannot write
into the replacement world. Backup validation includes all mail before clearing
any stores, then replaces everything atomically. Existing v1 JSON without `mail`
imports an empty mailbox; upgrading the v1 database only creates the new empty
store. Neither migration seeds private mail or alters prior forums/posts.
See [mail commands and privacy](mail.md).

Issue #93 extends the same store/JSON v1 shape with exactly one of `recipientId`
or `internetAddress`. The latter stores the raw ASCII address without `INET#`,
preserving spelling/case; there is no external member record, index or secondary
mailbox. The [bounded address subset](mail.md#browser-local-internet-destinations-issue-93)
is shared by commands, writes and imports. An outgoing external letter must have an
existing human sender and `local-human` origin, and cannot carry `recipientId`,
`readAt`, `simulation` or `recipientConfirmation`. An optional reply parent must
be an earlier incoming letter to that sender from the same exact external address.
Contradictory, malformed and forged variants fail before any import replacement or write. Local
resident correspondence, parent reversal and confirmation validation are retained.
Outgoing external letters cannot be reply targets or acquire recipient read markers.

The existing atomic insert/counter transaction, ID collision checks and world
fences cover both kinds. Same-ID retries compare destination kind and exact address
as well as sender/content/parent. Failure leaves no letter or consumed number.
Outgoing external letters enter only their sender's SENT projection; resident pair memory
explicitly excludes them. They do not consume resident generation budgets. JSON
and logs include external addresses and letter content, with the same unencrypted
local privacy limits. Old backups remain valid; older app versions reject the new
field without replacing data. No database/backup version bump or mailbox migration
is needed for this additive destination shape.

Issue #97 adds the incoming identity alternative: `senderInternetAddress` plus an
existing human `recipientId`, with no `senderId` or outgoing `internetAddress`.
The same bounded address validation applies. Its required `origin` is exactly
`local-sample:internet-letter-v1`, explicit fictional-sample provenance; resident
simulation, recipient confirmation and incoming reply-parent fields are rejected.
Unknown fields and contradictory identities fail strict validation. At most one
sample per recipient is accepted, including imports. The sender index naturally
omits these records; the recipient, number and parent indexes remain unchanged.
No database upgrade, external-member registry or second mailbox is needed.

`loadInternetSample(recipientId, expectedContext?)` is called only by the explicit
Settings action. In one existing transaction it checks the world/recipient,
returns an existing sample (preserving its read marker), or inserts the fixed
original fixture with a stable per-recipient ID and shared monotonic number.
Conflicting IDs fail; quota/abort rolls back the letter and counter. The Settings
confirmation pins the recipient and world context, and the existing private
generation fence rejects suspended cross-tab actions after reset/restore.
Human external replies use `createHumanMail` unchanged except for validating the
incoming parent: earlier number, no later creation time, same human and exact
address.
Resident replies explicitly reject external parents. Both directions are excluded
from resident pair memory and generation targets. Backups preserve addresses,
provenance, parent and read marker; legacy outbound-only and pre-mail backups stay
valid. Older app versions reject the added incoming shape without replacing data.

Issue #89 adds optional `recipientConfirmation: { at, replyMailId,
provenance: 'local-resident-reply-v1' }` on human-sent mail only. This explicitly
records a reconstructed confirmation event from a newly committed resident reply,
separate from human-recipient `readAt`. `at` is canonical operational UTC, no
earlier than the parent or confirming reply creation times. The referenced reply
must exist, be a later-numbered generated resident letter, reverse the same
correspondents and explicitly name this parent. Shape, provenance, timestamps
and relationships are checked on writes and imports. Unknown/malformed,
dangling, wrong-direction and cross-correspondent evidence is rejected before
replacement. Deletion guards protect both parent links and confirming-reply
references; a confirmed pair is retained until whole-world replacement/reset,
rather than silently losing evidence through individual deletion.

Only `commitAiRun` writes new evidence, after output/authorization validation and
duplicate suppression, in the existing world-fenced transaction with reply,
number allocation and run completion. The first `at` is retained. Operational
commitment time is clamped to parent/reply creation when the clock moves backward;
catch-up `simulatedAt` never supplies it. Quota errors and signal aborts before
completion roll back both evidence and delivery. Existing notifications refresh
snapshots without printing over terminal input. Rendering is pure.

No IndexedDB or backup version change is needed: older databases/backups without
the optional field remain valid, including old reply pairs, with no inferred
backfill. New evidence and exact timestamps survive export/import/reload. Older
app versions reject the unknown field without replacing data. Reset removes all
mail/evidence; reset/restore preserve cross-tab and in-flight generation fences.
The calendar displays `at` using the existing fixed mapping and considers it in
legacy timestamp fallback; projected strings are never stored.

## Repeatable checks

Run `npm ci`, `npx playwright install chromium`, then `npm test`. The suite serves
the built shell at port 14373 and Vite source modules at 14374. Repository tests
use real Chromium IndexedDB in fresh isolated contexts and a separate test
database; UI tests exercise the production bundle. No fake database or runtime
storage library is used. See [the validation record](validation.md#issue-6-local-storage-validation)
for results and checks not executed.

## OLT persistence

OLT adds a validated reserved setting `olt-rooms`, version 1, using the existing
settings store. IndexedDB remains version 2; JSON remains `pcvan-local` version 1.
Pre-OLT backups omit this setting and lazily get empty rooms on their first OLT
operation. No store-number migration can collide with SIG/mail work. Existing
members, posts, mail and counters are preserved. Reset removes OLT and recreates
the established ten residents/69 forum posts and three conference contributions;
OLT has no seeded transcript.

The setting contains `windowAt`, global `attempts` (0–24 per hour), and exactly
three rooms (`lounge`, `night`, `wakaba`). Each room stores a monotonic
`nextNumber`, the last
**200 lines**, resident leases, human visitor leases, `observedAt`, `nextTurnAt`,
`handledNumber`, bounded consecutive-resident `chain`, and an optional pending
turn token. `/LIST` displays the most recent 40 lines; terminal scrollback retains
what this session has displayed. Pruning never reuses a sequence or ID.

Compatibility keeps the same version-1 representation: the validator accepts
exactly the legacy `lounge`/`night` pair or the complete three-room set, with
strict shapes, bounds, unique/known IDs and member references. `oltState` first
validates the saved structure (and member references when supplied), clones it,
then adds only an empty `wakaba` room
to a valid legacy pair. Its initial timestamps derive from the saved `windowAt`,
so repeated reads are pure and deterministic. No existing fields, transcripts,
sequence counters, budget window/attempts or pending reservations are rewritten.
Repository mutations validate member references before lifecycle reconciliation
and persist the normalized set in the same transaction as the operation.
Concurrent tabs serialize that write; reload and JSON restore do not add a second
room or refill allowances. Import validates legacy references before any clears;
legacy JSON stays valid and normalizes on use. Malformed two-room subsets (such
as `lounge`/`wakaba`), unknown/duplicate rooms and malformed complete states are
rejected. Write/import failure rolls back the entire transaction. Ordinary
consent, presence expiry, departure and cancellation still apply to old leases
and pending turns. Compatibility does not reseed any community records.

Every line has `{id, number, authorId, createdAt, kind, text, origin}`. IDs are
`olt:<roomId>:<number>`; timestamps are canonical UTC ISO strings, nondecreasing
within the room even if the system clock moves backwards. `kind` is `enter`,
`leave`, or `say`. Presence lines have empty text and `local-presence` origin;
human speech uses `local-human`; model speech uses `local-ai:webllm:<modelId>`.
Authors reference shared members, so selecting/renaming/restoring a handle never
creates a second OLT identity. Presence and AI authors must use the stable ten
fictional resident IDs. No remote participant identities are created.

Resident entries store `{memberId, joinedAt, until}` (at most ten total across
rooms). Visitors store `{clientId, memberId, until}` (at most sixteen per room),
renewed with a 45-second lease by an open room. Attendance deduplicates member
IDs across tabs. Leaving one tab preserves the human while another lease remains;
reload renews that identity without a duplicate entrance. Expired leases are
reconciled on observation. Closing/hiding never claims continued live presence.
A read-only unregistered visitor has no fictional member record.

`observeRoom`, `speakRoom`, `claimRoomTurn` and `finishRoomTurn` each read/update
the complete bounded setting in one repository transaction. Inference happens
outside transactions. A pending `{id, authorId, modelId, context, until}` token
reserves a turn for 35 seconds; commit revalidates authorization/profile context,
presence, expiry and token before atomically appending and clearing it. Repeated
or stale commits cannot duplicate a line. Handled events, attempt counters and
next-turn times survive cancellation, reload, backup and restore. Old pending
leases expire; import never automatically infers a saved pending turn.

Strict import validation checks shapes, bounds, ordering, stable IDs, author
references, actor/provenance consistency, attendance uniqueness and timestamps
before any writes. JSON replacement/reset retain the existing atomic rollback
and private world-generation fence; old tabs cannot write into a new world.
No host-tab runtime objects or model data enter the backup. Backup contains public
OLT text as well as private mail and should be stored accordingly. The existing
explicit replace/reset confirmations include OLT through the settings payload.

## Conference persistence

Issue #65 adds reserved setting `daisizen-conference`, version 1, without changing
IndexedDB version 2 or JSON `pcvan-local` version 1. It contains `conferenceId`
(`DAISIZEN`), monotonic `nextNumber` and ordered `contributions`. Each contribution
has a stable `id`, per-conference `number`, shared `authorId`, `title`, multiline
`body`, canonical UTC `createdAt`, `origin` and optional `replyToPostId`. The
composer's generic parent field names a contribution here, never a forum post.
Replies must name an earlier retained contribution in this same conference.
Titles are 1–200 characters, bodies 1–20000, excluding blank-only/control text;
Japanese/full-width spaces, blank lines and literal markup are preserved.

`createConferenceContribution` checks the world-generation fence, author and
parent, allocates the next number and writes the setting in one transaction.
A draft ID is allocated once before composing; retrying the same input returns
the committed record, while a conflicting reuse fails. Failed writes consume no
number. Member changes/deletes cannot invalidate conference authors. Only human
submissions use this API; the three fresh-world authored examples carry
`local-seed:conference-v1`. No forum record is reused, so existing forum AI
planning and private-mail context cannot select conference messages.

Absence means empty, with no hidden demonstration fallback or read-side write.
Only pristine creation/reset seeds examples, atomically with the starter world.
Older existing/seeded/imported worlds, empty restores and forum POPULATE do not.
Existing JSON export includes the setting; import validates shape, unique IDs,
ordered safe numbers, timestamps, provenance, authors and earlier local parents
before replacement. Quota failures roll back replacement, and old tabs/drafts
remain fenced after replacement/reset. Stored timestamps survive round-trips;
conference operations do not reschedule residents or change forum/mail counters.

## Historical display calendar (Issue #67)

`historical-calendar` is a reserved, strictly validated setting with exactly
`{ version: 1, sourceAnchor: "<canonical UTC ISO timestamp>" }`. It is part of the
existing version-1 JSON backup, without a database upgrade or dependency.
`sourceAnchor` must be outside the JST years 1996–1997. Its historical anchor is
derived, never separately editable: the same weekday and JST time of day in
1996-11-18 through 1996-11-24. Presentation projects each operational instant as
`H + (instant - A)`, then formats in fixed JST, independent of browser timezone.
Gregorian day, month, leap and year boundaries advance normally; there is no
annual wrap or per-render year substitution. Seed history can precede that week.

Direct writes cannot change an existing anchor or delete its setting.
Initialization reads and adds the setting inside the existing all-store write
transaction, so competing tabs agree. Fresh activation/reset uses the creation
instant. Existing operational `community-world.createdAt` takes priority and is
never overwritten by calendar initialization. For a legacy document without a
usable operational world marker, the deterministic fallback is the earliest
operational timestamp among post/mail creation and simulation times, mail read
times, conference contributions, local NetNews creation, session login/logout,
AI activity watermark, batch endpoints and runs (including pending runs), next-due values, and OLT
window/observation/due/lease/line times. Arbitrary settings, text, titles and
fixture date strings are not scanned. The same dated backup therefore derives
the same mapping at different restoration times. Import initializes atomically
before new session/activity writes can contaminate that evidence; failures roll
back the entire import, including the mapping.

A canonical instant whose **JST** year is 1996 or 1997 is conservatively treated
as already historical and formatted directly. This is an import assumption,
not authentication. Such a `community-world` marker is provenance, never the
source anchor for contemporary activity. If *all* dated evidence is historical,
use its earliest instant plus 28 UTC years as a deterministic operational
surrogate (1996/1997 → 2024/2025, including leap day). The new contemporary events
then follow the same elapsed-time formula; their dates may already be beyond
1997. Historical records stay unchanged. Only an entirely undated document uses
its first activation/import instant. Once saved, the mapping takes priority over
all fallback evidence, including newly arriving catch-up records.

Forum/mail choose `simulation.simulatedAt ?? createdAt` before projecting once;
`simulatedAt` is an operational catch-up event time, not an already shifted date.
Rendering never writes records. Creation/commit time, simulation provenance,
mail `readAt`, IDs, counters, replies, ordering, read watermarks, session history,
AI consent/due times and OLT expiry/retention retain their operational semantics.
Reset discards the old calendar and creates a new mapping atomically. Backup
restoration retains an existing mapping exactly. Authored dates, user text and
OSL date-only metadata are never translated. Modern Settings retains actual UTC
session times and raw provenance. The epoch, JST policy and non-forum layouts
are disclosed reconstructions; see the [research record](research/pcvan-1996-1997.md#shared-historical-calendar-issue-67).

## NetNews persistence

Issue #87 adds optional version-1 setting `netnews-local` within the existing
IndexedDB v2 / JSON v1 storage. It contains `nextNumbers` for exactly
`fj.questions.fj` and `fj.news.usage`, and local `contributions` only. Six bundled
examples and authored dates remain application assets, outside backups. Absent
state in older/imported worlds means empty local contributions. Reading never
writes this setting, seeds communities or re-anchors the historical calendar.

Each article stores its draft `id`, `group`, group-local `number`, human `authorId`,
`title` (1–200), multiline `body` (1–20000), canonical operational UTC `createdAt`,
`origin: local-human`, `messageId`, complete ordered `references` and optional
`parentMessageId`. Text uses the established composer bounds and control-character
restrictions. `createNetNewsArticle` uses one world-fenced readwrite transaction:
resolve the parent by Message-ID against bundled or local same-group articles,
allocate the next group number (initially 4), validate and save. Draft-ID retries
return the committed article only for identical inputs; conflicts fail. A failed
validation/quota transaction leaves no article or consumed allocation. Screen
refresh errors after commit do not leave a sendable duplicate draft.

Validation applies to direct writes and JSON restore, including exact known group
counters, sequential unique numbers and identities, canonical timestamps, human
authors/provenance, earlier same-group parents (number and timestamp), and exact
inherited References plus the immediate parent. It rejects dangling, cyclic,
future and cross-group chains before replacement. Member deletion/actor changes
cannot invalidate authors. Restore replacement and quota rollback remain atomic.
Import/reset fences stale connections and invalidates owned drafts. Factory reset
removes local articles and keeps the bundled six. Browsing/cancellation changes no
other world records; normal registration and session/history bookkeeping applies.

`<local.GROUP.NUMBER@netnews.example.invalid>` identifies a local article across
both groups, independently of subject and raw member/draft keys. From is the
shared `penName` plus lowercased `identityToken` at `members.example.invalid`.
Names refresh on reads; addresses, attribution and IDs survive reorder/reload and
backup roundtrip. No real email is requested. Local Date uses the existing durable
historical projection, formatted as `Sat, 23 Nov 1996 11:00:00 +0900`. It never
rewrites operational timestamps or bundled dates; legacy calendar initialization
also considers local NetNews creation timestamps. These display/identity policies
are reconstruction. NetNews is excluded from resident inference/planning contexts;
no consent, credentials, external request or network delivery is introduced.
