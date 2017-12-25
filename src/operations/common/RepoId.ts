/**
 * Identifies a git repo
 */
import { ActionResult } from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

export interface RepoId {

    owner: string;

    repo: string;

}

export class SimpleRepoId implements RepoId {

    constructor(public owner: string, public repo: string) {
    }
}

/**
 * Identifies a version of a git repo containing a potential project
 */
export interface RepoRef extends RepoId {

    sha?: string;

    /**
     * Path from root, using / syntax. If undefined or the empty string, use the root of the repo.
     */
    path?: string;

}

/**
 * Identifies a git repo with a remote.
 * Also defines behavior for working with remote, such as
 * raising a pull request or equivalent
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

    createRemote(creds: ProjectOperationCredentials,
                 description: string,
                 visibility: "private" | "public"): Promise<ActionResult<this>>;

    /**
     * Configure the local remote based on information from remote
     * @param {ProjectOperationCredentials} credentials
     * @param {Configurable} configurable
     * @return {Promise<ActionResult<any>>}
     */
    setUserConfig(credentials: ProjectOperationCredentials,
                  configurable: Configurable): Promise<ActionResult<any>>;

    raisePullRequest(credentials: ProjectOperationCredentials,
                     title: string, body: string, head: string, base: string): Promise<ActionResult<this>>;

}

export function isRemoteRepoRef(r: RepoRef): r is RemoteRepoRef {
    const q = r as RemoteRepoRef;
    return !!q.setUserConfig;
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
