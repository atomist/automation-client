
import * as tmp from "tmp-promise";

import { CloneDirectoryInfo, CloneOptions, DirectoryManager } from "./DirectoryManager";

/**
 * Uses tmp-promise (built on tmp) to create clean temporary directories
 * to work with git projects from remotes
 */
export const TmpDirectoryManager: DirectoryManager = {

    directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        return tmp.dir({keep: opts.keep})// the lack of typings here causes lack of typechecking in this function
            .then(fromTmp => ({
                ...fromTmp,
                type: "empty-directory",
                release: () => Promise.resolve(), // opportunity: delete directory here
                invalidate: () => Promise.resolve(), // and here
                transient: true,
                provenance: "created with tmp, keep = " + opts.keep,
            }));
    },
};
