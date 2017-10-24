
export interface CloneOptions {

    keep?: boolean;
}

export const DefaultCloneOptions: CloneOptions = {
    keep: false,
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
    type: "parent-directory" | "actual-directory";
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
