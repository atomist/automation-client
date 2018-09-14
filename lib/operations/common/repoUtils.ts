import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { logger } from "../../util/logger";
import { defaultRepoLoader } from "./defaultRepoLoader";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import {
    AllRepos,
    RepoFilter,
} from "./repoFilter";
import { RepoFinder } from "./repoFinder";
import { RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Perform an action against all the given repos.
 * Skip over repos that cannot be loaded, logging a warning.
 * @param {HandlerContext} ctx
 * @param credentials credentials for repo finding and loading
 * @param action action parameter
 * @param parameters optional parameters
 * @param {RepoFinder} repoFinder
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<R[]>}
 */
export function doWithAllRepos<R, P>(ctx: HandlerContext,
                                     credentials: ProjectOperationCredentials,
                                     action: (p: Project, t: P) => Promise<R>,
                                     parameters: P,
                                     repoFinder: RepoFinder,
                                     repoFilter: RepoFilter = AllRepos,
                                     repoLoader: RepoLoader =
        defaultRepoLoader(credentials)): Promise<R[]> {
    return relevantRepos(ctx, repoFinder, repoFilter)
        .then(ids => {
            return Promise.all(
                ids.map(id =>
                    repoLoader(id)
                        .catch(err => {
                            logger.warn("Unable to load repo %s:%s: %s", id.owner, id.repo, err);
                            logger.debug(err.stack);
                            return undefined;
                        })
                        .then(p => {
                            if (p) {
                                return action(p, parameters);
                            }
                        })))
                .then(proms => proms.filter(prom => prom));
        });
}

export function relevantRepos(ctx: HandlerContext,
                              repoFinder: RepoFinder,
                              repoFilter: RepoFilter = AllRepos): Promise<RepoRef[]> {
    return repoFinder(ctx)
        .then(rids =>
            Promise.all(rids.map(rid => Promise.resolve(repoFilter(rid))
                .then(relevant => relevant ? rid : undefined))))
        .then(many => many.filter(s => s !== undefined));
}
