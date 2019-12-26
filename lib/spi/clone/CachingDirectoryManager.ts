import * as os from "os";
import * as path from "path";
import * as lockfile from "proper-lockfile";
import { increment } from "../../internal/util/metric";
import { logger } from "../../util/logger";
import {
    CloneDirectoryInfo,
    CloneOptions,
    DirectoryManager,
} from "./DirectoryManager";
import { StableDirectoryManager } from "./StableDirectoryManager";
import { TmpDirectoryManager } from "./tmpDirectoryManager";

const AtomistWorkingDirectory = path.join(".atomist", "cache");

const AbsoluteAtomistWorkingDirectory = path.join(os.homedir(), AtomistWorkingDirectory);

const cache = new StableDirectoryManager({
    reuseDirectories: true,
    baseDir: AbsoluteAtomistWorkingDirectory,
    cleanOnExit: false,
});

/**
 * Designed to accommodate occasional writes to the same repositories,
 * this keeps one clone available for each repository. Every time that repository is requested,
 * if that clone is available, we return it. (The caller gets to fetch, clean, etc. The directory could be dirty.)
 * If that clone is locked by some other automation invocation, this
 * DirectoryManager returns a temporary directory, and you get to clone into that.
 *
 * If the returned CloneDirectoryInfo has type: "empty-directory"
 * then the caller should clone into it (not from it, you're not in the parent directory).
 * If it has type: "existing-directory" then fetch, clean, checkout etc. given it's already cloned.
 *
 * @type {{directoryFor:
 * ((owner: string, repo: string, branch: string, opts: CloneOptions) => Promise<CloneDirectoryInfo>)}}
 */
export const CachingDirectoryManager: DirectoryManager = {

    async directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        const existing = await cache.directoryFor(owner, repo, branch, opts);
        try {
            const lockResult = await lockfile.lock(existing.path);
            incrementReuse(owner, repo);
            return {
                ...existing,
                release: () => {
                    logger.debug("Releasing lock on '%s'", existing.path);
                    return lockResult().then(existing.release);
                },
                invalidate: () => {
                    logger.debug("Invalidating '%s'", existing.path);
                    return cache.invalidate(existing)
                        .then(() => {
                            logger.debug("Invalidated. Now releasing lock");
                            return lockResult().then(existing.release);
                        });
                },
                provenance: (existing.provenance || "") + " successfully locked",
            };

        } catch {
            logger.debug("Lock detected on '%s'", existing.path);
            incrementFallback(owner, repo);
            return TmpDirectoryManager.directoryFor(owner, repo, branch, opts).then(cdi =>
                ({
                    ...cdi,
                    provenance: `Tried '${existing.path}' but it was locked. ` + (cdi.provenance || ""),
                }));
        }
    },
};

export const ReuseKey = "directory_cache.reuse";
export const FallbackKey = "directory_cache.fallback";

function incrementReuse(owner: string, repo: string): void {
    increment(`${ReuseKey}.${keyFor(owner, repo)}`);
    increment(ReuseKey);
}

function incrementFallback(owner: string, repo: string): void {
    increment(`${FallbackKey}.${keyFor(owner, repo)}`);
    increment(FallbackKey);
}

function keyFor(owner: string, repo: string): string {
    return `${owner}/${repo}`;
}
