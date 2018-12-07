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

import { RemoteRepoRef } from "../../operations/common/RepoId";
import { LocalProject } from "../local/LocalProject";
import { Configurable } from "./Configurable";
import { GitStatus } from "./gitStatus";

/**
 * Git push options.  See git-push(1) for more information.
 */
export interface GitPushOptions {
    follow_tags?: boolean;
    force?: boolean;
    force_with_lease?: boolean | string;
    quiet?: boolean;
    verbose?: boolean;
}

/**
 * Local project using git. Provides the ability to perform git operations
 * such as commit, and to set and push to a remote.
 */
export interface GitProject extends LocalProject, Configurable {

    branch: string;

    remote: string;

    newRepo: boolean;

    /**
     * Init git for this project.
     */
    init(): Promise<this>;

    /**
     * Get some status information
     */
    gitStatus(): Promise<GitStatus>;

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     */
    setRemote(remote: string): Promise<this>;

    /**
     * Sets the given user and email as the running git commands
     * @param {string} user
     * @param {string} email
     */
    setUserConfig(user: string, email: string): Promise<this>;

    /**
     * Sets the user config by using GitHub user information. Make sure to use a token that
     * has user scope.
     */
    configureFromRemote(): Promise<this>;

    /**
     * Does the project have uncommitted changes in Git? Success means it's clean
     */
    isClean(): Promise<boolean>;

    /**
     * Create a remote repository and set this repository's remote to it.
     * @param gid: RemoteRepoRef
     * @param {string} description
     * @param {"private" | "public"} visibility
     */
    createAndSetRemote(gid: RemoteRepoRef, description: string, visibility: "private" | "public"):
        Promise<this>;

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     * @param targetBranch
     */
    raisePullRequest(title: string, body: string, targetBranch?: string): Promise<this>;

    /**
     * Commit to local git
     * @param {string} message
     */
    commit(message: string): Promise<this>;

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param sha sha or branch identifier
     */
    checkout(sha: string): Promise<this>;

    /**
     * Revert all changes since last commit
     */
    revert(): Promise<this>;

    /**
     * Push to the remote.
     */
    push(options?: GitPushOptions): Promise<this>;

    /**
     * Create a new branch and switch to it.
     * @param {string} name Name of the new branch
     */
    createBranch(name: string): Promise<this>;

    /**
     * Check for existence of a branch
     */
    hasBranch(name: string): Promise<boolean>;

}
