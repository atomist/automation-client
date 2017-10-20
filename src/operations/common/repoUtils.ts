import { Parameters } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { allReposInTeam } from "./allReposInTeamRepoFinder";
import { defaultRepoLoader } from "./defaultRepoLoader";
import { AllRepos, RepoFilter } from "./repoFilter";
import { RepoFinder } from "./repoFinder";
import { RepoId } from "./RepoId";
import { RepoLoader } from "./repoLoader";

/**
 * Perform an action against all the given repos
 * @param {HandlerContext} ctx
 * @param {string} token
 * @param action action parameter
 * @parameter parameters optional parameters
 * @param {RepoFinder} repoFinder
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<R[]>}
 */
export function doWithAllRepos<R, PARAMS extends Parameters>(ctx: HandlerContext,
                                                             token: string,
                                                             action: (p: Project, t: PARAMS) => Promise<R>,
                                                             parameters: PARAMS,
                                                             repoFinder: RepoFinder = allReposInTeam(),
                                                             repoFilter: RepoFilter = AllRepos,
                                                             repoLoader: RepoLoader =
                                                                 defaultRepoLoader(token)): Promise<R[]> {
    return relevantRepos(ctx, repoFinder, repoFilter)
        .then(ids =>
            Promise.all(ids.map(id => repoLoader(id)
                .then(p => action(p, parameters))),
            ),
        );
}

export function relevantRepos(ctx: HandlerContext,
                              repoFinder: RepoFinder = allReposInTeam(),
                              repoFilter: RepoFilter = AllRepos): Promise<RepoId[]> {
    return repoFinder(ctx)
        .then(rids =>
            Promise.all(rids.map(rid => Promise.resolve(repoFilter(rid))
                .then(relevant => relevant ? rid : undefined))));
}
