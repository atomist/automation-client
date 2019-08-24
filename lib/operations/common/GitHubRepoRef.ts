/*
 * Copyright © 2019 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import axios from "axios";
import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import { Configurable } from "../../project/git/Configurable";
import { createRepo } from "../../util/gitHub";
import { logger } from "../../util/logger";
import { AbstractRemoteRepoRef } from "./AbstractRemoteRepoRef";
import { GitShaRegExp } from "./params/validationPatterns";
import {
    isTokenCredentials,
    ProjectOperationCredentials,
} from "./ProjectOperationCredentials";
import {
    ProviderType,
    RepoRef,
} from "./RepoId";

export const GitHubDotComBase = "https://api.github.com";
const FullGitHubDotComBase = "https://api.github.com/";

/**
 * GitHub repo ref
 */
export class GitHubRepoRef extends AbstractRemoteRepoRef {

    public static from(params: { owner: string, repo: string, sha?: string, rawApiBase?: string, path?: string, branch?: string }): GitHubRepoRef {
        if (params.sha && !params.sha.match(GitShaRegExp.pattern)) {
            throw new Error("You provided an invalid SHA: " + params.sha);
        }
        const result = new GitHubRepoRef(params.owner, params.repo, params.sha, params.rawApiBase, params.path, params.branch);
        return result;
    }

    public readonly kind = "github";

    public readonly apiBase: string;

    constructor(owner: string, repo: string, sha?: string, rawApiBase = GitHubDotComBase, path?: string, branch?: string, remoteBase?: string) {
        super(rawApiBase === GitHubDotComBase || rawApiBase === FullGitHubDotComBase ? ProviderType.github_com : ProviderType.ghe,
            remoteBase || apiBaseToRemoteBase(rawApiBase), rawApiBase, owner, repo, sha, path, branch);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility: string): Promise<ActionResult<this>> {
        if (!isTokenCredentials(creds)) {
            throw new Error("Only token auth supported");
        }
        return createRepo(creds.token, this, description, visibility === "private")
            .then(() => successOn(this));
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        const config = headers(credentials);
        return Promise.all([
            axios.get(`${this.scheme}${this.apiBase}/user`, config),
            axios.get(`${this.scheme}${this.apiBase}/user/public_emails`, config),
        ])
            .then(results => {
                const name = results[0].data.name || results[0].data.login;
                let email = results[0].data.email;

                if (!email && results[1].data && results[1].data.length > 0) {
                    email = results[1].data[0].email;
                }

                if (name && email) {
                    return project.setUserConfig(name, email);
                } else {
                    return project.setUserConfig("Atomist Bot", "bot@atomist.com");
                }
            })
            .catch(() => project.setUserConfig("Atomist Bot", "bot@atomist.com"))
            .then(successOn);
    }

    public raisePullRequest(credentials: ProjectOperationCredentials,
                            title: string, body: string, head: string, base: string): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repos/${this.owner}/${this.repo}/pulls`;
        const config = headers(credentials);
        logger.debug(`Making request to '${url}' to raise PR`);
        return axios.post(url, {
            title,
            body: beautifyPullRequestBody(body),
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
                logger.error(`Error attempting to raise PR. ${url}  ${err}`);
                return Promise.reject(err);
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repos/${this.owner}/${this.repo}`;
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

function apiBaseToRemoteBase(rawApiBase: string) {
    if (rawApiBase.includes("api.github.com")) {
        return "https://github.com";
    }
    if (rawApiBase.includes("api/v3")) {
        return rawApiBase.substring(0, rawApiBase.indexOf("api/v3"));
    }
    return rawApiBase;
}

// exported for testing
export function beautifyPullRequestBody(body: string): string {
    const tagRegEx = /(\[[-\w]+:[-\w:=\/\.]+\])/gm;
    let tagMatches = tagRegEx.exec(body);
    const tags = [];
    while (!!tagMatches) {
        tags.push(tagMatches[1]);
        tagMatches = tagRegEx.exec(body);
    }
    if (tags.length > 0) {
        const newBody = body.replace(/\[[-\w]+:[-\w:=\/\.]+\]/g, "")
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        return `${newBody}

---
<details>
  <summary><img src="https://images.atomist.com/logo/atomist-color-mark-small.png" height="20" valign="bottom"/>Tags</summary>
<br/>
${tags.sort().map(t => `<code>${t}</code>`).join("<br/>")}
</details>`;
    }
    return body;
}
