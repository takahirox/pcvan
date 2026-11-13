<!-- Write the title and body in English. Follow the development flow:
https://github.com/takahirox/pcvan/blob/main/docs/development-flow.md -->

## Summary

Explain the source problem and the focused changes that address it.

## Outcome

Describe the resulting behavior, including before/after examples when useful.
Explain any intentional partial scope and remaining work without automatically
closing the parent Issue. Pending post-merge-only checks do not make an otherwise
complete implementation partial.

## Validation

Report checks actually performed and their results, including failures. Identify
skipped or unperformed checks and explain why. Match checks to the changed files
and existing repository tooling; do not invent commands or require unrelated
runtime suites for documentation-only changes.

Distinguish mandatory pre-merge acceptance from any optional validation.

## Required post-merge verification

State that none is required, or list necessary checks possible only after merge
and mark them pending until performed. Pre-merge evidence does not establish
deployment or publication success.

After merge and Issue closure, record evidence and handle actual defects using
the [merge and follow-up lifecycle](https://github.com/takahirox/pcvan/blob/main/docs/development-flow.md#5-merge-and-handle-required-follow-up).

## Related Issues

Link the source Issue and other relevant Issues. Use and preserve `Closes #<number>`
when the implementation fully addresses that Issue and applicable mandatory
pre-merge acceptance is satisfied, even if post-merge-only checks remain pending.
