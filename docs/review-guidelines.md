# Review and merge guidelines

Use these guidelines for human and AI review, together with the
[development flow](development-flow.md) and its
[English collaboration convention](development-flow.md#collaboration-language).

## Review against the source Issue

Read the source Issue, its completion criteria, the PR description, and the full
diff. The central question is:

**Does the PR completely solve the source Issue, without unnecessary scope or complexity?**

Check both directions:

- **No missing work:** all required behavior and acceptance criteria the PR
  claims to resolve are implemented and appropriately validated. An intentionally
  partial PR must say so and must not claim to close the whole Issue.
- **No unnecessary work:** reject unnecessary abstractions, speculative
  extensibility, unrelated refactoring, frameworks/subsystems, or extra policies
  and configuration without a demonstrated need tied to the Issue.

Prefer the smallest coherent design that fully satisfies the Issue. Added
complexity is not automatically beneficial. Preserve justified existing
conventions; do not use simplicity to excuse omitted requirements or necessary
validation.

## Check the result and validation

Verify correctness, consistency with the repository, and documentation affected
by the change. Check that validation fits the changed files and actual available
tooling, and that reported results match evidence. Failures, skipped checks, and
unperformed checks must be disclosed with reasons.

Follow the [current repository validation guidance](development-flow.md#validation-for-the-current-repository).
Application build/test commands are documented in the [README](../README.md#validation).
For documentation and templates, check syntax, links, whitespace, and consistency;
do not require new runtime tooling or unrelated runtime, hardware/device, or
deployment checks.

Apply the [test and CI performance principles](development-flow.md#test-and-ci-performance-principles):
review additional defect coverage, duplication, and execution/maintenance cost
together. Ask: **Does this change provide sufficient confidence with the lightest
appropriate validation, without redundant execution?**

Mandatory pre-merge acceptance must be achievable and verifiable before merge.
Keep optional validation separate. Human confirmation, physical-device testing,
subjective evaluation, or external approval should be mandatory only when
necessary for the actual Issue, with a reason and expected result.

Required checks possible only after merge belong in a separate post-merge record,
pending until performed. For example, merge-triggered deployment and published
site verification cannot be pre-merge approval conditions. Pre-merge validation
does not prove publication succeeded. This separation does not waive required
implementation or applicable pre-merge checks.

## Decide the review outcome

- **Agent-fixable findings:** request specific fixes, explain the Issue requirement
  or demonstrated defect, and review the updated PR again. Treat optional
  suggestions as optional rather than blocking fixes.
- **Necessary human input missing:** record the specific question, why it blocks
  completion, and the expected answer/result. Enter the workflow's wait path and
  wait for that answer. Clearly distinguish this state from fixable findings; do
  not repeatedly send the agent back for code changes that cannot supply the
  missing input. Resume review when the answer arrives.
- **Ready to merge:** approve and merge through the authorized repository workflow
  when the implementation fully solves the Issue it claims to resolve, introduces
  no unjustified scope or complexity, has sufficient passing mandatory pre-merge
  checks, and has no blocking review findings remaining.

Record genuinely required post-merge verification separately. Pending checks
possible only after merge do not prevent approval under the conditions above.
After merge, record their actual results, including failures and follow-up; do
not claim they passed before performing them. No post-merge verification is
required for templates/documentation-only changes.
