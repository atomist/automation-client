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
 * Directory manager that creates temporary directories in the system
 * temporary directory.  It cleans them up after two hours or on
 * program exit, if possible.  The class only creates a single
 * instance of itself.
 *
 * It uses tmp-promise (built on tmp) to create clean temporary
 * directories to work with git projects from remotes
 */
class CleaningTmpDirectoryManager implements DirectoryManager {

    public readonly root: string = os.tmpdir();
    public readonly prefix: string = `atm-${process.pid}-`;
    private readonly reapInterval: number = 1000 * 60 * 30; // 30 minutes
    private readonly maxAge: number = 1000 * 60 * 60 * 2; // 2 hours
    private readonly instance: this;
    private initialized: boolean = false;

    constructor() {
        // only create a single instance
        if (!this.instance) {
            this.instance = this;
        }
        return this.instance;
    }

    /**
     * Create a temporary directory for the provided repository.
     */
    public async directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        this.initialize();
        const fromTmp = await tmp.dir({ keep: opts.keep, prefix: this.prefix });
        return {
            ...fromTmp,
            type: "empty-directory",
            release: () => this.cleanup(fromTmp.path, opts.keep),
            invalidate: () => Promise.resolve(),
            transient: opts.keep === false,
            provenance: `created with tmp, keep = ${opts.keep}`,
        };
    }

    /**
     * Initialize object, creating interval for cleanup and
     * registering shutdown hook.
     */
    private initialize(): this {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        setInterval(() => this.reap(this.ageFilter()), this.reapInterval).unref();
        registerShutdownHook(() => this.reap(), 3000, `temporary directory cleanup`);
        return this;
    }

    /*
     * If !keep, attempts to delete directory. Swallows errors
     * because it is not that important.
     */
    private async cleanup(p: string, keep: boolean): Promise<void> {
        if (keep) {
            return;
        }
        try {
            await fs.remove(p);
        } catch (e) {
            logger.warn(`Failed to remove '${p}': ${e.message}`);
        }
    }

    /**
     * Remove temporary directories created by this object that pass
     * the filter.  All operations of this method are wrapped in a
     * try/catch block to make it safe for use in timers and
     * intervals, although the return value will be ignored in those
     * cases.
     *
     * @param filter If this returns `true` when passed the basename of the temporary directory, the directory will be deleted
     * @return 0 if succesful, 1 otherwise
     */
    public async reap(filter: (d: string) => boolean = this.noFilter): Promise<number> {
        try {
            const files = await fs.readdir(this.root);
            const tmpDirs = files.filter(f => f.startsWith(this.prefix));
            const toRemove = tmpDirs.filter(filter);
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
     * Filter for reap that performs no filtering, everything gets
     * deleted.
     */
    public noFilter(d: string): boolean {
        return true;
    }

    /**
     * Filter directory on age.  The returned function returns true if
     * the age of its argument, as determined by the stat mtime, is
     * greater than the old, which defaults to 2 hours.
     *
     * @param old Age beyond which `true` will be returned
     * @param now Time to consider the current time, defaults to `Date.now()`
     */
    public ageFilter(old: number = this.maxAge, now?: number): (d: string) => boolean {
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

/**
 * Singleton instance of [[CleaningTmpDirectoryManager]].
 */
export const TmpDirectoryManager = new CleaningTmpDirectoryManager();
