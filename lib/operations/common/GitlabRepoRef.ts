import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { DefaultHttpClientFactory } from "../../spi/http/axiosHttpClient";
import { HttpMethod } from "../../spi/http/httpClient";
import { logger } from "../../util/logger";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import {
    ProjectOperationCredentials,
    TokenCredentials,
} from "./ProjectOperationCredentials";
import { ProviderType } from "./RepoId";

export const GitlabDotComBase = "https://gitlab.com/api/v4";
export const GitlabRemoteUrl = "https://gitlab.com/";

export class GitlabRepoRef extends AbstractRemoteRepoRef {

    constructor(owner: string,
                repo: string,
                sha: string = "master",
                public apiBase = GitlabDotComBase,
                gitlabRemoteUrl: string = GitlabRemoteUrl,
                path?: string) {
        super(apiBase === GitlabDotComBase ? ProviderType.gitlab_com : ProviderType.gitlab_enterprise,
            gitlabRemoteUrl,
            apiBase,
            owner,
            repo,
            sha,
            path);
    }

    public async createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        const url = `${this.apiBase}/projects`;
        const httpClient = DefaultHttpClientFactory.create();
        return httpClient.exchange(url, {
            method: HttpMethod.Post,
            body: {
                scm: "git",
                is_private: visibility === "private",
            },
            headers: {
                private_token: (creds as TokenCredentials).token,
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
        const url = `${this.apiBase}/project/${this.owner}%2f${this.repo}`;
        logger.debug(`Making request to '${url}' to delete repo`);
        return httpClient.exchange(url, {
            method: HttpMethod.Delete,
            headers: {
                private_token: (creds as TokenCredentials).token,
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
        const url = `${this.scheme}${this.apiBase}/projects/${this.owner}%2f${this.repo}/merge_requests`;
        logger.debug(`Making request to '${url}' to raise PR`);
        return httpClient.exchange(url, {
            body: {
                id: `${this.owner}%2f${this.repo}`,
                title,
                description: body,
                source_branch: head,
                target_branch: base,
            },
            headers: {
                private_token: (credentials as TokenCredentials).token,
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
