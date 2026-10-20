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

The repository currently has no application files or configured build/test
commands. Do not invent build, test, or runtime requirements, or add scaffolding,
dependencies, CI, or tooling merely to document a process. Reinspect the
repository for commands if tooling is added in the future.

For templates and documentation, check Markdown and template syntax, local links
(including heading anchors), whitespace, and consistency using available tools.
`git diff --check` checks whitespace in tracked changes; stage newly added files
and use `git diff --cached --check` to include them. Read the final diff and confirm
the change stays within the Issue's scope. Documentation-only changes require no
unrelated runtime suites, hardware/device checks, or deployed-site verification.

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
