import { curry } from "@typed/curry";
import { CommandHandler, Parameter } from "../../../decorators";
import { HandlerContext } from "../../../HandlerContext";
import { Project } from "../../../project/Project";
import { deleteFiles } from "../../../project/util/projectUtils";
import { ProjectEditor } from "../../edit/projectEditor";
import { chainEditors } from "../../edit/projectEditorOps";
import { UniversalSeed } from "../UniversalSeed";
import { JavaProjectStructure } from "./JavaProjectStructure";
import { movePackage } from "./javaProjectUtils";
import { updatePom } from "./updatePom";

/**
 * Represents a Maven or Gradle artifact.
 */
export interface VersionedArtifact {

    artifactId: string;
    groupId: string;
    version: string;
    description: string;
}

/**
 * Superclass for all Java seeds using Maven. Updates Maven pom
 * based on parameters.
 */
@CommandHandler("project generator for Java library seeds", "generate java")
export class JavaSeed extends UniversalSeed implements VersionedArtifact {

    public static Name = "JavaSeed";

    @Parameter({
        displayName: "Maven Artifact ID",
        description: "Maven artifact identifier, i.e., the name of the jar without the version," +
        " it is often the same as the project name",
        pattern: /^([a-z][-a-z0-9_]*|\$\{projectName\})$/,
        validInput: "a valid Maven artifact ID, which starts with a lower-case letter and contains only " +
        " alphanumeric, -, and _ characters, or `${projectName}` to use the project name",
        minLength: 1,
        maxLength: 50,
        required: true,
        order: 51,
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
        order: 50,
    })
    public groupId: string;

    @Parameter({
        displayName: "Version",
        description: "initial version of the project, e.g., 1.2.3-SNAPSHOT",
        pattern: /^.*$/,
        validInput: "a valid semantic version, http://semver.org",
        minLength: 1,
        maxLength: 50,
        required: true,
        order: 52,
    })
    public version: string = "0.1.0-SNAPSHOT";

    @Parameter({
        displayName: "Root Package",
        description: "root package for your generated source, often this will be namespaced under the group ID",
        pattern: /^.*$/,
        validInput: "a valid Java package name, which consists of period-separated identifiers which" +
        " have only alphanumeric characters, $ and _ and do not start with a number",
        minLength: 1,
        maxLength: 150,
        required: true,
        order: 53,
    })
    public rootPackage: string;

    public projectEditor(ctx: HandlerContext, params: this): ProjectEditor {
        return chainEditors(
            super.projectEditor(ctx, params),
            removeTravisBuildFiles,
            curry(doUpdatePom)(params),
            curry(inferStructureAndMovePackage)(params.rootPackage),
        );
    }

}

/**
 * Remove files in seed that are not useful, valid, or appropriate
 * for a generated project.  In addition to those deleted by
 * UniversalSeed, also remove Travis CI build script.
 *
 * @param project  Project to remove seed files from.
 */
export function removeTravisBuildFiles(project: Project): Promise<Project> {
    const filesToDelete: string[] = [
        "src/main/scripts/travis-build.bash",
    ];
    return deleteFiles(project, "src/main/scripts/**",
        f => filesToDelete.includes(f.path))
        .then(count => project);
}

export function doUpdatePom(id: VersionedArtifact, p: Project): Promise<Project> {
    const smartArtifactId = (id.artifactId === "${projectName}") ? p.name : id.artifactId;
    return updatePom(p, smartArtifactId, id.groupId, id.version, id.description);
}

export function inferStructureAndMovePackage(rootPackage: string, p: Project): Promise<Project> {
    return JavaProjectStructure.infer(p)
        .then(structure =>
            (structure) ?
                movePackage(p, structure.applicationPackage, rootPackage) :
                p);
}
