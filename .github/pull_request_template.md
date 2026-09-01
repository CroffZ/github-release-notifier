## Summary

<!-- Explain the problem and the smallest complete solution. -->

## Release model

<!--
Describe affected release topology: stable, prerelease/RC, nightly, maintenance,
monorepo, or not applicable.
-->

## Validation

<!-- List focused commands, fixtures, and manual checks. -->

- [ ] `pnpm validate`

## Safety checklist

- [ ] Tests cover behavior changes.
- [ ] Dry-run and idempotency behavior remain explicit.
- [ ] Release membership relies on ancestry and GitHub associations, not labels
      alone.
- [ ] Pagination, rate limits, permissions, forks, and untrusted input were
      considered.
- [ ] Documentation was updated when configuration or behavior changed.
- [ ] Generated `dist/` files are omitted unless this is a reviewed release
      commit.
