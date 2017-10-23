import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { AllRepos, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { ProjectReviewer } from "./projectReviewer";
import { ProjectReview, ReviewResult } from "./ReviewResult";

/**
 * Review all the repos
 * @param {HandlerContext} ctx
 * @param {string} token
 * @param {ProjectReviewer} reviewer
 * @param {RepoFinder} repoFinder
 * @param parameters parameters to the reviewer
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<Array<ActionResult<GitProject>>>}
 */
export function reviewAll<R, P>(ctx: HandlerContext,
                                token: string,
                                reviewer: ProjectReviewer,
                                parameters?: P,
                                repoFinder: RepoFinder = allReposInTeam(),
                                repoFilter: RepoFilter = AllRepos,
                                repoLoader: RepoLoader =
                                    defaultRepoLoader(token)): Promise<ProjectReview[]> {
    return doWithAllRepos(ctx, token, p => reviewer(p, ctx), parameters,
        repoFinder, repoFilter, repoLoader);
}

export function review<R, P>(ctx: HandlerContext,
                             token: string,
                             reviewer: ProjectReviewer,
                             parameters?: P,
                             repoFinder: RepoFinder = allReposInTeam(),
                             repoFilter: RepoFilter = AllRepos,
                             repoLoader: RepoLoader =
                                 defaultRepoLoader(token)): Promise<ReviewResult> {
    let projectsReviewed = 0;
    const countingRepoFilter: RepoFilter = id => {
        const include = repoFilter(id);
        if (include) {
            ++projectsReviewed;
        }
        return include;
    };
    return doWithAllRepos(ctx, token, p => reviewer(p, ctx), undefined,
        repoFinder, countingRepoFilter, repoLoader)
        .then(projectReviews => {
            return {
                projectReviews,
                projectsReviewed,
                code: 0,
            };
        });
}
