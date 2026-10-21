# Local repository and JSON backups

The application stores its local world in IndexedDB, database `pcvan-local`,
database version **1**. The repository has no runtime dependencies, network writes,
authentication, synchronization, or remote copies. Before starting the first
session, `openActivity()` initializes a pristine world with ten fictional residents,
two writable boards and 30 original static Japanese posts. Model consent remains
separate. The world anchor and fiction provenance live in `community-world`;
seeds use `local-seed:fictional`, while later inference uses `local-ai:webllm:`.
See [first-visit and population semantics](local-ai.md#setup-and-controls).

Storage belongs to the browser profile and origin (scheme, hostname, and port).
Changing the development port or moving hosts opens a different local world.
Reloading preserves committed data. Browser settings, private browsing, storage
pressure, and eviction can remove it; browser retention is not guaranteed. See
[MDN's storage quotas and eviction guide](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
The application does not request persistent-storage permission or promise unlimited
space. Keep downloaded backups outside browser storage.

## User backup and restore

Below the terminal, **JSON バックアップを保存** downloads a UTF-8 JSON snapshot.
Check that the download was saved. The file contains all local content, settings,
and command history; treat it as personal data. It is not uploaded anywhere.

Choose a file using **復元ファイル**, then select **全データを置き換えて復元**.
The application validates the file, asks for explicit confirmation, then
**replaces the entire local world**. There is no merge, ID remapping, or automatic
backup of the old world. Download the old world first if it matters. Cancelling,
invalid JSON, invalid records, or a failed write leaves the previous database
unchanged. Restore refreshes this tab's recalled commands; reload other open tabs
to refresh any in-memory views. Concurrent writes in other tabs are serialized
before or after the replacement, and writes made afterwards are new local changes.

The status below these controls reports opening, validation, write, and quota
errors. When storage is unavailable, the terminal still works in memory and
reports persistence failures. A quota failure leaves export available if the
database can still be read. There is no localStorage fallback that could silently
split the world across storage systems.

## Forum reading

The historical directory in `src/navigation.ts` uses the unchanged evidence
fixtures. The app supplies `PcvanController.setContent()` through the connection
wrapper with a consistent `exportBackup()` snapshot before forum commands.
Command responses and restores share the existing queue; input echo and history
remain immediate. Failed reads report an error without showing cached posts;
`MAIN` and `BACK` work without a successful content read. Reading a local post
advances the selected human's read marker before displaying it; failed marker
writes report an error without displaying the post. Reading never mutates posts.

`src/forums.ts` maps stored SIGs by case-insensitive `keyword` (`MITI` or
`DAISIZEN`) and stored forums by `sigId` plus `boardNo` (MITI `9`, DAISIZEN
`1`–`7`). Stored record IDs do not need to match fixture IDs. One matching SIG
and board are required: a missing or ambiguous mapping reports unavailability,
and an empty stored forum stays empty. Posts are sorted by ascending `number`;
allocation gaps and missing read numbers do not change the active screen.

A repository snapshot, even one with no SIGs/settings after an empty restore,
suppresses the old [display-only demos](../data/pcvan/demo-posts.json). Those
original DEMO fixtures remain for isolated controller demonstrations, never as a
second stored history or fallback for a restored world. No historical bodies or
real user IDs were imported. Other local SIGs and forums remain stored/exportable
but are outside this evidence-backed directory.

The post renderer preserves the exact title/body strings, including full-width
spaces, blank lines, trailing spaces, and literal HTML. UTC dates are a stable
presentation choice. `displaySecondNumber` is displayed only when present;
its meaning is unknown, and it is not a total, reply parent, or pagination limit.
The renderer accepts an optional explicit line-count display value, but the app
omits it because the v1 post schema has no such field. It never derives a count
from body lines: the historical counting rule (title, blank lines, wrapping,
etc.) is unverified. No schema/version change is needed for reading. See the
[header evidence and limitations](research/pcvan-1996-1997.md#synthetic-post-header-demonstration).

## Composition and read tracking

`WRITE` and `REPLY number` are reconstructed forum commands, not documented
PC-VAN shortcuts. The dialog labels its prompts, review, send and cancel controls
as reconstructed because exact 1996–97 compose interactions remain unverified.
It preserves Japanese text and whitespace, rejects blank titles/bodies, and
requires an explicit review followed by a send click. Title Enter and IME
confirmation cannot submit. Cancel/Escape writes no post or board; failed sends
retain the reviewed draft for manual retry. Drafts are never saved in backups,
history or the transcript. Only successful sends append a receipt to the log.

Users can create and select local human members below the terminal. Creation
atomically saves a human and the `active-human-member` setting; selection saves
that setting. Imported worlds without a valid selection use their first human
in database key order. AI members are excluded. Without a human, local posts can
be read without markers, and composition asks the user to create a human first.

Confirmed sends resolve the board by keyword/number inside the same transaction
as post allocation. A missing SIG or board is created there; failure rolls back
all initialization, the new post and its number increment. Ambiguous mappings
are rejected. Demo messages are never copied, persisted or used as reply targets.
Stored snapshots always take precedence over the legacy demonstration fallback.
Existing board counters and arbitrary stored IDs are retained.

Replies retain `replyToPostId` and prefill a `RE#number` subject. Lists and reads
derive references from the current parent's ID, so editing the subject cannot
sever the relationship. A separate link reads the parent within the same forum;
there is no comment tree. The repository revalidates the parent on send, including
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
| `configureResident(profile, now?)` | Validate and save a profile/AI handle, recalculate its future due time and preserve existing posts/runs. |
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
| `close()` | Releases the connection. Old connections also close on `versionchange`; reload before further use. |

Stores are `members`, `sigs`, `forums`, `posts`, `readStates`, `settings`, and a
singleton `session` store (out-of-line key `current`). The generic methods exclude
session; generic `put` also excludes posts so it cannot bypass allocation.
Indexes cover forums by SIG, posts by `[forumId, number]` (unique), author and
reply parent, and read states by member and forum. Relationship-sensitive writes
share a transaction scope across stores, preventing concurrent deletion/import
from invalidating references. Post-number uniqueness and counter allocation work
across independent connections/tabs without a JavaScript lock. Exhausted safe
integer counters are rejected; numbers are not wrapped.

`RepositoryError.code` distinguishes `validation`, `confirmation-required`,
`quota`, `blocked`, `unavailable`, and `storage`; native errors are retained as
`cause`. A blocked open asks the user to close other tabs. A newer database version
is not downgraded or deleted. No automatic retry or destructive recovery occurs.

The shell calls `startSession()` on opening/reloading and on `RECONNECT`, calls
`endSession()` for an explicit MAIN `Q` logout, and persists submitted nonblank
commands. The latest timestamps appear below the terminal in UTC. A browser tab
close is not recorded as a reliable logout event. Imported session records remain
exact until a subsequent start or command append applies the history bound;
in-memory recall is always limited to 100 nonblank entries.
The transcript, input draft and edits to recalled input remain in memory. The
terminal's **端末ログを保存 (.txt)** downloads the displayed transcript, including
scrollback, as UTF-8 text without modifying local data; it is separate from JSON
backup/restore. Neither the transcript nor unsubmitted drafts are in JSON backups.
Command echo remains immediate; responses, writes, backup and restore are queued
in this tab. Repository methods perform no external awaits inside transactions; see
[the IndexedDB transaction lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction).

## Version 1 JSON document

The root object has exactly these required fields (empty arrays are valid):

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
These additive settings remain inside the version-1 backup envelope; no IndexedDB
version/store upgrade is needed. See [the resident activity contract](local-ai.md#scheduling-discussion-and-bounds).

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
must explicitly version the backup format and IndexedDB schema rather than
silently dropping unknown content.

## Repeatable checks

Run `npm ci`, `npx playwright install chromium`, then `npm test`. The suite serves
the built shell at port 14373 and Vite source modules at 14374. Repository tests
use real Chromium IndexedDB in fresh isolated contexts and a separate test
database; UI tests exercise the production bundle. No fake database or runtime
storage library is used. See [the validation record](validation.md#issue-6-local-storage-validation)
for results and checks not executed.
