
export interface CloneOptions {

    /**
     * If this is true, the implementation should keep the directory at least
     * for the duration of the current process. If it's false, persistence can be treated
     * in any way.
     */
    keep?: boolean;

    /**
     * If this is true, always make a full clone.
     * If it's false, and we want the master branch, and we're cloning into a transient
     * place, then clone with `--depth 1` to save time.
     */
    alwaysDeep?: boolean;

    /**
     * If we are not doing a deep clone (alwaysDeep is false),
     * then the default is to clone only one branch.
     * Set noSingleBranch to true to clone the tips of all branches instead.
     * This passes `--no-single-branch` to `git clone`.
     * If alwaysDeep is true, this option has no effect.
     */
    noSingleBranch?: boolean;

    /**
     * Set this to the number of commits that should be cloned into the transient
     * place. This only applies when alwaysDeep is set to false.
     */
    depth?: number;

    /**
     * If you really want the SHA, not the tip of the branch that we've checked out,
     * then request a detached HEAD at that SHA.
     */
    detachHead?: boolean;
}

export const DefaultCloneOptions: CloneOptions = {
    keep: false,
    alwaysDeep: false,
};

/**
 * Information about a directory for working with a clone.
 */
export interface CloneDirectoryInfo {

    /**
     * Local file system path to the clone
     */
    path: string;

    /**
     * Directory type: either a parent directory into which we can clone,
     * or a distinct directory
     */
    type: "empty-directory" | "existing-directory";

    /**
     * Call this when you're done with this clone. It lets other people use it
     * @returns {Promise<void>}
     */
    release: () => Promise<void>;

    /**
     * Call this if you think this directory is not working for you.
     * useful when a standard clone has become corrupted somehow and we should not
     * use it again.
     */
    invalidate: () => Promise<void>;

    /**
     * Will this directory be deleted soon, or might it hang around a while?
     */
    transient: boolean;

    /**
     * for debugging, describe how this came to be constructed
     */
    provenance?: string;
}

/**
 * SPI strategy interface for managing project storage
 */
export interface DirectoryManager {

    /**
     * Return a clean parent directory for this project to be checked out
     * @param {string} owner
     * @param {string} repo
     * @param {string} branch
     * @param {CloneOptions} opts
     */
    directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo>;
}
