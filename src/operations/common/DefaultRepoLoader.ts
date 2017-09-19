import { gitHubRepoLoader } from "./gitHubRepoLoader";
import { LocalRepoLoader } from "./localRepoLoader";
import { isLocalDirectory, RepoId } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param token provider token
 * @return function to materialize repos
 * @constructor
 */
export function defaultRepoLoader(token: string): RepoLoader {
    return (repoId: RepoId) => {
        if (isLocalDirectory(repoId.provider)) {
            return LocalRepoLoader(repoId);
        } else {
           return gitHubRepoLoader(token)(repoId);
        }
    };
}
