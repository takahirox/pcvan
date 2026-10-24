# Playwright case inventory for Issue #129

Snapshot of discovery at `663c2a4d113687a4e5b0df80834f5f12d3bef27f` (source tree identical to `23576a5dbd97b143f95448538ab54d5e93f4494e`). See the [audit](test-suite-audit.md) for interpretation and timing methodology.

Generated from `npx playwright test --list --reporter=json`, recursively visiting `suites` and `specs`, with one row per `spec.tests` project entry. Nested describe names are retained; loop parameters are already expanded by Playwright. Source declarations/fixture arguments were checked against each discovered location.

**519 cases / 59 specs / one Chromium project.** N = 159 cases without a browser fixture (Node logic/controller checks). B = 360 cases using page/context/browser fixtures; this includes browser module/repository tests as well as production journeys. B does not imply end-to-end. These labels describe current placement, not a recommendation. Discovery did not execute tests; its JSON `skipped` result status is a listing artifact, not a runtime skip.

## Counts by functional area

| Area | Specs | Cases | N | B |
| --- | ---: | ---: | ---: | ---: |
| Core navigation and session | 4 | 74 | 59 | 15 |
| Terminal and Settings | 4 | 31 | 0 | 31 |
| Persistence and world lifecycle | 6 | 34 | 0 | 34 |
| Forums and public boards | 6 | 49 | 17 | 32 |
| Collections and OSL | 4 | 25 | 12 | 13 |
| Historical read/search and postal services | 9 | 67 | 40 | 27 |
| NetNews | 3 | 14 | 5 | 9 |
| Conference | 2 | 11 | 3 | 8 |
| Mail | 7 | 114 | 4 | 110 |
| OLT | 4 | 35 | 6 | 29 |
| AI planning, consent and adapter | 7 | 34 | 1 | 33 |
| Public resident profiles | 1 | 21 | 9 | 12 |
| Production smoke and recovery | 1 | 3 | 0 | 3 |
| Historical display calendar | 1 | 7 | 3 | 4 |
| **Total** | **59** | **519** | **159** | **360** |

## Cases by spec

Each source line links to its declaration. Multiple cases at the same line are intentional parameter expansions, not duplicate inventory entries. Full nested titles distinguish the three scheduled composer routes.

### Core navigation and session

