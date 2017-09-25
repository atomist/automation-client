import axios from "axios";
import { logger } from "./logger";

import { RepoId } from "../../operations/common/RepoId";
import { GitHubBase } from "../../project/git/GitProject";

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
    const config = token ? {
        headers: {
            Authorization: `token ${token}`,
        },
    }
        : {};
    const url = `${GitHubBase}/repos/${user}/${repo}/contents/${path}`;
    logger.debug(`Request to [${url}] to check for file existence]`);
    // We only care if it returns 200. Otherwise it isn't there
    return axios.get(url, config)
        .then(d => true)
        .catch(err => {
            logger.info("Axios error getting file: Probably not there", err.toString());
            return false;
        });
}

export interface Issue {
    title: string;
    body: string;
    assignee?: string;
    milestone?: number;
    labels?: string[];
    assignees?: string[];
}

export function raiseIssue(token: string, repoId: RepoId, issue: Issue): Promise<any> {
    const config = {
        headers: {
            Authorization: `token ${token}`,
        },
    };
    const url = `${GitHubBase}/repos/${repoId.owner}/${repoId.repo}/issues`;
    logger.debug(`Request to [${url}] to raise issue`);
    return axios.post(url, issue, config);
}
