# Browser validation

Run `npm ci`, `npm test` and `npm run build`. Playwright builds production assets
and serves them at port 14373, with a Vite source server at 14374 for repository
and injectable-adapter checks. `npm run test:e2e` selects the production journeys.
No backend, credentials, real GPU or model download is required.

`terminal-helpers.ts` submits every application operation through `#command` and
Enter. Native file choosers/downloads are exercised only after typed commands.
`noOtherUi` asserts the absence of buttons, selects, dialogs, anchors, summaries,
textareas and floating panels, with one visible input and keyboard focus.

| Coverage | Tests |
| --- | --- |
| First visit, skip, registration and posting-intent handoff | `composition.spec.ts` |
| Seed reading, reply parent, multiline Japanese/blank lines, edit/review/save/cancel/reload | `composition.spec.ts`, `journey.spec.ts` |
| Invalid lengths, IME, quota rollback/retry, deleted parent, failed read markers | `composition.spec.ts` |
| Human selection and independent read states | `composition.spec.ts` |
| Model consent refusal/blank/invalid/acceptance, deferral, cross-tab changes and leases | `ai-controls.spec.ts`, `ai-setup.spec.ts` |
| Progress, cancel/late results, errors, generation budget, profiles and provenance | `ai-controls.spec.ts` |
| Production Worker adapter and autonomous batch recovery/idempotency | `ai-adapter.spec.ts`, `journey.spec.ts` |
| Real JSON export/import, cancellation, invalid file/quota rollback, stale confirmations | `storage-controls.spec.ts` |
| Typed reset, transactional rollback, stale connections, tabs, preserved caches/recovery | `factory-reset.spec.ts` |
| MAIN 1–21/X/Q, index/services, verified MITI route, empty views | `navigation.spec.ts`, `sections.spec.ts`, `services.spec.ts`, `forums.spec.ts`, `journey.spec.ts` |
| Progressive UTF-8 output, graphemes, bounded queues, themes, speed, motion, logs | `progressive-output.spec.ts`, `connection.spec.ts` |
| Keyboard history/focus/scroll, literal text and narrow layout | `terminal.spec.ts`, `immersive.spec.ts` |
| Real offline shell and storage request statuses | `offline.spec.ts` |
| Repository integrity, deterministic ten-resident scheduling and concurrent commits | `repository.spec.ts`, `activity.spec.ts`, `residents.spec.ts`, `community.spec.ts` |

All convenience prompts and commands are documented as reconstructed interactions.
MAIN labels, SIG evidence, initial fiction and repository/backup schemas retain
their provenance. `ABOUT` exposes IDs, origins, model/timestamps and source URLs;
ordinary post reading uses nontechnical handles and plain parent references.

Native physical IME, mobile keyboards, screen-reader speech and real GPU quality
remain optional observations. Browser event tests cannot substitute for them.
No post-merge verification is required for this interaction migration.
