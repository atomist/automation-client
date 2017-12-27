
import { GitHubRepoRef } from "./GitHubRepoRef";
import { isRemoteRepoRef, RemoteRepoRef, RepoRef } from "./RepoId";

/**
 * Convention for resolving a local repo id to a RemoteRepoRef
 * If it's already remote, simply return it.
 */
export type RemoteFactory = (rr: RepoRef) => RemoteRepoRef;

export const GitHubDotComRemoteFactory = rr =>
    isRemoteRepoRef(rr) ? rr : new GitHubRepoRef(rr.owner, rr.repo, rr.sha);
