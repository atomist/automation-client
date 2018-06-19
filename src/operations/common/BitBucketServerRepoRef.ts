/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from "axios";
import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { encode } from "../../internal/util/base64";
import { logger } from "../../internal/util/logger";
import { Configurable } from "../../project/git/Configurable";
import { spawnAndWatch, WritableLog } from "../../util/spawned";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { ProviderType } from "./RepoId";

/**
 * RemoteRepoRef implementation for BitBucket server (not BitBucket Cloud)
 */
export class BitBucketServerRepoRef extends AbstractRemoteRepoRef {

    public readonly ownerType: "projects" | "users";

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
                sha: string = "master",
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

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
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
    doPost<T>(target: T, creds: ProjectOperationCredentials, url: string, data: any): Promise<HttpPostResult<T>> {
        const passthroughLog: WritableLog = {
            write(str: string) {
                logger.info(str);
            },
        };
        return spawnAndWatch({
            command: "curl", args: [
                "-u", usernameColonPassword(creds),
                "-X", "POST",
                "-H", "Content-Type: application/json",
                "-d", JSON.stringify(data),
                url,
            ],
        }, {}, passthroughLog)
            .then(fullResponse => {
                return {
                    target,
                    success: true,
                    fullResponse,
                };
            });
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
