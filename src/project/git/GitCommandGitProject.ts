import { exec } from "child-process-promise";
import * as fs from "fs";

import { isLocalProject } from "../local/LocalProject";
import { Project } from "../Project";

import * as tmp from "tmp-promise";

import axios from "axios";
import { ActionResult } from "../../action/ActionResult";
import { CommandResult, runCommand } from "../../action/cli/commandLine";
import { logger } from "../../internal/util/logger";
import { hideString } from "../../internal/util/string";
import { ProjectOperationCredentials } from "../../operations/common/ProjectOperationCredentials";
import { RepoId, SimpleRepoId } from "../../operations/common/RepoId";
import { PullRequest } from "../../operations/edit/editModes";
import { NodeFsLocalProject } from "../local/NodeFsLocalProject";
import { GitProject } from "./GitProject";

export const GitHubBase = "https://api.github.com";

export interface CloneOptions {

    keep?: boolean;
}

const DefaultCloneOptions: CloneOptions = {
    keep: false,
};

/**
 * Implements GitProject interface using the Git binary from the command line.
 * Works only if git is installed.
 */
export class GitCommandGitProject extends NodeFsLocalProject implements GitProject {

    public static fromProject(p: Project, credentials: ProjectOperationCredentials): GitProject {
        if (isLocalProject(p)) {
            return GitCommandGitProject.fromBaseDir(p.name, p.baseDir, credentials);
        }
        throw new Error(`Project ${p.name} doesn't have a local directory`);
    }

    public static fromBaseDir(name: string, baseDir: string,
                              credentials: ProjectOperationCredentials): GitCommandGitProject {
        return new GitCommandGitProject(name, baseDir, credentials);
    }

    public static cloned(credentials: ProjectOperationCredentials,
                         user: string, repo: string, branch: string = "master",
                         opts: CloneOptions = DefaultCloneOptions): Promise<GitCommandGitProject> {
        return clone(credentials.token, user, repo, branch, opts)
            .then(p => {
                const gp = GitCommandGitProject.fromBaseDir(repo, p.baseDir, credentials);
                gp.repoName = repo;
                gp.owner = user;
                return gp;
            });
    }

    public branch: string;

    public remote: string;

    public newRepo: boolean = false;

    public repoName: string;

    public owner: string;

    private constructor(public name: string, public baseDir: string, private credentials: ProjectOperationCredentials) {
        super(name, baseDir);
        logger.info(`Created GitProject with token '${hideString(this.credentials.token)}'`);
    }

    get id(): RepoId {
        return new SimpleRepoId(this.owner, this.repoName, undefined, {url: "github.com"});
    }

    public init(): Promise<CommandResult<this>> {
        this.newRepo = true;
        this.branch = "master";
        return this.runCommandInCurrentWorkingDirectory("git init");
    }

