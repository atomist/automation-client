import { HandleCommand } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { RedirectResult } from "../../HandlerResult";
import { ParametersConstructor } from "../../onCommand";
import { Project } from "../../project/Project";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { GitHubRepoRef } from "../common/GitHubRepoRef";
import { RepoRef } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { AnyProjectEditor } from "../edit/projectEditor";
import { BaseSeedDrivenGeneratorParameters } from "./BaseSeedDrivenGeneratorParameters";
import { generate, ProjectPersister } from "./generatorUtils";
import { RemoteGitProjectPersister } from "./remoteGitProjectPersister";

/**
 * Generator that uses external parameters. This decouples parameters from handle logic
 * and makes this generator usable in most cases.
 */
export class GenericGenerator<P extends BaseSeedDrivenGeneratorParameters>
    implements HandleCommand<P> {

    /**
     * Create a new generator instance, parameterizing it with parameters,
     * transform editor and redirect computation strategy
     * @param {ParametersConstructor<P extends BaseSeedDrivenGeneratorParameters>} factory
     * @param {(ctx: HandlerContext, params: P) => AnyProjectEditor<P extends BaseSeedDrivenGeneratorParameters>} editorFactory
     * @param {(r: RepoRef) => string} redirecter strategy function for determining what page to redirect to after project
     * creation
     * @param projectPersister function that knows how to persist repos we've created
     */
    constructor(private factory: ParametersConstructor<P>,
                private editorFactory: (params: P, ctx: HandlerContext) => AnyProjectEditor<P>,
                private redirecter: (r: RepoRef) => string = () => undefined,
                private projectPersister: ProjectPersister = RemoteGitProjectPersister) {
    }

    public freshParametersInstance(): P {
        return new this.factory();
    }

    public handle(ctx: HandlerContext, params: P): Promise<RedirectResult> {
        const editorFactory = this.editorFactory;
        const redirecter = this.redirecter;
        const projectPersister = this.projectPersister;
        return ctx.messageClient.respond(`Starting project generation for ${params.target.owner}/${params.target.repo}`)
            .then(() => generate(
                this.startingPoint(params, ctx)
                    .then(p => {
                        return ctx.messageClient.respond(`Cloned seed project from ${params.source.owner}/${params.source.repo}`)
                            .then(() => p);
                    }),
                ctx,
                { token: params.target.githubToken },
                editorFactory(params, ctx),
                projectPersister,
                params.target)
                .then(r => {
                    return ctx.messageClient.respond(`Created and pushed new project`)
                        .then(() => r);
                }))
            .then(r => ctx.messageClient.respond(`Successfully created new project`)
                .then(() => r))
            .then(r => ({
                code: 0,
                // Redirect to our local project page
                redirect: redirecter(params.target),
            }));
    }

    protected startingPoint(params: P, ctx: HandlerContext): Promise<Project> {
        return this.repoLoader(params)(
            new GitHubRepoRef(params.source.owner, params.source.repo,
                params.source.sha));
    }

    protected repoLoader(params: P): RepoLoader {
        return defaultRepoLoader({ token: params.target.githubToken });
    }
}
