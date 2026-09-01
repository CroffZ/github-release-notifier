# Roadmap

The repository will grow in reviewable increments. Package publication and
Marketplace release remain disabled until the core behavior and security model
are complete.

## Phase 1: Core planning engine

- Implement Git ancestry ranges and tag resolution.
- Use paginated GitHub commit-to-PR associations, with commit-subject parsing
  only as a fallback.
- Deduplicate squash, merge, and rebased associations.
- Add stable-linear and explicit previous-release policies.
- Render deterministic per-tag comment markers and idempotent plans.
- Make all mutation conditional on an explicit non-dry-run execution.

## Phase 2: Safety and release models

- Add prerelease/RC, nightly, maintenance-branch, and monorepo policies.
- Validate tag target, build commit, and optional artifact provenance.
- Add path/package ownership filters with rename-aware diagnostics.
- Handle API pagination, rate limits, retries, and permission failures without
  silently producing an incomplete plan.

## Phase 3: Integrations

- Complete and bundle the JavaScript Action.
- Publish a versioned reusable workflow that calls an immutable Action ref.
- Implement semantic-release lifecycle hooks using its supplied boundaries.
- Complete CLI dry-run and machine-readable diagnostics.

## Phase 4: Distribution

- Add integration fixtures and end-to-end tests.
- Establish npm provenance and protected release environments.
- Review generated Action bundles, then commit them only on release refs.
- Publish npm packages, immutable Action tags, moving major tags, and a
  Marketplace listing.
