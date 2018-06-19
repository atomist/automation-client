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

import { ActionResult } from "../../action/ActionResult";
import { isBasicAuthCredentials } from "../../operations/common/BasicAuthCredentials";
import { Configurable } from "../../project/git/Configurable";
import {
    isTokenCredentials,
    ProjectOperationCredentials,
} from "./ProjectOperationCredentials";
import {
    ProviderType,
    RemoteRepoRef,
} from "./RepoId";

/**
 * Superclass for RemoteRepoRef implementations.
 * Handles parsing remote base
 *
 * This should ultimately move down to automation-client-ts and replace AbstractRepoRef.
 */
export abstract class AbstractRemoteRepoRef implements RemoteRepoRef {

    public branch?: string;

    public readonly scheme: "http://" | "https://";

    public readonly apiBase: string;

    /**
     * Remote url not including scheme or trailing /
     */
    public readonly remoteBase: string;

    /**
     * Construct a new RemoteRepoRef
     * @param {ProviderType} providerType
     * @param {string} rawRemote remote url, like for cloning or linking into the repo. Should start with a scheme.
     * May have a trailing slash, which will be stripped
     * @param rawApiBase raw API base url. Should start with a scheme.
     * May have a trailing slash, which will be stripped
     * @param {string} owner
     * @param {string} repo
     * @param {string} sha
     * @param {string} path
     */
    protected constructor(public readonly providerType: ProviderType,
                          rawRemote: string,
                          rawApiBase: string,
                          public readonly owner: string,
                          public readonly repo: string,
                          public readonly sha: string = "master",
                          public readonly path?: string) {
        const [remoteScheme, remoteBase] = splitSchemeFromUrl(rawRemote);
        const [apiScheme, apiBase] = splitSchemeFromUrl(rawApiBase);
        if (apiScheme !== remoteScheme) { // that's confusing, don't handle it
            throw new Error(`Scheme is different between remoteBase ${rawRemote} and apiBase ${rawApiBase}`);
        }
        this.apiBase = apiBase;
        this.scheme = remoteScheme;
        this.remoteBase = remoteBase;
    }

    get url() {
        return `${this.scheme}${this.remoteBase}/${this.owner}/${this.repo}`;
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        if (isBasicAuthCredentials(creds)) {
            return `${this.scheme}${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@` +
                `${this.remoteBase}/${this.pathComponent}.git`;
        }
        if (!isTokenCredentials(creds)) {
            throw new Error("Only token or basic auth supported");
        }
        return `${this.scheme}${creds.token}:x-oauth-basic@${this.remoteBase}/${this.pathComponent}.git`;
    }

    get pathComponent(): string {
        return this.owner + "/" + this.repo;
    }

    public abstract createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>>;

    public abstract setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>>;

    public abstract raisePullRequest(creds: ProjectOperationCredentials,
                                     title: string, body: string, head: string, base: string): Promise<ActionResult<this>>;

    public abstract deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>>;
}

function splitSchemeFromUrl(urlWithSchemeAndPossibleTrailingSlash: string): ["http://" | "https://", string] {
    if (!urlWithSchemeAndPossibleTrailingSlash.startsWith("http")) {
        throw new Error(`This URL needs to start with http or https: '${urlWithSchemeAndPossibleTrailingSlash}'`);
    }
    const scheme = urlWithSchemeAndPossibleTrailingSlash.startsWith("http://") ? "http://" : "https://";
    const base = urlWithSchemeAndPossibleTrailingSlash.substr(scheme.length).replace(/\/$/, "");
    return [scheme, base];
}
