import { exec } from "child-process-promise";
import * as fs from "fs";
import * as tmp from "tmp";
import { promisify } from "util";
import { logger } from "../../internal/util/logger";
import { LocalProject } from "../local/LocalProject";
import { NodeFsLocalProject } from "../local/NodeFsLocalProject";
import { GitProject } from "./GitProject";

/**
 * Clone the given repo from GitHub
 * @param token
 * @param user
 * @param repo
 * @param branch
 * @return {Promise<TResult2|LocalProject>|PromiseLike<TResult2|LocalProject>}
 */
export function clone(token: string,
                      user: string,
                      repo: string,
                      branch: string = "master"): Promise<GitProject> {
    const tmpDir = promisify(tmp.dir);
    return tmpDir()
        .then(parentDir => {
            const repoDir = `${parentDir}/${repo}`;
            const command = (branch === "master") ?
                `git clone --depth 1 https://${token}@github.com/${user}/${repo}.git` :
                `git clone https://${token}@github.com/${user}/${repo}.git; cd ${repo}; git checkout ${branch}`;

            const url = `https://github.com/${user}/${repo}`;
            logger.info(`Cloning repo [${url}] to [${parentDir}]`);
            return exec(command, {cwd: parentDir})
                .then(_ => {
                    logger.debug(`Clone succeeded with URL [${url}]`);
                    fs.chmodSync(repoDir, "0777");
                    const p = new NodeFsLocalProject(repo, repoDir);
                    return p;
                });
        });
}
