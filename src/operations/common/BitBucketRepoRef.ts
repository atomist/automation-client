import { ActionResult, successOn } from "../../action/ActionResult";
import { logger } from "../../internal/util/logger";
import { Configurable } from "../../project/git/Configurable";
import { AbstractRepoRef } from "./AbstractRemoteRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

import axios from "axios";
import { encode } from "../../internal/util/base64";

export const BitBucketDotComBase = "https://bitbucket.org/api/2.0";

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

    public raisePullRequest(credentials: ProjectOperationCredentials,
                            title: string, body: string, head: string, base: string): Promise<ActionResult<this>> {
        const url = `${this.apiBase}/repositories/${this.owner}/${this.repo}/pullrequests`;
        logger.debug(`Making request to '${url}' to raise PR`);
        return axios.post(url, {
            title,
            description: body,
            source: {
                branch: {
                    name: head,
                },
            },
            destination: {
                branch: {
                    name: base,
                },
            },
        }, this.headers(credentials))
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(err => {
                logger.error("Error attempting to raise PR: " + err);
                return Promise.reject(err);
            });
    }

    private headers(credentials: ProjectOperationCredentials) {
        const upwd = `${this.owner}:${credentials.token}`;
        const encoded = encode(upwd);
        return {
            headers: {
                Authorization: `Basic ${encoded}`,
            },
        };
    }
}
