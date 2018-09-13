import * as appRoot from "app-root-path";
import * as path from "path";

/**
 * Load the package.json file of the consumer Node module.
 */
export function loadHostPackageJson(): any | undefined {
    try {
        // This works if the consumer of automation-client is not a global module
        return require(`${appRoot.path}/package.json`); // require is fine with / paths on windows
    } catch (err) {
        // This works if the consumer is installed globally
        const appDir = __dirname.split(path.join("node_modules", "@atomist", "automation-client"))[0];
        try {
            return require(path.join(appDir, "package.json"));
        } catch (err) {
            // Intentionally left empty
        }
    }
    return undefined;
}
