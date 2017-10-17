import { CommandHandler, MappedParameter, Parameter, Tags } from "../../decorators";
import { MappedParameters } from "../../Handlers";
import { defer } from "../../internal/common/Flushable";
import { logger } from "../../internal/util/logger";
import { GitProject } from "../../project/git/GitProject";
import { ProjectAsync } from "../../project/Project";
import { deleteFiles, doWithFiles } from "../../project/util/projectUtils";
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
        super();
    }

    /**
     * Subclasses can extend this to add custom logic to the repo
     * contents from the seed location.  The project is already
     * populated when this method is called.  This version calls
     * removeSeedFiles and updates the README.
     *
     * @param project raw seed project
     */
    public manipulate(project: ProjectAsync): void {
        this.removeSeedFiles(project);
        this.cleanReadMe(project, this.description);
    }

    protected push(gp: GitProject): Promise<any> {
        logger.info(`Pushing local repo at [${gp.baseDir}]`);
        return gp.push();
    }

    /**
     * Remove content from README specific to this project.
     *
     * @param project      project whose README should be cleaned
     * @param description  brief description of newly created project
     */
    protected cleanReadMe(project: ProjectAsync, description: string): void {
        defer(project, doWithFiles(project, "README.md", readMe => {
            readMe.recordReplace(/^#[\\s\\S]*?## Development/, `# ${project.name}
This project contains ${description}.
## Development`);
        }));
    }

    /**
     * Remove files in seed that are not useful, valid, or appropriate
     * for a generated project.
     */
    protected removeSeedFiles(project: ProjectAsync): void {
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
    }

}
