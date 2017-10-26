/**
 * Identifies a git repo
 */
export interface RepoId {

    owner: string;

    repo: string;

}

/**
 * Identifies a version of a git repo containing a potential project
 */
export interface RepoRef extends RepoId {

    sha?: string;

}

export type GitRemote = string;

/**
 * Identifies a git repo with a remote
 */
export interface RemoteRepoRef extends RepoRef {

    remote: GitRemote;
}

/**
 * Identifies a git repo checked out in a local directory.
 * A RepoRef can be both Remote and Local
 */
export interface LocalRepoRef extends RepoRef {

    baseDir: string;
}

export function isLocalRepoRef(r: RepoRef): r is LocalRepoRef {
    const maybeLocalRR = r as LocalRepoRef;
    return !!maybeLocalRR.baseDir;
}

/**
 * GitHub repo ref
 */
export class GitHubRepoRef implements RemoteRepoRef {

    constructor(public owner: string,
                public repo: string,
                public sha: string = "master") {
    }

    get remote() {
        return `https://github.com/${this.owner}/${this.repo}`;
    }
}
