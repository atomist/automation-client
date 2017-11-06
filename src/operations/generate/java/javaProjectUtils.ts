import { logger } from "../../../internal/util/logger";
import { ProjectAsync } from "../../../project/Project";
import { doWithFiles } from "../../../project/util/projectUtils";

export const AllJavaFiles = "**/*.java";

export const JavaSourceFiles = "src/main/java/**/*.java";

export const JavaTestFiles = "src/main/test/**/*.java";

/**
 * Move files from one package to another. Defaults to
 * working on all Java source. However, will work for Kotlin or Scala
 * if you pass in the appropriate glob pattern to select the files you want.
 *
 * @param project      project whose files should be moved
 * @param oldPackage   name of package to move from
 * @param newPackage   name of package to move to
 * @param globPattern  glob to select files. Defaults to all Java files in the project
 */
export function movePackage<P extends ProjectAsync>(project: P, oldPackage: string, newPackage: string,
                                                    globPattern: string = AllJavaFiles): Promise<P> {
    const pathToReplace = packageToPath(oldPackage);
    const newPath = packageToPath(newPackage);
    logger.debug("Replacing path '%s' with '%s', package '%s' with '%s'",
        pathToReplace, newPath, oldPackage, newPackage);
    return doWithFiles(project, globPattern, f => {
        f.recordReplaceAll(oldPackage, newPackage)
            .recordSetPath(f.path.replace(pathToReplace, newPath));
    });
}

/**
 * Convert a Java package (with dots) to a source path
 * @param pkg package
 * @return {string}
 */
export function packageToPath(pkg: string): string {
    return pkg.replace(/\./g, "/");
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
export function renameClass<P extends ProjectAsync>(project: P,
                                                    oldClass: string, newClass: string): Promise<P> {
    logger.debug("Replacing old class stem '%s' with '%s'", oldClass, newClass);
    return doWithFiles(project, AllJavaFiles, f => {
        if (f.name.includes(oldClass)) {
            f.recordRename(f.name.replace(oldClass, newClass));
            f.recordReplaceAll(oldClass, newClass);
        }
    });
}
