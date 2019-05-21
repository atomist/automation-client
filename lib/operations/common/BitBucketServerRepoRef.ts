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

    public readonly kind: string = "bitbucketserver";

    /**
     * Construct a new BitBucketServerRepoRef
     * @param {string} remoteBase remote base, including scheme
     * @param {string} owner
     * @param {string} repo
     * @param {boolean} isProject
     * @param {string} sha
     * @param {string} path
     * @param {string} branch
     * @param {string}apiUrl
     */
    constructor(remoteBase: string,
                owner: string,
                repo: string,
                private readonly isProject: boolean = true,
                sha?: string,
                path?: string,
                branch?: string,
                apiUrl?: string) {
        super(ProviderType.bitbucket, remoteBase, apiUrl || `${noTrailingSlash(remoteBase)}/rest/api/1.0/`, owner, repo, sha, path, branch);
        this.ownerType = isProject ? "projects" : "users";
        logger.info("Constructed BitBucketServerRepoRef: %j", this);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility: any): Promise<ActionResult<this>> {
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

    public async raisePullRequest(creds: ProjectOperationCredentials,
                                  title: string,
                                  body: string,
                                  head: string,
                                  base: string): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}/pull-requests`;
        logger.debug(`Making request to '${url}' to raise PR`);
        const repoId = await this.getRepoId(creds);
        const reviewers = await this.getDefaultReviewers(creds, repoId, head, base);
        const data = {
            title,
            description: body,
            fromRef: {
                id: head,
            },
            toRef: {
                id: base,
            },
            reviewers: reviewers.map(r => { return {
                    user: {
                        name: r,
                    },
                };
            }),
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

    private async getDefaultReviewers(creds: ProjectOperationCredentials, repoId: number, head: string, base: string): Promise<string[]> {
        const url = `${noTrailingSlash(this.remoteBase)}/rest/default-reviewers/1.0/projects/${this.apiBasePathComponent}${this.repo}/reviewers`;
        const queryParams = `sourceRepoId=${repoId}&targetRepoId=${repoId}&sourceRefId=${head}&targetRefId=${base}`;

        const apiResponse = await configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory)
            .create(`${url}?${queryParams}`).exchange(url, {
            method: HttpMethod.Get,
            headers: {
                Accept: "application/json",
                ...usernameColonPassword(creds),
            },
        })
            .then(response => ({
                success: true,
                target: this,
                response,
            }))
            .catch(error => {
                logger.error(`Error trying to get repository id`);
                return {
                    success: false,
                    target: this,
                    error,
                };
            });
        if (apiResponse.success) {
            return ((apiResponse as any).response as any[]).map(reviewer => reviewer.name as string);
        } else {
            return Promise.reject((apiResponse as any).error);
        }

    }

    private async getRepoId(creds: ProjectOperationCredentials): Promise<number> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}`;
        const apiResponse =  await configurationValue<HttpClientFactory>("http.client.factory", DefaultHttpClientFactory).create(url).exchange(url, {
            method: HttpMethod.Get,
            headers: {
                Accept: "application/json",
                ...usernameColonPassword(creds),
            },
        })
            .then(response => ({
                success: true,
                target: this,
                response,
            }))
            .catch(error => {
                logger.error(`Error trying to get repository id`);
                return {
                    success: false,
                    target: this,
                    error,
                };
            });
        if (apiResponse.success) {
            return (apiResponse as any).response.id;
        } else {
            return Promise.reject((apiResponse as any).error);
        }
    }

    get url(): string {
        return `${this.scheme}${this.remoteBase}/${this.ownerType}/${this.owner}/repos/${this.repo}`;
    }

    get pathComponent(): string {
        return `scm/${this.maybeTilde}${this.owner}/${this.repo}`;
    }

    private get maybeTilde(): string {
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
