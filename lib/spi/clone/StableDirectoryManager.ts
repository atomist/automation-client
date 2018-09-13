import * as fs from "fs-extra";
import * as path from "path";

import { registerShutdownHook } from "../../internal/util/shutdown";
import { logger } from "../../util/logger";
import {
    CloneDirectoryInfo,
    CloneOptions,
    DirectoryManager,
} from "./DirectoryManager";

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
                logger.debug("Deleted " + existing.path);
            }, err => {
                if (err.code === "ENOENT") {
                    logger.debug("Cleanup: deleting %s, but it's already gone", existing.path);
                    return;
                } else {
                    logger.error("Unexpected error deleting directory %s: %s", existing.path, err);
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

    private freshDirectoryFor(
        user: string,
        repo: string,
        branch: string,
        opts: CloneOptions,
    ): Promise<CloneDirectoryInfo> {

        return this.createFreshDir(user, repo)
            .then((cdi): CloneDirectoryInfo => {
                this.directoriesUsed++;
                logger.debug("%s directories used: Returning new path '%s'",
                    this.directoriesUsed, cdi);
                return {
                    path: cdi,
                    type: "empty-directory",
                    release: () => Promise.resolve(),
                    invalidate: () => Promise.resolve(),
                    transient: false,
                };
            });
    }

    private pathFor(owner: string, repo: string): string {
        return path.join(this.opts.baseDir, "repos", "github.com", owner, repo);
    }

    private createFreshDir(owner: string, repo: string): Promise<string> {
        const repoDir = this.pathFor(owner, repo);
        return fs.ensureDir(repoDir)
            .then(() => assureDirectoryIsEmpty(repoDir))
            .then(() => repoDir);
    }
}

function assureDirectoryIsEmpty(name: string): Promise<void> {
    return fs.readdir(name).then(files => {
        if (files.length > 0) {
            return fs.remove(name)
                .then(() => fs.ensureDir(name))
                .catch(err => {
                    throw new Error("I tried to make this directory be empty: " + name +
                        " but it didn't work: " + err.message);
                });
        }
    });
}
