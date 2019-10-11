/*
 * Copyright © 2018 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as _ from "lodash";
import promiseRetry = require("promise-retry");
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
    execPromise,
    ExecPromiseResult,
} from "../../util/child_process";
import { logger } from "../../util/logger";
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
    public static async cloned(credentials: ProjectOperationCredentials,
                               id: RemoteRepoRef,
                               opts: CloneOptions = DefaultCloneOptions,
                               directoryManager: DirectoryManager = DefaultDirectoryManager): Promise<GitProject> {
        const p = await clone(credentials, id, opts, directoryManager);
        if (!!id.path) {
            // It's possible to request a clone but only work with part of it.
            const pathInsideRepo = id.path.startsWith("/") ? id.path : "/" + id.path;
            const gp = GitCommandGitProject.fromBaseDir(id, p.baseDir + pathInsideRepo, credentials,
                () => p.release(),
                p.provenance + "\ncopied into one with extra path " + id.path);
            return gp;
        } else {
            return p;
        }
    }

    public branch: string;

    public remote: string;

    public newRepo: boolean = false;

    private constructor(id: RepoRef,
                        public baseDir: string,
                        private readonly credentials: ProjectOperationCredentials,
                        release: ReleaseFunction,
                        public provenance?: string,
                        shouldCache: boolean = false) {
        super(id, baseDir, release, shouldCache);
        this.branch = (id.branch || id.sha) || "master";
        logger.debug(`Created GitProject`);
    }

    public async init(): Promise<this> {
        this.newRepo = true;
        this.branch = "master";
        return this.gitInProjectBaseDir(["init"])
            .then(() => this);
    }

    public isClean(): Promise<boolean> {
        return this.gitInProjectBaseDir(["status", "--porcelain"])
            .then(result => result.stdout === "");
    }

    public gitStatus(): Promise<GitStatus> {
        return runStatusIn(this.baseDir);
    }

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     */
    public setRemote(remote: string): Promise<this> {
        this.remote = remote;
        return this.gitInProjectBaseDir(["remote", "add", "origin", remote])
            .then(() => this);
    }

    public setUserConfig(user: string, email: string): Promise<this> {
        return this.gitInProjectBaseDir(["config", "user.name", user])
            .then(() => this.gitInProjectBaseDir(["config", "user.email", email]))
            .then(() => this);
    }

    public createAndSetRemote(gid: RemoteRepoRef,
                              description: string = gid.repo,
                              visibility: "private" | "public"): Promise<this> {
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

    public configureFromRemote(): Promise<this> {
        if (isRemoteRepoRef(this.id)) {
            return this.id.setUserConfig(this.credentials, this)
                .then(() => this);
        }
        return Promise.resolve(this);
    }

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     */
    public raisePullRequest(title: string, body: string = this.name, targetBranch: string = "master"): Promise<this> {
        if (!this.branch) {
            throw new Error("Cannot create a PR: no branch has been created");
        }
        if (!isRemoteRepoRef(this.id)) {
            throw new Error("No remote in " + JSON.stringify(this.id));
        }

        return this.id.raisePullRequest(this.credentials, title, body, this.branch, targetBranch)
            .then(() => this);
    }

    /**
     * `git add .` and `git commit -m MESSAGE`
     * @param {string} message Commit message
     * @returns {Promise<this>}
     */
    public commit(message: string): Promise<this> {
        return this.gitInProjectBaseDir(["add", "."])
            .then(() => this.gitInProjectBaseDir(["commit", "-m", message]))
            .then(() => this);
    }

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param ref branch or SHA
     * @return {any}
     */
    public async checkout(ref: string): Promise<this> {
        await this.gitInProjectBaseDir(["checkout", ref, "--"]);
        if (!isValidSHA1(ref)) {
            this.branch = ref;
        }
        return this;
    }

    /**
     * Revert all changes since last commit
     * @return {any}
     */
    public async revert(): Promise<this> {
        return clean(this.baseDir)
            .then(() => this);
    }

    public async push(options?: GitPushOptions): Promise<this> {
        const gitPushArgs = ["push"];
        _.forOwn(options, (v, k) => {
            const opt = k.replace(/_/g, "-");
            if (typeof v === "boolean") {
                if (v === false) {
                    gitPushArgs.push(`--no-${opt}`);
                } else {
                    gitPushArgs.push(`--${opt}`);
                }
            } else if (typeof v === "string") {
                gitPushArgs.push(`--${opt}=${v}`);
            } else {
                return Promise.reject(new Error(`Unknown option key type for ${k}: ${typeof v}`));
            }
        });

        if (!!this.branch && !!this.remote) {
            // We need to set the remote
            gitPushArgs.push(this.remote, this.branch);
        } else {
            gitPushArgs.push("--set-upstream", "origin", this.branch);
        }

        return this.gitInProjectBaseDir(gitPushArgs)
            .then(() => this)
            .catch(err => {
                err.message = `Unable to push 'git "${gitPushArgs.join('" "')}"': ${err.message}`;
                logger.error(err.message);
                return Promise.reject(err);
            });
    }

    /**
     * Create branch from current HEAD.
     * @param name Name of branch to create.
     * @return project object
     */
    public async createBranch(name: string): Promise<this> {
        return this.gitInProjectBaseDir(["branch", name])
            .then(() => this.gitInProjectBaseDir(["checkout", name, "--"]))
            .then(() => {
                this.branch = name;
                return this;
            });
    }

    public async hasBranch(name: string): Promise<boolean> {
        return this.gitInProjectBaseDir(["branch", "--list", name])
            .then(result => result.stdout.includes(name));
    }

    private async gitInProjectBaseDir(args: string[]): Promise<ExecPromiseResult> {
        return execPromise("git", args, { cwd: this.baseDir });
    }

}

