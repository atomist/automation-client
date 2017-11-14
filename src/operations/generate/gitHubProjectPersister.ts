import { ActionResult } from "../../action/ActionResult";
import { logger } from "../../internal/util/logger";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { doWithRetry, RetryOptions } from "../../util/retry";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RepoId } from "../common/RepoId";
import { ProjectPersister } from "./generatorUtils";

/**
 * Persist project to GitHub, returning GitHub details. Use retry.
 * @param {Project} p project to persist
 * @param {ProjectOperationCredentials} creds
 * @param {RepoId} params
 * @return {Promise<ActionResult<GitProject>>}
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
                    this.targetRepo, this.visibility)
                    .catch(err => {
                        return Promise.reject(`Unable to create new repo '${params.owner}/${params.repo}': ` +
                            `Probably exists: ${err}`);
                    });
            })
            .then(() => {
                logger.debug(`Committing to local repo at '${gp.baseDir}'`);
                return gp.commit("Initial commit from Atomist");
            })
            .then(() => push(gp));
    };

export function push(gp: GitProject, opts: Partial<RetryOptions> = {}): Promise<ActionResult<GitProject>> {
    const retryOptions: RetryOptions = {
        retries: 5,
        factor: 3,
        minTimeout: 1 * 500,
        maxTimeout: 5 * 1000,
        randomize: true,
        ...opts,
    };
    return doWithRetry(() => gp.push(), `Pushing local repo at '${gp.baseDir}'`, retryOptions);
}
