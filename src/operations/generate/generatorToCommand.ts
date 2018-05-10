import * as _ from "lodash";
import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { RedirectResult } from "../../HandlerResult";
import { commandHandlerFrom, OnCommand } from "../../onCommand";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { CachingDirectoryManager } from "../../spi/clone/CachingDirectoryManager";
import { QueryNoCacheOptions } from "../../spi/graph/GraphClient";
import { Maker } from "../../util/constructionUtils";
import { CommandDetails } from "../CommandDetails";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { isGitHubRepoRef } from "../common/GitHubRepoRef";
import { ProjectAction } from "../common/projectAction";
import { RepoRef } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { AnyProjectEditor } from "../edit/projectEditor";
import { generate, ProjectPersister } from "./generatorUtils";
import { RemoteGitProjectPersister } from "./remoteGitProjectPersister";
import { SeedDrivenGeneratorParameters } from "./SeedDrivenGeneratorParameters";
import { addAtomistWebhook } from "./support/addAtomistWebhook";

export type EditorFactory<P> = (params: P, ctx: HandlerContext) => AnyProjectEditor<P>;

/**
 * Further details of a generator to allow selective customization
 */
export interface GeneratorCommandDetails<P extends SeedDrivenGeneratorParameters> extends CommandDetails {

    redirecter: (r: RepoRef) => string;
    projectPersister?: ProjectPersister;
    afterAction?: ProjectAction<P>;
}

function defaultDetails<P extends SeedDrivenGeneratorParameters>(name: string): GeneratorCommandDetails<P> {
    return {
        description: name,
        repoFinder: allReposInTeam(),
        repoLoader: (p: P) => defaultRepoLoader(p.target.credentials, CachingDirectoryManager),
        projectPersister: RemoteGitProjectPersister,
        redirecter: () => undefined,
    };
}

/**
 * Create a generator function wrapping the given transform
 *
 * DEPRECATED: use the one in @atomist/sdm
 *
 * @param {AnyProjectEditor} editorFactory editor for the transformation
 * @param factory construction function
 * @param {string} name name of the generator
 * @param {string} details object allowing customization beyond reasonable defaults
 * @return {HandleCommand}
 */
export function generatorHandler<P extends SeedDrivenGeneratorParameters>(editorFactory: EditorFactory<P>,
                                                                          factory: Maker<P>,
                                                                          name: string,
                                                                          details: Partial<GeneratorCommandDetails<P>> = {}): HandleCommand {

    const detailsToUse: GeneratorCommandDetails<P> = {
        ...defaultDetails(name),
        ...details,
    };
    return commandHandlerFrom(handleGenerate(editorFactory, detailsToUse), factory, name,
        detailsToUse.description, detailsToUse.intent, detailsToUse.tags);
}

function handleGenerate<P extends SeedDrivenGeneratorParameters>(editorFactory: EditorFactory<P>,
                                                                 details: GeneratorCommandDetails<P>): OnCommand<P> {

    return (ctx: HandlerContext, parameters: P) => {
        return handle(ctx, editorFactory, parameters, details);
    };
}

function handle<P extends SeedDrivenGeneratorParameters>(ctx: HandlerContext,
                                                         editorFactory: EditorFactory<P>,
                                                         params: P,
                                                         details: GeneratorCommandDetails<P>): Promise<RedirectResult> {

    return ctx.messageClient.respond(`Starting project generation for ${params.target.repoRef.owner}/${params.target.repoRef.repo}`)
        .then(() => {
            return generate(
                startingPoint(params, ctx, details.repoLoader(params), details)
                    .then(p => {
                        return ctx.messageClient.respond(`Cloned seed project from \`${params.source.repoRef.owner}/${params.source.repoRef.repo}\``)
                            .then(() => p);
                    }),
                ctx,
                params.target.credentials,
                editorFactory(params, ctx),
                details.projectPersister,
                params.target.repoRef,
                params,
                details.afterAction,
            )
                .then(r => ctx.messageClient.respond(`Created and pushed new project`)
                    .then(() => r));
        })
        .then(r => {
            if (isGitHubRepoRef(r.target.id)) {
                return hasOrgWebhook(params.target.repoRef.owner, ctx)
                    .then(webhookInstalled => {
                        if (!webhookInstalled) {
                            return addAtomistWebhook((r.target as GitProject), params);
                        } else {
                            return Promise.resolve(r);
                        }
                    });
            }
            return Promise.resolve(r);
        })
        .then(r => ctx.messageClient.respond(`Successfully created new project`).then(() => r))
        .then(r => ({
            code: 0,
            // Redirect to our local project page
            redirect: details.redirecter(params.target.repoRef),
        }));
}

const OrgWebhookQuery = `query OrgWebhook($owner: String!) {
  Webhook(webhookType: organization) {
    org(owner: $owner) @required {
      owner
    }
  }
}`;

async function hasOrgWebhook(owner: string, ctx: HandlerContext): Promise<boolean> {
    const orgHooks = await ctx.graphClient.query<any, any>({
        query: OrgWebhookQuery,
        variables: {
            owner,
        },
        options: QueryNoCacheOptions,
    });
    const hookOwner = _.get(orgHooks, "Webhook[0].org.owner");
    return hookOwner === owner;
}

/**
 * Retrieve a seed
 * @param {HandlerContext} ctx
 * @param {RepoLoader} repoLoader
 * @param {P} params
 * @param details command details
 * @return {Promise<Project>}
 */
function startingPoint<P extends SeedDrivenGeneratorParameters>(params: P,
                                                                ctx: HandlerContext,
                                                                repoLoader: RepoLoader,
                                                                details: GeneratorCommandDetails<any>): Promise<Project> {

    return repoLoader(params.source.repoRef);
}