    public isClean(): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory("git status --porcelain")
            .then(commandResult => {
                return {
                    ...commandResult,
                    success: commandResult.stdout !== undefined && commandResult.stdout === "",
                };
            });
    }

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     */
    public setRemote(remote: string): Promise<CommandResult<this>> {
        this.remote = remote;
        return this.runCommandInCurrentWorkingDirectory(`git remote add origin ${remote}`);
    }

    public setGitHubRemote(owner: string, repo: string): Promise<CommandResult<this>> {
        this.owner = owner;
        this.repoName = repo;
        return this.setRemote(`https://${this.credentials.token}@github.com/${owner}/${repo}.git`);
    }

    public setUserConfig(user: string, email: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git config user.name "${user}"`)
            .then(() => this.runCommandInCurrentWorkingDirectory(`git config user.email "${email}"`));
    }

    public setGitHubUserConfig(): Promise<CommandResult<this>> {
        const config = {
            headers: {
                Authorization: `token ${this.credentials.token}`,
            },
        };

        return axios.get(`${GitHubBase}/user`, config)
            .then(result => {
                if (result.data.name && result.data.email) {
                    return this.setUserConfig(result.data.name, result.data.email);
                } else {
                    return this.setUserConfig("Atomist Bot", "bot@atomist.com");
                }
            });
    }

    public createAndSetGitHubRemote(owner: string, name: string, description: string = name,
                                    visibility: "private" | "public" = "private"): Promise<CommandResult<this>> {
        const config = {
            headers: {
                Authorization: `token ${this.credentials.token}`,
            },
        };

        return axios.get(`${GitHubBase}/orgs/${owner}`, config)
            .then(result => {
                // We now know the owner is an org
                const url = `${GitHubBase}/orgs/${owner}/repos`;
                return this.createRepo(owner, url, name, description, visibility);
            })
            .catch(error => {
                // We now know the owner is an user
                const url = `${GitHubBase}/user/repos`;
                return this.createRepo(owner, url, name, description, visibility);
            });
    }

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     */
    public raisePullRequest(title: string, body: string = name): Promise<ActionResult<this>> {
        if (!(this.branch)) {
            throw new Error("Cannot create a PR: no branch has been created");
        }
        const config = {
            headers: {
                Authorization: `token ${this.credentials.token}`,
            },
        };
        const url = `${GitHubBase}/repos/${this.owner}/${this.repoName}/pulls`;
        logger.debug(`Making request to [${url}] to raise PR`);
        return axios.post(url, {
            title,
            body,
            head: this.branch,
            base: "master",
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

    public commit(message: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git add .; git commit -a -m "${message}"`);
    }

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param baseDir
     * @param sha
     * @return {any}
     */
    public checkout(sha: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git checkout ${sha}`);
    }

    public push(): Promise<any> {
        if (this.branch && this.remote) {
            // We need to set the remote
            return this.runCommandInCurrentWorkingDirectory(`git push ${this.remote} ${this.branch}`)
                .catch(err => logger.error("Unable to push: " + err));
        }
        return this.runCommandInCurrentWorkingDirectory(`git push --set-upstream origin ${this.branch}`)
            .catch(err => logger.error("Unable to push: " + err));
    }

    public createBranch(name: string): Promise<CommandResult<this>> {
        this.branch = name;
        return this.runCommandInCurrentWorkingDirectory(`git branch ${name}; git checkout ${name}`);
    }

    private runCommandInCurrentWorkingDirectory(cmd: string): Promise<CommandResult<this>> {
        return runCommand(cmd, {cwd: this.baseDir})
            .then(result => {
                return {
                    target: this,
                    ...result,
                };
            });
    }

    private createRepo(owner: string, url: string, name: string, description: string = name,
                       visibility: "private" | "public" = "private"): Promise<any> {
        const config = {
            headers: {
                Authorization: `token ${this.credentials.token}`,
            },
        };

        const payload = {
            name,
            description,
            private: visibility === "private" ? true : false,
        };
        logger.debug(`Request to '${url}' with '${JSON.stringify(payload)}' ` +
            `and auth token '${hideString(this.credentials.token)}'`);
        return axios.post(url, payload, config)
            .then(res => {
                logger.debug(`Repo created ok: ${res.statusText}`);
                return this.setRemote(`https://${this.credentials.token}@github.com/${owner}/${name}.git`);
            });
    }
}

/**
 * Create a PR if given
 * @param token
 * @param owner
 * @param name
 * @param doWithProject
 * @param branch
 * @param pr
 */
export function cloneEditAndPush(credentials: ProjectOperationCredentials,
                                 owner: string,
                                 name: string,
                                 doWithProject: (Project) => void,
                                 pr?: PullRequest): Promise<ActionResult<GitCommandGitProject>> {
    return GitCommandGitProject.cloned(credentials, owner, name).then(gp => {
        doWithProject(gp);
        const start: Promise<any> = pr.branch ? gp.createBranch(pr.branch) : Promise.resolve();
        return start
            .then(_ => gp.commit(pr.message))
            .then(_ => gp.push())
            .then(x => {
                if (pr) {
                    return gp.raisePullRequest(pr.title, pr.body);
                } else {
                    return {
                        target: gp,
                        success: false,
                    };
                }
            });
    }).catch(err => {
        logger.error(`Error cloning, editing and pushing repo: ${err}`);
        return Promise.reject(err);
    });
}

/**
 * Clone the given repo from GitHub
 * @param token
 * @param user
 * @param repo
 * @param branch
 */
function clone(token: string,
               user: string,
               repo: string,
               branch: string = "master",
               opts: CloneOptions): Promise<GitProject> {

    return tmp.dir({keep: opts.keep})
        .then(parentDir => {
            const repoDir = `${parentDir.path}/${repo}`;
            const command = (branch === "master") ?
                `git clone --depth 1 https://${token}@github.com/${user}/${repo}.git` :
                `git clone https://${token}@github.com/${user}/${repo}.git; cd ${repo}; git checkout ${branch}`;

            const url = `https://github.com/${user}/${repo}`;
            logger.info(`Cloning repo '${url}' to '${parentDir.path}'`);
            return exec(command, {cwd: parentDir.path})
                .then(_ => {
                    logger.debug(`Clone succeeded with URL '${url}'`);
                    fs.chmodSync(repoDir, "0777");
                    const p = new NodeFsLocalProject(repo, repoDir);
                    return p;
                });
        });
}
