import * as url from "url";
import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { configurationValue } from "../../configuration";
import { Configurable } from "../../project/git/Configurable";
import {
    defaultHttpClientFactory,
    HttpClientFactory,
    HttpMethod,
    HttpResponse,
} from "../../spi/http/httpClient";
import { logger } from "../../util/logger";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { GitlabPrivateTokenCredentials } from "./GitlabPrivateTokenCredentials";
import { GitShaRegExp } from "./params/validationPatterns";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";
import {
    ProviderType,
    PullRequestReviewer,
    PullRequestReviewerType,
} from "./RepoId";

export const GitlabDotComApiBase = "https://gitlab.com/api/v4";
export const GitlabDotComRemoteUrl = "https://gitlab.com/";

/**
 * Repository reference implementation for Gitlab
 */
export class GitlabRepoRef extends AbstractRemoteRepoRef {

    public static from(params: {
        owner: string,
        repo: string,
        sha?: string,
        rawApiBase?: string,
        path?: string,
        gitlabRemoteUrl?: string,
        branch?: string,
    }): GitlabRepoRef {
        if (params.sha && !params.sha.match(GitShaRegExp.pattern)) {
            throw new Error("You provided an invalid SHA: " + params.sha);
        }
        return new GitlabRepoRef(params.owner, params.repo, params.sha, params.rawApiBase, params.gitlabRemoteUrl, params.path, params.branch);
    }

    public readonly kind: string = "gitlab";
    private constructor(owner: string,
                        repo: string,
                        sha: string,
                        apiBase: string = GitlabDotComApiBase,
                        gitlabRemoteUrl: string = GitlabDotComRemoteUrl,
                        path?: string,
                        branch?: string) {
        super(apiBase === GitlabDotComApiBase ? ProviderType.gitlab_com : ProviderType.gitlab_enterprise,
            gitlabRemoteUrl, apiBase, owner, repo, sha, path, branch);
    }

    public async createRemote(creds: ProjectOperationCredentials, description: string, visibility: string): Promise<ActionResult<this>> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/projects`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        const namespace = await this.getNamespaceForOwner(this.owner, creds);
        return httpClient.exchange(gitlabUrl, {
            method: HttpMethod.Post,
            body: {
                name: `${this.repo}`,
                visibility,
                namespace_id: namespace,
            },
            headers: {
                "Private-Token": (creds as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },

        }).then(response => {
            return {
                target: this,
                success: true,
                response,
            };
        }).catch(err => {
            logger.error(`Error attempting to create remote project, status code ${err.response.status}. ` +
                `The response was ${JSON.stringify(err.response.data)}`);
            return Promise.reject(err);
        });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/project/${this.owner}%2f${this.repo}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        logger.debug(`Making request to '${url}' to delete repo`);
        return httpClient.exchange(gitlabUrl, {
            method: HttpMethod.Delete,
            headers: {
                "Private-Token": (creds as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },
        }).then(response => {
            return {
                target: this,
                success: true,
                response,
            };
        }).catch(err => {
            logger.error("Error attempting to delete repository: " + err);
            return Promise.reject(err);
        });
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return Promise.resolve(successOn(this));
    }

    /**
     * Retrieve the Gitlab Server version
     *
     * @param {ProjectOperationCredentials} credentials
     * @returns {version: string, revision: string} Revision info
     */
    public async getGitlabVersion(credentials: ProjectOperationCredentials): Promise<{ version: string, revision: string }> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/version`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        logger.debug(`Making request to '${gitlabUrl}' to get Gitlab Version`);
        const result = await httpClient.exchange<{ version: string, revision: string }>(gitlabUrl, {
            method: HttpMethod.Get,
            headers: {
                "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },
        });
        return result.body;
    }

