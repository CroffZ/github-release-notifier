# Release policies

A release boundary is a current release commit plus a policy-selected previous
boundary. “The nearest older tag” is not a safe universal definition.

## Stable-only linear releases

For a single mainline where every stable release descends from the previous
stable release, `stable-linear` can select the newest stable tag that is an
ancestor of the current tag. The engine must verify ancestry rather than trust
version ordering or release creation time.

## Prerelease and release-candidate channels

RCs may be incremental (`v2.0.0-rc.1` to `rc.2`) or compared with the last
stable (`v1.9.0` to `v2.0.0-rc.2`). A policy must state which model applies.
When the final `v2.0.0` points at the same commit as the last RC, a policy may
either notify no new PRs or compare against the last stable to provide a
complete stable-release announcement. That choice must be explicit.

## Nightly or rolling channels

Nightly tags may be mutable, non-semantic, or created from short-lived branches.
A nightly policy needs a durable prior-run boundary, not lexical tag sorting.
Mutable tags weaken idempotency and identity checks, so immutable run tags or a
stored commit boundary are strongly preferred.

## Maintenance and nonlinear streams

`v1.x` and `v2.x` releases form different ancestry lines. Select the previous
release from the same maintenance line and confirm it is an ancestor. Version
precedence across branches does not establish ancestry. Cherry-picks can
associate one PR with multiple release lines; the idempotency key therefore
includes the release tag.

## Monorepos

Package releases may share a repository tag, use package-prefixed tags, or
advance independently. A monorepo policy combines:

- a release stream or tag namespace;
- include/exclude path filters;
- optional package ownership metadata; and
- a defined strategy for commits that touch multiple packages.

Filtering happens after the ancestry range is known. PR labels or changelog
sections cannot substitute for membership in that range. Rename and merge
commits need explicit changed-path handling.

## Explicit policy

Automation should accept an explicit previous tag or commit for unusual release
topologies. It must still verify that the supplied boundary and current release
have the relationship required by the selected policy.

## Association fallback

For every commit in the selected range, query GitHub's commit-to-PR associations
with full pagination. If GitHub returns no association, parse conventional merge
or squash subjects as a diagnostic fallback. Never infer membership from a
changelog label alone, and never silently accept a partial API result.
