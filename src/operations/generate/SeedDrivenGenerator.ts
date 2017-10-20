import * as assert from "power-assert";
import * as shell from "shelljs";
import { ActionResult } from "../../action/ActionResult";
import {
    MappedParameter,
    Parameter,
} from "../../decorators";
import {
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameters,
    Success,
} from "../../Handlers";
import { logger } from "../../internal/util/logger";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { Project } from "../../project/Project";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { LocalOrRemote } from "../common/LocalOrRemote";
import { SimpleRepoId } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { ProjectEditor } from "../edit/projectEditor";

const gitHubNameRegExp = {
    pattern: /^[-.\w]+$/,
    validInput: "a valid GitHub identifier which consists of alphanumeric, ., -, and _ characters",
};

const gitBranchRegExp = {
    // not perfect, but pretty good
    pattern: /^\w([-.\w]*[-\w])*(\w([-.\w]*[-\w])*)*$/,
    validInput: "a valid Git branch name, see" +
    " https://www.kernel.org/pub/software/scm/git/docs/git-check-ref-format.html",
};

/**
 * Support for all seed-driven generators, which start with content
 * in a given repo.
 *
 * Defines common parameters.
 *
 * If the "local" parameter is set, the project will be created below the current working directory.
 */
export abstract class SeedDrivenGenerator extends LocalOrRemote implements HandleCommand {

    public static Name = "UniversalSeed";

    @Parameter({
        pattern: gitHubNameRegExp.pattern,
        displayName: "Seed Repository Owner",
        description: "owner, i.e., user or organization, of seed repository",
        validInput: gitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceOwner: string = "atomist-seeds";

    @Parameter({
        pattern: gitHubNameRegExp.pattern,
        displayName: "Seed Repository Name",
        description: "name of the seed repository",
        validInput: gitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceRepo: string = "spring-rest-seed";

    @Parameter({
        pattern: gitBranchRegExp.pattern,
        displayName: "Seed Branch",
        description: "seed repository branch to clone for new project",
        validInput: gitBranchRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceBranch: string = "master";

    @MappedParameter(MappedParameters.GitHubOwner)
    public targetOwner: string;

    @Parameter({
        pattern: gitHubNameRegExp.pattern,
        displayName: "Target Repository Name",
        description: "name of the target repository",
        validInput: gitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: true,
        displayable: false,
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
    // declareMappedParameter(this, "visibility", "atomist://github/default_repo_visibility");
    public visibility: "public" | "private" = "public";

    /**
     * Subclasses must implement this function to return a project editor
     * to use in the present context
     * @param {HandlerContext} ctx
     * @return {ProjectEditor<any>}
     */
    public abstract projectEditor(ctx: HandlerContext): ProjectEditor<any>;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return this.repoLoader()(new SimpleRepoId(this.sourceOwner, this.sourceRepo, this.sourceBranch))
            .then(project => {
                const populated: Promise<Project> =
                    this.projectEditor(ctx)(project, ctx, this)
                        .then(r => r.target);
                return this.local ?
                    populated.then(p => {
                        const parentDir = shell.pwd() + "";
                        logger.info(`Creating local project using cwd '${parentDir}': Other name '${p.name}'`);
                        return NodeFsLocalProject.copy(p, parentDir, this.targetRepo);
                    }).then(p => {
                        return {code: 0, baseDir: p.baseDir};
                    }) :
                    populated.then(proj =>
                        proj.deleteDirectory(".git")
                            .then(p => {
                                const gp: GitProject = GitCommandGitProject.fromProject(p, this.githubToken);
                                return gp.init()
                                    .then(() => gp.setGitHubUserConfig())
                                    .then(() => {
                                        logger.info(`Creating new repo '${this.targetOwner}/${this.targetRepo}'`);
                                        return gp.createAndSetGitHubRemote(this.targetOwner, this.targetRepo,
                                            this.targetRepo, this.visibility);
                                    })
                                    .then(() => {
                                        logger.info(`Committing to local repo at '${gp.baseDir}'`);
                                        return gp.commit("Initial commit from Atomist");
                                    })
                                    .then(() => this.push(gp))
                                    .then(() => {
                                        return {code: 0};
                                    });
                            }));
            })
            .then(() => {
                if (!this.local) {
                    return ctx.graphClient.executeMutationFromFile("graphql/createSlackChannel",
                        { name: this.targetRepo})
                        .then(channel => {
                            const channelId = (channel as any).createSlackChannel[0].id;
                            return ctx.graphClient.executeMutationFromFile("graphql/addBotToSlackChannel",
                                { channelId })
                                .then(() => {
                                    return ctx.graphClient.executeMutationFromFile("graphql/linkSlackChannelToRepo",
                                        { channelId, repo: this.targetRepo, owner: this.targetOwner });
                                });
                        })
                        .then(() => Success)
                        .catch(err => failure(err));
                } else {
                    return Promise.resolve(Success);
                }
            });
    }

    protected repoLoader(): RepoLoader {
        assert(this.githubToken, "Github token must be set");
        return defaultRepoLoader(this.githubToken);
    }

    protected push(gp: GitProject): Promise<ActionResult<GitProject>> {
        logger.info(`Pushing local repo at [${gp.baseDir}]`);
        return gp.push();
    }
}
