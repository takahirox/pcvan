# Development flow

This is the default contribution flow for pcvan, including AI-assisted work:
Issue → implementation → PR → review → revision as needed → merge → required
post-merge verification, if any. The default branch is `main`.

## Collaboration language

Use **English** for newly authored templates, development/review/merge
documentation, AI instructions, Issue and PR titles and bodies, review comments,
and commit messages. This collaboration convention does not require translating
historical content or changing product localization.

## 1. Start with an Issue

Use the [Issue template](../.github/ISSUE_TEMPLATE/issue.md) to capture the problem,
expected outcome, relevant context, reproduction steps where applicable, and
concrete completion criteria. No assignee or owner field is required.

The source Issue defines scope. Clarify genuinely blocking ambiguity before
dependent work instead of inventing requirements.

Default to completion criteria an AI agent can execute and verify. Require human
confirmation, physical-device testing, subjective evaluation, or external approval
only when necessary for the actual Issue. Explain why that input is necessary
and what result is expected.

Separate three categories:

- **Pre-merge acceptance:** mandatory implementation and checks achievable and
  verifiable before merge.
- **Optional validation:** useful additional checks that are not completion gates.
- **Required post-merge verification:** genuinely necessary checks possible only
  after merge; state that none is required when appropriate.

Checks possible only after merge must not be pre-merge approval conditions. For
example, if merging triggers deployment, validate applicable code/configuration
and available local checks before merge; verify deployment and publication after
merge. Do not add post-merge work routinely or waive applicable pre-merge checks.

## 2. Implement the smallest complete change

Read the source Issue and inspect the current repository and its instructions.
Reuse equivalent files and preserve useful existing conventions. Prefer the
smallest coherent design that fully satisfies the Issue. Added complexity is not
automatically beneficial: avoid unnecessary abstractions, speculative
extensibility, unrelated refactoring, frameworks/subsystems, and extra policies
or configuration without a demonstrated need tied to the Issue. Simplicity does
not excuse missing requirements or necessary validation.

### Validation for the current repository

