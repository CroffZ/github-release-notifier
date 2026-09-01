# Contributing

Thank you for helping build `github-release-notifier`.

## Before opening a change

Open an issue for behavior, policy, or security-model changes so the release
semantics can be agreed before implementation. Small fixes and documentation
improvements can go directly to a pull request.

## Local setup

Use Node.js 20.19 or newer and the repository-declared pnpm version:

```bash
corepack enable
pnpm install
pnpm validate
```

Add tests with every behavior change. Prefer pure core tests and adapter
contract tests; network-backed tests should be isolated as integration tests. Do
not weaken dry-run, idempotency, ancestry checks, pagination, or tag-identity
validation to make a fixture pass.

## Package boundaries

`packages/core` must not import integration packages. The Action,
semantic-release plugin, and CLI may depend on core. GitHub and Git behavior
should enter through typed ports rather than hidden process or network globals.

## Pull requests

Keep changes focused and explain their release model. Run `pnpm validate`.
Generated `dist/` files are not accepted in ordinary feature pull requests; the
release process will produce and review Action bundles.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
