import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { configurationValue } from "../../configuration";

import { encode } from "../../internal/util/base64";
import { Configurable } from "../../project/git/Configurable";
import {
    DefaultHttpClientFactory,
    HttpClientFactory,
    HttpMethod,
} from "../../spi/http/httpClient";
import { logger } from "../../util/logger";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { ProviderType } from "./RepoId";

export const BitBucketDotComBase = "https://bitbucket.org/api/2.0";

export class BitBucketRepoRef extends AbstractRemoteRepoRef {

    public readonly kind = "bitbucket";

    constructor(owner: string,
                repo: string,
                sha?: string,
                public apiBase = BitBucketDotComBase,
                path?: string,
                branch?: string,
                remote?: string) {
        super(ProviderType.bitbucket_cloud, remote || "https://bitbucket.org", apiBase, owner, repo, sha, path, branch);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repositories/${this.owner}/${this.repo}`;

        logger.debug("Making request to BitBucket '%s' to create repo", url);
        return configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Post,
            headers: {
                "Content-Type": "application/json",
                ...headers(creds),
            },
            body: {
                scm: "git",
                is_private: visibility === "private",
            },
        })
            .then(response => {
                return {
                    target: this,
                    success: true,
                    response,
                };
            })
            .catch(error => {
                logger.error("Error attempting to create repository %j: %s", this, error);
                return {
                    target: this,
                    success: false,
                    error,
                };
            });

    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repositories/${this.owner}/${this.repo}`;
        logger.debug(`Making request to '${url}' to delete repo`);

        return configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Delete,
            headers: {
                ...headers(creds),
            },
        })
            .then(response => {
                return {
                    target: this,
                    success: true,
                    response,
                };
            })
            .catch(error => {
                logger.error("Error attempting to delete repository: " + error);
                return {
                    target: this,
                    success: false,
                    error,
                };
            });
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return Promise.resolve(successOn(this));
    }

    public raisePullRequest(creds: ProjectOperationCredentials,
                            title: string,
                            body: string,
                            head: string,
                            base: string): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repositories/${this.owner}/${this.repo}/pullrequests`;
        logger.debug(`Making request to '${url}' to raise PR`);

        return configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Post,
            headers: {
                "Content-Type": "application/json",
                ...headers(creds),
            },
            body: {
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
            },
        })
            .then(response => {
                return {
                    target: this,
                    success: true,
                    response,
                };
            })
            .catch(error => {
                logger.error(`Error attempting to raise PR. ${url} ${error}`);
                return {
                    target: this,
                    success: false,
                    error,
                };
            });
    }
}

function headers(creds: ProjectOperationCredentials): { Authorization: string } {
    if (!isBasicAuthCredentials(creds)) {
        throw new Error("Only Basic auth supported: Had " + JSON.stringify(creds));
    }
    const upwd = `${creds.username}:${creds.password}`;
    const encoded = encode(upwd);
    return {
        Authorization: `Basic ${encoded}`,
    };
}
