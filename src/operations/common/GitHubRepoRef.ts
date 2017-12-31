import { ActionResult, successOn } from "../../action/ActionResult";
import { createRepo } from "../../util/gitHub";
import { isTokenCredentials, ProjectOperationCredentials } from "./ProjectOperationCredentials";
import { RepoRef } from "./RepoId";

import axios from "axios";
import { logger } from "../../internal/util/logger";
import { Configurable } from "../../project/git/Configurable";
import { AbstractRepoRef } from "./AbstractRemoteRepoRef";

export const GitHubDotComBase = "https://api.github.com";

/**
 * GitHub repo ref
 */
export class GitHubRepoRef extends AbstractRepoRef {

    public kind = "github";

    constructor(owner: string,
                repo: string,
                sha: string = "master",
                public apiBase = GitHubDotComBase,
                path?: string) {
        super("github.com", owner, repo, sha, path);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        if (!isTokenCredentials(creds)) {
            throw new Error("Only token auth supported");
        }
        return createRepo(creds.token, this, description, visibility)
            .then(() => successOn(this));
    }

    public setUserConfig(credentials: ProjectOperationCredentials,
                         project: Configurable,
                         userInfo: { name?: string, email?: string } = {}): Promise<ActionResult<any>> {
        const config = headers(credentials);
        if (userInfo.name && userInfo.email) {
            return project.setUserConfig(userInfo.name, userInfo.email);
        } else {
            // try to figure it out from GitHub
            return axios.get(`${this.apiBase}/user`, config)
                .then(userResult => {
                    const name = userInfo.name || userResult.data.name || "Atomist Bot";
                    let email = userInfo.email || userResult.data.email;
                    if (email) {
                        // perhaps this was enough
                        return project.setUserConfig(name, email);
                    } else {
                        // this one takes more permissions so don't try it unless we have to
                        return axios.get(`${this.apiBase}/user/emails`, config)
                            .then(emailsResult => {
                                email = emailsResult.data.find(e => e.primary === true).email || "bot@atomist.com";
                                return project.setUserConfig("Atomist Bot", "bot@atomist.com");
                            })
                    }
                }).catch(() => project.setUserConfig("Atomist Bot", "bot@atomist.com"));
        }
    }

    public raisePullRequest(credentials: ProjectOperationCredentials,
                            title: string, body: string, head: string, base: string): Promise<ActionResult<this>> {
        const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/pulls`;
        const config = headers(credentials);
        logger.debug(`Making request to '${url}' to raise PR`);
        return axios.post(url, {
            title,
            body,
            head,
            base,
        }, config)
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(err => {
                logger.error("Error attempting to raise PR: " + err);
                return Promise.reject(err);
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.apiBase}/repos/${this.owner}/${this.repo}`;
        return axios.delete(url, headers(creds))
            .then(r => successOn(this));
    }

}

export function isGitHubRepoRef(rr: RepoRef): rr is GitHubRepoRef {
    const maybe = rr as GitHubRepoRef;
    return maybe && !!maybe.apiBase && maybe.kind === "github";
}

function headers(credentials: ProjectOperationCredentials): { headers: any } {
    if (!isTokenCredentials(credentials)) {
        throw new Error("Only token auth supported");
    }
    return {
        headers: {
            Authorization: `token ${credentials.token}`,
        },
    };
}
