import { exec } from "child-process-promise";
import * as fs from "fs";

import { isLocalProject } from "../local/LocalProject";
import { Project } from "../Project";

import * as tmp from "tmp";
import { promisify } from "util";

import axios from "axios";
import { CommandResult, runCommand } from "../../internal/util/commandLine";
import { logger } from "../../internal/util/logger";
import { hideString } from "../../internal/util/string";
import { NodeFsLocalProject } from "../local/NodeFsLocalProject";
import { GitProject, PullRequestInfo } from "./GitProject";

export const GitHubBase = "https://api.github.com";

/**
 * Implements GitProject interface using the Git binary from the command line.
 * Works only if git is installed.
 */
export class GitCommandGitProject extends NodeFsLocalProject implements GitProject {

    public static fromProject(p: Project, token: string): GitProject {
        if (isLocalProject(p)) {
            return GitCommandGitProject.fromBaseDir(p.name, p.baseDir, token);
        }
        throw new Error(`Project ${p.name} doesn't have a local directory`);
    }

    public static fromBaseDir(name: string, baseDir: string, token: string): GitProject {
        return new GitCommandGitProject(name, baseDir, token);
    }

    public static cloned(token: string, user: string, repo: string, branch: string = "master"): Promise<GitProject> {
        return clone(token, user, repo, branch)
            .then(p => {
                const gp = GitCommandGitProject.fromBaseDir(repo, p.baseDir, token);
                gp.repoName = repo;
                gp.owner = user;
                return gp;
            });
    }

    /**
     * Undefined unless set
     */
    public newBranch: string;

    public remote: string;

    public newRepo: boolean = false;

    public repoName: string;

    public owner: string;

    private constructor(public name: string, public baseDir: string, private token: string) {
        super(name, baseDir);
        logger.info(`Created GitProject with token '${hideString(this.token)}'`);
    }

    public init(): Promise<any> {
        this.newRepo = true;
        this.newBranch = "master";
        return this.runCommandInCwd("git init").then(c => {
            return c;
        });
    }

    public clean(): Promise<boolean> {
        return this.runCommandInCwd("git status --porcelain")
            .then(c => {
                return c.stdout !== undefined && c.stdout === "";
            });
    }

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     * @return {Promise<TResult2|TResult1>|PromiseLike<TResult2|TResult1>}
     */
    public setRemote(remote: string): Promise<any> {
        this.remote = remote;
        return this.runCommandInCwd(`git remote add origin ${remote}`)
            .then(c => {
                return c;
            });
    }

    public setGitHubRemote(owner: string, repo: string): Promise<any> {
        this.owner = owner;
        this.repoName = repo;
        return this.setRemote(`https://${this.token}@github.com/${owner}/${repo}.git`);
    }

    public setUserConfig(user: string, email: string): Promise<any> {
        return this.runCommandInCwd(`git config user.name "${user}"`)
            .then(() => this.runCommandInCwd(`git config user.email "${email}"`));
    }

    public setGitHubUserConfig(): Promise<any> {
        const config = {
            headers: {
                Authorization: `token ${this.token}`,
            },
        };

        return axios.get(`${GitHubBase}/user`, config)
            .then(result => {
                if (result.data.name && result.data.email) {
                    return this.setUserConfig(result.data.name, result.data.email);
                } else {
                    return this.setUserConfig("Atomist Bot", "bot@atomist.com");
                }});
    }

    public createAndSetGitHubRemote(owner: string, name: string, description: string = name,
                                    visibility: "private" | "public" = "private"): Promise<any> {
        const config = {
            headers: {
                Authorization: `token ${this.token}`,
            },
        };

        return axios.get(`${GitHubBase}/orgs/${owner}`, config)
            .then(result => {
                // We now know the owner is an org
                const url = `${GitHubBase}/orgs/${owner}/repos`;
                return this.createRepo(owner, url, name, description, visibility);
            })
            .catch( error => {
                // We now know the owner is an user
                const url = `${GitHubBase}/user/repos`;
                return this.createRepo(owner, url, name, description, visibility);
            });
    }

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     * @return {any}
     */
    public raisePullRequest(title: string, body: string = name): Promise<any> {
        if (!(this.newBranch)) {
            throw new Error("Cannot create a PR: no branch has been created");
        }
        const config = {
            headers: {
                Authorization: `token ${this.token}`,
            },
        };
        const url = `${GitHubBase}/repos/${this.owner}/${this.repoName}/pulls`;
        logger.debug(`Making request to [${url}] to raise PR`);
        return axios.post(url, {
            title,
            body,
            head: this.newBranch,
            base: "master",
        }, config)
            .catch(err => {
                logger.error("Error attempting to raise PR: " + err);
                return Promise.reject(err);
            });
    }

