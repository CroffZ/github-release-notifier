import { describe, expect, it } from "vitest";

import { adaptSemanticReleaseContext } from "../src/index.js";

describe("adaptSemanticReleaseContext", () => {
  it("uses semantic-release boundaries and commits without re-inferring them", () => {
    expect(
      adaptSemanticReleaseContext(
        {
          lastRelease: { gitTag: "v1.0.0", gitHead: "old" },
          nextRelease: {
            gitTag: "v1.1.0",
            gitHead: "new",
            channel: "latest",
          },
          commits: [
            { hash: "abc", subject: "feat: notify shipped pull requests" },
          ],
        },
        {
          repository: { owner: "owner", name: "repo" },
          releaseUrl: "https://github.com/owner/repo/releases/tag/v1.1.0",
          dryRun: true,
        },
      ),
    ).toEqual({
      repository: { owner: "owner", name: "repo" },
      release: {
        tagName: "v1.1.0",
        gitHead: "new",
        channel: "latest",
        url: "https://github.com/owner/repo/releases/tag/v1.1.0",
      },
      previousRelease: { tagName: "v1.0.0", gitHead: "old" },
      knownCommits: [
        { sha: "abc", subject: "feat: notify shipped pull requests" },
      ],
      dryRun: true,
    });
  });

  it("supports a first release without a previous boundary", () => {
    const input = adaptSemanticReleaseContext(
      {
        lastRelease: {},
        nextRelease: { gitTag: "v1.0.0" },
        commits: [],
      },
      { repository: { owner: "owner", name: "repo" } },
    );

    expect(input.previousRelease).toBeUndefined();
  });

  it("requires semantic-release to provide the next tag", () => {
    expect(() =>
      adaptSemanticReleaseContext(
        { lastRelease: {}, nextRelease: {}, commits: [] },
        { repository: { owner: "owner", name: "repo" } },
      ),
    ).toThrow(/nextRelease\.gitTag/);
  });
});
