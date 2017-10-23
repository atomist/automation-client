import { File } from "../../../project/File";
import { ProjectAsync } from "../../../project/Project";
import { JavaPackageDeclaration } from "./JavaGrammars";
import { JavaSourceFiles } from "./javaProjectUtils";

/**
 * Represents the structure of a Java project,
 * which can be inferred from its contents.
 */
export class JavaProjectStructure {

    public static infer(p: ProjectAsync): Promise<JavaProjectStructure> {
        function inferStructure(f: File): JavaProjectStructure {
            const packageName = JavaPackageDeclaration.firstMatch(f.getContentSync());
            if (packageName) {
                return new JavaProjectStructure(packageName.name);
            }
            return null;
        }

        return new Promise((resolve, reject) => {
            let structure: JavaProjectStructure = null;
            p.streamFiles(JavaSourceFiles)
                .on("data", f => {
                    if (!structure) {
                        structure = inferStructure(f);
                    }
                })
                .on("error", reject)
                .on("end", _ => resolve(structure));
        });
    }

    /**
     * @param applicationPackage The first Java package found in the project.
     */
    constructor(public applicationPackage: string) {
    }

}
