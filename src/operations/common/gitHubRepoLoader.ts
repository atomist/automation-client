import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { GitHubRepoRef, isGitHubRepoRef } from "./GitHubRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @return function to materialize repos
 * @constructor
 */
export function gitHubRepoLoader(credentials: ProjectOperationCredentials): RepoLoader<GitProject> {
    return repoId => {
        // Default it if it isn't already a GitHub repo ref
        const gid = isGitHubRepoRef(repoId) ? repoId : new GitHubRepoRef(repoId.owner, repoId.repo, repoId.sha);
        return GitCommandGitProject.cloned(credentials, gid);
    };
}
