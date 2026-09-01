import { parseArgs } from "node:util";

import { parseRepositorySlug } from "@github-release-notifier/core";

import type { RepositoryRef } from "@github-release-notifier/core";

export interface CliArguments {
  readonly help: boolean;
  readonly version: boolean;
  readonly dryRun: boolean;
  readonly repository?: RepositoryRef;
  readonly releaseTag?: string;
  readonly previousReleaseTag?: string;
  readonly previousReleasePolicy: string;
}

export function parseCliArguments(args: readonly string[]): CliArguments {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
      "dry-run": { type: "boolean", default: true },
      repository: { type: "string", short: "R" },
      "release-tag": { type: "string" },
      "previous-release-tag": { type: "string" },
      "previous-release-policy": {
        type: "string",
        default: "stable-linear",
      },
    },
  });

  return {
    help: values.help,
    version: values.version,
    dryRun: values["dry-run"],
    ...(values.repository
      ? { repository: parseRepositorySlug(values.repository) }
      : {}),
    ...(values["release-tag"] ? { releaseTag: values["release-tag"] } : {}),
    ...(values["previous-release-tag"]
      ? { previousReleaseTag: values["previous-release-tag"] }
      : {}),
    previousReleasePolicy: values["previous-release-policy"],
  };
}
