# Permissions and security

## Minimum token permissions

| Mode          | `contents` | `pull-requests`                           |
| ------------- | ---------- | ----------------------------------------- |
| Dry run       | `read`     | `read` when comment inspection is enabled |
| Post comments | `read`     | `write`                                   |

The caller declares permissions and passes a token. The reusable workflow omits
a `permissions` block so it cannot imply that permissions are automatic. GitHub
prevents called workflows from elevating the caller's token.

`issues: write` should not be required for PR comments when the implementation
uses the pull-request review/comment surface. If GitHub API behavior requires an
issues permission for a chosen endpoint, that requirement must be documented
before release rather than requested preemptively.

## Forks and untrusted input

Do not run write-capable notification jobs on `pull_request` code from forks.
Release notifications should run from trusted release workflows or explicit
operator dispatches. Never check out or execute a contributor branch while a
write token is present.

Treat tag names, release text, PR titles, commit subjects, paths, workflow
inputs, and API responses as untrusted data. Use API clients and argument
arrays, not shell interpolation. Comments must escape user-controlled Markdown
where necessary and use a hidden, encoded marker for idempotency.

## Identity validation

Before mutation, the engine should be able to verify:

1. the tag resolves to the expected release commit;
2. the selected previous boundary satisfies the policy's ancestry rules;
3. a supplied build or artifact commit matches the tagged source; and
4. optional provenance or digest evidence refers to that same build.

A mismatch is a hard failure, not a warning followed by comments. This is
especially important when release creation and artifact publication happen in
separate workflows.

## API completeness

GitHub commit associations and comments are paginated. The implementation must
follow all pages, respect primary and secondary rate limits, and surface
permission or retry exhaustion. It must not turn an incomplete response into a
successful empty notification plan.

## Dependency and workflow integrity

Consumer workflows should pin immutable release SHAs where their threat model
requires it. Published moving major tags will be convenience pointers, not
immutable identities. This repository runs dependency review on pull requests
and will add release provenance before publishing.
