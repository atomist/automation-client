import { logger } from "../../../internal/util/logger";
import { File } from "../../../project/File";
import { Project, ProjectAsync } from "../../../project/Project";
import { doWithFiles } from "../../../project/util/projectUtils";

export const JavaFiles = "**/*.java";

/**
 * Move files from one Java package to another. Return run or defer.
 *
 * @param project      project whose files should be moved
 * @param oldPackage   name of package to move from
 * @param newPackage   name of package to move to
 */
export function movePackage<P extends ProjectAsync>(project: P, oldPackage: string, newPackage: string): Promise<P> {
    const pathToReplace = packageToPath(oldPackage);
    const newPath = packageToPath(newPackage);
    logger.info("Replacing path [%s] with [%s], package [%s] with [%s]",
        pathToReplace, newPath, oldPackage, newPackage);
    return doWithFiles(project, "**/*.java", f => {
        f.recordReplaceAll(oldPackage, newPackage)
            .recordSetPath(f.path.replace(pathToReplace, newPath));
    })
        .then(files => project);

}

/**
 * Convert a Java package (with dots) to a source path
 * @param pkg package
 * @return {string}
 */
export function packageToPath(pkg: string): string {
    return pkg.replace(/\./g, "/");
}
