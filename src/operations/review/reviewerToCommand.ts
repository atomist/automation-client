import { ActionResult } from "../../action/ActionResult";
import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { commandHandlerFrom, OnCommand, ParametersConstructor } from "../../onCommand";
import { CommandDetails } from "../CommandDetails";
import { GitHubRepoRef } from "../common/GitHubRepoRef";
import { RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoRef } from "../common/RepoId";
import { BaseEditorParameters } from "../edit/BaseEditorParameters";
import { issueRaisingReviewRouter } from "./issueRaisingReviewRouter";
import { ProjectReviewer } from "./projectReviewer";
import { reviewAll } from "./reviewAll";
import { ProjectReview } from "./ReviewResult";

export type ReviewRouter<PARAMS> = (pr: ProjectReview, params: PARAMS, title: string, ctx: HandlerContext) =>
    Promise<ActionResult<RepoRef>>;

/**
 * Further details of an editor to allow selective customization
 */
export interface ReviewerCommandDetails<PARAMS extends BaseEditorParameters> extends CommandDetails<PARAMS> {

    repoFilter?: RepoFilter;

    reviewRouter: ReviewRouter<PARAMS>;

}

function defaultDetails(name: string): ReviewerCommandDetails<BaseEditorParameters> {
    return {
        description: name,
        reviewRouter: issueRaisingReviewRouter,
    };
}

/**
 * Create a handle function that reviews one or many repos, following BaseEditorParameters
 * @param reviewerFactory function returning a reviewer instance for the appropriate parameters
 * @param {ParametersConstructor<PARAMS>} factory
 * @param {string} name
 * @param {string} details object allowing customization beyond reasonable defaults
 * @return {HandleCommand}
 */
export function reviewerHandler<PARAMS extends BaseEditorParameters>(reviewerFactory: (params: PARAMS) => ProjectReviewer<PARAMS>,
                                                                     factory: ParametersConstructor<PARAMS>,
                                                                     name: string,
                                                                     details: Partial<ReviewerCommandDetails<PARAMS>> = {}): HandleCommand {
    const detailsToUse: ReviewerCommandDetails<BaseEditorParameters> = {
        ...defaultDetails(name),
        ...details,
    };
    return commandHandlerFrom(handleReviewOneOrMany(reviewerFactory, name, detailsToUse),
        factory,
        name,
        detailsToUse.description, detailsToUse.intent, detailsToUse.tags);
}

/**
 * If owner and repo are required, review just one repo. Otherwise review all repos
 * in the present team
 */
function handleReviewOneOrMany<PARAMS extends BaseEditorParameters>(reviewerFactory: (params: PARAMS) => ProjectReviewer<PARAMS>,
                                                                    name: string,
                                                                    details: ReviewerCommandDetails<PARAMS>): OnCommand<PARAMS> {
    return (ctx: HandlerContext, parameters: PARAMS) => {
        const credentials = {token: parameters.githubToken};
        const repoFinder: RepoFinder = (!!parameters.owner && !!parameters.repo) ?
            // TODO will implement interface
            () => Promise.resolve([new GitHubRepoRef(parameters.owner, parameters.repo)]) :
            details.repoFinder;
        return reviewAll(ctx, credentials, reviewerFactory(parameters), parameters,
            repoFinder, details.repoFilter,
            !!details.repoLoader ? details.repoLoader(parameters) : undefined)
            .then(projectReviews => {
                return Promise.all(projectReviews
                    .filter(pr => pr.comments.length > 0)
                    .map(pr => {
                        return details.reviewRouter(pr, parameters, name, ctx);
                    }))
                    .then(persisted =>
                        ctx.messageClient.respond(
                            `${name} reviewed ${projectReviews.length} repositories: Reported on ${persisted.length} with problems`));
            });
    };
}