For application changes, follow the install/build/test commands in the
[README](../README.md#validation). `npm test` builds the static app and runs
session and browser interaction checks against its production assets. Select
additional validation based on the Issue and files changed; do not add unrelated
tooling merely to document a process.

Choose validation using the [test and CI performance principles](#test-and-ci-performance-principles).

For templates and documentation, check Markdown and template syntax, local links
(including heading anchors), whitespace, and consistency using available tools.
`git diff --check` checks whitespace in tracked changes; stage newly added files
and use `git diff --cached --check` to include them. Read the final diff and confirm
the change stays within the Issue's scope. Documentation-only changes require no
unrelated runtime suites, hardware/device checks, or deployed-site verification.

### Test and CI performance principles

**Detect the required failures at the lightest appropriate layer, without
redundant execution.** Preserve required behavior, regression assertions and
meaningful integration coverage when moving or consolidating checks. The
[test-suite audit](test-suite-audit.md) records concrete coverage distinctions and
performance follow-ups; its counts and timings describe its historical snapshot.

Current tooling uses Playwright for both Node logic/controller checks and
Chromium tests. `npm test` starts a production build/preview and a Vite module
server, even for Node-only selections; two servers do not mean two test runs.
`npm run test:e2e` selects journeys already included in the full suite. The
[Pages workflow](../.github/workflows/pages.yml) installs, builds and deploys on
`main` pushes or manual dispatch; it neither runs Playwright nor triggers on pull
requests.

1. **Prefer the lightest meaningful layer.** Put calculations, parsing, branches
   and broad data combinations in fast Node unit/controller checks where possible.
   Keep real IndexedDB transaction/race checks, DOM/renderer timing, focus/IME,
   offline and production wiring in browsers where those boundaries matter. Use
   real-model checks when inference behavior or quality requires them; mocked
   workers cannot establish model quality. Catch concrete defects rather than
   mirroring implementation steps.
2. **Choose combinations deliberately.** Cover distinct service routes, backup
   formats, resident states, models and viewports with representative cases;
   exhaust combinations when their interactions require it. Do not automatically
   multiply them into a browser/model/deployment matrix. Retain route-specific
   regressions, privacy, rollback and cross-tab coverage when redistributing work.
3. **Match validation to the change.** Documentation/templates use the syntax,
   link and whitespace checks above. UI changes need relevant browser/renderer
   checks; core/runtime changes need logic and affected storage/worker boundaries.
   Use focused specs for fast feedback and full `npm test` for application
   regression acceptance; its build includes TypeScript checking. CI/build changes
   need applicable configuration, build and asset-path checks before merge.
   Mandatory pre-merge checks must fit the Issue; keep optional observations
   separate. Record genuinely merge-dependent deployment/publication verification
   after merge, as described in the [acceptance categories](#1-start-with-an-issue).
4. **Reuse work and eliminate duplicate execution.** Reuse builds, fixtures,
   downloads and expensive setup only with keys tied to relevant source, lockfile,
   runtime and platform inputs, preserving test/profile isolation. Pages already
   caches npm downloads. Account for global server/build startup in focused runs;
   do not routinely rerun `test:e2e` or an equivalent build after the full suite
   without a distinct reason. If adding CI, avoid equivalent push/PR runs for the
   same revision and cancel superseded validation when safe. Preserve necessary
   deployment ordering: Pages currently disables in-progress cancellation. Measure
   resource use and file-level imbalance before adding parallel workers.
5. **Review value and added cost together.** Identify the additional defect each
   new or expanded test detects, whether existing coverage supplies that assurance,
   and its execution and maintenance cost. Watch repeated browser/renderer/compiler
   setup, large world/backup fixtures, long simulated resident loops and growing
   Cartesian products. Similar setup alone does not make distinct assertions
   redundant; consult the audit before consolidating coverage.
6. **Maintain an execution-time budget.** Use the audit's measured local baseline
   of 519 tests in 496.364 seconds with three workers as historical evidence,
   including its host/cache limitations, not a current CI timing promise. A normal-CI
   baseline/target remains to be established during actual performance work; no
   timing gate or new benchmark is required by this guidance. Track growth against
   comparable measurements and investigate target overruns once set. Separate
   elapsed feedback time, total runner/computation time and queue time; summed
   parallel test durations are not elapsed time. Revisit placement, setup and
   duplication while retaining meaningful assertions and required coverage.

## 3. Open a PR for the Issue

Use the [PR template](../.github/pull_request_template.md) and target `main` unless
the Issue specifies another base. Explain the problem, resulting behavior,
focused changes, related Issues, and validation actually performed. Report
failures, skipped checks, and unperformed checks accurately, with reasons.

Only claim to close an Issue when the implementation fully addresses it. If the
change is intentionally partial, say so and leave the Issue open. Record required
post-merge verification separately as pending until performed; pending post-merge
checks alone do not make a complete implementation partial.

## 4. Review and revise

Apply the [review guidelines](review-guidelines.md). The central question is:
**Does the PR completely solve the source Issue, without unnecessary scope or
complexity?** Check for both missing work and unjustified additions.

Fix agent-fixable review findings and review the updated PR again. When genuinely
necessary human input is missing, record the specific question and expected
answer, then wait through the workflow's wait path. Distinguish this state from
fixable findings; do not repeatedly request code changes for a missing human
answer.

## 5. Merge and handle required follow-up

Approve and merge through the authorized repository workflow once implementation
and mandatory pre-merge checks are sufficient and no blocking review findings
remain. Checks possible only after merge do not block that approval.

Perform required post-merge verification only when applicable. Keep it pending
until performed, then record actual results, failures, and necessary follow-up.
Pre-merge validation does not prove deployment or publication succeeded. No
post-merge verification is required for a templates/documentation-only change.
