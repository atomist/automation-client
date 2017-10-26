import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { GitHubRepoRef, RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function gitHubRepoLoader(credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return (repoId: GitHubRepoRef) => {
        return GitCommandGitProject.cloned(credentials, repoId);
    };
}
