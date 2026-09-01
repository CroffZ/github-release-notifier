export interface RepositoryRef {
  readonly owner: string;
  readonly name: string;
}

export interface ReleaseRef {
  readonly tagName: string;
  readonly gitHead?: string;
  readonly url?: string;
  readonly channel?: string;
  readonly prerelease?: boolean;
}

export interface ReleaseCommit {
  readonly sha: string;
  readonly subject?: string;
}

export interface PullRequestRef {
  readonly number: number;
  readonly url: string;
  readonly title: string;
  readonly mergeCommitSha?: string;
}

export interface PathFilter {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly packageName?: string;
}

export interface ArtifactIdentity {
  readonly commitSha: string;
  readonly source: string;
}

export interface ReleaseAnalysisInput {
  readonly repository: RepositoryRef;
  readonly release: ReleaseRef;
  readonly previousRelease?: ReleaseRef;
  readonly knownCommits?: readonly ReleaseCommit[];
  readonly pathFilter?: PathFilter;
  readonly dryRun: boolean;
  readonly expectedArtifact?: ArtifactIdentity;
}

export interface PreviousReleaseSelectionContext {
  readonly repository: RepositoryRef;
  readonly release: ReleaseRef;
  readonly candidates: readonly ReleaseRef[];
}

export interface PreviousReleasePolicy {
  readonly id: string;
  selectPreviousRelease(
    context: PreviousReleaseSelectionContext,
  ): Promise<ReleaseRef | undefined>;
}

export interface GitPort {
  resolveTag(tagName: string): Promise<string>;
  isAncestor(ancestorSha: string, descendantSha: string): Promise<boolean>;
  commitsBetween(
    ancestorSha: string | undefined,
    descendantSha: string,
  ): Promise<readonly ReleaseCommit[]>;
  changedPaths(commitSha: string): Promise<readonly string[]>;
}

export interface GitHubPort {
  associatedPullRequests(commitSha: string): Promise<readonly PullRequestRef[]>;
  findPullRequestComments(pullRequestNumber: number): Promise<
    readonly {
      readonly id: number;
      readonly body: string;
    }[]
  >;
  createPullRequestComment(
    pullRequestNumber: number,
    body: string,
  ): Promise<void>;
}

export interface PlannedNotification {
  readonly pullRequest: PullRequestRef;
  readonly marker: string;
  readonly body: string;
  readonly alreadyExists: boolean;
}

export interface ReleaseNotificationPlan {
  readonly input: ReleaseAnalysisInput;
  readonly notifications: readonly PlannedNotification[];
  readonly diagnostics: readonly string[];
}

export interface ReleaseNotificationEngine {
  plan(input: ReleaseAnalysisInput): Promise<ReleaseNotificationPlan>;
  apply(plan: ReleaseNotificationPlan): Promise<void>;
}
