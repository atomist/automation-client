import { ActionResult, successOn } from "../../action/ActionResult";
import { logger } from "../../internal/util/logger";
import { Configurable } from "../../project/git/Configurable";
import { AbstractRepoRef } from "./AbstractRemoteRepoRef";
import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

import axios from "axios";
import stringify = require("json-stringify-safe");
import { encode } from "../../internal/util/base64";
import { isBasicAuthCredentials } from "./BasicAuthCredentials";

export class BitBucketServerRepoRef extends AbstractRepoRef {

    private apiBase: string;
    private ownerType: string;

    constructor(remoteBase: string,
                owner: string,
                repo: string,
                private isProject: boolean = true,
                sha: string = "master",
                path?: string) {
        super(remoteBase, owner, repo, sha, path);
        this.apiBase = `https://${remoteBase}/rest/api/1.0/`;
        this.ownerType = isProject ? "projects" : "users";
    }

    public cloneUrl(creds: ProjectOperationCredentials) {
        if (!isBasicAuthCredentials(creds)) {
            throw new Error("Only basic credentials supported: " + stringify(creds));
        }
        return `https://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${this.remoteBase}/${this.pathComponent}.git`;
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        const url = `${this.apiBase}${this.apiBasePathComponent}`;
        logger.debug(`Making request to '${url}' to create repo`);
        return axios.post(url, {
            name: this.repo,
            scmId: "git",
            forkable: "true",
        }, headers(creds))
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(error => {
                logger.error("Error attempting to create repository %j: %s", this, error);
                return Promise.reject(error);
            });
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        const url = `${this.apiBase}${this.apiPathComponent}`;
        logger.debug(`Making request to '${url}' to delete repo`);
        return axios.delete(url, headers(creds))
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(err => {
                logger.error(`Error attempting to delete repository: ${err}`);
                return Promise.reject(err);
            });
    }

    public setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return Promise.resolve(successOn(this));
    }

    public raisePullRequest(credentials: ProjectOperationCredentials,
                            title: string, body: string, head: string, base: string): Promise<ActionResult<this>> {
        const url = `${this.apiBase}${this.apiPathComponent}/pull-requests`;
        logger.debug(`Making request to '${url}' to raise PR`);
        return axios.post(url, {
            title,
            description: body,
            fromRef: {
                id: head,
            },
            toRef: {
                id: base,
            },
        }, headers(credentials))
            .then(axiosResponse => {
                return {
                    target: this,
                    success: true,
                    axiosResponse,
                };
            })
            .catch(err => {
                logger.error(`Error attempting to raise PR: ${err}`);
                return Promise.reject(err);
            });
    }

    get url() {
        let url: string = `projects/${this.owner}/repos/`;
        if (!this.isProject) {
            url = `users/${this.owner}/repos/`;
        }
        return `https://${this.remoteBase}/${url}/${this.repo}`;
    }

    get pathComponent(): string {
        let owernUrlComponent = this.owner;
        if (!this.isProject) {
            owernUrlComponent = `~${this.owner}`;
        }
        return `scm/${owernUrlComponent}/${this.repo}`;
    }

    private get apiBasePathComponent(): string {
        let apiPath: string = `projects/${this.owner}/repos/`;
        if (!this.isProject) {
            apiPath = `projects/~${this.owner}/repos/`;
        }
        return apiPath;
    }

    get apiPathComponent(): string {
        return this.apiBasePathComponent + this.repo;
    }

}

function headers(creds: ProjectOperationCredentials) {
    if (!isBasicAuthCredentials(creds)) {
        throw new Error("Only Basic auth supported: Had " + JSON.stringify(creds));
    }
    const upwd = `${creds.username}:${creds.password}`;
    const encoded = encode(upwd);
    return {
        headers: {
            Authorization: `Basic ${encoded}`,
        },
    };
}
