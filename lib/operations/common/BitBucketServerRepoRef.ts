import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { configurationValue } from "../../configuration";
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

/**
 * RemoteRepoRef implementation for BitBucket server (not BitBucket Cloud)
 */
export class BitBucketServerRepoRef extends AbstractRemoteRepoRef {

    public readonly ownerType: "projects" | "users";

    public readonly kind = "bitbucketserver";

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
        return configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Post,
            body: data,
            headers: {
                "Content-Type": "application/json",
                ...usernameColonPassword(creds),
            },
        })
            .then(response => ({
                success: true,
                target: this,
                response,
            }))
            .catch(error => {
                logger.error("Error attempting to create repository %j: %s", this, error);
                return {
                    success: false,
                    target: this,
                    error,
                };
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}`;
        logger.debug(`Making request to '${url}' to delete repo`);

        return configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Delete,
            headers: {
                ...usernameColonPassword(creds),
            },
        })
            .then(response => ({
                success: true,
                target: this,
                response,
            }))
            .catch(error => {
                logger.error(`Error attempting to delete repository: ${error}`);
                return {
                    success: false,
                    target: this,
                    error,
                };
            });
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<this>> {
        return Promise.resolve(successOn(this));
    }

    public raisePullRequest(creds: ProjectOperationCredentials,
                            title: string,
                            body: string,
                            head: string,
                            base: string): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}/pull-requests`;
        logger.debug(`Making request to '${url}' to raise PR`);

        const data = {
            title,
            description: body,
            fromRef: {
                id: head,
            },
            toRef: {
                id: base,
            },
        };

        return configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Post,
            body: data,
            headers: {
                "Content-Type": "application/json",
                ...usernameColonPassword(creds),
            },
        })
            .then(response => ({
                success: true,
                target: this,
                response,
            }))
            .catch(error => {
                logger.error(`Error attempting to raise PR`);
                return {
                    success: false,
                    target: this,
                    error,
                };
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

function usernameColonPassword(creds: ProjectOperationCredentials): { Authorization: string } | {} {
    if (isBasicAuthCredentials(creds)) {
        return {
            Authorization: `Basic ${Buffer.from(creds.username + ":" + creds.password).toString("base64")}`,
        };
    } else {
        return {};
    }
}

function noTrailingSlash(s: string): string {
    return s.replace(/\/$/, "");
}
