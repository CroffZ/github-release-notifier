import { describe, expect, it } from "vitest";

import { parseCliArguments } from "../src/arguments.js";

describe("parseCliArguments", () => {
  it("defaults to a non-mutating dry run", () => {
    expect(parseCliArguments([])).toEqual({
      help: false,
      version: false,
      dryRun: true,
      previousReleasePolicy: "stable-linear",
    });
  });

  it("parses explicit release boundaries", () => {
    expect(
      parseCliArguments([
        "--repository",
        "owner/repo",
        "--release-tag",
        "v2",
        "--previous-release-tag",
        "v1",
        "--previous-release-policy",
        "explicit",
      ]),
    ).toMatchObject({
      repository: { owner: "owner", name: "repo" },
      releaseTag: "v2",
      previousReleaseTag: "v1",
      previousReleasePolicy: "explicit",
      dryRun: true,
    });
  });

  it("rejects unknown options", () => {
    expect(() => parseCliArguments(["--unknown"])).toThrow();
  });
});
