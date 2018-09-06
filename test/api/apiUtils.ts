/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from "axios";
import * as _ from "lodash";
import promiseRetry = require("promise-retry");

import { ActionResult } from "../../src/action/ActionResult";
import {
    logger,
    LoggingConfig,
} from "../../src/internal/util/logger";
import { guid } from "../../src/internal/util/string";
import {
    GitHubDotComBase,
    GitHubRepoRef,
} from "../../src/operations/common/GitHubRepoRef";
import { ProjectOperationCredentials } from "../../src/operations/common/ProjectOperationCredentials";
import { RemoteRepoRef } from "../../src/operations/common/RepoId";
import { LocalProject } from "../../src/project/local/LocalProject";
import { TestRepositoryVisibility } from "../credentials";

LoggingConfig.format = "cli";
(logger as any).transports.console.level = process.env.LOG_LEVEL || "info";

function barf(): string {
    throw new Error("<please set GITHUB_TOKEN env variable>");
}

export const GitHubToken: string = process.env.GITHUB_TOKEN || barf();

export const Creds = { token: GitHubToken };

export const SlackTeamId = "T095SFFBK";

export async function getOwnerByToken(): Promise<string> {
    const config = {
        headers: {
            Authorization: `token ${GitHubToken}`,
        },
    };
    return axios.get(`${GitHubDotComBase}/user`, config)
        .then(response => response.data.login);
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
        .then(owner => axios.post(url, {
            name,
            description,
            private: TestRepositoryVisibility === "private",
            auto_init: true,
        }, config)
            .then(() => promiseRetry((retry, count) => {
                const repoUrl = `${GitHubDotComBase}/repos/${owner}/${name}`;
                return axios.get(repoUrl, config)
                    .catch(retry);
            }))
            .then(() => ({ owner, repo: name })))
        .catch(error => {
            if (error.response.status === 422) {
                throw new Error("Could not create repository. GitHub says: " +
                    _.get(error, "response.data.message", "nothing"));
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
    return axios.delete(url, config)
        .catch(err => {
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

/*
let TargetOwner = "atomist-travisorg";
const config = {
    headers: {
        Authorization: `token ${GitHubToken}`,
    },
};
*/

export function deleteOrIgnore(rr: RemoteRepoRef, creds: ProjectOperationCredentials): Promise<ActionResult<any>> {
    return rr.deleteRemote(creds)
        .catch(err => {
            console.log(`cleanup: deleting ${JSON.stringify(rr)} failed with ${err}. oh well`);
            return null;
        });
}

export function tempRepoName() {
    return `test-repo-${new Date().getTime()}`;
}
