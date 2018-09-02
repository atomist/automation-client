import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as tmp from "tmp-promise";

import {
    CloneDirectoryInfo,
    CloneOptions,
    DirectoryManager,
} from "./DirectoryManager";

/**
 * Uses tmp-promise (built on tmp) to create clean temporary directories
 * to work with git projects from remotes
 */
class CleaningTmpDirectoryManager implements DirectoryManager {

    private prefix = `atm-${process.pid}-`;

    constructor() {
        setInterval(() => {
            const ts = Date.now() - (1000 * 60 * 60 * 2); // 2 hour threshold
            fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(this.prefix))
                .forEach(f => {
                    const st = fs.statSync(path.join(os.tmpdir(), f));
                    if (st.mtimeMs < ts) {
                        console.log("<< deleting " + f);
                        fs.removeSync(path.join(os.tmpdir(), f));
                    } else {
                        console.log(">> not deleting " + f);
                    }
                });
        }, 1000 * 60 * 30).unref(); // 30 second intervals
    }

    public directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        return tmp.dir({ keep: opts.keep, prefix: this.prefix }) // the lack of typings here causes lack of typechecking in this function
            .then(fromTmp => ({
                ...fromTmp,
                type: "empty-directory" as "empty-directory" | "existing-directory",
                release: () => cleanup(fromTmp.path, opts.keep),
                invalidate: () => Promise.resolve(), // and here
                transient: true,
                provenance: "created with tmp, keep = " + opts.keep,
            }));
    }
}

export const TmpDirectoryManager = new CleaningTmpDirectoryManager();

/*
 * If !keep, attempts to delete directory. Swallows errors
 * because it is not that important.
 */
function cleanup(p: string, keep: boolean): Promise<void> {
    if (keep) {
        return Promise.resolve();
    } else {
        return fs.remove(p)
            .then(() => Promise.resolve(), err => Promise.resolve());
    }
}
