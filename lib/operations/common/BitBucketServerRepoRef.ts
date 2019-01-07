/*
 * Copyright © 2018 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import axios from "axios";
import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { encode } from "../../internal/util/base64";
import { Configurable } from "../../project/git/Configurable";
import { execPromise } from "../../util/child_process";
import { logger } from "../../util/logger";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { ProviderType } from "./RepoId";

/**
 * RemoteRepoRef implementation for BitBucket server (not BitBucket Cloud)
 */
export class BitBucketServerRepoRef extends AbstractRemoteRepoRef {

    public readonly ownerType: "projects" | "users";

    public readonly kind = "bitbucketserver";

    private httpStrategy = process.env.ATOMIST_CURL_FOR_BITBUCKET ? CurlHttpStrategy : AxiosHttpStrategy;

    /**
     * Construct a new BitBucketServerRepoRef
     * @param {string} remoteBase remote base, including scheme
     * @param {string} owner
     * @param {string} repo
     * @param {boolean} isProject
     * @param {string} sha
     * @param {string} path
     */
    constructor(remoteBase: string,
                owner: string,
                repo: string,
                private readonly isProject: boolean = true,
                sha?: string,
                path?: string) {
        super(ProviderType.bitbucket, remoteBase, noTrailingSlash(remoteBase) + "/rest/api/1.0/", owner, repo, sha, path);
        this.ownerType = isProject ? "projects" : "users";
        logger.info("Constructed BitBucketServerRepoRef: %j", this);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiBasePathComponent}`;
        const data = {
            name: this.repo,
            scmId: "git",
            forkable: "true",
        };
        logger.info("Making request to BitBucket '%s' to create repo, data=%j", url, data);
        return this.httpStrategy.doPost(this, creds, url, data).catch(error => {
            logger.error("Error attempting to create repository %j: %s", this, error);
            return Promise.reject(error);
        });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}`;
        logger.debug(`Making request to '${url}' to delete repo`);
        return this.httpStrategy.doDelete(this, creds, url).catch(err => {
            logger.error(`Error attempting to delete repository: ${err}`);
            return Promise.reject(err);
        });
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<this>> {
        return Promise.resolve(successOn(this));
    }

    public raisePullRequest(credentials: ProjectOperationCredentials,
                            title: string, body: string, head: string, base: string): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}/pull-requests`;
        logger.debug(`Making request to '${url}' to raise PR`);
        return this.httpStrategy.doPost(this, credentials, url, {
            title,
            description: body,
            fromRef: {
                id: head,
            },
            toRef: {
                id: base,
            },
        }).catch(err => {
            logger.error(`Error attempting to raise PR. url: ${url}  ${err}`);
            return Promise.reject(err);
        });
    }

    get url() {
        let url: string = `projects/${this.owner}/repos`;
        if (!this.isProject) {
            url = `users/${this.owner}/repos`;
        }
        return `${this.scheme}${this.remoteBase}/${url}/${this.repo}`;
    }

    get pathComponent(): string {
        return `scm/${this.maybeTilde}${this.owner}/${this.repo}`;
    }

    private get maybeTilde() {
        return this.isProject ? "" : "~";
    }

    private get apiBasePathComponent(): string {
        return `projects/${this.maybeTilde}${this.owner}/repos/`;
    }

    get apiPathComponent(): string {
        return this.apiBasePathComponent + this.repo;
    }

}

interface HttpPostResult<T> {
    target: T;
    success: boolean;
    fullResponse: any;
}

interface HttpStrategy {
    doPost<T>(target: T, creds: ProjectOperationCredentials, url: string, data: any): Promise<HttpPostResult<T>>;

    doDelete<T>(target: T, creds: ProjectOperationCredentials, url: string): Promise<HttpPostResult<T>>;
}

const AxiosHttpStrategy: HttpStrategy = {
    doPost<T>(target: T, creds: ProjectOperationCredentials, url: string, data: any): Promise<HttpPostResult<T>> {
        return axios.post(url, data, headers(creds))
            .then(fullResponse => {
                return {
                    target,
                    success: true,
                    fullResponse,
                };
            });
    },

    doDelete<T>(target: T, creds: ProjectOperationCredentials, url: string): Promise<HttpPostResult<T>> {
        return axios.delete(url, headers(creds))
            .then(fullResponse => {
                return {
                    target,
                    success: true,
                    fullResponse,
                };
            });
    },
};

const CurlHttpStrategy: HttpStrategy = {
    async doPost<T>(target: T, creds: ProjectOperationCredentials, url: string, data: any): Promise<HttpPostResult<T>> {
        try {
            const result = await execPromise("curl", [
                "-u", usernameColonPassword(creds),
                "-X", "POST",
                "-H", "Content-Type: application/json",
                "-d", JSON.stringify(data),
                url,
            ]);
            return {
                target,
                success: true,
                fullResponse: result,
            };
        } catch (e) {
            return {
                target,
                success: false,
                fullResponse: e,
            };
        }
    },

    doDelete<T>(target: T, creds: ProjectOperationCredentials, url: string): Promise<HttpPostResult<T>> {
        throw new Error("Not implemented");
    },
};

function usernameColonPassword(creds: ProjectOperationCredentials): string {
    if (!isBasicAuthCredentials(creds)) {
        throw new Error("Only Basic auth supported: Had " + JSON.stringify(creds));
    }
    return `${creds.username}:${creds.password}`;
}

function headers(creds: ProjectOperationCredentials) {
    const encoded = encode(usernameColonPassword(creds));
    return {
        headers: {
            Authorization: `Basic ${encoded}`,
        },
    };
}

function noTrailingSlash(s: string): string {
    return s.replace(/\/$/, "");
}
