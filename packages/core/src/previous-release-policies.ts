import type {
  GitPort,
  PreviousReleasePolicy,
  ReleaseRef,
} from "./contracts.js";

export function createStableLinearPreviousReleasePolicy(
  git: GitPort,
): PreviousReleasePolicy {
  return {
    id: "stable-linear",

    async selectPreviousRelease({
      release,
      candidates,
    }): Promise<ReleaseRef | undefined> {
      const currentCommit = await git.resolveTag(release.tagName);
      const resolvedCandidates = await Promise.all(
        candidates
          .filter(
            (candidate) =>
              candidate.tagName !== release.tagName &&
              candidate.prerelease !== true,
          )
          .map(async (candidate) => ({
            release: candidate,
            commit: await git.resolveTag(candidate.tagName),
          })),
      );
      const ancestors = [];

      for (const candidate of resolvedCandidates) {
        if (
          candidate.commit !== currentCommit &&
          (await git.isAncestor(candidate.commit, currentCommit))
        ) {
          ancestors.push(candidate);
        }
      }

      const newest = [];
      for (const candidate of ancestors) {
        const hasNewerDescendant = await Promise.all(
          ancestors
            .filter((other) => other.commit !== candidate.commit)
            .map((other) => git.isAncestor(candidate.commit, other.commit)),
        ).then((results) => results.some(Boolean));
        if (!hasNewerDescendant) {
          newest.push(candidate);
        }
      }

      if (newest.length > 1) {
        throw new Error(
          `Stable release boundary is ambiguous for "${release.tagName}": ${newest
            .map(({ release: candidate }) => `"${candidate.tagName}"`)
            .join(", ")}`,
        );
      }

      const selected = newest[0];
      return selected?.release;
    },
  };
}
