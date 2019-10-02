import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as tmp from "tmp-promise";
import { registerShutdownHook } from "../../internal/util/shutdown";
import { logger } from "../../util/logger";
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

    private readonly root: string = os.tmpdir();
    private readonly prefix: string = `atm-${process.pid}-`;
    private readonly reapInterval: number = 1000 * 60 * 30; // 30 minute intervals

    constructor() {
        setInterval(() => this.reapSync(this.ageFilter()), this.reapInterval).unref();
    }

    public async directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        // the lack of typings here causes lack of typechecking in this function
        const fromTmp = await tmp.dir({ keep: opts.keep, prefix: this.prefix });
        return {
            ...fromTmp,
            type: "empty-directory" as "empty-directory" | "existing-directory",
            release: () => cleanup(fromTmp.path, opts.keep),
            invalidate: () => Promise.resolve(), // and here
            transient: opts.keep === false,
            provenance: "created with tmp, keep = " + opts.keep,
        };
    }

    /**
     * Remove temporary directories created by this object that pass
     * the filter.  For use in a timer which does not properly handle
     * async.
     *
     * @param filter If this returns `true` when passed the basename of the directory, the directory will be deleted
     * @return 0 if succesful, 1 otherwise
     */
    public async reap(filter: (d: string) => boolean = this.noFilter): Promise<number> {
        try {
            const files = await fs.readdir(this.root);
            const tmpDirs = files.filter(f => f.startsWith(this.prefix));
            const toRemove = files.filter(filter);
            const errs: Error[] = [];
            for (const dir of toRemove) {
                const dirPath = path.join(this.root, dir);
                logger.debug(`Deleting temporary directory: ${dirPath}`);
                try {
                    await fs.remove(dirPath);
                } catch (e) {
                    e.message = `Failed to remove temporary directory '${dirPath}': ${e.message}`;
                    logger.warn(e.message);
                    errs.push(e);
                }
            }
            if (errs.length > 0) {
                const err = errs[0];
                err.message = errs.map(e => e.message).join("; ");
                throw err;
            }
        } catch (e) {
            logger.warn(`Failed to remove temporary directories: ${e.message}`);
            return 1;
        }
        return 0;
    }

    /**
     * Synchronously remove temporary directories created by this
     * object that pass the filter.  For use in timers, which do not
     * properly handle async.
     *
     * @param filter If this returns `true` when passed the basename of the directory, the directory will be deleted
     */
    private reapSync(filter: (d: string) => boolean = this.noFilter): void {
        try {
            const files = fs.readdirSync(this.root);
            const tmpDirs = files.filter(f => f.startsWith(this.prefix));
            const toRemove = files.filter(filter);
            const errs: Error[] = [];
            for (const dir of toRemove) {
                const dirPath = path.join(this.root, dir);
                logger.debug(`Deleting temporary directory: ${dirPath}`);
                try {
                    fs.removeSync(dirPath);
                } catch (e) {
                    e.message = `Failed to remove temporary directory '${dirPath}': ${e.message}`;
                    logger.warn(e.message);
                    errs.push(e);
                }
            }
            if (errs.length > 0) {
                const err = errs[0];
                err.message = errs.map(e => e.message).join("; ");
                throw err;
            }
        } catch (e) {
            logger.warn(`Failed to remove temporary directories: ${e.message}`);
        }
    }

    /**
     * Perform no filtering, everything gets deleted.
     */
    private noFilter(d: string): boolean {
        return true;
    }

    /**
     * Filter directory on age.  The returned function returns true if
     * age is of its argument is greater than the old, which defaults
     * to 2 hours.
     *
     * @param old Age beyond which `true` will be returned
     * @param now Time to consider the current time, defaults to `Date.now()`
     */
    private ageFilter(old: number = 7200000, now?: number): (d: string) => boolean {
        const ts = (now || Date.now()) - old;
        return d => {
            const dirPath = path.join(this.root, d);
            try {
                const dirStat = fs.statSync(dirPath);
                return dirStat.mtimeMs < ts;
            } catch (e) {
                logger.warn(`Failed to stat temporary directory '${dirPath}', returning false: ${e.message}`);
                return false;
            }
        };
    }
}

export const TmpDirectoryManager = new CleaningTmpDirectoryManager();
registerShutdownHook(() => TmpDirectoryManager.reap(), 3000, `temporary directory cleanup`);

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
