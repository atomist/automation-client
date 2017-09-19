import { HandlerContext } from "../../HandlerContext";
import { logger } from "../../internal/util/logger";
import { DefaultExcludes } from "../../project/FileGlobs";
import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { toPromise } from "../../project/util/projectUtils";
import { RepoFinder } from "./RepoFinder";
import { RepoId, SimpleRepoId } from "./RepoId";

/**
 * Look for repos under /org/repo format, from current working directory
 */
export function twoTierDirectoryRepoFinder(cwd: string): RepoFinder {
    return (context: HandlerContext) => {
        logger.info(`Looking for repos in directories under [${cwd}]`);

        const project = new NodeFsLocalProject("sources", cwd);
        return toPromise(project.streamFilesRaw(["*/*/"].concat(DefaultExcludes), { nodir: false }))
            .then(twoDirs => twoDirs.map(dir => {
                const path = dir.path.startsWith("/") ? dir.path.substr(1) : dir.path;
                const components = path.split("/");
                const org = components[0];
                const repo = components[1];
                const baseDir = cwd + "/" + org + "/" + repo;
                return new SimpleRepoId(org, repo, "master", {baseDir});
            }));
    };
}
