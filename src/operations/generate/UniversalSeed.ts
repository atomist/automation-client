import { curry } from "@typed/curry";
import { CommandHandler, MappedParameter, Parameter, Secret, Tags } from "../../decorators";
import { HandlerContext } from "../../HandlerContext";
import { MappedParameters, Secrets } from "../../index";
import { defer } from "../../internal/common/Flushable";
import { Project } from "../../project/Project";
import { deleteFiles, doWithFiles } from "../../project/util/projectUtils";
import { flushAndSucceed, ProjectEditor } from "../edit/projectEditor";
import { chainEditors } from "../edit/projectEditorOps";
import { SeedDrivenGenerator } from "./SeedDrivenGenerator";

/**
 * Generic seed generator. Use when we don't know specifics about the seed.
 * Works with any source repo.
 *
 * Defines common parameters.
 */
@CommandHandler("Project generator for any seed", "generate universal")
@Tags("universal", "generator")
export class UniversalSeed extends SeedDrivenGenerator {

    @MappedParameter(MappedParameters.GitHubOwner)
    public targetOwner: string;

    // TODO removing this breaks parameter inheritance. Why?
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

    @Secret(Secrets.userToken(["repo", "user"]))
    protected githubToken: string;

    constructor() {
        super();
        this.sourceOwner = "atomist-seeds";
        this.sourceRepo = "spring-rest-seed";
    }

    public projectEditor(ctx: HandlerContext, params: this): ProjectEditor {
        return chainEditors(curry(cleanReadMe)(this.description));
    }
}

/**
 * Remove content from README specific to this project.
 *
 * @param project      project whose README should be cleaned
 * @param description  brief description of newly created project
 */
export function cleanReadMe(description: string, project: Project): Promise<Project> {
    return doWithFiles(project, "README.md", readMe => {
        readMe.recordReplace(/^#[\\s\\S]*?## Development/, `# ${project.name}
This project contains ${description}.

## Development`);
    });
}
