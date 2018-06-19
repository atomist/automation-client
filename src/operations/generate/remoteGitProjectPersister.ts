import { WrapOptions } from "retry";

import { ActionResult } from "../../action/ActionResult";
import { logger } from "../../internal/util/logger";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { doWithRetry } from "../../util/retry";
import {
    GitHubRepoRef,
    isGitHubRepoRef,
} from "../common/GitHubRepoRef";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import {
    isRemoteRepoRef,
    RepoId,
} from "../common/RepoId";
import { ProjectPersister } from "./generatorUtils";

/**
 * Persist project to GitHub or another remote, returning remote details. Use retry.
 * @param {Project} p project to persist
 * @param {ProjectOperationCredentials} creds
 * @param targetId id of target repo to create
 * @return {Promise<ActionResult<GitProject>>}
 */
export const RemoteGitProjectPersister: ProjectPersister<GitProject> =
    (p: Project,
     creds: ProjectOperationCredentials,
     targetId: RepoId) => {
        // Default to github.com if we don't have more information
        const gid = isRemoteRepoRef(targetId) ? targetId : new GitHubRepoRef(targetId.owner, targetId.repo);
        const gp: GitProject =
            GitCommandGitProject.fromProject(p, creds);
        return gp.init()
            .then(() => {
                return isGitHubRepoRef(gid) ? gp.configureFromRemote() : {};
            })
            .then(() => {
                logger.debug(`Creating new repo '${targetId.owner}/${targetId.repo}'`);
                return gp.createAndSetRemote(
                    gid,
                    this.targetRepo, this.visibility)
                    .catch(err => {
                        return Promise.reject(new Error(`Unable to create new repo '${targetId.owner}/${targetId.repo}': ` +
                            `Probably exists: ${err}`));
                    });
            })
            .then(() => {
                logger.debug(`Committing to local repo at '${gp.baseDir}'`);
                return gp.commit("Initial commit from Atomist");
            })
            .then(() => push(gp));
    };

export function push(gp: GitProject, opts: WrapOptions = {}): Promise<ActionResult<GitProject>> {
    const retryOptions: WrapOptions = {
        retries: 5,
        factor: 3,
        minTimeout: 1 * 500,
        maxTimeout: 5 * 1000,
        randomize: true,
        ...opts,
    };
    return doWithRetry(() => gp.push(), `Pushing local repo at '${gp.baseDir}'`, retryOptions);
}
