import { registerShutdownHook } from "../../internal/util/shutdown";

import { logger } from "../../internal/util/logger";

import * as fs from "fs-extra";
import { CloneDirectoryInfo, CloneOptions, DirectoryManager } from "./DirectoryManager";

export interface StableDirectoryManagerOpts {

    /**
     * Attempt to reuse directories?
     */
    reuseDirectories: boolean;

    /**
     * Clean up directories on exit?
     */
    cleanOnExit?: boolean;

    /**
     * If provided, number of directories
     */
    baseDir: string;
}

const DefaultOpts = {
    reuseDirectories: false,
    cleanOnExit: true,
};

/**
 * Build a stable working directory structure.
 * Options determine whether it's cleared on exit.
 */
export class StableDirectoryManager implements DirectoryManager {

    public opts: StableDirectoryManagerOpts;

    private directoriesUsed = 0;

    constructor(pOpts: StableDirectoryManagerOpts) {
        this.opts = {
            ...DefaultOpts,
            ...pOpts,
        };

        if (this.opts.cleanOnExit === true) {
            registerShutdownHook(() => {
                logger.debug("Cleaning up temporary directories under '%s'", this.opts.baseDir);
                return fs.remove(this.opts.baseDir).then(() => 0);
            });
        }
    }

    public invalidate(existing: CloneDirectoryInfo): Promise<void> {
        return fs.remove(existing.path)
            .then(() => {
                logger.info("deleted " + existing.path);
            }, err => {
                if (err.code === "ENOENT") {
                    logger.info("It's already gone");
                    // fine, it's already been removed
                    return;
                } else {
                    logger.error("unexpected error deleting directory:" + err);
                    throw err;
                }
            });
    }

    public directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        if (this.opts.reuseDirectories) {
            // Attempt to reuse the directory
            return this.existingDirectoryFor(owner, repo, branch, opts)
                .then(existing => !!existing ? existing : this.freshDirectoryFor(owner, repo, branch, opts));
        } else {
            return this.freshDirectoryFor(owner, repo, branch, opts);
        }
    }

    /**
     * Return undefined if not found
     */
    private existingDirectoryFor(owner: string, repo: string, branch: string,
                                 opts: CloneOptions): Promise<CloneDirectoryInfo> {
        const expectedPath = this.pathFor(owner, repo);
        return fs.pathExists(expectedPath)
            .then(exists => {
                if (exists) {
                    logger.debug("%s directories used: Reusing path '%s'",
                        this.directoriesUsed, expectedPath);
                    return {
                        path: expectedPath,
                        type: "existing-directory" as any,
                        release: () => Promise.resolve(),
                        invalidate: () => Promise.resolve(),
                        transient: false,
                    };
                } else {
                    // It doesn't exist
                    return undefined;
                }
            });
    }

    private freshDirectoryFor(user: string, repo: string, branch: string,
                              opts: CloneOptions): Promise<CloneDirectoryInfo> {
        return this.createFreshDir(user, repo)
            .then((path): CloneDirectoryInfo => {
                this.directoriesUsed++;
                logger.debug("%s directories used: Returning new path '%s'",
                    this.directoriesUsed, path);
                return {
                    path,
                    type: "empty-directory",
                    release: () => Promise.resolve(),
                    invalidate: () => Promise.resolve(),
                    transient: false,
                };
            });
    }

    private pathFor(user: string, repo: string): string {
        return `${this.opts.baseDir}/${user}/${repo}`;
    }

    private createFreshDir(user: string, repo: string): Promise<string> {
        // assume the baseDir exists
        const userDir = `${this.opts.baseDir}/${user}`;
        const repoDir = userDir + "/" + repo;
        return assureDirectoryExists(this.opts.baseDir)
            .then(() => assureDirectoryExists(userDir))
            .then(() => assureDirectoryExists(repoDir))
            .then(() => assureDirectoryIsEmpty(repoDir))
            .then(() => repoDir);
    }
}

function assureDirectoryExists(name: string): Promise<void> {
    // fyi, there is a race condition when the directory does not exist and
    // two concurrent activities both try to create it.
    // It's a transient error, not the end of the world. Works on second try.
    return fs.stat(name).then(stats => {
        if (!stats.isDirectory()) {
            throw new Error(name + "exists but is not a directory.");
        }
    }, err => {
        if (err.code === "ENOENT") {
            console.info("Creating " + name);
            return fs.mkdir(name);
        }
        throw err;
    });
}

function assureDirectoryIsEmpty(name: string): Promise<void> {
    return fs.readdir(name).then(files => {
        if (files.length > 0) {
            throw new Error("This directory was supposed to be empty: " + name +
                " but it contains: " + files.join("\n"));
        }
    });
}
