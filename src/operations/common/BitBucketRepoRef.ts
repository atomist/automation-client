import { ActionResult, successOn } from "../../action/ActionResult";
import { logger } from "../../internal/util/logger";
import { Configurable } from "../../project/git/Configurable";
import { AbstractRepoRef } from "./AbstractRemoteRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

import axios from "axios";
import stringify = require("json-stringify-safe");
import { encode } from "../../internal/util/base64";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";

export const BitBucketDotComBase = "https://bitbucket.org/api/2.0";

export class BitBucketRepoRef extends AbstractRepoRef {

    constructor(owner: string,
                repo: string,
                sha: string = "master",
                public apiBase = BitBucketDotComBase,
                path?: string) {
        super("bitbucket.org", owner, repo, sha, path);
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        if (!isBasicAuthCredentials(creds)) {
            throw new Error("Only basic credentials supported: " + stringify(creds));
        }
        return `https://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${this.remoteBase}/${this.pathComponent}.git`;
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        const url = `${this.apiBase}/repositories/${this.owner}/${this.repo}`;
        return axios.post(url, {
            scm: "git",
            is_private: visibility === "private",
        }, headers(creds))
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(error => {
                logger.error("Error attempting to create repository %j: %s", this, error);
                return Promise.resolve({
                    target: this,
                    success: false,
                    error,
                });
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.apiBase}/repositories/${this.owner}/${this.repo}`;
        logger.debug(`Making request to '${url}' to delete repo`);
        return axios.delete(url, headers(creds))
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(err => {
                logger.error("Error attempting to delete repository: " + err);
                return Promise.reject(err);
            });
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
        }, headers(credentials))
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

}

function headers(creds: ProjectOperationCredentials) {
    if (!isBasicAuthCredentials(creds)) {
        throw new Error("Only Basic auth supported: Had " + JSON.stringify(creds));
    }
    const upwd = `${creds.username}:${creds.password}`;
    const encoded = encode(upwd);
    return {
        headers: {
            Authorization: `Basic ${encoded}`,
        },
    };
}
