import { HandlerContext } from "../../HandlerContext";
import { DefaultDirectoryManager, GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { DefaultCloneOptions, DirectoryManager } from "../../spi/clone/DirectoryManager";
import { GitHubRepoRef } from "./GitHubRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { isRemoteRepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Materialize from github
 * @param credentials provider token
 * @param directoryManager strategy for handling local storage
 * @return function to materialize repos
 */
export function gitHubRepoLoader(context: HandlerContext, credentials: ProjectOperationCredentials,
                                 directoryManager: DirectoryManager = DefaultDirectoryManager): RepoLoader<GitProject> {
    return repoId => {
        // Default it if it isn't already a GitHub repo ref
        const gid = isRemoteRepoRef(repoId) ? repoId : new GitHubRepoRef(repoId.owner, repoId.repo, repoId.sha);
        return GitCommandGitProject.cloned(context, credentials, gid, DefaultCloneOptions, directoryManager);
    };
}
