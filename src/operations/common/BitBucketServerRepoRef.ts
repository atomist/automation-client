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

import { ActionResult, successOn } from "../../action/ActionResult";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { ProviderType } from "./RepoId";

import axios from "axios";
import { encode } from "../../internal/util/base64";
import { logger } from "../../internal/util/logger";
import { Configurable } from "../../project/git/Configurable";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";

/**
 * RemoteRepoRef implementation for BitBucket server (not BitBucket Cloud)
 *
 * This should ultimately move to automation-client-ts
 */
export class BitBucketServerRepoRef extends AbstractRemoteRepoRef {

    public readonly ownerType: "projects" | "users";

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
        const hdrs = headers(creds);
        logger.info("Making request to BitBucket '%s' to create repo, data=%j, headers=%j", url, data, hdrs);
        return axios.post(url, data, hdrs)
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(error => {
                logger.error("Error attempting to create repository %j: %s", this, error);
                return Promise.reject(error);
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}`;
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
        return axios.post(url, {
            title,
            description: body,
            fromRef: {
                id: head,
            },
            toRef: {
                id: base,
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
                logger.error(`Error attempting to raise PR: ${err}`);
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

function noTrailingSlash(s: string): string {
    return s.replace(/\/$/, "");
}