    /**
     * Retrieve the id of the supplied group
     * @param {ProjectOperationCredentials} credentials
     * @param {string} name
     * @returns {number} The id of the requested group
     */
    public async getGroupId(credentials: ProjectOperationCredentials, name: string): Promise<number> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/groups/${encodeURI(name)}?with_projects=false`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        try {
            const result = await httpClient.exchange<any>(gitlabUrl, {
                method: HttpMethod.Get,
                headers: {
                    "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                    "Content-Type": "application/json",
                },
                retry: {
                    retries: 1,
                },
            });
            return result.body.id;
        } catch (err) {
            if (err.response.status === 404) {
                throw new Error(`Failed to resolve ID for group ${name}.  Does it exist?`);
            } else {
                throw err;
            }
        }
    }

    /**
     * Retrieve the id of the supplied user
     * @param {ProjectOperationCredentials} credentials
     * @param {string} name
     * @returns {number} The id of the user
     */
    public async getUserId(credentials: ProjectOperationCredentials, name: string): Promise<number> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/users?username=${encodeURI(name)}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        const result = await httpClient.exchange<any>(gitlabUrl, {
            method: HttpMethod.Get,
            headers: {
                "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },
        });
        if (result.body === undefined || Array.isArray(result.body) && result.body.length === 0) {
            throw new Error(`Failed retrieve Gitlab user id for ${name}; does user exist?`);
        }
        return result.body[0].id;
    }

    /**
     * Convert reviewers from names to ids
     *
     * @param {ProjectOperationCredentials} credentials
     * @param {PullRequestReviewer[]} reviewers
     * @returns {users: number[], groups: number[]} The user and group ids requested for MR approval
     */
    private async resolveApprovers(credentials: ProjectOperationCredentials,
                                   reviewers: PullRequestReviewer[]): Promise<{ users: number[], groups: number[] }> {

        let userIds: number[];
        let groupIds: number[];
        try {
            userIds = await Promise.all(
                reviewers.filter(r => r.type === PullRequestReviewerType.individual).map(async i => this.getUserId(credentials, i.name)));
        } catch (err) {
            throw new Error(`Couldn't resolve ID(s) for supplied Merge Request approval users. ` + err);
        }

        try {
            groupIds = await Promise.all(
                reviewers.filter(r => r.type === PullRequestReviewerType.team).map(async g => this.getGroupId(credentials, g.name)));
        } catch (err) {
            throw new Error(`Couldn't resolve ID(s) for supplied Merge Request approval groups. ` + err);
        }
        return { users: userIds, groups: groupIds };
    }

    /**
     * Add Approvers to Merge Request
     *
     * @param {ProjectOperationCredentials} credentials
     * @param {PullRequestReviewer[]} reviewers
     * @param {number} mrNumber The iid of the merge request
     * @param {number} projectId The project id in Gitlab
     */
    public async addApproversToMergeRequest(credentials: ProjectOperationCredentials,
                                            reviewers: PullRequestReviewer[],
                                            mrNumber: number,
                                            projectId: number): Promise<void> {
        const gitlabVersion = await this.getGitlabVersion(credentials);
        const versionDetails = gitlabVersion.version.split(".").map(v => parseInt(v, undefined));
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(`${this.scheme}${this.apiBase}`);

        if (versionDetails[0] < 10 || (versionDetails[0] === 10 && versionDetails[1] < 6)) {
            /**
             * For versions less then 10.6 there is no support for this
             */
            throw new Error(`Cannot set merge request approvers, Gitlab version ${gitlabVersion.version} not supported!`);
        } else if (versionDetails[0] < 12 || (versionDetails[0] === 12 && versionDetails[1] < 3)) {
            /**
             * For Gitlab versions less then 12.3, use PUT /projects/:id/merge_requests/:merge_request_iid/approvers API
             */
            // Set the approvers
            const gitlabUrl = `${this.scheme}${this.apiBase}/projects/${projectId}/merge_requests/${mrNumber}/approvers`;
            const approvers = await this.resolveApprovers(credentials, reviewers);
            await httpClient.exchange<any>(gitlabUrl, {
                method: HttpMethod.Put,
                body: {
                    id: projectId,
                    iid: mrNumber,
                    approver_ids: approvers.users,
                    approver_group_ids: approvers.groups,
                },
                headers: {
                    "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                    "Content-Type": "application/json",
                },
            });

            // Set the required approvals equal to the requested reviewers/groups
            const gitlabApprovalUrl = `${this.scheme}${this.apiBase}/projects/${projectId}/merge_requests/${mrNumber}/approvals`;
            await httpClient.exchange<any>(gitlabApprovalUrl, {
                method: HttpMethod.Post,
                body: {
                    id: projectId,
                    iid: mrNumber,
                    approvals_required: approvers.groups.length + approvers.users.length,
                },
                headers: {
                    "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                    "Content-Type": "application/json",
                },
            });
        } else {
            /**
             * For Gitlab version 12.3 or higher, use POST /projects/:id/merge_requests/:merge_request_iid/approval_rules
             *
             * Note: This will override the project level rule(s)!
             */
            const gitlabUrl = `${this.scheme}${this.apiBase}/projects/${projectId}/merge_requests/${mrNumber}/approval_rules`;
            const approvers = await this.resolveApprovers(credentials, reviewers);
            await httpClient.exchange<any>(gitlabUrl, {
                method: HttpMethod.Post,
                body: {
                    id: projectId,
                    merge_request_iid: mrNumber,
                    name: `Atomist Generated Rule`,
                    approvals_required: approvers.groups.length + approvers.users.length,
                    user_ids: approvers.users,
                    group_ids: approvers.groups,
                },
                headers: {
                    "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                    "Content-Type": "application/json",
                },
            });
        }
    }

    public async raisePullRequest(
        credentials: ProjectOperationCredentials,
        title: string,
        body: string,
        head: string,
        base: string,
        reviewers?: PullRequestReviewer[],
    ): Promise<ActionResult<this>> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/projects/${this.owner}%2f${this.repo}/merge_requests`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        logger.debug(`Making request to '${gitlabUrl}' to raise PR`);

        let response: HttpResponse<any>;
        try {
            response = await httpClient.exchange<any>(gitlabUrl, {
                method: HttpMethod.Post,
                body: {
                    id: `${this.owner}%2f${this.repo}`,
                    title,
                    description: body,
                    source_branch: head,
                    target_branch: base,
                },
                headers: {
                    "Private-Token": (credentials as GitlabPrivateTokenCredentials).privateToken,
                    "Content-Type": "application/json",
                },
            });
        } catch (err) {
            throw new Error(`Failed to raise PR, status code ${err.response.status}. ` +
                `The response was ${JSON.stringify(err.response.data)}`);
        }

        if (reviewers) {
            try {
                await this.addApproversToMergeRequest(credentials, reviewers, response.body.iid, response.body.project_id);
            } catch (err) {
                throw new Error(`Failed to add reviewers to Merge Request: ${err.message}`);
            }
        }

        return {
            target: this,
            success: true,
        };
    }

    private getNamespaceForOwner(owner: string, creds: ProjectOperationCredentials): Promise<number> {
        const gitlabUrl = `${this.scheme}${this.apiBase}/namespaces?search=${encodeURI(owner)}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory()).create(gitlabUrl);
        return httpClient.exchange(gitlabUrl, {
            method: HttpMethod.Get,
            headers: {
                "Private-Token": (creds as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },
        }).then(response => {
            const namespaces = response.body as any[];
            const ownerNamespace = namespaces.filter(n => n.name === owner)[0];
            if (!!ownerNamespace) {
                return ownerNamespace.id;
            } else {
                return Promise.reject("Cannot find Gitlab namespace with name " + owner);
            }
        });
    }
}
