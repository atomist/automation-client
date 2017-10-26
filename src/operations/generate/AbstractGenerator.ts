import * as assert from "power-assert";
import * as shell from "shelljs";
import { ActionResult } from "../../action/ActionResult";
import { MappedParameter, Parameter } from "../../decorators";
import { RedirectResult } from "../../HandlerResult";
import { HandleCommand, HandlerContext, HandlerResult, MappedParameters } from "../../Handlers";
import { logger } from "../../internal/util/logger";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { Project } from "../../project/Project";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { LocalOrRemote } from "../common/LocalOrRemote";
import { RepoLoader } from "../common/repoLoader";
import { AnyProjectEditor, ProjectEditor, toEditor } from "../edit/projectEditor";

export const GitHubNameRegExp = {
    pattern: /^[-.\w]+$/,
    validInput: "a valid GitHub identifier which consists of alphanumeric, ., -, and _ characters",
};

/**
 * Support for all generators.
 * Defines common parameters.
 *
 * If the "local" parameter is set, the project will be created below the current working directory.
 */
export abstract class AbstractGenerator extends LocalOrRemote implements HandleCommand {

    @MappedParameter(MappedParameters.GitHubOwner)
    public targetOwner: string;

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Target Repository Name",
        description: "name of the target repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: true,
        order: 1,
    })
    public targetRepo: string;

    @Parameter({
        displayName: "Project Description",
        description: "short descriptive text describing the new project",
        pattern: /.*/,
        validInput: "free text",
        minLength: 1,
        maxLength: 100,
        required: false,
    })
    public description: string = "my new project";

    @Parameter({
        displayName: "Repository Visibility",
        description: "visibility of the new repository (public or private; defaults to public)",
        pattern: /^(public|private)$/,
        validInput: "public or private",
        minLength: 6,
        maxLength: 7,
        required: false,
    })
    public visibility: "public" | "private" = "public";

    /**
     * Subclasses must implement this method to return a starting point project
     * which will be transformed by the given projectEditor
     * @param {HandlerContext} ctx
     * @param {this} params
     * @return {Promise<Project>}
     */
    public abstract startingPoint(ctx: HandlerContext, params: this): Promise<Project>;

    /**
     * Subclasses must implement this method to return a project editor
     * to use in the present context
     * @param {HandlerContext} ctx context for current command
     * @param params. Actually this, as parameters are bound to a fresh instance of this class,
     * but without the problems of scoping and "this".
     * @return {ProjectEditor<any>}
     */
    public abstract projectEditor(ctx: HandlerContext, params: this): AnyProjectEditor<this>;

    public handle(ctx: HandlerContext, params: this): Promise<HandlerResult> {
        return this.startingPoint(ctx, params)
            .then(project => {
                const populated: Promise<Project> =
                    toEditor(this.projectEditor(ctx, params))(project, ctx, this)
                        .then(r => r.target);
                return this.local ?
                    populated.then(p => {
                        const parentDir = shell.pwd() + "";
                        logger.debug(`Creating local project using cwd '${parentDir}': Other name '${p.name}'`);
                        return NodeFsLocalProject.copy(p, parentDir, this.targetRepo);
                    }).then(p => {
                        return {code: 0, baseDir: p.baseDir} as HandlerResult;
                    }) :
                    populated.then(proj =>
                        proj.deleteDirectory(".git")
                            .then(p => {
                                    return this.initAndSetRemote(p, params)
                                    .then(() => {
                                        const r = {code: 0,
                                            redirect: `https://github.com/${params.targetOwner}/${params.targetRepo}`};
                                        return r as RedirectResult;
                                    });
                            }));
            })
            .then(result => {
                // TODO remove until we need this
                /* if (!this.local) {
                    return ctx.graphClient.executeMutationFromFile("graphql/createSlackChannel",
                        {name: this.targetRepo})
                        .then(channel => {
                            const channelId = (channel as any).createSlackChannel[0].id;
                            return ctx.graphClient.executeMutationFromFile("graphql/addBotToSlackChannel",
                                {channelId})
                                .then(() => {
                                    return ctx.graphClient.executeMutationFromFile("graphql/linkSlackChannelToRepo",
                                        {channelId, repo: this.targetRepo, owner: this.targetOwner});
                                });
                        })
                        .then(() => result)
                        .catch(err => failure(err));
                } else { */
                    return result;
                // }
            });
    }

    protected initAndSetRemote(p: Project, params: this): Promise<ActionResult<Project>> {
        const gp: GitProject =
            GitCommandGitProject.fromProject(p, { token: params.githubToken });
        return gp.init()
            .then(() => gp.setGitHubUserConfig())
            .then(() => {
                logger.debug(`Creating new repo '${params.targetOwner}/${params.targetRepo}'`);
                return gp.createAndSetGitHubRemote(params.targetOwner, params.targetRepo,
                    this.targetRepo, this.visibility);
            })
            .then(() => {
                logger.debug(`Committing to local repo at '${gp.baseDir}'`);
                return gp.commit("Initial commit from Atomist");
            })
            .then(() => this.push(gp));
    }

    protected repoLoader(): RepoLoader {
        assert(this.githubToken, "Github token must be set");
        return defaultRepoLoader( {token: this.githubToken });
    }

    protected push(gp: GitProject): Promise<ActionResult<GitProject>> {
        logger.debug(`Pushing local repo at '${gp.baseDir}'`);
        return gp.push();
    }
}
