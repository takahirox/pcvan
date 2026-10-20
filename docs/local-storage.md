# Local repository and JSON backups

The application stores its local world in IndexedDB, database `pcvan-local`,
database version **1**. There are no runtime dependencies, network writes,
authentication, synchronization, or remote copies. A clean browser profile starts
with no members, SIGs, forums, posts, read states, or settings. Opening the terminal
creates only local session metadata. Research fixtures are not automatically
seeded into storage; the reader has a separately labeled in-memory demo fallback.

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
fixtures. The app supplies `PcvanController.setContent()` with a consistent
`exportBackup()` snapshot before forum commands. Command responses and restores
share the existing queue; input echo and history remain immediate. Failed reads
report an error without showing cached posts; `MAIN` and `BACK` work without a
successful content read. Reading does not mutate posts or read-state records.

`src/forums.ts` maps stored SIGs by case-insensitive `keyword` (`MITI` or
`DAISIZEN`) and stored forums by `sigId` plus `boardNo` (MITI `9`, DAISIZEN
`1`–`7`). Stored record IDs do not need to match fixture IDs. One matching SIG
and board are required: a missing or ambiguous mapping reports unavailability,
and an empty stored forum stays empty. Posts are sorted by ascending `number`;
allocation gaps and missing read numbers do not change the active screen.

When no stored SIG matches, the reader uses the original, explicitly synthetic
[demo posts](../data/pcvan/demo-posts.json). These read-only seeds exist only in
the bundled app, never overwrite local records, and are not exported in backups.
They use fictional `DEMO` identities and dates. No historical bodies or real user
IDs were imported. Other local SIGs and forums remain stored/exportable but are
outside this evidence-backed directory.

The post renderer preserves the exact title/body strings, including full-width
spaces, blank lines, trailing spaces, and literal HTML. UTC dates are a stable
presentation choice. `displaySecondNumber` is displayed only when present;
its meaning is unknown, and it is not a total, reply parent, or pagination limit.
The renderer accepts an optional explicit line-count display value, but the app
omits it because the v1 post schema has no such field. It never derives a count
from body lines: the historical counting rule (title, blank lines, wrapping,
etc.) is unverified. No schema/version change is needed for reading. See the
[header evidence and limitations](research/pcvan-1996-1997.md#synthetic-post-header-demonstration).

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
| `startSession()` / `endSession()` | Atomically updates the respective timestamp, retaining history and the other timestamp; returns the session. |
| `recordCommand(line)` | Atomically appends to persisted history; concurrent appends do not overwrite each other. Returns the session. |
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

The shell calls `startSession()` on opening and persists submitted nonblank commands.
The transcript and input draft remain in memory. The navigation controller's
simulated disconnect does not call `endSession()`; `lastLogoutAt` stays `null`
until a caller invokes it, or retains the imported value. A browser tab close is
not recorded as a reliable logout event.
Command rendering remains immediate; writes, backup and restore are queued in
this tab. Repository methods perform no external awaits inside transactions; see
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
| Post | `id`, `forumId`, `number`, `authorId`, `title`, `body`, `createdAt`, `origin` | `displaySecondNumber`, `replyToPostId` |
| ReadState | `memberId`, `forumId`, `lastReadNumber` | — |
| Session | `lastLoginAt`, `lastLogoutAt`, `commandHistory` | — |
| Setting | `id`, `value` | — |

IDs, handles, keywords, names, SIG titles, and origins are nonblank strings; post
title/body and history entries may be empty strings. IDs are unique **within each
entity collection**, not globally across types. Read states are unique by their
member/forum pair. Settings values may be any finite JSON value, including nested
arrays/objects. No settings are created by default. This version has no AI-run
records; `AiRun` is reserved for a later schema revision once its contract exists.

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
