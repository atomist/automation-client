import { GitProject } from "../../project/git/GitProject";
import { gitHubRepoLoader } from "./gitHubRepoLoader";
import { LocalRepoLoader } from "./localRepoLoader";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { isLocalRepoRef, RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function defaultRepoLoader(credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return (repoId: RepoRef) => {
        if (isLocalRepoRef(repoId)) {
            return LocalRepoLoader(repoId) as Promise<GitProject>;
        } else {
           return gitHubRepoLoader(credentials)(repoId);
        }
    };
}
import { GitProject } from "../../project/git/GitProject";
import { gitHubRepoLoader } from "./gitHubRepoLoader";
import { LocalRepoLoader } from "./localRepoLoader";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { isLocalRepoRef, RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function defaultRepoLoader(context: HandlerContext, credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return (repoId: RepoRef) => {
        if (isLocalRepoRef(repoId)) {
            return LocalRepoLoader(repoId) as Promise<GitProject>;
        } else {
           return gitHubRepoLoader(credentials)(repoId);
        }
    };
}
