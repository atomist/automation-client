import * as _ from "lodash";
import { ProjectAsync } from "../../../project/Project";
import { findMatches } from "../../../project/util/parseUtils";
import { JavaPackageDeclaration } from "./JavaGrammars";
import { AllJavaFiles } from "./javaProjectUtils";

/**
 * Represents the structure of a Java project,
 * which can be inferred from its contents.
 */
export class JavaProjectStructure {

    public static infer(p: ProjectAsync): Promise<JavaProjectStructure> {
        return findMatches(p, AllJavaFiles, JavaPackageDeclaration)
            .then(packages => {
                const uniquePackages = _.uniq(packages.map(pack => pack.name));
                if (uniquePackages.length === 0) {
                    return undefined;
                }
                if (uniquePackages.length === 1) {
                    return new JavaProjectStructure(uniquePackages[0]);
                }
                const longestPrefix = sharedStart(uniquePackages);
                return !!longestPrefix ?
                    new JavaProjectStructure(longestPrefix.replace(/\.$/, "")) :
                    undefined;
            });
    }

    /**
     * @param applicationPackage The first Java package found in the project.
     */
    constructor(public applicationPackage: string) {
    }

}

// Taken from https://stackoverflow.com/questions/1916218/find-the-longest-common-starting-substring-in-a-set-of-strings
function sharedStart(array: string[]): string {
    const A = array.concat().sort();
    if (!A) {
        return "";
    }
    const a1 = A[0];
    const a2 = A[A.length - 1];
    const L = a1.length;
    let i = 0;
    while (i < L && a1.charAt(i) === a2.charAt(i)) { i++; }
    return a1.substring(0, i);
}
