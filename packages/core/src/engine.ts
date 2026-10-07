import type {
  GitHubPort,
  GitPort,
  PathFilter,
  PlannedNotification,
  PreviousReleasePolicy,
  ReleaseAnalysisInput,
  ReleaseCommit,
  ReleaseNotificationEngine,
  ReleaseNotificationPlan,
  ReleaseRef,
} from "./contracts.js";
import { createReleaseMarker } from "./release-identity.js";

export interface ReleaseNotificationEngineOptions {
  readonly git: GitPort;
  readonly github: GitHubPort;
  readonly listReleaseCandidates?: (
    repository: ReleaseAnalysisInput["repository"],
  ) => Promise<readonly ReleaseRef[]>;
  readonly previousReleasePolicy?: PreviousReleasePolicy;
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          expression += "(?:.*/)?";
        } else {
          expression += ".*";
        }
      } else {
        expression += "[^/]*";
      }
    } else {
      expression += escapeRegExp(character);
    }
  }
  return new RegExp(`^${expression}$`, "u");
}

function matchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(path));
}

function matchesPathFilter(
  paths: readonly string[],
  filter: PathFilter,
): boolean {
  if (filter.packageName) {
    throw new Error(
      "packageName filtering requires package ownership metadata; use include/exclude path patterns",
    );
  }
  const includes = filter.include ?? [];
  const excludes = filter.exclude ?? [];
  return paths.some(
    (path) =>
      (includes.length === 0 || matchesAny(path, includes)) &&
      !matchesAny(path, excludes),
  );
}

function escapeMarkdownText(value: string): string {
  return value.replaceAll("\\", "\\\\").replace(/[`*_{}[\]()#+!|>]/gu, "\\$&");
}

function renderComment(input: ReleaseAnalysisInput, marker: string): string {
  const tag = escapeMarkdownText(input.release.tagName);
  let release = `\`${tag.replace(/`/gu, "\\`")}\``;
  if (input.release.url) {
    const url = new URL(input.release.url);
    if (url.protocol !== "https:") {
      throw new Error("Release URL must use HTTPS");
    }
    release = `[${tag}](${url.href.replace(/[()]/gu, (character) =>
      character === "(" ? "%28" : "%29",
    )})`;
  }
  return `This pull request shipped in ${release}.\n\n${marker}`;
}

async function resolveReleaseCommit(
  git: GitPort,
  release: ReleaseRef,
  description: string,
): Promise<string> {
  const resolved = await git.resolveTag(release.tagName);
  if (release.gitHead && release.gitHead !== resolved) {
    throw new Error(
      `${description} tag "${release.tagName}" resolves to ${resolved}, not the declared commit ${release.gitHead}`,
    );
  }
  return resolved;
}

async function getCommits(
  git: GitPort,
  input: ReleaseAnalysisInput,
  previousCommit: string | undefined,
  releaseCommit: string,
): Promise<readonly ReleaseCommit[]> {
  if (input.knownCommits) {
    return input.knownCommits;
  }
  return git.commitsBetween(previousCommit, releaseCommit);
}

export function createReleaseNotificationEngine(
  options: ReleaseNotificationEngineOptions,
): ReleaseNotificationEngine {
  const policy = options.previousReleasePolicy;

  async function selectPreviousRelease(
    input: ReleaseAnalysisInput,
  ): Promise<ReleaseRef | undefined> {
    if (input.previousRelease) {
      return input.previousRelease;
    }
    if (!policy) {
      throw new Error(
        "A previous-release policy is required when previousRelease is not provided",
      );
    }
    if (!options.listReleaseCandidates) {
      throw new Error(
        "listReleaseCandidates is required when previousRelease is not provided",
      );
    }

    return policy.selectPreviousRelease({
      repository: input.repository,
      release: input.release,
      candidates: await options.listReleaseCandidates(input.repository),
    });
  }

  return {
    async plan(input): Promise<ReleaseNotificationPlan> {
      if (input.pathFilter?.packageName) {
        throw new Error(
          "packageName filtering requires package ownership metadata; use include/exclude path patterns",
        );
      }
      const marker = createReleaseMarker(
        input.repository,
        input.release.tagName,
      );
      const body = renderComment(input, marker);
      const releaseCommit = await resolveReleaseCommit(
        options.git,
        input.release,
        "Release",
      );
      if (
        input.expectedArtifact &&
        input.expectedArtifact.commitSha !== releaseCommit
      ) {
        throw new Error(
          `Artifact from "${input.expectedArtifact.source}" targets ${input.expectedArtifact.commitSha}, not release commit ${releaseCommit}`,
        );
      }

      const previousRelease = await selectPreviousRelease(input);
      const previousCommit = previousRelease
        ? await resolveReleaseCommit(
            options.git,
            previousRelease,
            "Previous release",
          )
        : undefined;
      if (
        previousCommit &&
        previousRelease &&
        !(await options.git.isAncestor(previousCommit, releaseCommit))
      ) {
        throw new Error(
          `Previous release "${previousRelease.tagName}" is not an ancestor of release "${input.release.tagName}"`,
        );
      }

      const commits = await getCommits(
        options.git,
        input,
        previousCommit,
        releaseCommit,
      );
      const diagnostics =
        previousRelease === undefined
          ? [
              "No previous release boundary selected; analyzing all reachable commits.",
            ]
          : [];
      const pullRequests = new Map<
        number,
        PlannedNotification["pullRequest"]
      >();
      const pathsByCommit = new Map<string, readonly string[]>();

      for (const commit of commits) {
        const associated = await options.github.associatedPullRequests(
          commit.sha,
        );
        for (const pullRequest of associated) {
          if (input.pathFilter) {
            let paths = pathsByCommit.get(commit.sha);
            if (!paths) {
              paths = await options.git.changedPaths(commit.sha);
              pathsByCommit.set(commit.sha, paths);
            }
            if (!matchesPathFilter(paths, input.pathFilter)) {
              continue;
            }
          }
          if (!pullRequests.has(pullRequest.number)) {
            pullRequests.set(pullRequest.number, pullRequest);
          }
        }
      }

      const notifications: PlannedNotification[] = [];
      for (const pullRequest of pullRequests.values()) {
        const comments = await options.github.findPullRequestComments(
          pullRequest.number,
        );
        notifications.push({
          pullRequest,
          marker,
          body,
          alreadyExists: comments.some((comment) =>
            comment.body.includes(marker),
          ),
        });
      }

      return {
        input,
        notifications: notifications.sort(
          (left, right) => left.pullRequest.number - right.pullRequest.number,
        ),
        diagnostics,
      };
    },

    async apply(plan): Promise<void> {
      if (plan.input.dryRun) {
        return;
      }

      for (const notification of plan.notifications) {
        if (notification.alreadyExists) {
          continue;
        }
        const comments = await options.github.findPullRequestComments(
          notification.pullRequest.number,
        );
        if (
          comments.some((comment) => comment.body.includes(notification.marker))
        ) {
          continue;
        }
        await options.github.createPullRequestComment(
          notification.pullRequest.number,
          notification.body,
        );
      }
    },
  };
}
