/**
 * Identifies a git repo
 */
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

export interface RepoId {

    owner: string;

    repo: string;

}

export class SimpleRepoId implements RepoId {

    constructor(public owner: string, public repo: string) {}
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

    /**
     * Entire url of the repo
     */
    url: string;

    /**
     * Return the clone URL for this to pass to git clone
     * @param {ProjectOperationCredentials} creds
     * @return {string}
     */
    cloneUrl(creds: ProjectOperationCredentials): string;

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
        return `https://${this.remoteBase}/${this.owner}/${this.repo}`;
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        return `https://${creds.token}@${this.remoteBase}/${this.pathComponent}.git`;
    }

    get pathComponent(): string {
        return this.owner + "/" + this.repo;
    }
}
