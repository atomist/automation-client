import {ActionResult, successOn} from "../../action/ActionResult";
import {configurationValue} from "../../configuration";
import {Configurable} from "../../project/git/Configurable";
import {defaultHttpClientFactory, HttpClientFactory, HttpMethod} from "../../spi/http/httpClient";
import {logger} from "../../util/logger";
import {AbstractRemoteRepoRef} from "./AbstractRemoteRepoRef";
import {isBasicAuthCredentials} from "./BasicAuthCredentials";
import {ProjectOperationCredentials} from "./ProjectOperationCredentials";
import {ProviderType, PullRequestReviewerType} from "./RepoId";

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
        logger.debug("Constructed BitBucketServerRepoRef: %j", this);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility: any): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiBasePathComponent}`;
        const data = {
            name: this.repo,
            scmId: "git",
            forkable: "true",
        };

        logger.debug("Making request to BitBucket '%s' to create repo, data=%j", url, data);
        return configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(url).exchange(url, {
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

        return configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(url).exchange(url, {
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
                                  base: string,
                                  reviewers?: Array<{type: Exclude<PullRequestReviewerType, PullRequestReviewerType.team>, name: string}>,
    ): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}/pull-requests`;
        logger.debug(`Making request to '${url}' to raise PR`);
        const repoId = await this.getRepoId(creds);

        // Figure out reviewers
        const allReviewers = await this.getDefaultReviewers(creds, repoId, head, base);
        if (reviewers) {
            if (reviewers.every(r => r.type !== PullRequestReviewerType.individual)) {
                throw new Error(`Bitbucket only supports reviewer type of individual!  Found ` +
                    JSON.stringify([...new Set(reviewers.map(r => PullRequestReviewerType[r.type]))]));
            }
            const ids = reviewers.filter(r => r.type === PullRequestReviewerType.individual).map(fr => fr.name);
            allReviewers.push(...ids);
        }

        // Build payload
        const data = {
            title,
            description: body,
            fromRef: {
                id: head,
            },
            toRef: {
                id: base,
            },
            reviewers: allReviewers.map(r => { return {
                    user: {
                        name: r,
                    },
                };
            }),
        };

        return configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(url).exchange(url, {
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

    protected async getDefaultReviewers(creds: ProjectOperationCredentials, repoId: number, head: string, base: string): Promise<string[]> {
        const restApiPath = `/rest/default-reviewers/1.0/${this.apiBasePathComponent}${this.repo}/reviewers`;
        const url = `${this.scheme}${noTrailingSlash(this.remoteBase)}${restApiPath}`;
        const queryParams = `sourceRepoId=${repoId}&targetRepoId=${repoId}&sourceRefId=${head}&targetRefId=${base}`;

        const urlWithQueryParams = `${url}?${queryParams}`;
        const apiResponse = await configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(url).exchange(urlWithQueryParams, {
            method: HttpMethod.Get,
            headers: {
                ...usernameColonPassword(creds),
            },
        });
        return ((apiResponse as any).body as any[]).map(reviewer => reviewer.name as string);
    }

    private async getRepoId(creds: ProjectOperationCredentials): Promise<number> {
        const url = `${this.scheme}${this.apiBase}/${this.apiPathComponent}`;
        const apiResponse = await configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(url).exchange(url, {
            method: HttpMethod.Get,
            headers: {
                ...usernameColonPassword(creds),
            },
        });
        return (apiResponse as any).body.id;
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
