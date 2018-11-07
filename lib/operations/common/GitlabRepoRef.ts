import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { DefaultHttpClientFactory } from "../../spi/http/axiosHttpClient";
import { HttpMethod } from "../../spi/http/httpClient";
import { logger } from "../../util/logger";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { GitlabPrivateTokenCredentials } from "./GitlabPrivateTokenCredentials";
import { GitShaRegExp } from "./params/validationPatterns";
import { ProjectOperationCredentials, } from "./ProjectOperationCredentials";
import { ProviderType } from "./RepoId";
import * as path from "path";
import * as url from "url";

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
        const result = new GitlabRepoRef(params.owner, params.repo, params.sha, params.rawApiBase, params.gitlabRemoteUrl, params.path);
        result.branch = params.branch;
        return result;
    }

    private constructor(owner: string,
                        repo: string,
                        sha: string,
                        public apiBase = GitlabDotComApiBase,
                        gitlabRemoteUrl: string = GitlabDotComRemoteUrl,
                        path?: string) {
        super(apiBase === GitlabDotComApiBase ? ProviderType.gitlab_com : ProviderType.gitlab_enterprise,
            gitlabRemoteUrl,
            apiBase,
            owner,
            repo,
            sha,
            path);
    }

    public async createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        const gitlabUrl = url.resolve(this.apiBase, `/projects`);
        const httpClient = DefaultHttpClientFactory.create();
        return httpClient.exchange(gitlabUrl, {
            method: HttpMethod.Post,
            body: {
                name: `${this.repo}`,
                visibility,
            },
            headers: {
                "Private-Token": (creds as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },

        }).then(axiosResponse => {
            return {
                target: this,
                success: true,
                axiosResponse,
            };
        })
            .catch(err => {
                logger.error(`Error attempting to raise PR. ${url} ${err}`);
                return Promise.reject(err);
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const httpClient = DefaultHttpClientFactory.create();
        path.join()
        const gitlabUrl = url.resolve(this.apiBase, `/project/${this.owner}%2f${this.repo}`);
        logger.debug(`Making request to '${url}' to delete repo`);
        return httpClient.exchange(gitlabUrl, {
            method: HttpMethod.Delete,
            headers: {
                "Private-Token": (creds as GitlabPrivateTokenCredentials).privateToken,
                "Content-Type": "application/json",
            },
        }).then(axiosResponse => {
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
        const httpClient = DefaultHttpClientFactory.create();
        const gitlabUrl = url.resolve(this.apiBase, `/projects/${this.owner}%2f${this.repo}/merge_requests`);
        logger.debug(`Making request to '${url}' to raise PR`);
        return httpClient.exchange(gitlabUrl, {
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
        }).then(axiosResponse => {
            return {
                target: this,
                success: true,
                axiosResponse,
            };
        })
            .catch(err => {
                logger.error(`Error attempting to raise PR. ${url} ${err}`);
                return Promise.reject(err);
            });
    }
}
