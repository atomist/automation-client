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
    PullRequestReviewer,
    PullRequestReviewerType,
    RepoRef,
} from "./RepoId";

export const GitHubDotComBase = "https://api.github.com";
const FullGitHubDotComBase = "https://api.github.com/";

/**
 * GitHub repo ref
 */
export class GitHubRepoRef extends AbstractRemoteRepoRef {

    /**
     * Create a GitHubRepoRef instance.
     * @param params Object with the following properties:
     *                 owner: Repo owner
     *                 repo: Repo name
     *                 sha: Commit SHA to checkout
     *                 rawApiBase: Full GitHub API base URL
     *                 path: Path within the Git repository to use as project root
     *                 branch: Branch to checkout
     *                 rawRemoteBase: Full GitHub remote base URL
     */
    public static from(params: { owner: string, repo: string, sha?: string, rawApiBase?: string, path?: string, branch?: string }): GitHubRepoRef {
        if (params.sha && !params.sha.match(GitShaRegExp.pattern)) {
            throw new Error("You provided an invalid SHA: " + params.sha);
        }
        return new GitHubRepoRef(params.owner, params.repo, params.sha, params.rawApiBase, params.path, params.branch);
    }

    public readonly kind: string = "github";

    public readonly apiBase: string;

    /**
     * Create a GitHubRepoRef instance.  It may be easier to use [[GitHubRepoRef.from]].
     * @param owner Repo owner
     * @param repo Repo name
     * @param sha Commit SHA to checkout
     * @param rawApiBase Full GitHub API base URL
     * @param path Path within the Git repository to use as project root
     * @param branch Branch to checkout
     * @param rawRemoteBase Full GitHub remote base URL
     */
    constructor(
        owner: string,
        repo: string,
        sha?: string,
        rawApiBase: string = GitHubDotComBase,
        path?: string,
        branch?: string,
        rawRemoteBase?: string,
    ) {
        super(rawApiBase === GitHubDotComBase || rawApiBase === FullGitHubDotComBase ? ProviderType.github_com : ProviderType.ghe,
            rawRemoteBase || apiBaseToRemoteBase(rawApiBase), rawApiBase, owner, repo, sha, path, branch);
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility: string): Promise<ActionResult<this>> {
        if (!isTokenCredentials(creds)) {
            throw new Error("Only token auth supported");
        }
        return createRepo(creds.token, this, description, visibility === "private")
            .then(() => successOn(this));
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        // Only permit one retry trying to lookup user info
        const config = {...headers(credentials), retry: {retries: 1}};
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(`${this.scheme}${this.apiBase}`);

        return Promise.all([
            httpClient.exchange<any>(`${this.scheme}${this.apiBase}/user`, config),
            httpClient.exchange<any>(`${this.scheme}${this.apiBase}/user/public_emails`, config),
        ])
            .then(results => {
                const name = results[0].body.name || results[0].body.login;
                let email = results[0].body.email;

                if (!email && results[1].body && results[1].body.length > 0) {
                    email = results[1].body[0].email;
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

    public async getPr(credentials: ProjectOperationCredentials, head: string): Promise<any> {
        const config = headers(credentials);
        const url = `${this.scheme}${this.apiBase}/repos/${this.owner}/${this.repo}/pulls?state=open&head=${this.owner}:${head}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(url);
        return (await httpClient.exchange(url, config)).body;
    }

    /**
     * Used to assign reviewers to existing Pull Requests
     * https://developer.github.com/v3/pulls/review_requests/#create-a-review-request
     * @param {ProjectOperationCredentials} credentials
     * @param {string} prNumber
     * @param {PullRequestReviewer[]} reviewers
     */
    public async addReviewersToPullRequest(credentials: ProjectOperationCredentials,
                                           prNumber: string,
                                           reviewers: PullRequestReviewer[]): Promise<HttpResponse<any>> {
        const url = `${this.scheme}${this.apiBase}/repos/${this.owner}/${this.repo}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(url);

        return httpClient.exchange<any>(`${url}/pulls/${prNumber}/requested_reviewers`, {
            body: {
                reviewers: reviewers.filter(r => r.type === PullRequestReviewerType.individual).map(i => i.name),
                team_reviewers: reviewers.filter(r => r.type === PullRequestReviewerType.team).map(t => t.name),
            },
            method: HttpMethod.Post,
            ...headers(credentials),
        });
    }

    /**
     * Used to create a new Pull Request
     * https://developer.github.com/v3/pulls/#create-a-pull-request
     * @param {ProjectOperationCredentials} credentials
     * @param {string} title
     * @param {string} body
     * @param {string} head Source branch
     * @param {string} base Target branch
     * @param {PullRequestReviewer[]} reviewers
     */
    public async raisePullRequest(credentials: ProjectOperationCredentials,
                                  title: string,
                                  body: string,
                                  head: string,
                                  base: string,
                                  reviewers?: PullRequestReviewer[]): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repos/${this.owner}/${this.repo}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(url);

        // Check if PR already exists on the branch
        const pr = await this.getPr(credentials, head);
        if (!!pr && pr.length > 0) {
            try {
                await httpClient.exchange(`${url}/pulls/${pr[0].number}`, {
                    body: {title},
                    method: HttpMethod.Patch,
                    ...headers(credentials),
                });
                await httpClient.exchange(`${url}/issues/${pr[0].number}/comments`, {
                    body: beautifyPullRequestBody(body),
                    method: HttpMethod.Post,
                    ...headers(credentials),
                });
                return {
                    target: this,
                    success: true,
                };
            } catch (e) {
                logger.error(`Error attempting to add PR comment. ${url}  ${e}`);
                throw e;
            }
        } else {
            try {
                await httpClient.exchange(`${url}/pulls`, {
                    body: {
                        title,
                        body: beautifyPullRequestBody(body),
                        head,
                        base,
                    },
                    method: HttpMethod.Post,
                    ...headers(credentials),
                });
            } catch (e) {
                logger.error(`Error Attempting to Raise PR.  ${url} ${e}`);
                throw e;
            }

            try {
                if (reviewers) {
                    /**
                     * If there are reviewers retrieve the PR that was created and update the required reviewers
                     */
                    const thisPr = await this.getPr(credentials, head);
                    await this.addReviewersToPullRequest(credentials, thisPr[0].number, reviewers);
                }
            } catch (e) {
                logger.error(`Error Attempting to Assign Reviewer(s) to PR.  ${url} ${e}`);
                throw e;
            }

            return {
                target: this,
                success: true,
            };
        }
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.scheme}${this.apiBase}/repos/${this.owner}/${this.repo}`;
        const httpClient = configurationValue<HttpClientFactory>("http.client.factory", defaultHttpClientFactory())
            .create(url);
        return httpClient.exchange(url, {...headers(creds), method: HttpMethod.Delete})
            .then(() => successOn(this));
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

function apiBaseToRemoteBase(rawApiBase: string): string {
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
            .replace(/\n\s*\n\s*\n/g, "\n\n")
            .trim();
        return `${newBody}

---
<details>
  <summary>Tags</summary>
<br/>
${tags.sort().map(t => `<code>${t}</code>`).join("<br/>")}
</details>`;
    }
    return body;
}
