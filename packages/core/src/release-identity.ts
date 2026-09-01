import type { RepositoryRef } from "./contracts.js";

export function parseRepositorySlug(value: string): RepositoryRef {
  const parts = value.trim().split("/");

  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new Error(
      `Repository must use the "owner/name" form; received ${JSON.stringify(value)}`,
    );
  }

  const [owner, name] = parts;
  return { owner: owner!, name: name! };
}

export function createReleaseMarker(
  repository: RepositoryRef,
  tagName: string,
): string {
  if (tagName.length === 0) {
    throw new Error("Release tag must not be empty");
  }

  const identity = JSON.stringify({
    repository: `${repository.owner.toLowerCase()}/${repository.name.toLowerCase()}`,
    tag: tagName,
  });
  const encodedIdentity = Buffer.from(identity, "utf8").toString("base64url");

  return `<!-- github-release-notifier:${encodedIdentity} -->`;
}
