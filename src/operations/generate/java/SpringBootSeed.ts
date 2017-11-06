import { curry } from "@typed/curry";
import { CommandHandler, Parameter, Tags } from "../../../decorators";
import { HandlerContext } from "../../../HandlerContext";
import { Project } from "../../../project/Project";
import { ProjectEditor } from "../../edit/projectEditor";
import { chainEditors } from "../../edit/projectEditorOps";
import { renameClass } from "./javaProjectUtils";
import { JavaSeed } from "./JavaSeed";
import { SpringBootProjectStructure } from "./SpringBootProjectStructure";

/**
 * Spring Boot seed project. Extends generic Java seed to renames Spring Boot package and class name.
 */
@CommandHandler("Spring Boot seed generator", "generate spring-boot rest")
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

    constructor() {
        super();
        this.sourceOwner = "atomist-seeds";
        this.sourceRepo = "spring-rest-seed";
    }

    public projectEditor(ctx: HandlerContext, params: this): ProjectEditor {
        return chainEditors(
            super.projectEditor(ctx, this),
            curry(inferSpringStructureAndRename)(params.serviceClassName),
        );
    }

}

export function inferSpringStructureAndRename(serviceClassName: string, p: Project): Promise<Project> {
    return SpringBootProjectStructure.inferFromJavaSource(p)
        .then(structure => {
            if (structure) {
                return renameClass(p, structure.applicationClassStem, serviceClassName);
            } else {
                console.log("WARN: Spring Boot project structure not found");
                return p;

            }
        });
}
