import { exec } from "child-process-promise";

import { isLocalProject, ReleaseFunction } from "../local/LocalProject";
import { Project } from "../Project";

import { ActionResult, successOn } from "../../action/ActionResult";
import { CommandResult, runCommand } from "../../action/cli/commandLine";
import { logger } from "../../internal/util/logger";
import { ProjectOperationCredentials } from "../../operations/common/ProjectOperationCredentials";
import { isRemoteRepoRef, RemoteRepoRef, RepoRef } from "../../operations/common/RepoId";
import {
    CloneDirectoryInfo,
    CloneOptions,
    DefaultCloneOptions,
    DirectoryManager,
} from "../../spi/clone/DirectoryManager";
import { TmpDirectoryManager } from "../../spi/clone/tmpDirectoryManager";
import { NodeFsLocalProject } from "../local/NodeFsLocalProject";
import { GitProject } from "./GitProject";
import { GitStatus, runStatusIn } from "./gitStatus";

export const DefaultDirectoryManager = TmpDirectoryManager;

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

    /**
     * Deprecated; use gitStatus().then(status => status.isClean) instead
     */
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
    public raisePullRequest(title: string, body: string = name): Promise<ActionResult<this>> {
        if (!(this.branch)) {
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
            "master")
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
        return this.runCommandInCurrentWorkingDirectory(`git checkout ${sha} --`);
    }

    /**
     * Revert all changes since last commit
     * @return {any}
     */
    public async revert(): Promise<CommandResult<this>> {
        return clean(this.baseDir);
    }

    public push(): Promise<CommandResult<this>> {
        if (!!this.branch && !!this.remote) {
            // We need to set the remote
            return this.runCommandInCurrentWorkingDirectory(`git push ${this.remote} ${this.branch}`)
                .catch(err => {
                    logger.error("Unable to push with existing remote: %s", err);
                    return Promise.reject(err);
                });
        }
        return this.runCommandInCurrentWorkingDirectory(`git push --set-upstream origin ${this.branch}`)
            .catch(err => {
                logger.error("Unable to push with set upstream origin: %s", err);
                return Promise.reject(err);
            });
    }

    public createBranch(name: string): Promise<CommandResult<this>> {
        this.branch = name;
        return this.runCommandInCurrentWorkingDirectory(`git branch ${name}`).then(() =>
            this.runCommandInCurrentWorkingDirectory(`git checkout ${name} --`));
    }

    public hasBranch(name: string): Promise<boolean> {
        return this.runCommandInCurrentWorkingDirectory(`git branch --list ${name}`).then(
            commandResult => {
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
function clone(credentials: ProjectOperationCredentials,
               id: RemoteRepoRef,
               opts: CloneOptions,
               directoryManager: DirectoryManager,
               secondTry: boolean = false): Promise<GitProject> {
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

function cloneInto(credentials: ProjectOperationCredentials,
                   targetDirectoryInfo: CloneDirectoryInfo,
                   opts: CloneOptions,
                   id: RemoteRepoRef) {
    const repoDir = targetDirectoryInfo.path;
    const command = (!opts.alwaysDeep && id.sha === "master" && targetDirectoryInfo.transient) ?
        runIn(".", `git clone --depth 1 ${id.cloneUrl(credentials)} ${repoDir}`) :
        runIn(".", `git clone ${id.cloneUrl(credentials)} ${repoDir}`)
            .then(() => runIn(repoDir, `git checkout ${id.sha} --`));

    logger.debug(`Cloning repo '${id.url}' in '${repoDir}'`);
    return command
        .then(_ => {
            logger.debug(`Clone succeeded with URL '${id.url}'`);
            // fs.chmodSync(repoDir, "0777");
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
        .then(result => runIn(repoDir, "git checkout -- ."));
}

function runIn(baseDir: string, command: string) {
    return runCommand(command, { cwd: baseDir });
}

function pwd(baseDir) {
    return runCommand("pwd", { cwd: baseDir }).then(result =>
        console.log(result.stdout));
}
