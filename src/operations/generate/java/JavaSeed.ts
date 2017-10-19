import { curry } from "@typed/curry";
import { CommandHandler, Parameter } from "../../../decorators";
import { defer } from "../../../internal/common/Flushable";
import { Project, ProjectAsync } from "../../../project/Project";
import { deleteFiles } from "../../../project/util/projectUtils";
import { UniversalSeed } from "../UniversalSeed";
import { JavaProjectStructure } from "./JavaProjectStructure";
import { movePackage } from "./javaProjectUtils";
import { updatePom } from "./updatePom";

/**
 * Superclass for all Java seeds using Maven. Updates Maven pom
 * based on parameters.
 */
@CommandHandler("project generator for Java library seeds", ["java", "generator"])
export class JavaSeed extends UniversalSeed {

    public static Name = "JavaSeed";

    @Parameter({
        displayName: "Maven Artifact ID",
        description: "Maven artifact identifier, i.e., the name of the jar without the version," +
        " it is often the same as the project name",
        pattern: /^([a-z][-a-z0-9_]*|\\$\\{projectName\\})$/,
        validInput: "a valid Maven artifact ID, which starts with a lower-case letter and contains only " +
        " alphanumeric, -, and _ characters, or `${projectName}` to use the project name",
        minLength: 1,
        maxLength: 50,
        required: true,
    })
    public artifactId: string = "${projectName}";

    @Parameter({
        displayName: "Maven Group ID",
        description: "Maven group identifier, often used to provide a namespace for your project," +
        " e.g., com.pany.team",
        pattern: /^.*$/,
        validInput: "a valid Maven group ID, which starts with a letter, -, or _ and contains only" +
        " alphanumeric, -, and _ characters and may having leading period separated identifiers starting" +
        " with letters or underscores and containing only alphanumeric and _ characters.",
        minLength: 1,
        maxLength: 50,
        required: true,
    })
    public groupId: string;

    @Parameter({
        displayName: "Version",
        description: "initial version of the project, e.g., 1.2.3-SNAPSHOT",
        pattern: /^.*$/,
        validInput: "a valid semantic version, http://semver.org",
        minLength: 1,
        maxLength: 50,
        required: false,
    })
    public version: string = "0.1.0-SNAPSHOT";

    @Parameter({
        displayName: "Root Package",
        description: "root package for your generated source, often this will be namespaced under the group ID",
        pattern: /^.*$/,
        validInput: "a valid Java package name, which consists of period-separated identifiers which" +
        " have only alphanumeric characters, $ and _ and do not start with a number",
        minLength: 1,
        maxLength: 50,
        required: true,
    })
    public rootPackage: string;

    /**
     * After initial population from seed project, update POM and
     * source code to reflect proper artifact, group, version, etc.
     *
     * @param project  project to tailor
     */
    public manipulate(project: Project): Promise<Project> {
        return super.manipulate(project)
            .then(this.updatePom)
            .then(curry(inferStructureAndMovePackage)(this.rootPackage));
    }

    /**
     * Remove files in seed that are not useful, valid, or appropriate
     * for a generated project.  In addition to those deleted by
     * UniversalSeed, also remove Travis CI build script.
     *
     * @param project  Project to remove seed files from.
     */
    protected removeSeedFiles(project: ProjectAsync): void {
        super.removeSeedFiles(project);
        const filesToDelete: string[] = [
            "src/main/scripts/travis-build.bash",
        ];
        defer(project, deleteFiles(project, "src/main/scripts/**", f => filesToDelete.includes(f.path)));
    }

    private updatePom(p: Project): Promise<Project> {
        const smartArtifactId = (this.artifactId === "${projectName}") ? p.name : this.artifactId;
        return updatePom(p, smartArtifactId, this.groupId, this.version, this.description);
    }

}

function inferStructureAndMovePackage(rootPackage: string, p: Project): Promise<Project> {
    return JavaProjectStructure.infer(p)
        .then(structure =>
            (structure) ?
                movePackage(p, structure.applicationPackage, rootPackage) :
                p);
}
