import { curry } from "@typed/curry";
import { CommandHandler, Parameter, Tags } from "../../../decorators";
import { HandlerContext } from "../../../HandlerContext";
import { logger } from "../../../internal/util/logger";
import { Project, ProjectAsync } from "../../../project/Project";
import { doWithFiles } from "../../../project/util/projectUtils";
import { ProjectEditor } from "../../edit/projectEditor";
import { chainEditors } from "../../edit/projectEditorOps";
import { AllJavaFiles } from "./javaProjectUtils";
import { JavaSeed } from "./JavaSeed";
import { SpringBootProjectStructure } from "./SpringBootProjectStructure";

/**
 * Spring Boot seed project. Extends generic Java seed to renames Spring Boot package and class name.
 */
@CommandHandler("Spring Boot seed generator", ["java", "spring", "spring-boot", "generator"])
@Tags("java", "spring", "spring-boot", "generator")
export class SpringBootSeed extends JavaSeed {

    public static Name = "SpringBootSeed";

    @Parameter({
        displayName: "Class Name",
        description: "name for the service class",
        pattern: /^.*$/,
        validInput: "a valid Java class name, which contains only alphanumeric characters, $ and _" +
        " and does not start with a number",
        minLength: 1,
        maxLength: 50,
        required: false,
    })
    public serviceClassName: string = "RestService";

    public projectEditor(ctx: HandlerContext, params: this): ProjectEditor {
        return chainEditors(
            super.projectEditor(ctx, this),
            curry(params.inferSpringStructureAndRename)(params.serviceClassName),
        );
    }

    public inferSpringStructureAndRename(serviceClassName: string, p: Project): Promise<Project> {
        return SpringBootProjectStructure.inferFromJavaSource(p)
            .then(structure => {
                if (structure) {
                    return renameClassStem(p, structure.applicationClassStem, serviceClassName);
                } else {
                    console.log("WARN: Spring Boot project structure not found");
                    return p;

                }
            });
    }

}

/**
 * Rename all instances of a Java class.  This method is somewhat
 * surgical when replacing appearances in Java code but brutal when
 * replacing appearances elsewhere, i.e., it uses `Project.recordReplace()`.
 *
 * @param project    project whose Java classes should be renamed
 * @param oldClass   name of class to move from
 * @param newClass   name of class to move to
 */
function renameClassStem<P extends ProjectAsync>(project: P,
                                                 oldClass: string, newClass: string): Promise<P> {
    logger.info("Replacing old class stem [%s] with [%s]", oldClass, newClass);
    return doWithFiles(project, AllJavaFiles, f => {
        if (f.name.includes(oldClass)) {
            f.recordRename(f.name.replace(oldClass, newClass));
            f.recordReplaceAll(oldClass, newClass);
        }
    });
}
