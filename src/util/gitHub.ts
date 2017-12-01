import axios, { AxiosPromise, AxiosRequestConfig } from "axios";
import { logger } from "../internal/util/logger";

import { decode } from "../internal/util/base64";
import { GitHubDotComBase, GitHubRepoRef, isGitHubRepoRef } from "../operations/common/GitHubRepoRef";
import { RepoRef } from "../operations/common/RepoId";
import { SourceLocation } from "../operations/common/SourceLocation";

/**
 * Return a deep link to the file location
 * @param {GitHubRepoRef} grr
 * @param {SourceLocation} sourceLocation
 * @return {string}
 */
export function deepLink(grr: GitHubRepoRef, sourceLocation: SourceLocation) {
    // TODO need to allow for GHE
    return `https://github.com/${grr.owner}/${grr.repo}/blob/${grr.sha}` +
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
export function hasFile(token: string, user: string, repo: string, path: string): Promise<boolean> {
    // We only care if it returns 200. Otherwise it isn't there
    return filePromise(token, user, repo, path)
        .then(d => true)
        .catch(err => {
            logger.info("Axios error getting file: Probably not there", err.toString());
            return false;
        });
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
        .then(d => decode(d.data.content))
        .catch(err => {
            logger.info("Axios error getting file: Probably not there", err.toString());
            return undefined;
        });
}

function filePromise(token: string, user: string, repo: string, path: string): AxiosPromise {
    const url = `${GitHubDotComBase}/repos/${user}/${repo}/contents/${path}`;
    logger.debug(`Request to '${url}' to check for file existence]`);
    // We only care if it returns 200. Otherwise it isn't there
    return axios.get(url, authHeaders(token));
}

export interface Issue {
    title: string;
    body: string;
    assignee?: string;
    milestone?: number;
    labels?: string[];
    assignees?: string[];
}

export function raiseIssue(token: string, rr: RepoRef, issue: Issue): AxiosPromise {
    const grr = isGitHubRepoRef(rr) ? rr : new GitHubRepoRef(rr.owner, rr.repo, rr.sha);
    const url = `${grr.apiBase}/repos/${rr.owner}/${rr.repo}/issues`;
    logger.debug(`Request to '${url}' to raise issue`);
    return axios.post(url, issue, authHeaders(token));
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

export function createCommitComment(token: string, rr: GitHubRepoRef, comment: Comment): AxiosPromise {
    const url = `${rr.apiBase}/repos/${rr.owner}/${rr.repo}/commits/${rr.sha}/comments`;
    logger.debug(`Request to '${url}' to create comment`);
    return axios.post(url, comment, authHeaders(token));
}

export function createRepo(token: string, rr: GitHubRepoRef, description: string, priv: boolean): AxiosPromise {
    const config = authHeaders(token);
    return axios.get(`${rr.apiBase}/orgs/${rr.owner}`, config)
        .then(result => {
            // We now know the owner is an org
            return `${rr.apiBase}/orgs/${rr.owner}/repos`;
        }, err => {
            // We now know the owner is an user
            return `${rr.apiBase}/user/repos`;
        })
        .then(url => {
            const payload = {
                name: rr.repo,
                description,
                private: priv,
            };
            logger.debug(`Request to '${url}' to create repo`);
            return axios.post(url, payload, config);
        });
}

function authHeaders(token: string): AxiosRequestConfig {
    return token ? {
        headers: {
            Authorization: `token ${token}`,
        },
    }
        : {};
}
