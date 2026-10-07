import { describe, expect, it, vi } from "vitest";

import {
  createReleaseNotificationEngine,
  createStableLinearPreviousReleasePolicy,
} from "../src/index.js";

import type {
  GitHubPort,
  GitPort,
  PullRequestRef,
  ReleaseAnalysisInput,
  ReleaseRef,
} from "../src/index.js";

import { createReleaseMarker } from "../src/release-identity.js";

function createGitPort(
  options: {
    readonly tags?: Readonly<Record<string, string>>;
    readonly parents?: Readonly<Record<string, string | undefined>>;
    readonly commits?: readonly {
      readonly sha: string;
      readonly subject: string;
    }[];
    readonly paths?: Readonly<Record<string, readonly string[]>>;
  } = {},
): GitPort {
  return {
    resolveTag: vi.fn(async (tag) => {
      const commit = options.tags?.[tag];
      if (!commit) {
        throw new Error(`Unknown tag ${tag}`);
      }
      return commit;
    }),
    isAncestor: vi.fn(async (ancestor, descendant) => {
      let commit: string | undefined = descendant;
      while (commit) {
        if (commit === ancestor) {
          return true;
        }
        commit = options.parents?.[commit];
      }
      return false;
    }),
    commitsBetween: vi.fn(async () => options.commits ?? []),
    changedPaths: vi.fn(async (commit) => options.paths?.[commit] ?? []),
  };
}

function createGitHubPort(
  options: {
    readonly associations?: Readonly<Record<string, readonly PullRequestRef[]>>;
    readonly comments?: Readonly<
      Record<number, readonly { id: number; body: string }[]>
    >;
  } = {},
): GitHubPort {
  return {
    associatedPullRequests: vi.fn(
      async (commit) => options.associations?.[commit] ?? [],
    ),
    findPullRequestComments: vi.fn(
      async (number) => options.comments?.[number] ?? [],
    ),
    createPullRequestComment: vi.fn(async () => {}),
  };
}

const repository = { owner: "owner", name: "repo" };
const pullRequest = {
  number: 12,
  url: "https://github.com/owner/repo/pull/12",
  title: "Add release notifications",
};

function input(
  overrides: Partial<Omit<ReleaseAnalysisInput, "previousRelease">> & {
    readonly previousRelease?: ReleaseAnalysisInput["previousRelease"];
  } = {},
): ReleaseAnalysisInput {
  const { previousRelease, ...inputOverrides } = overrides;
  const resolved: ReleaseAnalysisInput = {
    repository,
    release: {
      tagName: "v2.0.0",
      url: "https://github.com/owner/repo/releases/tag/v2.0.0",
    },
    previousRelease: { tagName: "v1.0.0" },
    dryRun: true,
    ...inputOverrides,
  };
  if (!Object.hasOwn(overrides, "previousRelease")) {
    return resolved;
  }
  if (previousRelease) {
    return { ...resolved, previousRelease };
  }
  const { previousRelease: omitted, ...withoutPreviousRelease } = resolved;
  void omitted;
  return withoutPreviousRelease;
}

