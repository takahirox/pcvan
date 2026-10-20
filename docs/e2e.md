# Browser journey evidence checklist (Issue #14)

The merged #3–#13 features are exercised together using the existing pinned
Playwright/Chromium setup. No new framework or dependencies are needed.
All five tests in [journey.spec.ts](../tests/journey.spec.ts) use the production
build on localhost, visible controls, keyboard commands, actual JSON downloads
and the file chooser. They do not import source modules or seed IndexedDB.

## Repeat locally

Use the Node version range in [package.json](../package.json), then run:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
npm test
```

`test:e2e` runs the five connected journeys; `npm test` also runs the existing
module, browser interaction and failure-injection coverage. Both commands build
and type-check the app before serving it. Ports 14373 (production preview) and
14374 (existing source-module tests) must be free; Playwright starts and stops
both servers and refuses to reuse an unrelated server. No backend process,
account, API key, model weights or working GPU is needed. The tests use temporary
isolated browser contexts, never a person's normal browser profile. Downloads
are temporary Playwright artifacts; failures produce details in `test-results/`.

## Acceptance evidence

| Issue #14 criterion | Repeatable evidence |
| --- | --- |
| Minimal tooling and documented command | Existing Playwright configuration and lockfile reused; `npm run test:e2e` selects the production journeys. |
| MAIN count and mappings | `journey: all MAIN mappings…` independently specifies 21 numbered labels plus X/Q, counts displayed entries and submits every selector using Enter. Checks Communication, disconnect/reconnect and safe unimplemented destinations. |
| Keyboard route and errors | Same journey checks focus, ArrowUp/ArrowDown draft recovery, unknown jump, `J MITI` → `3` → `9`, invalid commands at each MITI screen, subsequent successful reading and no frame/URL navigation. |
| Post header | Same journey checks number/board, `★タイトル (author) YY/MM/DD HH:MM`, title, `★内容` and the header reconstruction notice. Existing `forums.spec.ts` covers optional second numbers and omitted line count. |
| Human post/reply and unread | `journey: offline human post…` starts from an empty profile, reads fiction, creates a human, sends exact Japanese multiline/plain-text content, checks unread/read transitions, replies and follows the parent link. Downloaded data verifies origin, parent ID and per-member/forum highest-read number. |
| Reload persistence and JSON round-trip | Same journey reloads offline, verifies both posts are read, makes a third post, restores the earlier download through the confirmation dialog, and checks the complete exported envelope equals the original. Another offline reload preserves all six content/settings collections and the reply link. Session timestamps/history may advance on reload and commands. |
| Offline and unsupported WebGPU | Same journey opts into the real shell service worker, disconnects the browser network, reloads and completes posting, reading and backup/restore with `navigator.gpu` absent. AI load stays disabled. Existing `offline.spec.ts` also checks subpath hosting, missing runtime/weights and cache/update failures. |
| Mocked AI and interruption/duplicates | `journey: production AI resumes…` creates a real human topic, opts into a cap of two, advances the clock by three hours and reconnects. The first fictional post commits; the second worker completion waits. HELP and backup still work. Closing/reopening the tab in the same context resumes only the unfinished run. Run IDs, unchanged first post, exactly three total posts, next number 4, one resumed generation and a further reconnect with no additions prove duplicate prevention. |
| AI failure fallback | `journey: production AI invalid…` and `…failure…` inject invalid structured output and worker failure. Neither creates AI data; manual reading, replying and downloaded backups remain usable. Existing AI suites additionally cover load failure, cancellation, rollback and offline weight checks. |
| No backend or API key | The complete manual journey starts without credentials and checks no password/key input is required. Request observation rejects anything except same-origin static-file GETs, including attempted external/API requests, and asserts no AI assets were requested. The AI recovery journey also rejects non-static/external requests. Existing `connection.spec.ts` guards network/modem APIs. |
| Evidence boundaries | MAIN remains C/provisional with its 1997 caveat; MITI route evidence is B/verified while screens/prompts are D/reconstructed. Demo content, composition and Communication carry their reconstruction notices. DAISIZEN remains B/provisional; all five service notices explicitly deny reproducing an original service screen. AI records retain actor/origin and fictional timestamps. |

The AI journeys replace only `window.Worker` before startup. The built lazy
WebLLM adapter, worker request protocol, prompt construction, validation, controls,
reconnect planning and transactional persistence execute normally. The mock
answers the pinned runtime's reload/reset/completion messages; it never loads a
worker script, GPU or weights. Existing [adapter tests](../tests/ai-adapter.spec.ts)
check cancellation and protocol details separately. This is deterministic
integration evidence, not evidence of real-model quality or GPU compatibility.

## Historical and visual limits

The [research record](research/pcvan-1996-1997.md) remains the source of historical
scope. These tests preserve evidence labels; they do not authenticate new facts.

- MAIN's 21 numbered labels, X/Q and prompt are a retrospective circa-1996
  transcription, not an original capture or proof of availability throughout 1997.
- The two columns, spacing, colors, font, responsive width, scrollback and modern
  utility panels are reconstruction choices. There is no pixel-perfect historical
  screenshot baseline.
- MITI evidence supports only the stated route, not complete screens or prompts.
  DAISIZEN's undated directory remains provisional for 1996–1997. Communication
  selectors, service helpers, connection text/timing, command conveniences,
  posting/reply editor and read-tracking UI are reconstructed.
- The header uses a preserved structural example; exact spacing, UTC rendering,
  the secondary number's meaning and historical line-count rules remain uncertain.
  Demo IDs, dates and bodies are fiction. Human content is local user data;
  generated activity has explicit fictional attribution and time metadata.

Real WebGPU/model loading, Japanese generation quality, real-weight cache reuse,
physical-device/native IME, assistive technology and other browser engines are
outside this deterministic run and were not performed. A former user's nostalgic
fidelity review is optional and was not performed. Tab closure/reload recovery
does not prove OS/browser-crash durability or protection from browser eviction.
No deployment was tested and no post-merge verification is required.

See [the validation record](validation.md#issue-14-connected-browser-journeys)
for commands actually executed and results, including earlier failed attempts.
