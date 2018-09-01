import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import {
    AllRepos,
    RepoFilter,
} from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { ProjectReviewer } from "./projectReviewer";
import {
    ProjectReview,
    ReviewResult,
} from "./ReviewResult";

/**
 * Review all the repos
 * @param {HandlerContext} ctx
 * @param credentials credentials to use to find and load repos
 * @param {ProjectReviewer} reviewer
 * @param {RepoFinder} repoFinder
 * @param parameters parameters to the reviewer
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<Array<ActionResult<GitProject>>>}
 */
export function reviewAll<P,
    R extends ProjectReview = ProjectReview>(ctx: HandlerContext,
                                             credentials: ProjectOperationCredentials,
                                             reviewer: ProjectReviewer<P, R>,
                                             parameters: P,
                                             repoFinder: RepoFinder,
                                             repoFilter: RepoFilter = AllRepos,
                                             repoLoader: RepoLoader =
        defaultRepoLoader(
            credentials)): Promise<ProjectReview[]> {
    return doWithAllRepos(ctx, credentials,
        p => reviewer(p, ctx, parameters), parameters,
        repoFinder, repoFilter, repoLoader);
}

export function review<P,
    R extends ProjectReview = ProjectReview>(ctx: HandlerContext,
                                             credentials: ProjectOperationCredentials,
                                             reviewer: ProjectReviewer<P, R>,
                                             parameters: P,
                                             repoFinder: RepoFinder,
                                             repoFilter: RepoFilter = AllRepos,
                                             repoLoader: RepoLoader =
        defaultRepoLoader(credentials)): Promise<ReviewResult> {
    let projectsReviewed = 0;
    const countingRepoFilter: RepoFilter = id => {
        const include = repoFilter(id);
        if (include) {
            ++projectsReviewed;
        }
        return include;
    };
    return doWithAllRepos(ctx, credentials, p => reviewer(p, ctx, parameters), parameters,
        repoFinder, countingRepoFilter, repoLoader)
        .then(projectReviews => {
            return {
                projectReviews,
                projectsReviewed,
                code: 0,
            };
        });
}
