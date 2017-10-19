import { CommandHandler, MappedParameter, Parameter, Tags } from "../../decorators";
import { MappedParameters } from "../../Handlers";
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
@CommandHandler("Project generator for any seed", ["universal generator"])
@Tags("universal", "generator")
export class UniversalSeed extends SeedDrivenGenerator {

    public static Name = "UniversalSeed";

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

    constructor() {
        super(chainEditors(RemoveSeedFiles));
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

export const RemoveSeedFiles: ProjectEditor = project => {
    const filesToDelete: string[] = [
        ".travis.yml",
        "LICENSE",
        "CHANGELOG.md",
        "CODE_OF_CONDUCT.md",
        "CONTRIBUTING.md",
    ];
    defer(project, deleteFiles(project, "/*", f => filesToDelete.includes(f.path)));
    const deleteDirs: string[] = [
        ".travis",
    ];
    deleteDirs.forEach(d => defer(project, project.deleteDirectory(d)));
    return flushAndSucceed(project);
};
