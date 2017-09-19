import { logger } from "../../../internal/util/logger";
import { ProjectNonBlocking } from "../../../project/Project";
import { doWithFiles } from "../../../project/util/projectUtils";

export const JavaFiles = "**/*.java";

/**
 * Move files from one Java package to another.
 *
 * @param project      project whose files should be moved
 * @param oldPackage   name of package to move from
 * @param newPackage   name of package to move to
 */
export function movePackage(project: ProjectNonBlocking, oldPackage: string, newPackage: string): void {
    const pathToReplace = packageToPath(oldPackage);
    const newPath = packageToPath(newPackage);
    logger.info("Replacing path [%s] with [%s], package [%s] with [%s]",
        pathToReplace, newPath, oldPackage, newPackage);
    return doWithFiles(project, "**/*.java", f => {
        f.recordReplaceAll(oldPackage, newPackage)
            .recordSetPath(f.path.replace(pathToReplace, newPath));
    }).defer();

}

/**
 * Convert a Java package (with dots) to a source path
 * @param pkg package
 * @return {string}
 */
export function packageToPath(pkg: string): string {
    return pkg.replace(/\./g, "/");
}
