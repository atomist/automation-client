
import * as tmp from "tmp-promise";

import { CloneDirectoryInfo, CloneOptions, DirectoryManager } from "./DirectoryManager";

/**
 * Uses tmp-promise (built on tmp) to create clean temporary directories
 * to work with git projects from remotes
 */
export const TmpDirectoryManager: DirectoryManager = {

    directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        return tmp.dir({keep: opts.keep})
            .then(fromTmp => Promise.resolve({
                ...fromTmp,
                type: "parent-directory",
            }));
    },
};
