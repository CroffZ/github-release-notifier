import { describe, expect, it } from "vitest";

import { readActionConfiguration } from "../src/config.js";

function source(values: Readonly<Record<string, string>>) {
  return {
    get(name: string) {
      return values[name] ?? "";
    },
  };
}

describe("readActionConfiguration", () => {
  it("reads safe defaults and GitHub repository context", () => {
    expect(
      readActionConfiguration(source({}), "CroffZ/github-release-notifier"),
    ).toEqual({
      repository: { owner: "CroffZ", name: "github-release-notifier" },
      previousReleasePolicy: "stable-linear",
      pathFilters: [],
      dryRun: false,
      validateTagTarget: true,
    });
  });

  it("reads explicit boundaries, filters, and dry-run mode", () => {
    expect(
      readActionConfiguration(
        source({
          repository: "owner/repo",
          "release-tag": "v2.0.0",
          "release-url": "https://github.com/owner/repo/releases/tag/v2.0.0",
          "previous-release-tag": "v1.0.0",
          "previous-release-policy": "explicit",
          "path-filters": "packages/api/**\n docs/** ",
          "dry-run": "true",
          "validate-tag-target": "false",
        }),
        undefined,
      ),
    ).toMatchObject({
      releaseTag: "v2.0.0",
      releaseUrl: "https://github.com/owner/repo/releases/tag/v2.0.0",
      previousReleaseTag: "v1.0.0",
      previousReleasePolicy: "explicit",
      pathFilters: ["packages/api/**", "docs/**"],
      dryRun: true,
      validateTagTarget: false,
    });
  });

  it("rejects ambiguous booleans", () => {
    expect(() =>
      readActionConfiguration(
        source({ repository: "owner/repo", "dry-run": "yes" }),
        undefined,
      ),
    ).toThrow(/dry-run/);
  });
});
