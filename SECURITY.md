# Security policy

## Supported versions

There are no supported releases yet. This scaffold is not ready for production
use.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** private security-advisory flow for this
repository. Do not open a public issue for token disclosure, command or workflow
injection, artifact identity confusion, permission escalation, or another
suspected vulnerability.

Include affected refs, reproduction steps, impact, and any suggested mitigation.
Maintainers will acknowledge a report within seven days and coordinate fixes and
disclosure with the reporter.

## Security principles

- Tokens are never accepted through command-line arguments that may be exposed
  in process listings.
- Caller workflows own permissions; the project cannot elevate a token.
- Pull request content, commit subjects, release notes, paths, and tag names are
  untrusted input and must not become executable workflow or shell syntax.
- Fork-originated workflows must not receive write tokens.
- Plans must fail visibly if pagination, permissions, ancestry, or identity
  checks are incomplete.
- Release builds will use provenance, reviewed bundles, immutable refs, and
  protected environments before publication.

Operational guidance is in
[Permissions and security](docs/permissions-and-security.md).
