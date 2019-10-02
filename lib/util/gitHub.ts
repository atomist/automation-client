import { decode } from "../internal/util/base64";
import {
    GitHubDotComBase,
    GitHubRepoRef,
    isGitHubRepoRef,
} from "../operations/common/GitHubRepoRef";
import { RepoRef } from "../operations/common/RepoId";
import { SourceLocation } from "../operations/common/SourceLocation";
import {
    HttpClientOptions,
    HttpMethod,
    HttpResponse,
} from "../spi/http/httpClient";
import { httpClient } from "./http";
import { logger } from "./logger";

/**
 * Return a deep link to the file location
 * @param {GitHubRepoRef} grr
 * @param {SourceLocation} sourceLocation
 * @return {string}
 */
export function deepLink(grr: GitHubRepoRef, sourceLocation: SourceLocation): string {
    return `${grr.scheme}${grr.remoteBase}/${grr.owner}/${grr.repo}/blob/${grr.sha}` +
        (!!sourceLocation ? `/${sourceLocation.path}` : "") +
        (!!sourceLocation && !!sourceLocation.lineFrom1 ? `#L${sourceLocation.lineFrom1}` : "");
}

/**
 * Check whether the given file, including path, exists
 * in the GitHub repo
 * @param token GitHub token. Don't try to auth if it's undefined or null
 * @param user
 * @param repo
 * @param path
 * @return {Promise<boolean|T>}
 */
export async function hasFile(token: string, user: string, repo: string, path: string): Promise<boolean> {
    // We only care if it returns 200. Otherwise it isn't there
    try {
        await filePromise(token, user, repo, path);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Return file content, or undefined if it's not found
 * @param {string} token
 * @param {string} user
 * @param {string} repo
 * @param {string} path
 * @return {Promise<string>}
 */
export function fileContent(token: string, user: string, repo: string, path: string): Promise<string | undefined> {
    return filePromise(token, user, repo, path)
        .then(d => decode(d.body.content))
        .catch(() => {
            return undefined;
        });
}

function filePromise(token: string, user: string, repo: string, path: string): Promise<HttpResponse<{ content: string }>> {
    const url = `${GitHubDotComBase}/repos/${user}/${repo}/contents/${path}`;
    logger.debug(`Request to '${url}' to check for file existence]`);
    // We only care if it returns 200. Otherwise it isn't there
    return httpClient(url).exchange<{ content: string }>(url, {
        method: HttpMethod.Get, ...authHeaders(token),
        retry: { retries: 0 },
    });
}

export interface Issue {
    title: string;
    body: string;
    state?: "open" | "closed";
    assignee?: string;
    milestone?: number;
    labels?: string[];
    assignees?: string[];
}

export function raiseIssue(token: string, rr: RepoRef, issue: Issue): Promise<HttpResponse<any>> {
    const grr = isGitHubRepoRef(rr) ? rr : new GitHubRepoRef(rr.owner, rr.repo, rr.sha);
    const url = `${grr.scheme}${grr.apiBase}/repos/${rr.owner}/${rr.repo}/issues`;
    logger.debug(`Request to '${url}' to raise issue`);
    return httpClient(url).exchange(url, { method: HttpMethod.Post, body: issue, ...authHeaders(token) });
}

/**
 * GitHub commit comment structure
 */
export interface Comment {

    body: string;

    path: string;

    /**
     * Line number in the diff
     */
    position: number;
}

export function createCommitComment(token: string, rr: GitHubRepoRef, comment: Comment): Promise<HttpResponse<any>> {
    const url = `${rr.scheme}${rr.apiBase}/repos/${rr.owner}/${rr.repo}/commits/${rr.sha}/comments`;
    logger.debug(`Request to '${url}' to create comment`);
    return httpClient(url).exchange(url, { method: HttpMethod.Post, body: comment, ...authHeaders(token) });
}

export async function createRepo(token: string,
                                 rr: GitHubRepoRef,
                                 description: string,
                                 priv: boolean): Promise<HttpResponse<any>> {
    const client = httpClient(`${rr.scheme}${rr.apiBase}`);
    let repoUrl;

    // check if owner is a user
    const userOrOrg = await client.exchange<{ type: "Organization" | "User" }>(
        `${rr.scheme}${rr.apiBase}/users/${rr.owner}`,
        {
            method: HttpMethod.Get,
            ...authHeaders(token),
        });

    if (userOrOrg.body.type === "User") {
        repoUrl = `${rr.scheme}${rr.apiBase}/user/repos`;
    } else if (userOrOrg.body.type === "Organization") {
        repoUrl = `${rr.scheme}${rr.apiBase}/orgs/${rr.owner}/repos`;
    }
    const payload = {
        name: rr.repo,
        description,
        private: priv,
    };

    logger.debug(`Request to '${repoUrl}' to create repo`);
    return client.exchange(repoUrl, {
        method: HttpMethod.Post,
        body: payload, ...authHeaders(token),
        retry: { retries: 0 },
    });
}

function authHeaders(token: string): HttpClientOptions {
    return token ? {
        headers: {
            Authorization: `token ${token}`,
        },
    }
        : {};
}
