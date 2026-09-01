import type {
  ReleaseAnalysisInput,
  ReleaseCommit,
  RepositoryRef,
} from "@github-release-notifier/core";

export interface SemanticReleaseBoundary {
  readonly gitTag?: string;
  readonly gitHead?: string;
  readonly version?: string;
  readonly channel?: string;
}

export interface SemanticReleaseCommit {
  readonly hash: string;
  readonly subject?: string;
  readonly message?: string;
}

export interface SemanticReleaseLifecycleContext {
  readonly lastRelease: SemanticReleaseBoundary;
  readonly nextRelease: SemanticReleaseBoundary;
  readonly commits: readonly SemanticReleaseCommit[];
}

export interface SemanticReleaseAdapterOptions {
  readonly repository: RepositoryRef;
  readonly releaseUrl?: string;
  readonly dryRun?: boolean;
}

function requireGitTag(
  boundaryName: "lastRelease" | "nextRelease",
  boundary: SemanticReleaseBoundary,
) {
  if (!boundary.gitTag) {
    throw new Error(`${boundaryName}.gitTag is required`);
  }
  return boundary.gitTag;
}

export function adaptSemanticReleaseContext(
  context: SemanticReleaseLifecycleContext,
  options: SemanticReleaseAdapterOptions,
): ReleaseAnalysisInput {
  const nextTag = requireGitTag("nextRelease", context.nextRelease);
  const commits: ReleaseCommit[] = context.commits.map((commit) => ({
    sha: commit.hash,
    ...(commit.subject || commit.message
      ? { subject: commit.subject ?? commit.message!.split("\n", 1)[0] }
      : {}),
  }));

  return {
    repository: options.repository,
    release: {
      tagName: nextTag,
      ...(context.nextRelease.gitHead
        ? { gitHead: context.nextRelease.gitHead }
        : {}),
      ...(context.nextRelease.channel
        ? { channel: context.nextRelease.channel }
        : {}),
      ...(options.releaseUrl ? { url: options.releaseUrl } : {}),
    },
    ...(context.lastRelease.gitTag
      ? {
          previousRelease: {
            tagName: requireGitTag("lastRelease", context.lastRelease),
            ...(context.lastRelease.gitHead
              ? { gitHead: context.lastRelease.gitHead }
              : {}),
          },
        }
      : {}),
    knownCommits: commits,
    dryRun: options.dryRun ?? false,
  };
}
