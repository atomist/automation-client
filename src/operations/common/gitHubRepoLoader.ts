import { clone } from "../../project/git/GitLoader";
import { RepoId } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param token provider token
 * @return function to materialize repos
 * @constructor
 */
export function gitHubRepoLoader(token: string): RepoLoader {
    return (repoId: RepoId) => {
        return clone(token, repoId.owner, repoId.repo);
    };
}
