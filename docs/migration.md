# Migrating from copied scripts

Copied release scripts often encode assumptions that are invisible until a
repository adds prereleases, maintenance branches, squash merges, or a monorepo.

## Inventory current behavior

Record how the script chooses its current and previous release, discovers pull
requests, filters paths, formats comments, handles retries, and avoids duplicate
comments. Identify every token permission and whether fork-controlled content
can reach the job.

## Run both planners

When the CLI is implemented, run it in dry-run mode alongside the existing
script for several releases. Compare commit boundaries and associated PRs, not
only final comment text. Resolve differences in policy configuration before
enabling writes.

## Choose an integration

- Use the Action when an existing pipeline creates releases.
- Use the reusable workflow for a conventional GitHub-hosted pipeline with
  minimal configuration.
- Use the semantic-release adapter when semantic-release already supplies
  `lastRelease`, `nextRelease`, and `commits`.
- Use the CLI outside Actions or for diagnostics.

Do not make the semantic-release adapter rediscover tags independently; doing so
can disagree with semantic-release's branch and channel rules.

## Cut over safely

Start with `contents: read`, comment-read access, and dry-run. Configure an
explicit previous boundary for the first comparison if historical tags are
ambiguous. Then grant `pull-requests: write`, enable tag/artifact identity
validation, and disable the copied script in the same change to avoid competing
comment formats.

The notifier's marker is per repository and release tag. Existing script
comments without that marker will not automatically count as idempotent matches;
a future migration option may support recognized legacy markers.
