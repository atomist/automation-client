import { GitProject } from "../../project/git/GitProject";
import { gitHubRepoLoader } from "./gitHubRepoLoader";
import { LocalRepoLoader } from "./localRepoLoader";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { isLocalDirectory, RepoId } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function defaultRepoLoader(credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return (repoId: RepoId) => {
        if (isLocalDirectory(repoId.provider)) {
            return LocalRepoLoader(repoId) as Promise<GitProject>;
        } else {
           return gitHubRepoLoader(credentials)(repoId);
        }
    };
}
