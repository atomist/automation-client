import * as _ from "lodash";
import { WrapOptions } from "retry";
import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import * as nsp from "../../internal/util/cls";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { logger } from "../../util/logger";
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
     targetId: RepoId,
     params?: any) => {
        // Default to github.com if we don't have more information
        const gid = isRemoteRepoRef(targetId) ? targetId : new GitHubRepoRef(targetId.owner, targetId.repo);
        const gp: GitProject = GitCommandGitProject.fromProject(p, creds);
        return gp.init()
            .then(() => {
                return isGitHubRepoRef(gid) ? gp.configureFromRemote() : {};
            })
            .then(() => {
                logger.debug(`Creating new repo '${targetId.owner}/${targetId.repo}'`);
                const description = _.get(params, "target.description", "");
                const visibility = _.get(params, "target.visibility", "public");
                return gp.createAndSetRemote(
                    gid,
                    description, visibility)
                    .catch(err => {
                        return Promise.reject(new Error(`Unable to create new repo '${targetId.owner}/${targetId.repo}': ` +
                            `Error: ${err}`));
                    });
            })
            .then(() => {
                logger.debug(`Committing to local repo at '${gp.baseDir}'`);
                let msg = "Initial commit from Atomist\n\n[atomist:generated]";
                const ctx = nsp.get();
                if (!!ctx) {
                    msg = `${msg} [atomist:generator=${ctx.operation.toLowerCase()}]`
                }
                return gp.commit(msg);
            })
            .then(() => retryPush(gp))
            .then(tp => successOn(tp));
    };

function retryPush(gp: GitProject, opts: WrapOptions = {}): Promise<GitProject> {
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
