# github-release-notifier

Notify merged pull requests when they ship in a GitHub release.

> [!IMPORTANT] This repository is an initial, unpublished scaffold. No npm
> package, GitHub Marketplace release, Action distribution bundle, or stable
> reusable-workflow ref exists yet.

`github-release-notifier` will provide one release-to-PR notification engine
through four integrations:

- a JavaScript GitHub Action for arbitrary release pipelines;
- a reusable GitHub workflow wrapping that Action;
- a semantic-release adapter that uses semantic-release lifecycle context; and
- a CLI for dry runs, diagnostics, and non-GitHub-Actions CI.

## Intended behavior

For a selected release boundary, the engine will:

1. resolve the commits that actually entered the release using Git ancestry;
2. associate those commits with merged pull requests through GitHub's
   commit-to-PR API, using commit subjects only as a fallback;
3. optionally filter by package or path;
4. validate tag and build-artifact identity when configured;
5. produce or post an idempotent comment linking the release; and
6. support a dry run that reports the plan without changing GitHub.

Labels and changelog entries may be useful inputs, but they are not release
membership evidence.

## Architecture

```text
packages/core
  ^             ^                          ^
  |             |                          |
packages/action packages/semantic-release-plugin packages/cli
```

| Package                                    | Responsibility                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `@github-release-notifier/core`            | Release boundaries, selection-policy contracts, Git/GitHub ports, PR association and notification planning |
| `@github-release-notifier/action`          | GitHub Actions inputs, token/event integration, annotations, and mutation control                          |
| `semantic-release-github-release-notifier` | Adapts `lastRelease`, `nextRelease`, and `commits` into the shared core model                              |
| `github-release-notifier`                  | Dry runs, diagnostics, and CI-friendly command-line output                                                 |

The core package does not depend on an integration package. Previous-release
selection is a pluggable policy because stable, prerelease, nightly,
maintenance, and monorepo streams do not share one universally correct rule. Git
and GitHub are represented by ports so the engine can be tested without network
access.

### Generic Action vs semantic-release adapter

The generic Action starts from a GitHub release event or explicit tag. It must
select a previous release according to a configured policy, inspect the Git
graph, and query GitHub associations.

The semantic-release adapter does **not** independently infer those release
boundaries. It consumes semantic-release's authoritative `lastRelease`,
`nextRelease`, and `commits` lifecycle values and passes them to the same core
engine.

`@semantic-release/github` already creates or updates GitHub releases, uploads
assets, and can comment on and label issues and pull requests associated with a
semantic-release run. This project is not a replacement for those publishing
features. Its adapter is for teams that specifically want the same
ancestry-aware, association-based, idempotent release notification behavior
across semantic-release and non-semantic-release pipelines.

## Planned Action interface

The root [`action.yml`](action.yml) defines the intended inputs. The initial
scaffold deliberately has no committed `dist/` bundle and is not usable as an
Action release. Published Action refs will include the reviewed bundle required
by the Actions runner.

A caller will retain control of token permissions:

```yaml
permissions:
  contents: read
  pull-requests: write

jobs:
  notify:
    uses: CroffZ/github-release-notifier/.github/workflows/reusable-release-notifier.yml@v1
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

The reusable workflow intentionally does not declare permissions. A caller can
grant only `contents: read` for a dry run; posting comments also requires
`pull-requests: write`. See
[Permissions and security](docs/permissions-and-security.md).

## Release models

Configuration guidance for stable-only linear releases, release candidates,
nightlies, maintenance branches, nonlinear streams, and monorepo filters is in
[Release policies](docs/release-policies.md). There is no hidden “previous tag”
default that is correct for every model.

## Development

Requires Node.js 20.19 or newer and pnpm through Corepack.

```bash
corepack pnpm install
corepack pnpm validate
```

The repository is private-to-publish during scaffolding: every workspace package
has `"private": true`.

## Project documents

- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Release policies](docs/release-policies.md)
- [Permissions and security](docs/permissions-and-security.md)
- [Migration from copied scripts](docs/migration.md)

## License

[MIT](LICENSE) © 2026 Croff Zhong
