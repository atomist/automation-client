import { ActionResult, successOn } from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { AbstractRepoRef } from "./AbstractRemoteRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RepoRef } from "./RepoId";

export const BitBucketDotComBase = "https://api.github.com";

export interface BitBucketCredentials extends ProjectOperationCredentials {

    basic: boolean;
}

export function isBitBucketCredentials(o: any): o is BitBucketCredentials {
    const c = o as BitBucketCredentials;
    return c.basic !== undefined;
}

/**
 * GitHub repo ref
 */
export class BitBucketRepoRef extends AbstractRepoRef {

    constructor(owner: string,
                repo: string,
                sha: string = "master",
                public apiBase = BitBucketDotComBase,
                path?: string) {
        super("bitbucket.org", owner, repo, sha, path);
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        if (!isBitBucketCredentials(creds)) {
            throw new Error("Not BitBucket credentials: " + JSON.stringify(creds));
        }
        return `https://${this.owner}:${creds.token}@${this.remoteBase}/${this.pathComponent}.git`;
    }

    public create(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        throw new Error("Not implemented");
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return Promise.resolve(successOn(this));
    }

    public raisePullRequest(creds: ProjectOperationCredentials,
                            title: string, body: string, head: string, base: string): Promise<ActionResult<this>> {
        throw new Error("Not implemented");
    }
}

export function isBitBucketRepoRef(rr: RepoRef): rr is BitBucketRepoRef {
    const maybe = rr as BitBucketRepoRef;
    return maybe && !!maybe.apiBase;
}
