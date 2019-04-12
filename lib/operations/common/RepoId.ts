import { ActionResult } from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

/**
 * Identifies a git repo
 */
export interface RepoId {

    owner: string;

    repo: string;

    /**
     * Entire url of the repo. Can be a file URL if this is local.
     */
    url: string;

}

export class SimpleRepoId implements RepoId {

    constructor(public readonly owner: string,
                public readonly repo: string,
                public readonly url: string = `${owner}/${repo}`) {
    }
}

/**
 * Identifies a version of a git repo containing a potential project
 */
export interface RepoRef extends RepoId {

    /*
     * Might contain a sha, might contain a ref (for backwards compatibility)
     * Providing a sha here and a branch in `branch` instead is encouraged.
     */
    sha?: string;

    /**
     * Path from root, using / syntax. If undefined or the empty string, use the root of the repo.
     */
    path?: string;

    /*
     * If this is populated, then `sha` should contain a sha (it may also contain the same branch name, for backwards compatibility)
     */
    branch?: string;

}

/**
 * Supported SCM providers.
 */
export enum ProviderType {
    /** BitBucket server instances, maps to [[BitBucketServerRepoRef]] */
    bitbucket,
    /** Atlassian-hosted BitBucket cloud, maps to [[BitBucketRepoRef]] */
    bitbucket_cloud,
    /** GitHub.com, maps to [[GitHubRepoRef]] */
    github_com,
    /** GitHub Enterprise, maps to [[GitHubRepoRef]] */
    ghe,
    /** Gitlab.com, maps to [[GitlabRepoRef]] */
    gitlab_com,
    /** Gitlab Enterprise, maps to [[GitlabRepoRef]] */
    gitlab_enterprise,
}

/**
 * Identifies a git repo with a remote.
 * Also defines behavior for working with remote, such as
 * raising a pull request or equivalent
 */
export interface RemoteRepoRef extends RepoRef {

    /** @deprecated use providerType */
    readonly kind: string;
    /** Base root remote clone */
    readonly remoteBase: string;
    /** SCM provider of remote repo */
    readonly providerType: ProviderType;

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

    deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>>;

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
