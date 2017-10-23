import { Parameter } from "../../decorators";
import { HandlerContext } from "../../Handlers";
import { Project } from "../../project/Project";
import { SimpleRepoId } from "../common/RepoId";
import { ProjectEditor } from "../edit/projectEditor";
import { AbstractGenerator, GitHubNameRegExp } from "./AbstractGenerator";

const GitBranchRegExp = {
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
 */
export abstract class SeedDrivenGenerator extends AbstractGenerator {

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Seed Repository Owner",
        description: "owner, i.e., user or organization, of seed repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceOwner: string = "atomist-seeds";

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Seed Repository Name",
        description: "name of the seed repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceRepo: string = "spring-rest-seed";

    @Parameter({
        pattern: GitBranchRegExp.pattern,
        displayName: "Seed Branch",
        description: "seed repository branch to clone for new project",
        validInput: GitBranchRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceBranch: string = "master";

    /**
     * Subclasses must implement this function to return a project editor
     * to use in the present context
     * @param {HandlerContext} ctx
     * @param params. Actually this, as parameters are bound to a fresh instance of this class,
     * but without the problems of scoping and "this".
     * @return {ProjectEditor<any>}
     */
    public abstract projectEditor(ctx: HandlerContext, params: this): ProjectEditor<this>;

    public startingPoint(ctx: HandlerContext, params: this): Promise<Project> {
        return this.repoLoader()(
            new SimpleRepoId(this.sourceOwner, this.sourceRepo, this.sourceBranch));
    }

}