    public commit(message: string): Promise<CommandResult> {
        return this.runCommandInCwd(`git add .; git commit -a -m "${message}"`);
    }

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param baseDir
     * @param sha
     * @return {any}
     */
    public checkout(sha: string): Promise<CommandResult> {
        return this.runCommandInCwd(`git checkout ${sha}`);
    }

    public push(): Promise<any> {
        if (this.newBranch && this.remote) {
            // We need to set the remote
            return this.runCommandInCwd(`git push ${this.remote} ${this.newBranch}`)
                .catch(err => logger.error("Unable to push: " + err));
        }
        return this.runCommandInCwd(`git push --set-upstream origin ${this.newBranch}`)
            .catch(err => logger.error("Unable to push: " + err));
    }

    public createBranch(name: string): Promise<CommandResult> {
        this.newBranch = name;
        return this.runCommandInCwd(`git branch ${name}; git checkout ${name}`);
    }

    private runCommandInCwd(cmd: string): Promise<CommandResult> {
        return runCommand(cmd, {cwd: this.baseDir});
    }

    private createRepo(owner: string, url: string, name: string, description: string = name,
                       visibility: "private" | "public" = "private"): Promise<any> {
        const config = {
            headers: {
                Authorization: `token ${this.token}`,
            },
        };

        const payload = {
            name,
            description,
            private: visibility === "private" ? true : false,
        };
        logger.debug(`Request to '${url}' with '${JSON.stringify(payload)}' ` +
            `and auth token '${hideString(this.token)}'`);
        return axios.post(url, payload, config)
            .then(res => {
                logger.debug(`Repo created ok: ${res.statusText}`);
                return this.setRemote(`https://${this.token}@github.com/${owner}/${name}.git`);
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
 * @return {Promise<TResult|TResult2|TResult1>}
 */
export function cloneEditAndPush(token: string,
                                 owner: string,
                                 name: string,
                                 doWithProject: (Project) => void,
                                 branch?: string,
                                 pr?: PullRequestInfo): Promise<any> {
    return GitCommandGitProject.cloned(token, owner, name).then(gp => {
        doWithProject(gp);
        const start: Promise<any> = branch ? gp.createBranch(branch) : Promise.resolve();
        return start
            .then(_ => gp.commit("Added a Thing"))
            .then(_ => gp.push())
            .then(x => {
                if (pr) {
                    return gp.raisePullRequest(pr.title, pr.body);
                } else {
                    return new Promise(x);
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
 * @return {Promise<TResult2|LocalProject>|PromiseLike<TResult2|LocalProject>}
 */
function clone(token: string,
               user: string,
               repo: string,
               branch: string = "master"): Promise<GitProject> {
    const tmpDir = promisify(tmp.dir);
    return tmpDir()
        .then(parentDir => {
            const repoDir = `${parentDir}/${repo}`;
            const command = (branch === "master") ?
                `git clone --depth 1 https://${token}@github.com/${user}/${repo}.git` :
                `git clone https://${token}@github.com/${user}/${repo}.git; cd ${repo}; git checkout ${branch}`;

            const url = `https://github.com/${user}/${repo}`;
            logger.info(`Cloning repo '${url}' to '${parentDir}'`);
            return exec(command, {cwd: parentDir})
                .then(_ => {
                    logger.debug(`Clone succeeded with URL '${url}'`);
                    fs.chmodSync(repoDir, "0777");
                    const p = new NodeFsLocalProject(repo, repoDir);
                    return p;
                });
        });
}