<details>
<summary>connection.spec.ts — 22 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L12](../tests/connection.spec.ts#L12) | N | entry advances in order using fixed JST session dates and completes idempotently |
| [L31](../tests/connection.spec.ts#L31) | N | completion and early commands cancel entry at stage 0 |
| [L31](../tests/connection.spec.ts#L31) | N | completion and early commands cancel entry at stage 1 |
| [L31](../tests/connection.spec.ts#L31) | N | completion and early commands cancel entry at stage 2 |
| [L31](../tests/connection.spec.ts#L31) | N | completion and early commands cancel entry at stage 3 |
| [L31](../tests/connection.spec.ts#L31) | N | completion and early commands cancel entry at stage 4 |
| [L31](../tests/connection.spec.ts#L31) | N | completion and early commands cancel entry at stage 5 |
| [L45](../tests/connection.spec.ts#L45) | N | missing previous logout is explicit, never inferred from an earlier login |
| [L52](../tests/connection.spec.ts#L52) | B | fresh entry reaches MAIN naturally with one separate handle invitation and no credential request |
| [L79](../tests/connection.spec.ts#L79) | B | returning entry and repeated reconnect use saved logout dates without fabricating a logout on reload |
| [L108](../tests/connection.spec.ts#L108) | B | Escape at intermediate stage 1 cancels later stages and preserves IME and input |
| [L108](../tests/connection.spec.ts#L108) | B | Escape at intermediate stage 2 cancels later stages and preserves IME and input |
| [L108](../tests/connection.spec.ts#L108) | B | Escape at intermediate stage 3 cancels later stages and preserves IME and input |
| [L108](../tests/connection.spec.ts#L108) | B | Escape at intermediate stage 4 cancels later stages and preserves IME and input |
| [L108](../tests/connection.spec.ts#L108) | B | Escape at intermediate stage 5 cancels later stages and preserves IME and input |
| [L129](../tests/connection.spec.ts#L129) | B | early commands and rapid reconnect submissions execute once without late stages or composer interference |
| [L159](../tests/connection.spec.ts#L159) | B | Settings remains usable and closing it restores the pending entry draft |
| [L171](../tests/connection.spec.ts#L171) | B | delayed startup loads dates before entry and serializes pending skips/commands (skip=false) |
| [L171](../tests/connection.spec.ts#L171) | B | delayed startup loads dates before entry and serializes pending skips/commands (skip=true) |
| [L210](../tests/connection.spec.ts#L210) | N | connection presentation can finish once, and commands cancel the wait without being lost |
| [L228](../tests/connection.spec.ts#L228) | B | Escape skips connection once; logout/reconnect preserve session times and history |
| [L241](../tests/connection.spec.ts#L241) | B | typed log export contains all accepted output, literal Unicode, and excludes unsent input |

</details>

<details>
<summary>navigation.spec.ts — 30 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L50](../tests/navigation.spec.ts#L50) | N | MAIN reproduces consecutive pairs, banner and display selectors with aligned columns |
| [L61](../tests/navigation.spec.ts#L61) | B | MAIN presentation survives HELP, service returns and reconnect at 320px |
| [L61](../tests/navigation.spec.ts#L61) | B | MAIN presentation survives HELP, service returns and reconnect at 1280px |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 1 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 2 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 3 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 4 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 5 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 6 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 7 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 8 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 9 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 10 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 11 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 12 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 13 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 14 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 15 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 16 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 17 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 18 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 19 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 20 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN 21 preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN X preserves the fixture mapping and has a safe result |
| [L99](../tests/navigation.spec.ts#L99) | N | MAIN Q preserves the fixture mapping and has a safe result |
| [L134](../tests/navigation.spec.ts#L134) | N | the documented MITI sequence uses each screen’s own numeric mapping |
| [L148](../tests/navigation.spec.ts#L148) | N | Communication bridge and MAIN return helper preserve routing |
| [L161](../tests/navigation.spec.ts#L161) | N | invalid commands and unknown jumps preserve every active screen |
| [L183](../tests/navigation.spec.ts#L183) | N | Q disconnects only at MAIN; reconnect restores MAIN and state is per session |

</details>

<details>
<summary>sections.spec.ts — 19 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L14](../tests/sections.spec.ts#L14) | N | 1 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 6 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 8 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 9 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 11 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 12 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 14 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 15 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 17 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 18 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 19 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 20 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | 21 has the appropriate empty collection and scoped navigation |
| [L14](../tests/sections.spec.ts#L14) | N | X has the appropriate empty collection and scoped navigation |
| [L32](../tests/sections.spec.ts#L32) | N | index links to every other section and preserves the complete return path |
| [L62](../tests/sections.spec.ts#L62) | N | 1 mailboxes remain distinct and return to their own directory |
| [L62](../tests/sections.spec.ts#L62) | N | X mailboxes remain distinct and return to their own directory |
| [L62](../tests/sections.spec.ts#L62) | N | 13 → 2 → MAIL mailboxes remain distinct and return to their own directory |
| [L88](../tests/sections.spec.ts#L88) | N | empty saved boards remain empty after exploring sections and services |

</details>

<details>
<summary>session.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L6](../tests/session.spec.ts#L6) | N | a replaceable controller receives the original input and output stays exact |
| [L26](../tests/session.spec.ts#L26) | N | history handles empty history, boundaries, drafts, and a recalled submission |
| [L45](../tests/session.spec.ts#L45) | N | history bounds restored and submitted commands while retaining edits to recalled input |

</details>

### Terminal and Settings

<details>
<summary>immersive.spec.ts — 4 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L4](../tests/immersive.spec.ts#L4) | B | all operation screens use one terminal with provenance available only on demand |
| [L18](../tests/immersive.spec.ts#L18) | B | nested details return through Help and Settings to the original forum screen |
| [L38](../tests/immersive.spec.ts#L38) | B | full-screen command input and scrollback remain usable at 320px |
| [L38](../tests/immersive.spec.ts#L38) | B | full-screen command input and scrollback remain usable at 1280px |

</details>

<details>
<summary>progressive-output.spec.ts — 5 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L7](../tests/progressive-output.spec.ts#L7) | B | controlled frames preserve graphemes, exact spacing, asynchronous append order and bounded batches |
| [L121](../tests/progressive-output.spec.ts#L121) | B | display costs use the limited Shift-JIS approximation with a two-unit Unicode fallback |
| [L135](../tests/progressive-output.spec.ts#L135) | B | UTF-8 log download includes accepted unpainted Unicode and excludes the unsent draft |
| [L164](../tests/progressive-output.spec.ts#L164) | B | terminal speed/theme/effects persist and Escape drains paced output without changing the draft |
| [L181](../tests/progressive-output.spec.ts#L181) | B | reduced motion defaults to instant with effects off; invalid display commands do not mutate preferences |

</details>

<details>
<summary>settings-dialog.spec.ts — 18 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L40](../tests/settings-dialog.spec.ts#L40) | B | keyboard Settings preserves terminal text, traps focus, guards IME and persists display choices at mobile width |
| [L74](../tests/settings-dialog.spec.ts#L74) | B | deliberate Settings preserves the active title prompt and never submits it on close |
| [L74](../tests/settings-dialog.spec.ts#L74) | B | deliberate Settings preserves the active body prompt and never submits it on close |
| [L74](../tests/settings-dialog.spec.ts#L74) | B | deliberate Settings preserves the active review prompt and never submits it on close |
| [L94](../tests/settings-dialog.spec.ts#L94) | B | terminal IME defers Settings without losing text; neutral setup cue supports per-world deferral |
| [L111](../tests/settings-dialog.spec.ts#L111) | B | Settings model selector, refusal, affirmative consent, pause and on-demand provenance share stored actions |
| [L135](../tests/settings-dialog.spec.ts#L135) | B | all ten resident profiles and schedule fields are editable, validated, cancellable and restored on reload |
| [L166](../tests/settings-dialog.spec.ts#L166) | B | Settings can cancel pending load without late output or blocking human posting |
| [L166](../tests/settings-dialog.spec.ts#L166) | B | Settings can cancel pending generate without late output or blocking human posting |
| [L182](../tests/settings-dialog.spec.ts#L182) | B | model progress and failures stay in Settings; a failed load leaves terminal reading and posting available |
| [L193](../tests/settings-dialog.spec.ts#L193) | B | Settings native JSON import/export require replacement consent, retain rollback, restore and reset with backup |
| [L227](../tests/settings-dialog.spec.ts#L227) | B | Settings stale consent and file picker completion cannot overwrite cross-tab changes |
| [L244](../tests/settings-dialog.spec.ts#L244) | B | offline shell, storage estimate and persistence controls execute from Settings without transcript chatter |
| [L264](../tests/settings-dialog.spec.ts#L264) | B | profile conflicts and cross-tab display/reset refresh Settings and invalidate pending model work |
| [L293](../tests/settings-dialog.spec.ts#L293) | B | failed dialog import keeps a human draft; confirmed import cancels it and clears unsubmitted text |
| [L316](../tests/settings-dialog.spec.ts#L316) | B | Internet sample Settings explains missing human, supports cancellation and explicitly targets each selected human |
| [L342](../tests/settings-dialog.spec.ts#L342) | B | restore invalidates a pending sample action and reviewed external reply across tabs; empty mail stays empty |
| [L342](../tests/settings-dialog.spec.ts#L342) | B | reset invalidates a pending sample action and reviewed external reply across tabs; empty mail stays empty |

</details>

<details>
<summary>terminal.spec.ts — 4 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L8](../tests/terminal.spec.ts#L8) | B | starts without services and submits Japanese text as plain text with exact spacing |
| [L34](../tests/terminal.spec.ts#L34) | B | recalls commands, restores the draft, and does not submit during IME composition |
| [L69](../tests/terminal.spec.ts#L69) | B | keyboard scrollback keeps the input draft and allows returning through Tab |
| [L95](../tests/terminal.spec.ts#L95) | B | a narrow viewport scrolls long output and keeps the command field usable |

</details>

### Persistence and world lifecycle

<details>
<summary>community.spec.ts — 2 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L5](../tests/community.spec.ts#L5) | B | atomic seed failure rolls back every record; concurrent connections seed once, preserve backups and never refill deletions |
| [L53](../tests/community.spec.ts#L53) | B | legacy opt-in preserves custom directories and allocation; populated, ambiguous, colliding and imported worlds stay untouched |

</details>

<details>
<summary>expanded-community.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L12](../tests/expanded-community.spec.ts#L12) | B | expanded baseline preserves original fiction and shares ten authors across distinct conversations |
| [L59](../tests/expanded-community.spec.ts#L59) | B | v1 expansion is atomic, concurrent, conservative with custom boards and never runs after JSON restore |
| [L118](../tests/expanded-community.spec.ts#L118) | B | terminal human identity, read/write/reply, reload and scheduled replies work across SIGs |

</details>

<details>
<summary>factory-reset.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L9](../tests/factory-reset.spec.ts#L9) | B | repository reset reuses the exact first-visit fixture, clears all local state, repeats and restores backups |
| [L88](../tests/factory-reset.spec.ts#L88) | B | reset transaction failure rolls back clears, fixture writes and generation guard |
| [L116](../tests/factory-reset.spec.ts#L116) | B | old connections cannot resurrect posts, settings, profiles, consent or history even without notifications |
| [L150](../tests/factory-reset.spec.ts#L150) | B | typed reset refusal/invalid/blank preserves data; confirmed reset reloads tabs, preserves caches and restores backup |
| [L173](../tests/factory-reset.spec.ts#L173) | B | reset failure rolls back the world and reports within the transcript |
| [L188](../tests/factory-reset.spec.ts#L188) | B | a suspended tab missing notifications cannot approve old consent after reset or restore |
| [L213](../tests/factory-reset.spec.ts#L213) | B | reset invalidates pending production load and ignores late worker results |
| [L213](../tests/factory-reset.spec.ts#L213) | B | reset invalidates pending production generate and ignores late worker results |

</details>

<details>
<summary>offline.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L4](../tests/offline.spec.ts#L4) | B | offline shell is opt-in, caches static assets only, and supports offline reload/read/write/backup |
| [L19](../tests/offline.spec.ts#L19) | B | storage estimate and browser persistence requests return transcript statuses, including denial and errors |
| [L32](../tests/offline.spec.ts#L32) | B | unsupported offline storage explains availability without interfering with navigation |

</details>

<details>
<summary>repository.spec.ts — 12 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L29](../tests/repository.spec.ts#L29) | B | a clean world is empty; all entities round-trip exactly and posts survive reload |
| [L64](../tests/repository.spec.ts#L64) | B | invalid documents and unconfirmed replacements leave the database unchanged |
| [L99](../tests/repository.spec.ts#L99) | B | a constraint failure or simulated quota failure during replacement rolls back clears and inserts |
| [L124](../tests/repository.spec.ts#L124) | B | two tabs allocate unique per-forum numbers transactionally and deleted numbers are not reused |
| [L159](../tests/repository.spec.ts#L159) | B | CRUD preserves references and post metadata; failed post creation leaves the counter intact |
| [L197](../tests/repository.spec.ts#L197) | B | session operations persist timestamps and concurrent history appends |
| [L212](../tests/repository.spec.ts#L212) | B | history retains the newest 100 commands on startup and on concurrent appends |
| [L227](../tests/repository.spec.ts#L227) | B | a failed counter write rolls back an already inserted post |
| [L246](../tests/repository.spec.ts#L246) | B | version changes close old connections so an upgrade can finish |
| [L259](../tests/repository.spec.ts#L259) | B | concurrent first sends initialize one local board and allocate distinct numbers |
| [L280](../tests/repository.spec.ts#L280) | B | invalid compose targets, blank drafts and AI authors leave all content unchanged |
| [L309](../tests/repository.spec.ts#L309) | B | read high-water marks are monotonic across connections; failed writes and missing posts preserve state |

</details>

<details>
<summary>storage-controls.spec.ts — 6 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L5](../tests/storage-controls.spec.ts#L5) | B | typed backup/import preserves real Japanese multiline posts, identities, read markers and preferences |
| [L20](../tests/storage-controls.spec.ts#L20) | B | malformed JSON, cancelled native picker, and replacement quota failure leave the old world intact |
| [L41](../tests/storage-controls.spec.ts#L41) | B | a world changed while a native file picker is pending cannot consume old approval |
| [L57](../tests/storage-controls.spec.ts#L57) | B | RESET rejects approval when another connection posts after the confirmation snapshot |
| [L57](../tests/storage-controls.spec.ts#L57) | B | IMPORT rejects approval when another connection posts after the confirmation snapshot |
| [L96](../tests/storage-controls.spec.ts#L96) | B | legacy empty world offers real populate confirmation and only adds the fixture after Y |

</details>

### Forums and public boards

<details>
<summary>bulletin-repository.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L9](../tests/bulletin-repository.spec.ts#L9) | B | general bulletin pristine initialization is atomic/concurrent; reopen, consent, deletion, restore and reset respect world boundaries |
| [L68](../tests/bulletin-repository.spec.ts#L68) | B | existing/legacy population and v1 expansion never insert general bulletin examples |
| [L92](../tests/bulletin-repository.spec.ts#L92) | B | lazy first sends serialize numbering and enforce same-board parents, ambiguity, invalid input and atomic rollback |

</details>

<details>
<summary>bulletin.spec.ts — 9 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L47](../tests/bulletin.spec.ts#L47) | N | MAIN/index communication selector 6 opens the single board and preserves exact callers through the connection wrapper |
| [L75](../tests/bulletin.spec.ts#L75) | N | general bulletin numbered/gapped unread reads, anonymous guidance and missing/empty/ambiguous mappings are read-only |
| [L100](../tests/bulletin.spec.ts#L100) | B | pristine production reading, reply/edit/save/cancel, literal IME input, About, log and JSON reload |
| [L157](../tests/bulletin.spec.ts#L157) | B | inactive production browsing protects all records; NEXT persists exactly 4 then 9 with no side effects |
| [L179](../tests/bulletin.spec.ts#L179) | B | production refreshes another tab selection/content before entry and fails closed on marker/refresh errors |
| [L238](../tests/bulletin.spec.ts#L238) | B | production anonymous browsing and missing-board cancel/failed submission never create a board; save creates just required records |
| [L278](../tests/bulletin.spec.ts#L278) | N | notice prompt culture uses only public board context and recognizes original starter replies |
| [L290](../tests/bulletin.spec.ts#L290) | B | 320px keyboard journey and replacement/reset invalidate pending board input without refilling restored examples |
| [L323](../tests/bulletin.spec.ts#L323) | B | production duplicate board or container mappings reject reading and composition without mutation |

</details>

<details>
<summary>composition.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L4](../tests/composition.spec.ts#L4) | B | first run → handle → seeded read → reply/edit/save → list/read → reload uses only commands |
| [L35](../tests/composition.spec.ts#L35) | B | skipped handle resumes pending WRITE; blank, long, command-shaped body and cancel preserve data |
| [L71](../tests/composition.spec.ts#L71) | B | human handle selection retains independent read states and never selects residents |
| [L88](../tests/composition.spec.ts#L88) | B | IME confirmation cannot submit title/body/review; storage failure retains a retryable draft without duplicate saves |
| [L114](../tests/composition.spec.ts#L114) | B | deleted reply parent fails safely and a failed read marker never reveals stale post content |
| [L133](../tests/composition.spec.ts#L133) | B | composer state machine isolates navigation, non-destructive edit validation and consumed sends |
| [L151](../tests/composition.spec.ts#L151) | B | rapid queued lines preserve prompt order, exact text and a single transactional send |
| [L167](../tests/composition.spec.ts#L167) | B | first send creates an absent board in an existing SIG; cancelling never creates it |

</details>

<details>
<summary>forums.spec.ts — 19 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L27](../tests/forums.spec.ts#L27) | N | DAISIZEN sections preserve evidence labels without invented section numbers or jump |
| [L40](../tests/forums.spec.ts#L40) | N | all seven DAISIZEN boards are independently selectable with scoped numbers and back |
| [L58](../tests/forums.spec.ts#L58) | N | MITI route reaches numbered original demos; gaps and invalid reads preserve the screen |
| [L81](../tests/forums.spec.ts#L81) | N | headers preserve title/body spacing and optional fields without interpreting secondary numbers |
| [L92](../tests/forums.spec.ts#L92) | N | all seeded demo posts have original provenance and synthetic IDs |
| [L103](../tests/forums.spec.ts#L103) | N | human, seeded and generated headers separate stable tokens from current pen names without changing records |
| [L134](../tests/forums.spec.ts#L134) | N | legacy, missing and unusable names never turn internal keys into presentation identities |
| [L162](../tests/forums.spec.ts#L162) | B | legacy imports render without assigning fields, seeding content or changing the backup |
| [L189](../tests/forums.spec.ts#L189) | N | repository identities map by SIG keyword and board number; empty/missing/ambiguous boards stay empty |
| [L216](../tests/forums.spec.ts#L216) | N | empty DAISIZEN board and invalid forum selectors preserve navigation |
| [L234](../tests/forums.spec.ts#L234) | N | unread controls cover MITI, every DAISIZEN board and additional SIG boards with actual parent paths |
| [L269](../tests/forums.spec.ts#L269) | N | unread absent/exhausted markers, anonymous and demo readers, empty and ambiguous mappings remain read-only |
| [L307](../tests/forums.spec.ts#L307) | B | production unread → rapid NEXT → exhaustion persists the exact candidates and only intended markers |
| [L356](../tests/forums.spec.ts#L356) | B | production absent marker, numbered READ high-water, human/forum isolation and JSON/reload recovery |
| [L387](../tests/forums.spec.ts#L387) | B | production other-tab content, current selection/name and high-water changes refresh on each command |
| [L424](../tests/forums.spec.ts#L424) | B | production NEXT write/refresh failures reveal no body and allow retry |
| [L453](../tests/forums.spec.ts#L453) | B | production anonymous and restored-empty worlds never seed content or create read state |
| [L473](../tests/forums.spec.ts#L473) | B | production composition, IME and other services own UNREAD/NEXT without forum marker writes |
| [L491](../tests/forums.spec.ts#L491) | B | production stale replacement without notifications stops queued NEXT; restore/reset discard old markers |

</details>

<details>
<summary>wakaba-repository.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L8](../tests/wakaba-repository.spec.ts#L8) | B | Wakaba pristine initialization is atomic/concurrent; reopen, consent, deletion, restore and reset respect world boundaries |
| [L64](../tests/wakaba-repository.spec.ts#L64) | B | existing/legacy population and v1 expansion never insert Wakaba examples |
| [L88](../tests/wakaba-repository.spec.ts#L88) | B | lazy first sends serialize numbering and enforce same-board parents, ambiguity, invalid input and atomic rollback |

</details>

<details>
<summary>wakaba.spec.ts — 7 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L41](../tests/wakaba.spec.ts#L41) | N | MAIN/index welcome selects only one authored board with exact parents through connection wrapper |
| [L64](../tests/wakaba.spec.ts#L64) | N | Wakaba numbered/gapped unread reads, anonymous guidance and missing/empty/ambiguous mappings are read-only |
| [L89](../tests/wakaba.spec.ts#L89) | B | pristine production reading, reply/edit/save/cancel, literal IME input, About, log and JSON reload |
| [L131](../tests/wakaba.spec.ts#L131) | B | inactive production browsing protects all records; NEXT persists exactly 4 then 9 with no side effects |
| [L153](../tests/wakaba.spec.ts#L153) | B | production refreshes another tab selection/content and fails closed on marker/refresh errors |
| [L199](../tests/wakaba.spec.ts#L199) | B | production anonymous browsing and missing-board cancel/failed submission never create a board; save creates just required records |
| [L231](../tests/wakaba.spec.ts#L231) | N | beginner prompt culture uses only public board context and recognizes original starter replies |

</details>

### Collections and OSL

<details>
<summary>osl-download.spec.ts — 9 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L27](../tests/osl-download.spec.ts#L27) | N | OSL selection is scoped, validates safe numbers, pins payload and restores the exact parent stack |
| [L54](../tests/osl-download.spec.ts#L54) | B | OSL command owner pins requests, consumes approval once, restores after failure and fences invalidation across awaits |
| [L54](../tests/osl-download.spec.ts#L54) | B | FTP command owner pins requests, consumes approval once, restores after failure and fences invalidation across awaits |
| [L136](../tests/osl-download.spec.ts#L136) | B | production OSL exact downloads, cancellation, IME, Settings and protected records at 320px (anonymous) |
| [L136](../tests/osl-download.spec.ts#L136) | B | production OSL exact downloads, cancellation, IME, Settings and protected records at 320px (取得する人) |
| [L239](../tests/osl-download.spec.ts#L239) | B | production synchronous browser failure, reload, modal restore and reset discard pending acquisition |
| [L272](../tests/osl-download.spec.ts#L272) | B | production OSL category 1: register original text, review/edit, reload/restore and exact acquisition at 320px |
| [L272](../tests/osl-download.spec.ts#L272) | B | production OSL category 2: register original text, review/edit, reload/restore and exact acquisition at 320px |
| [L355](../tests/osl-download.spec.ts#L355) | B | production fresh cross-tab OSL selection and world replacement invalidate authored drafts and acquisition |

</details>

<details>
<summary>osl-registration.spec.ts — 2 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L10](../tests/osl-registration.spec.ts#L10) | N | OSL category scope, current authored catalog, safe attribution and stable selection do not affect library or other services |
| [L35](../tests/osl-registration.spec.ts#L35) | B | OSL composer preserves review/edit/cancel/retry and excursions; repeated confirmation and invalidation across awaits cannot save twice |

</details>

<details>
<summary>osl-repository.spec.ts — 2 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L6](../tests/osl-repository.spec.ts#L6) | B | OSL atomically allocates category numbers, rejects collisions, deduplicates retries and protects authors and other records |
| [L68](../tests/osl-repository.spec.ts#L68) | B | OSL validates direct settings and atomic restores, preserves legacy/empty state, rolls back quota failures and fences stale worlds |

</details>

<details>
<summary>services.spec.ts — 12 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L22](../tests/services.spec.ts#L22) | N | service helpers preserve provisional metadata and show concise operational labels |
| [L36](../tests/services.spec.ts#L36) | N | MAIL opens its service view with stable HELP, BACK and MAIN |
| [L36](../tests/services.spec.ts#L36) | N | LIBRARY opens its service view with stable HELP, BACK and MAIN |
| [L36](../tests/services.spec.ts#L36) | N | CONFERENCE opens its service view with stable HELP, BACK and MAIN |
| [L36](../tests/services.spec.ts#L36) | N | OLT opens its service view with stable HELP, BACK and MAIN |
| [L36](../tests/services.spec.ts#L36) | N | OSL opens its service view with stable HELP, BACK and MAIN |
| [L59](../tests/services.spec.ts#L59) | N | service helpers stay scoped to the SIG; forum reading and MITI navigation still work |
| [L81](../tests/services.spec.ts#L81) | N | LIBRARY visits every category, reads bundled items and returns through the actual parents |
| [L81](../tests/services.spec.ts#L81) | N | OSL visits every category, reads bundled items and returns through the actual parents |
| [L144](../tests/services.spec.ts#L144) | N | switching services and MAIN from every collection depth cannot retain an old category or item |
| [L165](../tests/services.spec.ts#L165) | B | production reading and preview journeys preserve community records (no handle) |
| [L165](../tests/services.spec.ts#L165) | B | production reading and preview journeys preserve community records (読む人) |

</details>

### Historical read/search and postal services

<details>
<summary>archie.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L47](../tests/archie.spec.ts#L47) | N | Archie controller location metadata and returns to actual MAIN parent |
| [L47](../tests/archie.spec.ts#L47) | N | Archie controller location metadata and returns to actual index parent |
| [L70](../tests/archie.spec.ts#L70) | N | Archie filename-only literal matching and replacement queries keep exactly one return step |
| [L90](../tests/archie.spec.ts#L90) | N | Archie connection forwarding, MAIN at both depths, clean re-entry and disconnect/reconnect |
| [L102](../tests/archie.spec.ts#L102) | N | Archie About qualifies sources, original index, default-mode difference and unknown host access |
| [L114](../tests/archie.spec.ts#L114) | B | production Archie 320px keyboard, IME, literal lookup, export and protected anonymous empty world |
| [L114](../tests/archie.spec.ts#L114) | B | production Archie 320px keyboard, IME, literal lookup, export and protected registered world |
| [L211](../tests/archie.spec.ts#L211) | B | production Archie cancelled restore/reset retains results; identical restore, cross-tab replacement and reset discard visits |

</details>

<details>
<summary>biz.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L26](../tests/biz.spec.ts#L26) | N | BiZ controller searches and reads with stable sets and direct returns |
| [L26](../tests/biz.spec.ts#L26) | N | BiZ controller searches and reads with stable sets and index returns |
| [L76](../tests/biz.spec.ts#L76) | N | BiZ errors preserve every active view and existing results |
| [L95](../tests/biz.spec.ts#L95) | N | BiZ retains exactly twenty successful sets without eviction; limits and state are per visit and controller |
| [L119](../tests/biz.spec.ts#L119) | N | MAIN clears every BiZ depth and fresh entries expose no previous service context |
| [L142](../tests/biz.spec.ts#L142) | N | About qualifies BiZ command evidence, continuity, reconstruction and fictional content |
| [L153](../tests/biz.spec.ts#L153) | B | production BiZ journey preserves records and literal text at 320px (anonymous empty world) |
| [L153](../tests/biz.spec.ts#L153) | B | production BiZ journey preserves records and literal text at 320px (資料検索の人) |

</details>

<details>
<summary>ecom.spec.ts — 7 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L30](../tests/ecom.spec.ts#L30) | N | ECOM discoverability, isolation and actual MAIN parent |
| [L30](../tests/ecom.spec.ts#L30) | N | ECOM discoverability, isolation and actual index parent |
| [L54](../tests/ecom.spec.ts#L54) | N | ECOM limits, literal input, every edit, cancellation and single-use reviewed approval |
| [L123](../tests/ecom.spec.ts#L123) | B | production ECOM 320px keyboard journey and protected storage (anonymous restored-empty) |
| [L123](../tests/ecom.spec.ts#L123) | B | production ECOM 320px keyboard journey and protected storage (架空の手紙を書く人) |
| [L219](../tests/ecom.spec.ts#L219) | B | production ECOM draft and receipt lifetime across identical restore, cross-tab replacement, reload, reset and queued departure |
| [L254](../tests/ecom.spec.ts#L254) | N | ECOM About describes qualified evidence and reconstructed controls |

</details>

<details>
<summary>eic.spec.ts — 6 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L21](../tests/eic.spec.ts#L21) | N | EIC controller reads every item, rejects contextual errors and follows direct parents |
| [L21](../tests/eic.spec.ts#L21) | N | EIC controller reads every item, rejects contextual errors and follows index parents |
| [L63](../tests/eic.spec.ts#L63) | N | MAIN from every new depth and re-entry clear old articles, service contexts and parents |
| [L87](../tests/eic.spec.ts#L87) | N | About preserves EIC evidence, chronology, limitations and reconstruction scope |
| [L98](../tests/eic.spec.ts#L98) | B | production EIC journey preserves protected records at 320px (anonymous empty world) |
| [L98](../tests/eic.spec.ts#L98) | B | production EIC journey preserves protected records at 320px (資料を読む人) |

</details>

<details>
<summary>ftp.spec.ts — 7 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L33](../tests/ftp.spec.ts#L33) | N | FTP controller list/preview, pinned payload and exact MAIN returns |
| [L33](../tests/ftp.spec.ts#L33) | N | FTP controller list/preview, pinned payload and exact index returns |
| [L73](../tests/ftp.spec.ts#L73) | N | FTP MAIN at every depth clears the path and connection forwarding selects only eligible files |
| [L86](../tests/ftp.spec.ts#L86) | N | FTP examples and About qualify authorship, scope and historical uncertainty |
| [L100](../tests/ftp.spec.ts#L100) | B | production FTP exact files, confirmation, protected world and 320px keyboard journey (anonymous empty) |
| [L100](../tests/ftp.spec.ts#L100) | B | production FTP exact files, confirmation, protected world and 320px keyboard journey (文書を読む人) |
| [L200](../tests/ftp.spec.ts#L200) | B | production FTP handoff failure, reload, same-tab identical restore, cross-tab replacement and reset discard approval |

</details>

<details>
<summary>gopher.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L34](../tests/gopher.spec.ts#L34) | N | Gopher controller directory/document/search path returns to actual MAIN parent |
| [L34](../tests/gopher.spec.ts#L34) | N | Gopher controller directory/document/search path returns to actual index parent |
| [L77](../tests/gopher.spec.ts#L77) | N | Gopher search is literal, case insensitive, title/body only and replacement queries keep one return frame |
| [L108](../tests/gopher.spec.ts#L108) | N | Gopher connection forwarding, MAIN at every depth, clean re-entry and disconnect/reconnect |
| [L123](../tests/gopher.spec.ts#L123) | N | Gopher About discloses historical capability, uncertain route, category D and original authorship |
| [L136](../tests/gopher.spec.ts#L136) | B | production Gopher 320px keyboard, IME, exact returns, export and protected anonymous empty world |
| [L136](../tests/gopher.spec.ts#L136) | B | production Gopher 320px keyboard, IME, exact returns, export and protected registered world |
| [L237](../tests/gopher.spec.ts#L237) | B | production Gopher restore cancellation preserves query; identical restore, cross-tab restore and reset clear the visit |

</details>

<details>
<summary>news.spec.ts — 7 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L33](../tests/news.spec.ts#L33) | N | news controller reads all briefs, rejects contextual errors and follows direct parents |
| [L33](../tests/news.spec.ts#L33) | N | news controller reads all briefs, rejects contextual errors and follows index parents |
| [L76](../tests/news.spec.ts#L76) | N | MAIN clears every news depth; visits and service contexts cannot retain stale paths |
| [L98](../tests/news.spec.ts#L98) | N | About qualifies news sources, continuity, reconstruction, access limits and fiction |
| [L108](../tests/news.spec.ts#L108) | B | production news journey preserves registered populated records and literal text at 320px |
| [L108](../tests/news.spec.ts#L108) | B | production news journey preserves registered empty records and literal text at 320px |
| [L108](../tests/news.spec.ts#L108) | B | production news journey preserves anonymous empty records and literal text at 320px |

</details>

<details>
<summary>publications.spec.ts — 7 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L36](../tests/publications.spec.ts#L36) | N | publishing controller reads all installments, rejects contextual errors and follows direct parents |
| [L36](../tests/publications.spec.ts#L36) | N | publishing controller reads all installments, rejects contextual errors and follows index parents |
| [L79](../tests/publications.spec.ts#L79) | N | MAIN clears every publishing depth; visits and service contexts cannot retain stale paths |
| [L102](../tests/publications.spec.ts#L102) | N | About qualifies publishing evidence, fiction and uncertain Journal relationship |
| [L110](../tests/publications.spec.ts#L110) | B | production publishing journey preserves registered populated records and literal text at 320px |
| [L110](../tests/publications.spec.ts#L110) | B | production publishing journey preserves registered empty records and literal text at 320px |
| [L110](../tests/publications.spec.ts#L110) | B | production publishing journey preserves anonymous populated records and literal text at 320px |

</details>

<details>
<summary>telnet.spec.ts — 9 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L26](../tests/telnet.spec.ts#L26) | N | TELNET controller complete journey and stable MAIN parents |
| [L26](../tests/telnet.spec.ts#L26) | N | TELNET controller complete journey and stable index parents |
| [L78](../tests/telnet.spec.ts#L78) | N | TELNET MAIN clears every depth; other services and connections never retain remote state |
| [L103](../tests/telnet.spec.ts#L103) | N | TELNET fiction and About disclose evidence, chronology and authored controls |
| [L115](../tests/telnet.spec.ts#L115) | B | production TELNET keyboard journey preserves anonymous empty, literal Japanese and input at 320px |
| [L115](../tests/telnet.spec.ts#L115) | B | production TELNET keyboard journey preserves registered empty, literal Japanese and input at 320px |
| [L115](../tests/telnet.spec.ts#L115) | B | production TELNET keyboard journey preserves registered populated, literal Japanese and input at 320px |
| [L228](../tests/telnet.spec.ts#L228) | B | confirmed restore and reset invalidate TELNET sessions and selections through existing safeguards |
| [L247](../tests/telnet.spec.ts#L247) | B | native restore failure retains TELNET selection; successful and cross-tab restores discard it |

</details>

### NetNews

<details>
<summary>netnews-posting.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L17](../tests/netnews-posting.spec.ts#L17) | B | production fj.questions.fj: register, compose/edit/cancel, followup generations, search, reload/restore and literal log at 320px |
| [L17](../tests/netnews-posting.spec.ts#L17) | B | production fj.news.usage: register, compose/edit/cancel, followup generations, search, reload/restore and literal log at 320px |
| [L129](../tests/netnews-posting.spec.ts#L129) | B | production failed-save editing/retry, cross-connection read refresh and import/reset discard owned NetNews drafts |

</details>

<details>
<summary>netnews-repository.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L5](../tests/netnews-repository.spec.ts#L5) | B | NetNews atomic allocation, concurrent/idempotent drafts, group identities, reference chains and failed-save retry |
| [L69](../tests/netnews-repository.spec.ts#L69) | B | NetNews direct writes and restores validate entire state; quota rollback, roundtrip, legacy absence, reset and stale connections |
| [L149](../tests/netnews-repository.spec.ts#L149) | B | NetNews command drafts pin group/author/parent across settings changes and consume committed sends despite refresh failure |

</details>

<details>
<summary>netnews.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L39](../tests/netnews.spec.ts#L39) | N | NetNews controller: all articles, searches, errors and direct returns |
| [L39](../tests/netnews.spec.ts#L39) | N | NetNews controller: all articles, searches, errors and index returns |
| [L135](../tests/netnews.spec.ts#L135) | N | NetNews MAIN clears every depth and filter; visits cannot retain other service contexts |
| [L160](../tests/netnews.spec.ts#L160) | N | NetNews corpus has fixed fictional headers and linked followups; About qualifies the evidence |
| [L181](../tests/netnews.spec.ts#L181) | B | production NetNews preserves registered populated records and literal headers/body at 320px |
| [L181](../tests/netnews.spec.ts#L181) | B | production NetNews preserves registered empty records and literal headers/body at 320px |
| [L181](../tests/netnews.spec.ts#L181) | B | production NetNews preserves anonymous empty records and literal headers/body at 320px |
| [L315](../tests/netnews.spec.ts#L315) | N | local NetNews attribution shares safe stable identities and calendar projection without altering bundled dates or stored records |

</details>

### Conference

<details>
<summary>conference-repository.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L5](../tests/conference-repository.spec.ts#L5) | B | conference transactions allocate concurrent numbers, validate authors/parents, deduplicate and roll back failed writes |
| [L48](../tests/conference-repository.spec.ts#L48) | B | conference backups reject invalid state and references without replacement; quota restore is atomic and stale drafts cannot cross import/reset |
| [L108](../tests/conference-repository.spec.ts#L108) | B | existing seeded, legacy and imported worlds never acquire conference examples; first send remains independent of AI planning |

</details>

<details>
<summary>conference.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L20](../tests/conference.spec.ts#L20) | N | conference author identity matches shared service tokens, refreshes names and preserves literal records and controller output |
| [L75](../tests/conference.spec.ts#L75) | N | conference safe-name and unknown-author fallbacks apply only to attribution and retain strict import validation |
| [L105](../tests/conference.spec.ts#L105) | N | conference controller reads retained contributions and keeps list context isolated from all other services |
| [L132](../tests/conference.spec.ts#L132) | B | production conference identity survives duplicate names, human contributions/replies, both renames and reload/reordered restore |
| [L218](../tests/conference.spec.ts#L218) | B | production anonymous read → registration → reply/edit → save → list/read → return/reload and JSON round-trip |
| [L262](../tests/conference.spec.ts#L262) | B | production older missing conference stays empty, cancels and accepts its first human contribution |
| [L262](../tests/conference.spec.ts#L262) | B | production intentionally empty conference stays empty, cancels and accepts its first human contribution |
| [L291](../tests/conference.spec.ts#L291) | B | production IME guards, failed conference save/retry and removed reply parent retain a safe draft |

</details>

### Mail

<details>
<summary>mail-autonomy.spec.ts — 14 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L41](../tests/mail-autonomy.spec.ts#L41) | B | MAIN 1: consented reply confirms only its parent, preserves draft/IME and public capacity, and survives reload/restore |
| [L41](../tests/mail-autonomy.spec.ts#L41) | B | MAIN X: consented reply confirms only its parent, preserves draft/IME and public capacity, and survives reload/restore |
| [L41](../tests/mail-autonomy.spec.ts#L41) | B | SIG MAIL: consented reply confirms only its parent, preserves draft/IME and public capacity, and survives reload/restore |
| [L88](../tests/mail-autonomy.spec.ts#L88) | B | a direct SIG acquaintance can autonomously initiate mail with the same member ID and public history |
| [L104](../tests/mail-autonomy.spec.ts#L104) | B | unopened model leaves scheduled mail readable and never downloads or generates |
| [L104](../tests/mail-autonomy.spec.ts#L104) | B | unsupported model leaves scheduled mail readable and never downloads or generates |
| [L115](../tests/mail-autonomy.spec.ts#L115) | B | mail prompts exclude other humans and other recipients, bound history and reject injection output or wrong identities |
| [L148](../tests/mail-autonomy.spec.ts#L148) | B | scheduled mail invalid is bounded, delivers nothing and leaves human reading usable |
| [L148](../tests/mail-autonomy.spec.ts#L148) | B | scheduled mail failure is bounded, delivers nothing and leaves human reading usable |
| [L163](../tests/mail-autonomy.spec.ts#L163) | B | deterministic catch-up bounds mail without displacing all public work, and respects pause/consent/routines |
| [L187](../tests/mail-autonomy.spec.ts#L187) | B | separate timer batches reserve forum saves until the six-hour mail allowance renews |
| [L283](../tests/mail-autonomy.spec.ts#L283) | B | scheduled mail quota failure rolls back delivery and run completion; explicit recovery commits the same run once |
| [L316](../tests/mail-autonomy.spec.ts#L316) | B | Internet letters create no resident acquaintance, targets, pair memory or forum/OLT prompt content |
| [L359](../tests/mail-autonomy.spec.ts#L359) | B | mocked scheduled reply to one multi-mail copy leaves its co-recipient unconfirmed and out of the prompt |

</details>

<details>
<summary>mail-file-controller.spec.ts — 1 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L3](../tests/mail-file-controller.spec.ts#L3) | B | file controller pins identities, invalidates asynchronous waits and consumes failed/repeated acquisition |

</details>

<details>
<summary>mail-file.spec.ts — 14 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L27](../tests/mail-file.spec.ts#L27) | B | MAIN 1: explicit file selection, IME review, single save, inert exact-byte acquisition, reload and JSON restore |
| [L27](../tests/mail-file.spec.ts#L27) | B | MAIN X: explicit file selection, IME review, single save, inert exact-byte acquisition, reload and JSON restore |
| [L27](../tests/mail-file.spec.ts#L27) | B | DAISIZEN MAIL: explicit file selection, IME review, single save, inert exact-byte acquisition, reload and JSON restore |
| [L75](../tests/mail-file.spec.ts#L75) | B | file mail preserves 0 exact bytes after JSON restoration |
| [L75](../tests/mail-file.spec.ts#L75) | B | file mail preserves 262144 exact bytes after JSON restoration |
| [L87](../tests/mail-file.spec.ts#L87) | B | picker cancellation, empty selection, read errors, oversized/unsafe files, reselection and save failure never partially save |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab reset invalidates file picker and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab reset invalidates file read and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab reset invalidates file review and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab reset invalidates file acquire and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab restore invalidates file picker and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab restore invalidates file read and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab restore invalidates file review and queued approvals |
| [L128](../tests/mail-file.spec.ts#L128) | B | cross-tab restore invalidates file acquire and queued approvals |

</details>

<details>
<summary>mail-presentation.spec.ts — 8 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L10](../tests/mail-presentation.spec.ts#L10) | N | sent status means unknown until confirmation and projects the durable commitment instant without changing content |
| [L34](../tests/mail-presentation.spec.ts#L34) | N | mail parties share forum tokens, refresh safe names and preserve literal content and source records |
| [L84](../tests/mail-presentation.spec.ts#L84) | B | directory uses current member names and new/reply drafts pin the resolved ID and label through edits and save retry |
| [L148](../tests/mail-presentation.spec.ts#L148) | B | committed external save consumes its pinned draft even when refresh fails |
| [L173](../tests/mail-presentation.spec.ts#L173) | N | incoming external sender has its own address, sample label, recipient and date without a synthetic sender |
| [L190](../tests/mail-presentation.spec.ts#L190) | B | multi selection pins safe identities, rejects duplicate aliases/ambiguity and retains all labels through edit and retry |
| [L233](../tests/mail-presentation.spec.ts#L233) | B | multi committed save consumes every copy after refresh or output failure; invalidate discards pending selection reads |
| [L271](../tests/mail-presentation.spec.ts#L271) | B | multi save waiting for a repository cannot write after controller invalidation |

</details>

<details>
<summary>mail-repository.spec.ts — 36 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L40](../tests/mail-repository.spec.ts#L40) | B | atomic addresses, sender/parent validation, concurrent numbering, idempotent retries and quota rollback preserve forums |
| [L80](../tests/mail-repository.spec.ts#L80) | B | mail backup strictness, individual recipient read markers, replies, import and stale/reset fences |
| [L125](../tests/mail-repository.spec.ts#L125) | B | v1 database upgrade and pre-mail backup import retain original posts and read states |
| [L161](../tests/mail-repository.spec.ts#L161) | B | stable addresses resolve handle collisions and generic member edits cannot invalidate existing mail |
| [L186](../tests/mail-repository.spec.ts#L186) | B | only a new explicit reply confirms its parent atomically; concurrent retries and legacy duplicates never refresh or infer evidence |
| [L257](../tests/mail-repository.spec.ts#L257) | B | backwards operational clocks clamp confirmation to parent creation, never to catch-up time |
| [L267](../tests/mail-repository.spec.ts#L267) | B | confirmation imports reject malformed, dangling and mismatched evidence without replacing any world records |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after recipient, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after parent, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after persona, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after output, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after cancelled, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after failed, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after pending, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after consent, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after pause, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after quota, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after abort, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after pre-abort, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after restore, including rollback after the parent write |
| [L298](../tests/mail-repository.spec.ts#L298) | B | resident confirmation stays absent after reset, including rollback after the parent write |
| [L357](../tests/mail-repository.spec.ts#L357) | B | Internet addresses share strict controller/write/import validation and never resolve to resident handles |
| [L403](../tests/mail-repository.spec.ts#L403) | B | mixed Internet/resident saves allocate atomically, retry identically, reject forged imports and round-trip without member creation |
| [L466](../tests/mail-repository.spec.ts#L466) | B | opt-in Internet samples and replies are atomic, isolated, idempotent and survive JSON/reopen |
| [L513](../tests/mail-repository.spec.ts#L513) | B | incoming Internet schema and reply relationships reject forged imports and writes without changing the world |
| [L565](../tests/mail-repository.spec.ts#L565) | B | Internet sample quota/abort rollback keeps numbering and reset/restore fences reject stale actions |
| [L565](../tests/mail-repository.spec.ts#L565) | B | Internet reply quota/abort rollback keeps numbering and reset/restore fences reject stale actions |
| [L609](../tests/mail-repository.spec.ts#L609) | B | sample IDs reject collisions, mixed sample/resident allocation stays monotonic and stale confirmation rolls back |
| [L628](../tests/mail-repository.spec.ts#L628) | B | multi-mail complete-set retries, collisions, mixed concurrent numbering and rollback use one transaction |
| [L682](../tests/mail-repository.spec.ts#L682) | B | multi-mail JSON, legacy and empty restore, pinned eligibility and identical-world generation fences |
| [L713](../tests/mail-repository.spec.ts#L713) | B | multi-mail copies keep pair prompts and explicit-parent confirmations independent |
| [L761](../tests/mail-repository.spec.ts#L761) | B | multi-mail validation after an earlier copy write rolls back the set and allocator |
| [L761](../tests/mail-repository.spec.ts#L761) | B | multi-mail abort after an earlier copy write rolls back the set and allocator |
| [L786](../tests/mail-repository.spec.ts#L786) | B | native files: canonical bytes, complete retry identity, rollback and mixed scheduled/text/file numbering |
| [L840](../tests/mail-repository.spec.ts#L840) | B | native files reject malformed bytes, unsafe names, invalid actors and unsupported combinations before writes or restore |
| [L892](../tests/mail-repository.spec.ts#L892) | B | native files remain outside prompts and planning; direct, restored and already-planned reply parents fail closed |

</details>

<details>
<summary>mail.spec.ts — 21 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L17](../tests/mail.spec.ts#L17) | B | MAIN 1: duplicate correspondents, stable-address send/edit, received reply, rename and reload/restore |
| [L17](../tests/mail.spec.ts#L17) | B | MAIN X: duplicate correspondents, stable-address send/edit, received reply, rename and reload/restore |
| [L17](../tests/mail.spec.ts#L17) | B | SIG MAIL: duplicate correspondents, stable-address send/edit, received reply, rename and reload/restore |
| [L116](../tests/mail.spec.ts#L116) | B | fresh visitor registers in mail, edits multiline Japanese with IME, retries quota and sees the same sent letter from all three routes |
| [L161](../tests/mail.spec.ts#L161) | B | cancel at every mail stage, invalid commands and independent human projections never deliver accidentally |
| [L178](../tests/mail.spec.ts#L178) | B | stored mail is usable without GPU, survives offline reload/backup/import and reset fences an open draft in another tab |
| [L205](../tests/mail.spec.ts#L205) | B | MAIN 1: Internet letter stays literal and local through IME, edit, retry, SENT/READ, reload and backup |
| [L205](../tests/mail.spec.ts#L205) | B | MAIN X: Internet letter stays literal and local through IME, edit, retry, SENT/READ, reload and backup |
| [L205](../tests/mail.spec.ts#L205) | B | SIG MAIL: Internet letter stays literal and local through IME, edit, retry, SENT/READ, reload and backup |
| [L276](../tests/mail.spec.ts#L276) | B | Internet draft cancellation and reset invalidate a reviewed external draft in another tab |
| [L276](../tests/mail.spec.ts#L276) | B | Internet draft cancellation and restore invalidate a reviewed external draft in another tab |
| [L306](../tests/mail.spec.ts#L306) | B | MAIN 1: Settings Internet sample → INBOX → literal reply/edit/retry → local save and JSON round-trip |
| [L306](../tests/mail.spec.ts#L306) | B | MAIN X: Settings Internet sample → INBOX → literal reply/edit/retry → local save and JSON round-trip |
| [L306](../tests/mail.spec.ts#L306) | B | SIG MAIL: Settings Internet sample → INBOX → literal reply/edit/retry → local save and JSON round-trip |
| [L397](../tests/mail.spec.ts#L397) | B | MAIN 1: WRITE-MULTI registration, selection, IME, edit, atomic retry, SENT/READ and JSON |
| [L397](../tests/mail.spec.ts#L397) | B | MAIN X: WRITE-MULTI registration, selection, IME, edit, atomic retry, SENT/READ and JSON |
| [L397](../tests/mail.spec.ts#L397) | B | SIG MAIL: WRITE-MULTI registration, selection, IME, edit, atomic retry, SENT/READ and JSON |
| [L484](../tests/mail.spec.ts#L484) | B | multi-mail selection is invalidated across tabs by reset, including queued approval |
| [L484](../tests/mail.spec.ts#L484) | B | multi-mail review is invalidated across tabs by reset, including queued approval |
| [L484](../tests/mail.spec.ts#L484) | B | multi-mail selection is invalidated across tabs by restore, including queued approval |
| [L484](../tests/mail.spec.ts#L484) | B | multi-mail review is invalidated across tabs by restore, including queued approval |

</details>

<details>
<summary>scheduled-mail.spec.ts — 20 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L14](../tests/scheduled-mail.spec.ts#L14) | N | inverse JST projection validates calendar dates, exact limits and midnight/year rollover |
| [L279](../tests/scheduled-mail.spec.ts#L279) | B | expiry retains draft and requires new time/review; active release preserves IME and terminal output ownership |
| [L310](../tests/scheduled-mail.spec.ts#L310) | B | scheduled composer retries a failed save but consumes a committed draft when output fails |
| [L329](../tests/scheduled-mail.spec.ts#L329) | B | inline registration, pinned recipient after rename, rapid queued review and retry preserve identity and private recall |
| [L365](../tests/scheduled-mail.spec.ts#L365) | B | scheduled review approvals are fenced by reset across tabs |
| [L365](../tests/scheduled-mail.spec.ts#L365) | B | scheduled cancellation approvals are fenced by reset across tabs |
| [L365](../tests/scheduled-mail.spec.ts#L365) | B | scheduled review approvals are fenced by restore across tabs |
| [L365](../tests/scheduled-mail.spec.ts#L365) | B | scheduled cancellation approvals are fenced by restore across tabs |
| [L393](../tests/scheduled-mail.spec.ts#L393) | B | a focus resume releases overdue mail beyond the AI window without downloads or external requests |
| [L407](../tests/scheduled-mail.spec.ts#L407) | B | active delivery continues while a resident generation is waiting indefinitely |
| [L39](../tests/scheduled-mail.spec.ts#L39) | B | scheduled repository → pending isolation, concurrent submission, exact boundary release and global numbering |
| [L66](../tests/scheduled-mail.spec.ts#L66) | B | scheduled repository → cancellation serializes with release and submission retries retain terminal tombstones |
| [L85](../tests/scheduled-mail.spec.ts#L85) | B | scheduled repository → a cancellation waiting for the storage lock checks the clock inside its transaction |
| [L104](../tests/scheduled-mail.spec.ts#L104) | B | scheduled repository → quota failure rolls back all releases and number allocation, then late wake releases once in due order |
| [L127](../tests/scheduled-mail.spec.ts#L127) | B | scheduled repository → strict backup/direct-write validation, actors, references, lifecycle and deliberately empty legacy backup |
| [L171](../tests/scheduled-mail.spec.ts#L171) | B | scheduled repository → saved due instants survive restore; identical replacement fences stale submit, cancel and reconciliation handles |
| [L192](../tests/scheduled-mail.spec.ts#L192) | B | scheduled repository → mocked catch-up prompts respect availability and commits revalidate scheduled-parent response delay |
| [L245](../tests/scheduled-mail.spec.ts#L245) | B | production scheduling route 1 → review/edit, pending, reload, confirmed cancellation and due release preserve contextual returns |
| [L245](../tests/scheduled-mail.spec.ts#L245) | B | production scheduling route X → review/edit, pending, reload, confirmed cancellation and due release preserve contextual returns |
| [L245](../tests/scheduled-mail.spec.ts#L245) | B | production scheduling route 13/2/MAIL → review/edit, pending, reload, confirmed cancellation and due release preserve contextual returns |

</details>

### OLT

<details>
<summary>olt-repository.spec.ts — 6 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L15](../tests/olt-repository.spec.ts#L15) | B | bounded monotonic lines, same-identity leases, atomic failure, strict restore, legacy import and epoch fencing |
| [L84](../tests/olt-repository.spec.ts#L84) | B | transactional turn reservations, persistent independent budget, privacy, duplicate commit and withdrawn consent (night) |
| [L84](../tests/olt-repository.spec.ts#L84) | B | transactional turn reservations, persistent independent budget, privacy, duplicate commit and withdrawn consent (wakaba) |
| [L145](../tests/olt-repository.spec.ts#L145) | B | default evening routines allow both populated and empty visits without duplicate arrivals or off-hour crowds |
| [L173](../tests/olt-repository.spec.ts#L173) | B | OLT prompts bound public context and malformed, impersonated or repeated model output never appends (night) |
| [L173](../tests/olt-repository.spec.ts#L173) | B | OLT prompts bound public context and malformed, impersonated or repeated model output never appends (wakaba) |

</details>

<details>
<summary>olt.spec.ts — 14 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L14](../tests/olt.spec.ts#L14) | B | terminal directory, literal commands, IME, history, transitions, handles, reentry and forum posting |
| [L39](../tests/olt.spec.ts#L39) | B | delayed human-to-resident and resident-to-resident chat preserve input, shared identities, and private mail |
| [L70](../tests/olt.spec.ts#L70) | B | silent residents, expiry and reload produce bounded chronology without closed-tab inference |
| [L86](../tests/olt.spec.ts#L86) | B | two tabs share attendance and arbitrate each AI turn once |
| [L110](../tests/olt.spec.ts#L110) | B | invalid inference preserves terminal room navigation and never fabricates speech |
| [L110](../tests/olt.spec.ts#L110) | B | failure inference preserves terminal room navigation and never fabricates speech |
| [L110](../tests/olt.spec.ts#L110) | B | unsupported inference preserves terminal room navigation and never fabricates speech |
| [L121](../tests/olt.spec.ts#L121) | B | JSON backup, import and reset preserve transcript and shared authors, then clear OLT baseline |
| [L135](../tests/olt.spec.ts#L135) | B | pending OLT generation times out, releases its worker, and keeps navigation usable |
| [L144](../tests/olt.spec.ts#L144) | B | leaving or hiding a tab cancels in-flight inference and never commits its late result |
| [L166](../tests/olt.spec.ts#L166) | N | presentation reuses forum tokens and safe names for every line kind without writes or record mutation |
| [L226](../tests/olt.spec.ts#L226) | B | production OLT speech → WHO → rename → LIST keeps forum identity through reload/restore at 320px |
| [L292](../tests/olt.spec.ts#L292) | B | anonymous OLT reading preserves zero attendance and never invents an identity |
| [L306](../tests/olt.spec.ts#L306) | N | About discloses OLT identity sources, confidence, continuity and reconstructed placement |

</details>

<details>
<summary>wakaba-olt-repository.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L15](../tests/wakaba-olt-repository.spec.ts#L15) | B | legacy normalization preserves every old field, is pure/idempotent and persists atomically across connections and JSON |
| [L86](../tests/wakaba-olt-repository.spec.ts#L86) | B | malformed legacy/new imports, invalid references and normalization/import write failure retain the old world |
| [L138](../tests/wakaba-olt-repository.spec.ts#L138) | B | all three rooms share the persistent cap, while Wakaba prompt/output and turn arbitration remain room scoped |

</details>

<details>
<summary>wakaba-olt.spec.ts — 12 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L20](../tests/wakaba-olt.spec.ts#L20) | N | both controller parents carry a separate OLT context and preserve the beginner board |
| [L37](../tests/wakaba-olt.spec.ts#L37) | B | production MAIN anonymous quiet/speaking visit isolates local selectors and records |
| [L37](../tests/wakaba-olt.spec.ts#L37) | B | production MAIN registered quiet/speaking visit isolates local selectors and records |
| [L37](../tests/wakaba-olt.spec.ts#L37) | B | production index anonymous quiet/speaking visit isolates local selectors and records |
| [L37](../tests/wakaba-olt.spec.ts#L37) | B | production index registered quiet/speaking visit isolates local selectors and records |
| [L75](../tests/wakaba-olt.spec.ts#L75) | B | Wakaba two-tab attendance and shared turn arbitration use the shared residents and model |
| [L95](../tests/wakaba-olt.spec.ts#L95) | B | Wakaba pending inference is cancelled on departure before another visit |
| [L95](../tests/wakaba-olt.spec.ts#L95) | B | Wakaba pending inference is cancelled on settings before another visit |
| [L95](../tests/wakaba-olt.spec.ts#L95) | B | Wakaba pending inference is cancelled on hidden before another visit |
| [L114](../tests/wakaba-olt.spec.ts#L114) | N | late output is fenced after context changes |
| [L114](../tests/wakaba-olt.spec.ts#L114) | N | late output is fenced after reentry changes |
| [L141](../tests/wakaba-olt.spec.ts#L141) | N | About makes Wakaba capability, uncertainty, reconstruction and compatibility discoverable |

</details>

### AI planning, consent and adapter

<details>
<summary>activity.spec.ts — 6 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L10](../tests/activity.spec.ts#L10) | B | model authorization survives cap/pause edits but never transfers to another model or its pending batch |
| [L42](../tests/activity.spec.ts#L42) | B | independent resident plans are deterministic, varied, bounded and require model consent |
| [L72](../tests/activity.spec.ts#L72) | B | reply-only residents stay silent without eligible parents instead of starting topics |
| [L105](../tests/activity.spec.ts#L105) | B | individual pause withdraws retained runs across reloads and retries without blocking other residents |
| [L160](../tests/activity.spec.ts#L160) | B | cross-tab pauses before inference and during generation skip stale actions and preserve other residents |
| [L214](../tests/activity.spec.ts#L214) | B | atomic result/status, concurrent commits, rollback, interrupted retry, caps and backup timestamps |

</details>

<details>
<summary>ai-adapter.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L4](../tests/ai-adapter.spec.ts#L4) | B | mock adapter handles bare and timestamped module URLs with deterministic startup mode |
| [L24](../tests/ai-adapter.spec.ts#L24) | B | real WebLLM adapter uses structured worker requests, forwards progress, rejects truncation and terminates cancelled/failed workers |
| [L91](../tests/ai-adapter.spec.ts#L91) | B | offline real adapter rejects uncached weights before any model reload request |

</details>

<details>
<summary>ai-controls.spec.ts — 2 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L5](../tests/ai-controls.spec.ts#L5) | B | typed model consent rejects blank, malformed and refusal, without manual post controls |
| [L18](../tests/ai-controls.spec.ts#L18) | B | resident profile editor persists all field types with validation and stable identity |

</details>

<details>
<summary>ai-generation.spec.ts — 5 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L6](../tests/ai-generation.spec.ts#L6) | B | all prompt builders retain the trusted 1996 setting with hankote and LOCAL-DOSV |
| [L6](../tests/ai-generation.spec.ts#L6) | B | all prompt builders retain the trusted 1996 setting with soroban and LOCAL-GV |
| [L107](../tests/ai-generation.spec.ts#L107) | B | prompts bound persona, SIG and four recent local posts; strict validation rejects malformed content and IDs |
| [L158](../tests/ai-generation.spec.ts#L158) | B | AI identity, provenance and allocation commit atomically; collisions, deleted parents and quota errors roll back |
| [L206](../tests/ai-generation.spec.ts#L206) | N | the pinned runtime includes every offered model |

</details>

<details>
<summary>ai-setup.spec.ts — 4 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L5](../tests/ai-setup.spec.ts#L5) | B | unsupported WebGPU, deferral and on-demand provenance require no downloads or secondary UI |
| [L17](../tests/ai-setup.spec.ts#L17) | B | another tab changing consent context invalidates a pending typed approval |
| [L28](../tests/ai-setup.spec.ts#L28) | B | one tab holds the model lease; another cannot download until STOP releases it |
| [L41](../tests/ai-setup.spec.ts#L41) | B | model cache inspection is a typed action without consent or loading; status never promises offline inference |

</details>

<details>
<summary>autonomy.spec.ts — 12 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L8](../tests/autonomy.spec.ts#L8) | B | visible timer saves delayed human and resident replies, preserves input, renews bounds and catches up after reopening |
| [L56](../tests/autonomy.spec.ts#L56) | B | scheduled invalid stops bounded retries, preserves failed work and leaves human posting usable |
| [L56](../tests/autonomy.spec.ts#L56) | B | scheduled failure stops bounded retries, preserves failed work and leaves human posting usable |
| [L75](../tests/autonomy.spec.ts#L75) | B | automatic activity waits for the other tab model lease and resumes when that tab closes |
| [L87](../tests/autonomy.spec.ts#L87) | B | pausing scheduled inference discards late output and persisted pause survives reopening |
| [L99](../tests/autonomy.spec.ts#L99) | B | due opportunities never authorize a download and missing Web Locks blocks model work |
| [L113](../tests/autonomy.spec.ts#L113) | B | changing model cancels pending inference, keeps its run and requires renewed consent before automatic saving |
| [L139](../tests/autonomy.spec.ts#L139) | B | paused residents remain silent on timer opportunities while another resident can reply |
| [L154](../tests/autonomy.spec.ts#L154) | B | a reopened approved model can fail loading without requiring a manual post workflow |
| [L171](../tests/autonomy.spec.ts#L171) | B | scheduled quota failure rolls back numbering and retry saves the same run atomically |
| [L199](../tests/autonomy.spec.ts#L199) | B | hidden pages defer inference and a restored page resumes on visibility without reconnecting |
| [L217](../tests/autonomy.spec.ts#L217) | B | restoring approved activity resumes on the timer without reopening model settings |

</details>

<details>
<summary>residents.spec.ts — 2 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L6](../tests/residents.spec.ts#L6) | B | all ten seeded profiles are distinct; routines obey local dates and seeded decisions include quiet periods |
| [L61](../tests/residents.spec.ts#L61) | B | profile edits, pause/resume and old-backup migration preserve identities, pending work and atomic restore |

</details>

### Public resident profiles

<details>
<summary>resident-profile.spec.ts — 21 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L21](../tests/resident-profile.spec.ts#L21) | N | public projection uses actual members, current fields, exact arguments, bounded literal text and no private fields |
| [L46](../tests/resident-profile.spec.ts#L46) | N | unmatched token-shaped identities fall back to exact safe handles and reject ambiguity |
| [L59](../tests/resident-profile.spec.ts#L59) | N | reserved keys and tokens precede handles, ambiguity is independent of order and restored absences stay absent |
| [L82](../tests/resident-profile.spec.ts#L82) | N | daisizen delayed profile never prints after invalidate and lookup never observes attendance |
| [L82](../tests/resident-profile.spec.ts#L82) | N | daisizen delayed profile never prints after context and lookup never observes attendance |
| [L82](../tests/resident-profile.spec.ts#L82) | N | daisizen delayed profile never prints after reentry and lookup never observes attendance |
| [L82](../tests/resident-profile.spec.ts#L82) | N | wakaba delayed profile never prints after invalidate and lookup never observes attendance |
| [L82](../tests/resident-profile.spec.ts#L82) | N | wakaba delayed profile never prints after context and lookup never observes attendance |
| [L82](../tests/resident-profile.spec.ts#L82) | N | wakaba delayed profile never prints after reentry and lookup never observes attendance |
| [L101](../tests/resident-profile.spec.ts#L101) | B | mail lookup fences reset/restore and context changes; existing prompts own PROFILE input |
| [L145](../tests/resident-profile.spec.ts#L145) | B | MAIN anonymous profile preserves selected mailbox, literal output and composition |
| [L145](../tests/resident-profile.spec.ts#L145) | B | old MAIN anonymous profile preserves selected mailbox, literal output and composition |
| [L145](../tests/resident-profile.spec.ts#L145) | B | SIG anonymous profile preserves selected mailbox, literal output and composition |
| [L187](../tests/resident-profile.spec.ts#L187) | B | daisizen anonymous directory and room lookup preserve attendance and continued reading/speech |
| [L187](../tests/resident-profile.spec.ts#L187) | B | wakaba anonymous directory and room lookup preserve attendance and continued reading/speech |
| [L145](../tests/resident-profile.spec.ts#L145) | B | MAIN registered profile preserves selected mailbox, literal output and composition |
| [L145](../tests/resident-profile.spec.ts#L145) | B | old MAIN registered profile preserves selected mailbox, literal output and composition |
| [L145](../tests/resident-profile.spec.ts#L145) | B | SIG registered profile preserves selected mailbox, literal output and composition |
| [L187](../tests/resident-profile.spec.ts#L187) | B | daisizen registered directory and room lookup preserve attendance and continued reading/speech |
| [L187](../tests/resident-profile.spec.ts#L187) | B | wakaba registered directory and room lookup preserve attendance and continued reading/speech |
| [L205](../tests/resident-profile.spec.ts#L205) | B | restored absent residents remain unavailable and About explains the four-field reconstruction |

</details>

### Production smoke and recovery

<details>
<summary>journey.spec.ts — 3 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L8](../tests/journey.spec.ts#L8) | B | production keyboard journey preserves all MAIN mappings, Japanese posts, read states and backup recovery |
| [L29](../tests/journey.spec.ts#L29) | B | production READ → HANDLE rename → READ retains synthetic identity through reload and restore |
| [L79](../tests/journey.spec.ts#L79) | B | production AI recovers a partially committed autonomous batch after tab loss without duplicates |

</details>

### Historical display calendar

<details>
<summary>calendar.spec.ts — 7 cases</summary>

| Line | Placement | Discovered title (Chromium) |
| --- | --- | --- |
| [L17](../tests/calendar.spec.ts#L17) | N | one fixed calendar formats entry, forum, mail and conference without changing effective times or literal text |
| [L44](../tests/calendar.spec.ts#L44) | N | JST midnight, month/year rollover, leap input and historical imports have independent expected values |
| [L62](../tests/calendar.spec.ts#L62) | N | legacy fallback uses only timestamp fields; historical-only provenance uses a deterministic non-era source |
| [L85](../tests/calendar.spec.ts#L85) | B | production connected journey, live/replayed OLT, reload, backup and tabs (Asia/Tokyo) |
| [L85](../tests/calendar.spec.ts#L85) | B | production connected journey, live/replayed OLT, reload, backup and tabs (America/Los_Angeles) |
| [L145](../tests/calendar.spec.ts#L145) | B | atomic initialization, pending catch-up legacy imports, historical imports and reset preserve the source clock |
| [L219](../tests/calendar.spec.ts#L219) | B | production legacy and era-only imports keep existing dates stable across restoration times and date new activity |

</details>
