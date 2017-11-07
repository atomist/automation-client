import { ActionResult } from "../../action/ActionResult";
import { logger } from "../../internal/util/logger";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RepoId } from "../common/RepoId";
import { ProjectPersister } from "./generatorUtils";

import * as promiseRetry from "promise-retry";

/**
 * Persist project to GitHub, returning GitHub details. Use retry.
 * @param {Project} p
 * @param {ProjectOperationCredentials} creds
 * @param {RepoId} params
 * @return {Promise<ActionResult<GitProject>>}
 * @constructor
 */
export const GitHubProjectPersister: ProjectPersister<RepoId, Project, ActionResult<GitProject>> =
    (p: Project,
     creds: ProjectOperationCredentials,
     params: RepoId) => {
        const gp: GitProject =
            GitCommandGitProject.fromProject(p, creds);
        return gp.init()
            .then(() => gp.setGitHubUserConfig())
            .then(() => {
                logger.debug(`Creating new repo '${params.owner}/${params.repo}'`);
                return gp.createAndSetGitHubRemote(params.owner, params.repo,
                    this.targetRepo, this.visibility);
            })
            .then(() => {
                logger.debug(`Committing to local repo at '${gp.baseDir}'`);
                return gp.commit("Initial commit from Atomist");
            })
            .then(() => push(gp));
    };

function push(gp: GitProject): Promise<ActionResult<GitProject>> {
    const retryOptions = {
        retries: 5,
        factor: 3,
        minTimeout: 1 * 500,
        maxTimeout: 5 * 1000,
        randomize: true,
    };
    logger.debug(`Pushing local repo at '${gp.baseDir}' with retry options '%j'`, retryOptions);
    return promiseRetry(retryOptions, retry => {
        return gp.push()
            .catch(err => {
                logger.warn(`Error occurred attempting to push local repo. '${err.message}'`);
                retry(err);
            });
    });
}