/**
 * Clone the given repo from GitHub
 * @param credentials git provider credentials
 * @param id remote repo ref
 * @param opts options for clone
 * @param directoryManager strategy for cloning
 */
async function clone(
    credentials: ProjectOperationCredentials,
    id: RemoteRepoRef,
    opts: CloneOptions,
    directoryManager: DirectoryManager,
    secondTry: boolean = false,
): Promise<GitProject> {

    const cloneDirectoryInfo = await directoryManager.directoryFor(id.owner, id.repo, id.branch, opts);
    logger.debug("Directory info: %j", cloneDirectoryInfo);
    switch (cloneDirectoryInfo.type) {
        case "empty-directory":
            return cloneInto(credentials, cloneDirectoryInfo, opts, id);
        case "existing-directory":
            const repoDir = cloneDirectoryInfo.path;
            try {
                await resetOrigin(repoDir, credentials, id); // sometimes the credentials are in the origin URL
                // Why do we not fetch?
                await checkout(repoDir, id.branch || id.sha);
                await clean(repoDir);
                return GitCommandGitProject.fromBaseDir(id,
                    repoDir, credentials, cloneDirectoryInfo.release,
                    cloneDirectoryInfo.provenance + "\nRe-using existing clone");
            } catch (error) {
                await cloneDirectoryInfo.invalidate();
                if (secondTry) {
                    throw error;
                } else {
                    return clone(credentials, id, opts, directoryManager, true);
                }
            }
        default:
            throw new Error("What is this type: " + cloneDirectoryInfo.type);
    }
}

async function cloneInto(
    credentials: ProjectOperationCredentials,
    targetDirectoryInfo: CloneDirectoryInfo,
    opts: CloneOptions,
    id: RemoteRepoRef,
): Promise<GitCommandGitProject> {
    logger.debug(
        `Cloning repo with owner '${id.owner}', name '${id.repo}', branch '${id.branch}', sha '${id.sha}' and options '${JSON.stringify(opts)}'`);
    const sha = id.sha || "HEAD";
    const repoDir = targetDirectoryInfo.path;
    const url = id.cloneUrl(credentials);
    const cloneBranch = id.branch;
    const cloneArgs = ["clone", url, repoDir];
    // If we wanted a deep clone, just clone it
    if (!opts.alwaysDeep) {
        // If we didn't ask for a deep clone, then default to cloning only the tip of the default branch.
        // the cloneOptions let us ask for more commits than that
        cloneArgs.push("--depth", ((opts.depth && opts.depth > 0) ? opts.depth : 1).toString(10));
        if (cloneBranch) {
            // if not cloning deeply, be sure we clone the right branch
            cloneArgs.push("--branch", cloneBranch);
        }
        if (opts.noSingleBranch) {
            cloneArgs.push("--no-single-branch");
        }
    }
    // Note: branch takes preference for checkout because we might be about to commit to it.
    // If you want to be sure to land on your SHA, set opts.detachHead to true.
    // Or don't, but then call gitStatus() on the returned project to check whether the branch is still at the SHA you wanted.
    const checkoutRef = opts.detachHead ? sha : id.branch || sha;

    // TODO CD user:password should be replaced too
    const cleanUrl = url.replace(/\/\/.*:x-oauth-basic/, "//TOKEN:x-oauth-basic");
    logger.debug(`Cloning repo '${cleanUrl}' in '${repoDir}'`);
    const retryOptions = {
        retries: 4,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 500,
        randomize: false,
    };
    await promiseRetry(retryOptions, (retry, count) => {
        return execPromise("git", cloneArgs)
            .catch(err => {
                logger.debug(`Clone of ${id.owner}/${id.repo} attempt ${count} failed: ` + err.message);
                retry(err);
            });
    });
    try {
        await execPromise("git", ["checkout", checkoutRef, "--"], { cwd: repoDir });
    } catch (err) {
        // When the head moved on and we only cloned with depth; we might have to do a full clone to get to the commit we want
        logger.debug(`Ref ${checkoutRef} not in cloned history. Attempting full clone`);
        await execPromise("git", ["fetch", "--unshallow"], { cwd: repoDir })
            .then(() => execPromise("git", ["checkout", checkoutRef, "--"], { cwd: repoDir }));
    }
    logger.debug(`Clone succeeded with URL '${cleanUrl}'`);
    return GitCommandGitProject.fromBaseDir(id, repoDir, credentials,
        targetDirectoryInfo.release,
        targetDirectoryInfo.provenance + "\nfreshly cloned");
}

async function resetOrigin(
    repoDir: string,
    credentials: ProjectOperationCredentials,
    id: RemoteRepoRef,
): Promise<ExecPromiseResult> {

    return execPromise("git", ["remote", "set-url", "origin", id.cloneUrl(credentials)], { cwd: repoDir });
}

async function checkout(repoDir: string, branch: string = "HEAD"): Promise<ExecPromiseResult> {
    return execPromise("git", ["fetch", "origin", branch], { cwd: repoDir })
        .then(() => execPromise("git", ["checkout", branch, "--"], { cwd: repoDir }))
        .then(() => execPromise("git", ["reset", "--hard", `origin/${branch}`], { cwd: repoDir }));
}

async function clean(repoDir: string): Promise<ExecPromiseResult> {
    return execPromise("git", ["clean", "-dfx"], { cwd: repoDir }) // also removes ignored files
        .then(() => execPromise("git", ["checkout", "--", "."], { cwd: repoDir }));
}

export function isValidSHA1(s: string): boolean {
    return /^[a-fA-F0-9]{40}$/.test(s);
}
