import axios, { AxiosPromise } from "axios";
import { logger } from "../internal/util/logger";

import { decode } from "../internal/util/base64";
import { GitHubDotComBase, GitHubRepoRef } from "../operations/common/GitHubRepoRef";
import { RepoRef } from "../operations/common/RepoId";

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
    const config = token ? {
            headers: {
                Authorization: `token ${token}`,
            },
        }
        : {};
    const url = `${GitHubDotComBase}/repos/${user}/${repo}/contents/${path}`;
    logger.debug(`Request to '${url}' to check for file existence]`);
    // We only care if it returns 200. Otherwise it isn't there
    return axios.get(url, config);
}

export interface Issue {
    title: string;
    body: string;
    assignee?: string;
    milestone?: number;
    labels?: string[];
    assignees?: string[];
}

export function raiseIssue(token: string, repoId: RepoRef, issue: Issue): AxiosPromise {
    const config = {
        headers: {
            Authorization: `token ${token}`,
        },
    };
    const url = `${GitHubDotComBase}/repos/${repoId.owner}/${repoId.repo}/issues`;
    logger.debug(`Request to '${url}' to raise issue`);
    return axios.post(url, issue, config);
}
