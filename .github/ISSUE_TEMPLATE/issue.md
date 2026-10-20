---
name: Issue
about: Report a problem or propose a change
title: ""
labels: ""
---

<!-- Write the title and body in English. See the development guidance:
https://github.com/takahirox/pcvan/blob/main/docs/development-flow.md -->

## Problem

Describe the problem and why it needs to be addressed.

## Expected outcome

Describe what should be true when the Issue is resolved.

## Context

Add relevant context, examples, logs, or related Issues. Include reproduction
steps and actual versus expected results when applicable.

## Pre-merge acceptance

List concrete mandatory completion criteria achievable and verifiable before
merge. Default to criteria an AI agent can execute and verify. Require human
confirmation, physical-device testing, subjective evaluation, or external approval
only when necessary for this Issue; explain why and what result is expected.

Checks possible only after merge must not be pre-merge approval conditions.
Preserve all implementation requirements and applicable pre-merge validation.

## Optional validation

List useful additional checks separately from mandatory acceptance, or state
that none are proposed.

## Required post-merge verification

State that none is required unless this Issue needs checks possible only after
merge. If needed, describe the checks and expected results separately; report
them as pending until performed. Pre-merge checks do not prove publication or
deployment succeeded.
