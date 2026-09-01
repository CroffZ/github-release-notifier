import { describe, expect, it } from "vitest";

import {
  createReleaseMarker,
  parseRepositorySlug,
} from "../src/release-identity.js";

describe("parseRepositorySlug", () => {
  it("parses an owner and repository name", () => {
    expect(parseRepositorySlug(" CroffZ/github-release-notifier ")).toEqual({
      owner: "CroffZ",
      name: "github-release-notifier",
    });
  });

  it.each(["repo", "owner/", "/repo", "owner/repo/extra"])(
    "rejects invalid slug %s",
    (value) => {
      expect(() => parseRepositorySlug(value)).toThrow(/owner\/name/);
    },
  );
});

describe("createReleaseMarker", () => {
  it("creates a deterministic marker per repository and tag", () => {
    const repository = parseRepositorySlug("CroffZ/github-release-notifier");

    expect(createReleaseMarker(repository, "v1.2.3")).toBe(
      createReleaseMarker(
        parseRepositorySlug("croffz/GITHUB-RELEASE-NOTIFIER"),
        "v1.2.3",
      ),
    );
    expect(createReleaseMarker(repository, "v1.2.4")).not.toBe(
      createReleaseMarker(repository, "v1.2.3"),
    );
  });

  it("keeps unusual tags out of the HTML comment syntax", () => {
    const marker = createReleaseMarker(
      parseRepositorySlug("owner/repo"),
      "release--candidate --> visible",
    );

    expect(marker).toMatch(/^<!-- github-release-notifier:[A-Za-z0-9_-]+ -->$/);
    expect(marker).not.toContain("release--candidate");
  });

  it("rejects an empty tag", () => {
    expect(() =>
      createReleaseMarker(parseRepositorySlug("owner/repo"), ""),
    ).toThrow(/must not be empty/);
  });
});
