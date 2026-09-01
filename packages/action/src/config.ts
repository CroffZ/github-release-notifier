import { parseRepositorySlug } from "@github-release-notifier/core";

import type { RepositoryRef } from "@github-release-notifier/core";

export interface ActionInputSource {
  get(name: string): string;
}

export interface ActionConfiguration {
  readonly repository: RepositoryRef;
  readonly releaseTag?: string;
  readonly releaseUrl?: string;
  readonly previousReleaseTag?: string;
  readonly previousReleasePolicy: string;
  readonly pathFilters: readonly string[];
  readonly dryRun: boolean;
  readonly validateTagTarget: boolean;
}

function parseBoolean(name: string, value: string, defaultValue: boolean) {
  if (value.length === 0) {
    return defaultValue;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${name} must be "true" or "false"`);
}

export function readActionConfiguration(
  source: ActionInputSource,
  githubRepository: string | undefined,
): ActionConfiguration {
  const repositoryValue = source.get("repository") || githubRepository;
  if (!repositoryValue) {
    throw new Error(
      'repository is required outside GitHub Actions and must use "owner/name"',
    );
  }

  const releaseTag = source.get("release-tag") || undefined;
  const releaseUrl = source.get("release-url") || undefined;
  const previousReleaseTag = source.get("previous-release-tag") || undefined;

  return {
    repository: parseRepositorySlug(repositoryValue),
    ...(releaseTag ? { releaseTag } : {}),
    ...(releaseUrl ? { releaseUrl } : {}),
    ...(previousReleaseTag ? { previousReleaseTag } : {}),
    previousReleasePolicy:
      source.get("previous-release-policy") || "stable-linear",
    pathFilters: source
      .get("path-filters")
      .split(/\r?\n/u)
      .map((value) => value.trim())
      .filter(Boolean),
    dryRun: parseBoolean("dry-run", source.get("dry-run"), false),
    validateTagTarget: parseBoolean(
      "validate-tag-target",
      source.get("validate-tag-target"),
      true,
    ),
  };
}