describe("createReleaseNotificationEngine", () => {
  it("plans sorted, deduplicated notifications from the ancestry range", async () => {
    const git = createGitPort({
      tags: { "v1.0.0": "old", "v2.0.0": "new" },
      parents: { new: "old" },
      commits: [
        { sha: "c1", subject: "feat: add feature" },
        { sha: "c2", subject: "fix: feature" },
      ],
    });
    const github = createGitHubPort({
      associations: {
        c1: [pullRequest, { ...pullRequest, number: 4 }],
        c2: [pullRequest],
      },
    });
    const engine = createReleaseNotificationEngine({ git, github });

    const plan = await engine.plan(input());

    expect(git.commitsBetween).toHaveBeenCalledWith("old", "new");
    expect(plan.notifications.map(({ pullRequest: pr }) => pr.number)).toEqual([
      4, 12,
    ]);
    expect(plan.notifications[1]).toMatchObject({
      pullRequest,
      alreadyExists: false,
      body: expect.stringContaining(
        "[v2.0.0](https://github.com/owner/repo/releases/tag/v2.0.0)",
      ),
    });
    expect(
      plan.notifications[1]?.body.match(/github-release-notifier:/gu),
    ).toHaveLength(1);
  });

  it("uses an explicit boundary and rejects one outside the release ancestry", async () => {
    const git = createGitPort({
      tags: { "v1.0.0": "old", "v2.0.0": "new" },
    });
    const engine = createReleaseNotificationEngine({
      git,
      github: createGitHubPort(),
    });

    await expect(engine.plan(input())).rejects.toThrow(/not an ancestor/);
  });

  it("selects the newest stable ancestor and ignores prereleases", async () => {
    const git = createGitPort({
      tags: {
        "v1.0.0": "one",
        "v1.5.0": "mid",
        "v2.0.0-rc.1": "rc",
        "v2.0.0": "two",
      },
      parents: { mid: "one", rc: "mid", two: "rc" },
    });
    const policy = createStableLinearPreviousReleasePolicy(git);
    const candidates: ReleaseRef[] = [
      { tagName: "v1.0.0" },
      { tagName: "v1.5.0" },
      { tagName: "v2.0.0-rc.1", prerelease: true },
    ];

    await expect(
      policy.selectPreviousRelease({
        repository,
        release: { tagName: "v2.0.0" },
        candidates,
      }),
    ).resolves.toEqual({ tagName: "v1.5.0" });
  });

  it("rejects ambiguous stable boundaries on divergent history", async () => {
    const git = createGitPort({
      tags: { "v1.0.0": "one", "v1.1.0": "other", "v2.0.0": "current" },
    });
    vi.mocked(git.isAncestor).mockImplementation(
      async (ancestor, descendant) =>
        descendant === "current" && ["one", "other"].includes(ancestor),
    );
    const policy = createStableLinearPreviousReleasePolicy(git);

    await expect(
      policy.selectPreviousRelease({
        repository,
        release: { tagName: "v2.0.0" },
        candidates: [{ tagName: "v1.0.0" }, { tagName: "v1.1.0" }],
      }),
    ).rejects.toThrow(/ambiguous/);
  });

  it("validates release and artifact commit identities", async () => {
    const git = createGitPort({ tags: { "v2.0.0": "release" } });
    const engine = createReleaseNotificationEngine({
      git,
      github: createGitHubPort(),
    });

    await expect(
      engine.plan(
        input({
          previousRelease: undefined,
          release: { tagName: "v2.0.0", gitHead: "different" },
        }),
      ),
    ).rejects.toThrow(/not the declared commit/);
    await expect(
      engine.plan(
        input({
          previousRelease: undefined,
          expectedArtifact: { commitSha: "artifact", source: "build" },
        }),
      ),
    ).rejects.toThrow(/not release commit/);
  });

  it("rejects unsafe release URLs before producing a plan", async () => {
    const git = createGitPort({
      tags: { "v1.0.0": "old", "v2.0.0": "new" },
      parents: { new: "old" },
    });
    const engine = createReleaseNotificationEngine({
      git,
      github: createGitHubPort(),
    });

    await expect(
      engine.plan(
        input({
          release: { tagName: "v2.0.0", url: "javascript:alert(1)" },
        }),
      ),
    ).rejects.toThrow(/HTTPS/);
  });

  it("filters notifications by matching changed paths and checks existing markers", async () => {
    const git = createGitPort({
      tags: { "v1.0.0": "old", "v2.0.0": "new" },
      parents: { new: "old" },
      commits: [
        { sha: "c1", subject: "feat" },
        { sha: "c2", subject: "docs" },
      ],
      paths: {
        c1: ["packages/api/src/index.ts"],
        c2: ["docs/guide.md"],
      },
    });
    const marker = createReleaseMarker(repository, "v2.0.0");
    const github = createGitHubPort({
      associations: { c1: [pullRequest], c2: [{ ...pullRequest, number: 13 }] },
      comments: { 12: [{ id: 1, body: `Previously shipped\n${marker}` }] },
    });
    const engine = createReleaseNotificationEngine({ git, github });

    const plan = await engine.plan(
      input({
        pathFilter: { include: ["packages/**"], exclude: ["**/*.test.ts"] },
      }),
    );

    expect(plan.notifications).toHaveLength(1);
    expect(plan.notifications[0]).toMatchObject({ alreadyExists: true });
    expect(github.findPullRequestComments).toHaveBeenCalledTimes(1);
  });

  it("does not write in dry-run mode and rechecks comments before writing", async () => {
    const git = createGitPort({
      tags: { "v1.0.0": "old", "v2.0.0": "new" },
      parents: { new: "old" },
      commits: [{ sha: "c1", subject: "feat" }],
    });
    const github = createGitHubPort({ associations: { c1: [pullRequest] } });
    const engine = createReleaseNotificationEngine({ git, github });
    const plan = await engine.plan(input());

    await engine.apply(plan);
    expect(github.createPullRequestComment).not.toHaveBeenCalled();

    await engine.apply({ ...plan, input: { ...plan.input, dryRun: false } });
    expect(github.findPullRequestComments).toHaveBeenCalledTimes(2);
    expect(github.createPullRequestComment).toHaveBeenCalledWith(
      12,
      plan.notifications[0]?.body,
    );
  });

  it("reports when no previous boundary is selected", async () => {
    const git = createGitPort({ tags: { "v2.0.0": "new" } });
    const engine = createReleaseNotificationEngine({
      git,
      github: createGitHubPort(),
      listReleaseCandidates: async () => [],
      previousReleasePolicy: createStableLinearPreviousReleasePolicy(git),
    });

    const plan = await engine.plan(input({ previousRelease: undefined }));
    expect(plan.diagnostics).toContain(
      "No previous release boundary selected; analyzing all reachable commits.",
    );
    expect(git.commitsBetween).toHaveBeenCalledWith(undefined, "new");
  });
});
