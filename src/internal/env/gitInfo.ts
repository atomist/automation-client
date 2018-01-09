import * as fs from "fs-extra";
import * as path from "path";

import { runCommand } from "../../action/cli/commandLine";
import { logger } from "../util/logger";

/**
 * Return Git remote origin URL, branch, and sha for provided
 * directory.  If provided directory is not a Git repository, empty
 * strings will be returned for the repository, branch, and sha.
 *
 * @param directory path to local Git repository
 * @return Git URL, branch, and sha
 */
export function obtainGitInfo(directory: string): Promise<GitInformation> {
    const gitInfo: GitInformation = {
        sha: "",
        branch: "",
        repository: "",
    };
    const gitPath = path.join(directory, ".git");
    const headPath = path.join(gitPath, "HEAD");
    const refsPath = path.join(gitPath, "refs", "heads");
    const configPath = path.join(gitPath, "config");
    return fs.readFile(headPath)
        .then(headLine => {
            const head = headLine.toString().trim();
            const refHead = "ref: refs/heads/";
            if (head.indexOf(refHead) === 0) {
                const branch = head.replace(refHead, "");
                if (!branch) {
                    throw new Error(`failed to get branch from ${headPath}: ${head}`);
                }
                gitInfo.branch = branch;
                const branchPath = path.join(refsPath, branch);
                return fs.readFile(branchPath)
                    .then(ref => {
                        const sha = ref.toString().trim();
                        if (!sha) {
                            throw new Error(`failed to get SHA from ${branchPath}`);
                        }
                        gitInfo.sha = sha;
                    });
            } else {
                gitInfo.sha = head;
                gitInfo.branch = head;
            }
        })
        .then(() => {
            return fs.readFile(configPath)
                .then(config => {
                    const configLines = config.toString().split("\n");
                    for (let i = 0; i < configLines.length; i++) {
                        if (/^\[remote "origin"\]$/.test(configLines[i])) {
                            for (let j = i + 1; i < configLines.length; j++) {
                                if (/^\s+url\s*=/.test(configLines[j])) {
                                    const url = configLines[j].replace(/.*?=\s*/, "");
                                    if (!url) {
                                        continue;
                                    }
                                    gitInfo.repository = url;
                                    i = configLines.length;
                                    break;
                                } else if (/^\S/.test(configLines[j])) {
                                    i = j;
                                    break;
                                }
                            }
                        }
                    }
                    if (!gitInfo.repository) {
                        throw new Error(`failed to get remote origin URL from ${configPath}`);
                    }
                });
        })
        .then(() => Promise.resolve(gitInfo), err => {
            logger.info(`failed to fully populate git information: ${err.message}`);
            return Promise.resolve(gitInfo);
        });
}

/*
 * Information about current Git commit and remote.
 */
export interface GitInformation {
    sha: string;
    branch: string;
    repository: string;
}
