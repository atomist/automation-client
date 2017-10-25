import { exec } from "child-process-promise";

import axios from "axios";
import * as os from "os";
import { isLocalProject } from "../local/LocalProject";
import { Project } from "../Project";

import { ActionResult } from "../../action/ActionResult";
import { CommandResult, runCommand } from "../../action/cli/commandLine";
import { logger } from "../../internal/util/logger";
import { hideString } from "../../internal/util/string";
import { ProjectOperationCredentials } from "../../operations/common/ProjectOperationCredentials";
import { RepoId, SimpleRepoId } from "../../operations/common/RepoId";
import { CloneOptions, DefaultCloneOptions, DirectoryManager } from "../../spi/clone/DirectoryManager";
import { StableDirectoryManager } from "../../spi/clone/StableDirectoryManager";
import { NodeFsLocalProject } from "../local/NodeFsLocalProject";
import { GitProject } from "./GitProject";

/**
 * Default Atomist working directory
 * @type {string}
 */
const AtomistWorkingDirectory = ".atomist-working";

export const DefaultDirectoryManager = new StableDirectoryManager({
    baseDir: os.homedir() + "/" + AtomistWorkingDirectory,
    cleanOnExit: false,
    reuseDirectories: false,
});

export const GitHubBase = "https://api.github.com";

/**
 * Implements GitProject interface using the Git binary from the command line.
 * Works only if git is installed.
 */
export class GitCommandGitProject extends NodeFsLocalProject implements GitProject {

    public static fromProject(p: Project, credentials: ProjectOperationCredentials): GitProject {
        if (isLocalProject(p)) {
            return GitCommandGitProject.fromBaseDir(p.id, p.baseDir, credentials);
        }
        throw new Error(`Project ${p.name} doesn't have a local directory`);
    }

    public static fromBaseDir(id: RepoId, baseDir: string,
                              credentials: ProjectOperationCredentials): GitCommandGitProject {
        return new GitCommandGitProject(id, baseDir, credentials);
    }

    public static cloned(credentials: ProjectOperationCredentials,
                         user: string, repo: string, branch: string = "master",
                         opts: CloneOptions = DefaultCloneOptions,
                         directoryManager: DirectoryManager = DefaultDirectoryManager): Promise<GitCommandGitProject> {
        return clone(credentials.token, user, repo, branch, opts, directoryManager)
            .then(p => {
                const gp = GitCommandGitProject.fromBaseDir(new SimpleRepoId(user, repo), p.baseDir, credentials);
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

    private constructor(id: RepoId, public baseDir: string, private credentials: ProjectOperationCredentials) {
        super(id, baseDir);
        logger.debug(`Created GitProject with token '${hideString(this.credentials.token)}'`);
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

        return Promise.all([ axios.get(`${GitHubBase}/user`, config),
                axios.get(`${GitHubBase}/user/emails`, config) ])
            .then(results => {
                const name = results[0].data.name;
                let email = results[0].data.email;

                if (!email) {
                    email = results[1].data.find(e => e.primary === true).email;
                }

                if (name && email) {
                    return this.setUserConfig(name, email);
                } else {
                    return this.setUserConfig("Atomist Bot", "bot@atomist.com");
                }
            })
            .catch(() => this.setUserConfig("Atomist Bot", "bot@atomist.com"));
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
        logger.debug(`Making request to '${url}' to raise PR`);
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
 * Clone the given repo from GitHub
 * @param token
 * @param user
 * @param repo
 * @param branch
 * @param opts options for clone
 * @param directoryManager strategy for cloning
 */
function clone(token: string,
               user: string,
               repo: string,
               branch: string = "master",
               opts: CloneOptions,
               directoryManager: DirectoryManager): Promise<GitProject> {
    return directoryManager.directoryFor(user, repo, branch, opts)
        .then(cloneDirectoryInfo => {
                switch (cloneDirectoryInfo.type) {
                    case "parent-directory" :
                        const repoDir = `${cloneDirectoryInfo.path}/${repo}`;
                        const command = (branch === "master") ?
                            `git clone --depth 1 https://${token}@github.com/${user}/${repo}.git` :
                            // tslint:disable-next-line:max-line-length
                            `git clone https://${token}@github.com/${user}/${repo}.git; cd ${repo};git checkout ${branch}`;

                        const url = `https://github.com/${user}/${repo}`;
                        logger.info(`Cloning repo '${url}' to '${cloneDirectoryInfo.path}'`);
                        return exec(command, {cwd: cloneDirectoryInfo.path})
                            .then(_ => {
                                logger.debug(`Clone succeeded with URL '${url}'`);
                                // fs.chmodSync(repoDir, "0777");
                                return new NodeFsLocalProject(new SimpleRepoId(user, repo), repoDir);
                            });
                    case "actual-directory" :
                        throw new Error("actual-directory clone directory type not yet supported");
                }
            },
        );
}
