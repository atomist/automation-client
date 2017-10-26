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

/**
 * Identifies a git repo with a remote
 */
export interface RemoteRepoRef extends RepoRef {

    /**
     * Remote base
     */
    readonly remoteBase: string;

    pathComponent: string;

    /**
     * Entire url of the repo
     */
    url: string;
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

export class RemoteRepoRefSupport implements RemoteRepoRef {

    constructor(public remoteBase: string,
                public owner: string,
                public repo: string,
                public sha: string = "master") {
    }

    get url() {
        return `${this.remoteBase}/${this.owner}/${this.repo}`;
    }

    get pathComponent() {
        return `${this.owner}/${this.repo}`;
    }
}

/**
 * GitHub repo ref
 */
export class GitHubRepoRef extends RemoteRepoRefSupport {

    constructor(owner: string,
                repo: string,
                sha: string = "master") {
        super("github.com", owner, repo, sha);
    }

}
