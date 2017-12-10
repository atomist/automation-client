import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { RedirectResult } from "../../HandlerResult";
import { commandHandlerFrom, OnCommand, ParametersConstructor } from "../../onCommand";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { CachingDirectoryManager } from "../../spi/clone/CachingDirectoryManager";
import { CommandDetails } from "../CommandDetails";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { GitHubRepoRef, isGitHubRepoRef } from "../common/GitHubRepoRef";
import { ProjectAction } from "../common/projectAction";
import { RepoFilter } from "../common/repoFilter";
import { RepoRef } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { AnyProjectEditor } from "../edit/projectEditor";
import { BaseSeedDrivenGeneratorParameters } from "./BaseSeedDrivenGeneratorParameters";
import { generate, ProjectPersister } from "./generatorUtils";
import { GitHubProjectPersister } from "./gitHubProjectPersister";
import { addAtomistWebhook } from "./support/addAtomistWebhook";

export type EditorFactory<P> = (params: P, ctx: HandlerContext) => AnyProjectEditor<P>;

/**
 * Further details of a generator to allow selective customization
 */
export interface GeneratorCommandDetails<P extends BaseSeedDrivenGeneratorParameters> extends CommandDetails {

    redirecter: (r: RepoRef) => string;
    projectPersister?: ProjectPersister;
    afterAction?: ProjectAction<P>;
}

function defaultDetails<P extends BaseSeedDrivenGeneratorParameters>(name: string): GeneratorCommandDetails<P> {
    return {
        description: name,
        repoFinder: allReposInTeam(),
        repoLoader: (p: P) => defaultRepoLoader({ token: p.target.githubToken }, CachingDirectoryManager),
        projectPersister: GitHubProjectPersister,
        redirecter: () => undefined,
    };
}

/**
 * Create a generator function wrapping the given transform
 * @param {AnyProjectEditor} editorFactory editor for the transformation
 * @param {ParametersConstructor<P>} factory for the parameters
 * @param {string} name name of the generator
 * @param {string} details object allowing customization beyond reasonable defaults
 * @return {HandleCommand}
 */
export function generatorHandler<P extends BaseSeedDrivenGeneratorParameters>(
    editorFactory: EditorFactory<P>,
    factory: ParametersConstructor<P>,
    name: string,
    details: Partial<GeneratorCommandDetails<P>> = {},
): HandleCommand {

    const detailsToUse: GeneratorCommandDetails<P> = {
        ...defaultDetails(name),
        ...details,
    };
    return commandHandlerFrom(handleGenerate(editorFactory, detailsToUse), factory, name,
        detailsToUse.description, detailsToUse.intent, detailsToUse.tags);
}

function handleGenerate<P extends BaseSeedDrivenGeneratorParameters>(
    editorFactory: EditorFactory<P>,
    details: GeneratorCommandDetails<P>,
): OnCommand<P> {

    return (ctx: HandlerContext, parameters: P) => {
        return handle(ctx, editorFactory, parameters, details);
    };
}

function handle<P extends BaseSeedDrivenGeneratorParameters>(
    ctx: HandlerContext,
    editorFactory: EditorFactory<P>,
    params: P,
    details: GeneratorCommandDetails<P>,
): Promise<RedirectResult> {

    return ctx.messageClient.respond(`Starting project generation for ${params.target.owner}/${params.target.repo}`)
        .then(() => {
            return generate(
                startingPoint(params, ctx, details.repoLoader(params))
                    .then(p => {
                        return ctx.messageClient.respond(`Cloned seed project from \`${params.source.owner}/${params.source.repo}\``)
                            .then(() => p);
                    }),
                ctx,
                { token: params.target.githubToken },
                editorFactory(params, ctx),
                details.projectPersister,
                params.target,
                params,
                details.afterAction,
            )
                .then(r => ctx.messageClient.respond(`Created and pushed new project`)
                    .then(() => r));
        })
        .then(r => {
            if (isGitHubRepoRef(r.target.id)) {
                return addAtomistWebhook((r.target as GitProject), params);
            }
            return Promise.resolve(r);
        })
        .then(r => ctx.messageClient.respond(`Successfully created new project`).then(() => r))
        .then(r => ({
            code: 0,
            // Redirect to our local project page
            redirect: details.redirecter(params.target),
        }));
}

/**
 * Retrieve a seed
 * @param {HandlerContext} ctx
 * @param {RepoLoader} repoLoader
 * @param {P} params
 * @return {Promise<Project>}
 */
function startingPoint<P extends BaseSeedDrivenGeneratorParameters>(
    params: P,
    ctx: HandlerContext,
    repoLoader: RepoLoader,
): Promise<Project> {

    return repoLoader(new GitHubRepoRef(params.source.owner, params.source.repo, params.source.sha));
}
