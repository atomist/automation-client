// tslint:disable-next-line:import-blacklist
import axios from "axios";
import * as _ from "lodash";

import promiseRetry = require("promise-retry");
import { ActionResult } from "../../lib/action/ActionResult";
import { guid } from "../../lib/internal/util/string";
import { GitHubDotComBase } from "../../lib/operations/common/GitHubRepoRef";
import { ProjectOperationCredentials } from "../../lib/operations/common/ProjectOperationCredentials";
import { RemoteRepoRef } from "../../lib/operations/common/RepoId";
import { LocalProject } from "../../lib/project/local/LocalProject";
import { logger } from "../../lib/util/logger";
import { TestRepositoryVisibility } from "../credentials";

export const GitHubToken: string = process.env.GITHUB_TOKEN;

export const Creds = { token: GitHubToken };

export const AtomistApiKey = process.env.ATOMIST_API_KEY;

export const SlackTeamId = "T095SFFBK";

export async function getOwnerByToken(): Promise<string> {
    const config = {
        headers: {
            Authorization: `token ${GitHubToken}`,
        },
    };
    return axios.get(`${GitHubDotComBase}/user`, config).then(response => response.data.login);
}

export interface TestRepo {
    owner: string;
    repo: string;
}

/**
 * Create a new repo we can use for tests
 * @return {Promise<{owner: string; repo: string}>}
 */
export async function newRepo(): Promise<TestRepo> {
    const config = {
        headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `token ${GitHubToken}`,
        },
    };
    const name = `test-repo-${new Date().getTime()}-${guid()}`;
    const description = "a thing";
    const url = `${GitHubDotComBase}/user/repos`;
    // logger.debug("Visibility is " + TestRepositoryVisibility);
    return getOwnerByToken()
        .then(owner =>
            axios
                .post(
                    url,
                    {
                        name,
                        description,
                        private: TestRepositoryVisibility === "private",
                        auto_init: true,
                    },
                    config,
                )
                .then(() =>
                    promiseRetry((retry, count) => {
                        const repoUrl = `${GitHubDotComBase}/repos/${owner}/${name}`;
                        return axios.get(repoUrl, config).catch(retry);
                    }),
                )
                .then(() => ({ owner, repo: name })),
        )
        .catch(error => {
            if (error.response.status === 422) {
                throw new Error(
                    "Could not create repository. GitHub says: " + _.get(error, "response.data.message", "nothing"),
                );
            } else {
                throw new Error("Could not create repo: " + error.message);
            }
        });
}

export async function deleteRepoIfExists(repo: TestRepo): Promise<any> {
    const config = {
        headers: {
            Authorization: `token ${GitHubToken}`,
        },
    };
    const url = `${GitHubDotComBase}/repos/${repo.owner}/${repo.repo}`;
    return axios.delete(url, config).catch(err => {
        logger.error(`error deleting ${repo.owner}/${repo.repo}, ignoring. ${err.response.status}`);
    });
}

export async function cleanAfterTest(p: LocalProject, r: TestRepo): Promise<void> {
    if (r) {
        try {
            await deleteRepoIfExists(r);
        } catch (e) {
            logger.warn(`ignoring failure to delete GitHub.com repo: ${e.message}`);
        }
    }
    if (p) {
        try {
            await p.release();
        } catch (e) {
            logger.warn(`ignore failure to remove project directory: ${e.message}`);
        }
    }
}

export function deleteOrIgnore(rr: RemoteRepoRef, creds: ProjectOperationCredentials): Promise<ActionResult<any>> {
    return rr.deleteRemote(creds).catch(err => {
        // tslint:disable-next-line:no-console
        console.log(`cleanup: deleting ${JSON.stringify(rr)} failed with ${err}. oh well`);
        return undefined;
    });
}

export function tempRepoName(): string {
    return `test-repo-${new Date().getTime()}`;
}
