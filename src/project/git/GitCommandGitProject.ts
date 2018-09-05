import { exec } from "child-process-promise";
import * as _ from "lodash";
import promiseRetry = require("promise-retry");
import {
    ActionResult,
    successOn,
} from "../../action/ActionResult";
import {
    CommandResult,
    runCommand,
} from "../../action/cli/commandLine";
import { logger } from "../../internal/util/logger";
import { ProjectOperationCredentials } from "../../operations/common/ProjectOperationCredentials";
import {
    isRemoteRepoRef,
    RemoteRepoRef,
    RepoRef,
} from "../../operations/common/RepoId";
import {
    CloneDirectoryInfo,
    CloneOptions,
    DefaultCloneOptions,
    DirectoryManager,
} from "../../spi/clone/DirectoryManager";
import { TmpDirectoryManager } from "../../spi/clone/tmpDirectoryManager";
import {
    isLocalProject,
    ReleaseFunction,
} from "../local/LocalProject";
import { NodeFsLocalProject } from "../local/NodeFsLocalProject";
import { Project } from "../Project";
import {
    GitProject,
    GitPushOptions,
} from "./GitProject";
import {
    GitStatus,
    runStatusIn,
} from "./gitStatus";

export const DefaultDirectoryManager: DirectoryManager = TmpDirectoryManager;

/**
 * Implements GitProject interface using the Git binary from the command line.
 * Works only if git is installed.
 */
export class GitCommandGitProject extends NodeFsLocalProject implements GitProject {

    public static fromProject(p: Project, credentials: ProjectOperationCredentials): GitProject {
        if (isLocalProject(p)) {
            return GitCommandGitProject.fromBaseDir(p.id, p.baseDir, credentials, () => Promise.resolve());
        }
        throw new Error(`Project ${p.name} doesn't have a local directory`);
    }

    /**
     * Create a project from an existing git directory
     * @param {RepoRef} id
     * @param {string} baseDir
     * @param {ProjectOperationCredentials} credentials
     * @param release call this when you're done with the project. make its filesystem resources available to others.
     * @param provenance optional; for debugging, describe how this was constructed
     * @return {GitCommandGitProject}
     */
    public static fromBaseDir(id: RepoRef, baseDir: string,
                              credentials: ProjectOperationCredentials,
                              release: ReleaseFunction,
                              provenance?: string): GitCommandGitProject {
        return new GitCommandGitProject(id, baseDir, credentials, release, provenance);
    }

    /**
     * Create a new GitCommandGitProject by cloning the given remote project
     * @param {ProjectOperationCredentials} credentials
     * @param {RemoteRepoRef} id
     * @param {CloneOptions} opts
     * @param {DirectoryManager} directoryManager
     * @return {Promise<GitCommandGitProject>}
     */
    public static cloned(credentials: ProjectOperationCredentials,
                         id: RemoteRepoRef,
                         opts: CloneOptions = DefaultCloneOptions,
                         directoryManager: DirectoryManager = DefaultDirectoryManager): Promise<GitProject> {
        return clone(credentials, id, opts, directoryManager)
            .then(p => {
                if (!!id.path) {
                    const pathInsideRepo = id.path.startsWith("/") ? id.path : "/" + id.path;
                    // not sure this will work with cached
                    const gp = GitCommandGitProject.fromBaseDir(id, p.baseDir + pathInsideRepo, credentials,
                        () => p.release(),
                        p.provenance + "\ncopied into one with extra path " + id.path);
                    return gp;
                } else {
                    return p;
                }
            });
    }

    public branch: string;

    public remote: string;

    public newRepo: boolean = false;

