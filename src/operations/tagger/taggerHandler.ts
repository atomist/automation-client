import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { commandHandlerFrom, OnCommand, ParametersConstructor } from "../../onCommand";
import { CommandDetails } from "../CommandDetails";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { EditorOrReviewerParameters } from "../common/params/BaseEditorOrReviewerParameters";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { AllRepos, andFilter, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { Tagger, TagRouter, Tags } from "./Tagger";

export interface TaggerCommandDetails<PARAMS extends EditorOrReviewerParameters> extends CommandDetails<PARAMS> {

    tagRouter: TagRouter;

    repoFilter?: RepoFilter;

}

function defaultDetails(name: string): TaggerCommandDetails<EditorOrReviewerParameters> {
    return {
        tagRouter: MessageClientTagRouter,
        description: name,
    };
}

export const MessageClientTagRouter: TagRouter = (tags, params, ctx) =>
    ctx.messageClient.respond("Tags: " + tags.tags.join());

/**
 * Create a handle function that tags one or many repos, following AllReposByDefaultParameters
 * @param tagger tagger function
 * @param {ParametersConstructor<PARAMS>} factory
 * @param {string} name
 * @param {string} details object allowing customization beyond reasonable defaults
 * @return {HandleCommand}
 */
export function taggerHandler<PARAMS extends EditorOrReviewerParameters>(tagger: Tagger<PARAMS>,
                                                                         factory: ParametersConstructor<PARAMS>,
                                                                         name: string,
                                                                         details: Partial<TaggerCommandDetails<PARAMS>> = {}): HandleCommand {
    const detailsToUse: TaggerCommandDetails<PARAMS> = {
        ...defaultDetails(name),
        ...details,
    };
    return commandHandlerFrom(tagOneOrMany(tagger, name, detailsToUse),
        factory,
        name,
        detailsToUse.description, detailsToUse.intent, detailsToUse.tags);
}

/**
 * If owner and repo are required, tag just one repo. Otherwise tag all repos
 * in the present team
 */
function tagOneOrMany<PARAMS extends EditorOrReviewerParameters>(tagger: Tagger<PARAMS>,
                                                                 name: string,
                                                                 details: TaggerCommandDetails<PARAMS>): OnCommand<PARAMS> {
    return (ctx: HandlerContext, parameters: PARAMS) => {
        const repoFinder: RepoFinder = parameters.targets.repoRef ?
            () => Promise.resolve([parameters.targets.repoRef]) :
            details.repoFinder;
        return tagAll(ctx, parameters.targets.credentials, tagger, parameters,
            repoFinder,
            andFilter(parameters.targets.test, details.repoFilter),
            !!details.repoLoader ? details.repoLoader(parameters) : undefined)
            .then((tags: Tags[]) => {
                return Promise.all(tags
                    .filter(pr => tags.length > 0)
                    .map(t => details.tagRouter(t, parameters, ctx)));
            });
    };
}

function tagAll<P extends EditorOrReviewerParameters>(ctx: HandlerContext,
                                                      credentials: ProjectOperationCredentials,
                                                      tagger: Tagger<P>,
                                                      parameters?: P,
                                                      repoFinder: RepoFinder = allReposInTeam(),
                                                      repoFilter: RepoFilter = AllRepos,
                                                      repoLoader: RepoLoader =
        defaultRepoLoader(ctx,
            credentials)): Promise<Tags[]> {
    return doWithAllRepos(ctx, credentials,
        p => tagger(p, ctx, parameters), parameters,
        repoFinder, repoFilter, repoLoader);
}
