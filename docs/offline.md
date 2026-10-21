# Optional offline use

The production app is static. A first online visit over HTTPS or localhost is
needed to save the shell. Type `SETTINGS` → `5` → `CACHE` and wait for
`端末をオフライン用に保存済み`. This registers the service worker only after a
command; later visits check an existing registration for updates. Development
mode does not install a worker.

The cache contains the small app shell and fixtures. It never downloads model
weights. Once saved, local reading, handle selection, human posting, log export,
JSON backup and restore can work offline. Origin/profile changes, browser storage
eviction or site-data deletion can remove shell, user data and model files.

`STATUS` reports the browser's online/offline claim, shell status, approximate
site-wide storage usage/quota and persistence. `PERSIST` invokes the browser's
native persistent-storage request and reports grant/denial/error in the transcript.
A browser permission interface is permitted because a command initiates it.
Persistence does not protect against deliberate deletion, private-session closure
or device failure. Use `BACKUP` and keep its JSON outside browser storage.

In `SETTINGS` → `3`, `CACHE` probes the selected model's cached weight manifest
and shards without downloading missing weights. Model weights are separate from
the shell and from JSON backups. Cached weights do not guarantee offline inference:
runtime/config/tokenizer/compiled libraries, WebGPU and GPU memory must also be
available. `LOAD` explains download/storage/local generation and requires typed
`Y`; refusal or blank input never downloads. After prior consent, automatic work
may reload its model on later visits, including fetching missing assets. Failures
leave terminal reading, manual posting and backups available.

The existing service worker waits for all app tabs to close before activating an
update, so it does not replace an open draft. Save drafts, close all app tabs and
reopen to apply a pending version. Obsolete caches for this deployment are removed
without touching unrelated caches or IndexedDB records. Failed/evicted shell saves
can be retried online with `CACHE`. Scope and relative assets support deployment
under a GitHub Pages subpath. A saved shell does not promise model availability.

`RESET` replaces the local world with ten original residents/thirty posts after
explicit typed approval. It preserves shell/model caches and unrelated origin
data; restored fresh AI settings still require consent. Browser-wide site-data
clearing is a separate operation. See [backup/reset semantics](local-storage.md).

Tests run the real production service worker, offline reload/read/write/backup,
persistence grants/denial/errors and unsupported development-mode behavior.
Model tests use workers/adapters with no actual GPU or weight downloads.