    private constructor(id: RepoRef, public baseDir: string,
                        private credentials: ProjectOperationCredentials, release: ReleaseFunction,
                        public provenance?: string) {
        super(id, baseDir, release);
        this.branch = id.sha;
        logger.debug(`Created GitProject`);
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

    public gitStatus(): Promise<GitStatus> {
        return runStatusIn(this.baseDir);
    }

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     */
    public setRemote(remote: string): Promise<CommandResult<this>> {
        this.remote = remote;
        return this.runCommandInCurrentWorkingDirectory(`git remote add origin ${remote}`);
    }

    public setUserConfig(user: string, email: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git config user.name "${user}"`)
            .then(() => this.runCommandInCurrentWorkingDirectory(`git config user.email "${email}"`));
    }

    public createAndSetRemote(gid: RemoteRepoRef,
                              description: string = gid.repo,
                              visibility: "private" | "public"): Promise<CommandResult<this>> {
        this.id = gid;
        return gid.createRemote(this.credentials, description, visibility)
            .then(res => {
                if (res.success) {
                    logger.debug(`Repo created ok`);
                    return this.setRemote(gid.cloneUrl(this.credentials));
                } else {
                    return Promise.reject(res.error);
                }
            });
    }

    public configureFromRemote(): Promise<ActionResult<this>> {
        if (isRemoteRepoRef(this.id)) {
            return this.id.setUserConfig(this.credentials, this);
        }
        return Promise.resolve(successOn(this));
    }

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     */
    public raisePullRequest(title: string, body: string = name, targetBranch: string = "master"): Promise<ActionResult<this>> {
        if (!this.branch) {
            throw new Error("Cannot create a PR: no branch has been created");
        }
        if (!isRemoteRepoRef(this.id)) {
            throw new Error("No remote in " + JSON.stringify(this.id));
        }

        return this.id.raisePullRequest(
            this.credentials,
            title,
            body,
            this.branch,
            targetBranch)
            .then(() => successOn(this));
    }

    /**
     * `git add .` and `git commit`
     * @param {string} message
     * @returns {Promise<CommandResult<this>>}
     */
    public commit(message: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git add .`)
            .then(() => {
                const escapedMessage = message.replace(/"/g, `\\"`);
                const command = `git commit -a -m "${escapedMessage}"`;
                return this.runCommandInCurrentWorkingDirectory(command);
            });
    }

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param sha
     * @return {any}
     */
    public checkout(sha: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git checkout ${sha} --`)
            .then(res => {
                this.branch = sha;
                return res;
            });
    }

    /**
     * Revert all changes since last commit
     * @return {any}
     */
    public async revert(): Promise<CommandResult<this>> {
        return clean(this.baseDir);
    }

    public push(options?: GitPushOptions): Promise<CommandResult<this>> {
        let gitPushCmd: string = "git push";
        _.forOwn(options, (v, k) => {
            const opt = k.replace(/_/g, "-");
            if (typeof v === "boolean") {
                if (v === false) {
                    gitPushCmd += ` --no-${opt}`;
                } else {
                    gitPushCmd += ` --${opt}`;
                }
            } else if (typeof v === "string") {
                gitPushCmd += ` --${opt}=${v}`;
            } else {
                return Promise.reject(new Error(`Unknown option key type for ${k}: ${typeof v}`));
            }
        });

        if (!!this.branch && !!this.remote) {
            // We need to set the remote
            gitPushCmd += ` ${this.remote} ${this.branch}`;
        } else {
            gitPushCmd += ` --set-upstream origin ${this.branch}`;
        }

        return this.runCommandInCurrentWorkingDirectory(gitPushCmd)
            .catch(err => {
                err.message = `Unable to push '${gitPushCmd}': ${err.message}`;
                logger.error(err.message);
                return Promise.reject(err);
            });
    }

    public createBranch(name: string): Promise<CommandResult<this>> {
        return this.runCommandInCurrentWorkingDirectory(`git branch ${name}`)
            .then(() => this.runCommandInCurrentWorkingDirectory(`git checkout ${name} --`))
            .then(res => {
                this.branch = name;
                return res;
            });
    }

    public hasBranch(name: string): Promise<boolean> {
        return this.runCommandInCurrentWorkingDirectory(`git branch --list ${name}`)
            .then(commandResult => {
                if (commandResult.success && commandResult.stdout.includes(name)) {
                    return Promise.resolve(true);
                } else if (commandResult.success) {
                    return Promise.resolve(false);
                } else {
                    return Promise.reject(new Error(
                        `command <git branch --list ${name}> failed: ${commandResult.stderr}`));
                }
            });
    }

    private runCommandInCurrentWorkingDirectory(cmd: string): Promise<CommandResult<this>> {
        return runCommand(cmd, { cwd: this.baseDir })
            .then(result => {
                return {
                    target: this,
                    ...result,
                };
            });
    }

}

/**
 * Clone the given repo from GitHub
 * @param credentials git provider credentials
 * @param id remote repo ref
 * @param opts options for clone
 * @param directoryManager strategy for cloning
 */
function clone(
    credentials: ProjectOperationCredentials,
    id: RemoteRepoRef,
    opts: CloneOptions,
    directoryManager: DirectoryManager,
    secondTry: boolean = false,
): Promise<GitProject> {

    return directoryManager.directoryFor(id.owner, id.repo, id.sha, opts)
        .then(cloneDirectoryInfo => {
            switch (cloneDirectoryInfo.type) {
                case "empty-directory":
                    return cloneInto(credentials, cloneDirectoryInfo, opts, id);
                case "existing-directory":
                    const repoDir = cloneDirectoryInfo.path;
                    return resetOrigin(repoDir, credentials, id)
                        .then(() => checkout(repoDir, id.sha))
                        .then(() => clean(repoDir))
                        .then(() => {
                            return GitCommandGitProject.fromBaseDir(id,
                                repoDir, credentials, cloneDirectoryInfo.release,
                                cloneDirectoryInfo.provenance + "\nRe-using existing clone");
                        }, error => {
                            return cloneDirectoryInfo.invalidate().then(() => {
                                if (secondTry) {
                                    throw error;
                                } else {
                                    return clone(credentials, id, opts, directoryManager, true);
                                }
                            });
                        });
                default:
                    throw new Error("What is this type: " + cloneDirectoryInfo.type);
            }
        });
}

function cloneInto(
    credentials: ProjectOperationCredentials,
    targetDirectoryInfo: CloneDirectoryInfo,
    opts: CloneOptions,
    id: RemoteRepoRef,
) {

    const repoDir = targetDirectoryInfo.path;
    const url = id.cloneUrl(credentials);
    const command = ((!opts.alwaysDeep && targetDirectoryInfo.transient) ?
        runIn(".", `git clone --depth ${opts.depth ? opts.depth : 1} ${url} ${repoDir} ${id.branch ? `--branch ${id.branch}` : ""}`) :
        runIn(".", `git clone ${url} ${repoDir}`))
            .then(() => runIn(repoDir, `git checkout ${id.branch ? id.branch : id.sha} --`));

    const cleanUrl = url.replace(/\/\/.*:x-oauth-basic/, "//TOKEN:x-oauth-basic");
    logger.debug(`Cloning repo '${cleanUrl}' in '${repoDir}'`);
    const retryOptions = {
        retries: 4,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 500,
        randomize: false,
    };
    return promiseRetry(retryOptions, (retry, count) => {
        return command
            .catch(err => {
                logger.debug(`clone of ${id.owner}/${id.repo} attempt ${count} failed`);
                retry(err);
            });
    })
        .then(() => {
            logger.debug(`Clone succeeded with URL '${cleanUrl}'`);
            return GitCommandGitProject.fromBaseDir(id, repoDir, credentials,
                targetDirectoryInfo.release,
                targetDirectoryInfo.provenance + "\nfreshly cloned");
        });
}

function resetOrigin(repoDir: string, credentials: ProjectOperationCredentials, id: RemoteRepoRef) {
    return runIn(repoDir, `git remote set origin ${id.cloneUrl(credentials)}`);
}

function checkout(repoDir: string, branch: string) {
    return pwd(repoDir)
        .then(() => runIn(repoDir, `git fetch origin ${branch}`))
        .then(() => runIn(repoDir, `git checkout ${branch} --`))
        .then(() => runIn(repoDir, `git reset --hard origin/${branch}`));
}

function clean(repoDir: string) {
    return pwd(repoDir)
        .then(() => runIn(repoDir, "git clean -dfx")) // also removes ignored files
        .then(() => runIn(repoDir, "git checkout -- ."));
}

function runIn(baseDir: string, command: string) {
    return runCommand(command, { cwd: baseDir });
}

function pwd(baseDir) {
    return runCommand("pwd", { cwd: baseDir }).then(result =>
        console.log(result.stdout));
}
