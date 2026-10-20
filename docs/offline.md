# Optional offline shell and data retention (Issue #12)

## Three independent kinds of storage

| Content | Saved when | Offline meaning / backup |
| --- | --- | --- |
| HTML, main JS/CSS and bundled fixtures | Press **端末をオフライン用に保存** on an initial successful online production visit | Wait for **保存済み** before disconnecting; supports terminal reload and local posts |
| WebLLM runtime JS/worker, model config, tokenizer, library and weights | Explicit cache check/load imports runtime; only explicit load fetches model artifacts | Selected weights must actually be cached; all other prerequisites and GPU must also work; excluded from JSON backups |
| IndexedDB local world | Existing local read/write, settings and session actions | Independent of app cache version; use the existing JSON export/restore controls |

The status panel is reconstructed utility UI outside the historical terminal.
Network status stays visible; expand **オフライン保存・容量・バックアップ**
to use the cache/storage controls and read their status messages.
Online/offline is `navigator.onLine`, a browser signal rather than a connectivity
probe. No backend, login or inference service is required. An initial online
visit and static HTTPS/localhost hosting are required to install the shell;
neither `file:` URLs nor ordinary insecure remote HTTP install a worker.
The Vite development server deliberately does not install one. Host the complete
`dist/` directory, including `sw.js` with a JavaScript MIME type, at a stable
origin/subdirectory. Open its directory URL (with trailing slash) or `index.html`.
Serve `sw.js` with revalidation/no-cache headers, and publish a complete release
with its hashed assets together. A different origin/browser profile has different
storage. Shell saving is optional; an ordinary visit does not register a worker.

`vite.config.ts` derives a content version and an exact allowlist from the final
bundle. Only HTML and the entry's static imports/CSS are pre-cached (about 70 KB
uncompressed at implementation time). Optional multi-MB AI runtime assets are
cached on demand when used; model distribution URLs are outside the worker's
allowlist. The shell worker does not intercept external downloads or arbitrary
URLs. It serves its own shell and hashed assets from its versioned cache first.
No multi-GB weights are automatically pre-cached.

The AI panel initially reports selected-model weights as unconfirmed.
**選択モデルの保存を確認** lazily imports the pinned WebLLM runtime and uses
`hasModelInCache`, which checks the tensor manifest and every shard. A partial
download is unavailable. A successful check reports cached **weights**, with an
explicit warning about other missing artifacts and GPU requirements. It never
claims that weights alone make AI ready. The model-load action determines actual
readiness; offline missing weights or runtime files produce a recoverable error.
Neither cache checks nor weight load failures gate terminal use or local posts.

## Updates and storage loss

The worker installs a whole new shell with atomic `Cache.addAll`. Each allowed
file has a build-derived SHA-256 integrity value. Installation, cache repair and
cache-miss fetches reject mismatched bytes, including a newer mutable `index.html`
served while an older worker is still active. An unsuccessful
install discards that release's cache and leaves the previous active release
available. A new release waits for all older app tabs to close; there is no forced
reload or `skipWaiting`. Save editor drafts first, close all tabs of this app,
then reopen. Cache-first HTML keeps existing clients on a coherent release until
the waiting worker activates. The next activated worker removes only older
`pcvan-shell:<this scope>:` caches. Model caches, caches for other subdirectories
and IndexedDB are untouched. There is no database schema change in this Issue.

On later visits an opted-in registration checks for updates. The panel checks
that every shell asset is still present, rather than treating a registration as
proof of offline availability. A missing/evicted shell can be saved again with
the same button while online. Saving or updating can fail when storage is full,
denied or the connection is lost; this is reported separately from local-data
errors. Recheck model storage after eviction; no last-success flag is trusted.

**保存容量を再確認** obtains the site's approximate usage/quota. This estimate
combines browser-managed storage, not just the local database, and can be rounded
or unavailable. **データの永続保存をリクエスト** calls `StorageManager.persist()`
only on user action. Grant, denial and unsupported/error states are explained.
Persistence reduces automatic eviction; it cannot protect against intentional
site-data clearing, private-session cleanup, browser-profile/device loss.
Download JSON backups outside the browser and keep them separately. The direct
**JSON バックアップ・復元へ** link reaches the existing export and confirmed
replace-all restore controls. Models and unsaved editor/transcript state are
excluded from those backups; see [the backup contract](local-storage.md).

Browser behavior references: [service worker lifecycle and caches](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers),
[storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Reproducible local checks

`npm test -- tests/offline.spec.ts` builds production assets and runs Chromium
checks using a real worker, real Cache Storage/IndexedDB, a static subdirectory
deployment and synthetic tiny shard fixtures. No real model/GPU is needed.
The fixture shard bytes establish cache presence only; they are never inferred on.
The update test serves changed worker/HTML versions, tests failed installation,
keeps two old clients open, and verifies activation, scoped cache cleanup and
unchanged members/posts/read states/settings after closing them.

For a manual check (also suitable for optional second-browser validation):

1. Run `npm ci`, `npm run build`, then `npm run preview`. Open the printed localhost
   URL in a fresh ordinary browser profile. Save a local post, export JSON and
   store the download outside browser storage.
2. Expand **オフライン保存・容量・バックアップ**, press
   **端末をオフライン用に保存**, wait for **保存済み** and inspect Cache
   Storage: only index HTML and the main hashed JS/CSS should be present. Network
   should show no model hosts or lazy AI runtime requests before cache/load actions.
3. Disconnect the device/network (or use browser offline mode), then reload the
   page, including a second reload bypassing the HTTP cache. Navigate `J MITI` →
   `3` → `9`, read a post, `WRITE` and save a manual post. Export JSON and restore
   the earlier backup with confirmation. All should work from the cached shell.
4. With no prior model download, try **モデルを読み込む**. Missing runtime/weights
   should explain unavailable AI, while terminal/manual posting still work.
   Online, the explicit cache check should report missing/incomplete weights
   without fetching weights. Actual offline inference is optional hardware testing:
   load a real model online first, then disconnect and try loading it again.
5. Reconnect. Save drafts and JSON. Keep two app tabs open, change visible app text
   in a disposable checkout, rebuild, and reload one tab. Expect the update-waiting
   message and old shell in both tabs. Close both and reopen: expect new text and
   the same local records. Only the obsolete shell cache should disappear.
6. In developer tools delete only the app-shell cache, leaving IndexedDB intact.
   Reload online: expect an incomplete/deleted status and a working save-again
   button. Save again, disconnect and reload. Check usage/persistence controls
   and their backup advice. Do not clear user records without an external backup.

Second-browser and real-weight/GPU checks are optional and are not claimed as
performed. Hosted publication is outside this Issue; no post-merge check is
required.
