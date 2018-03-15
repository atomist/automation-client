import { ActionResult } from "../../action/ActionResult";
import { RemoteRepoRef } from "../../operations/common/RepoId";
import { LocalProject } from "../local/LocalProject";
import { Configurable } from "./Configurable";
import { GitStatus } from "./gitStatus";

/**
 * Local project using git. Provides the ability to perform git operations
 * such as commit, and to set and push to a remote.
 */
export interface GitProject extends LocalProject, Configurable {

    branch: string;

    remote: string;

    newRepo: boolean;

    id: RemoteRepoRef;

    /**
     * Init git for this project.
     */
    init(): Promise<ActionResult<this>>;

    /**
     * get some status information
     */
    gitStatus(): Promise<GitStatus>;

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     */
    setRemote(remote: string): Promise<ActionResult<this>>;

    /**
     * Sets the given user and email as the running git commands
     * @param {string} user
     * @param {string} email
     */
    setUserConfig(user: string, email: string): Promise<ActionResult<this>>;

    /**
     * Sets the user config by using GitHub user information. Make sure to use a token that
     * has user scope.
     */
    configureFromRemote(): Promise<ActionResult<this>>;

    /**
     * Does the project have uncommitted changes in Git? Success means it's clean
     */
    isClean(): Promise<ActionResult<this>>;

    /**
     * Create a remote repository and set this repository's remote to it.
     * @param gid: RemoteRepoRef
     * @param {string} description
     * @param {"private" | "public"} visibility
     */
    createAndSetRemote(gid: RemoteRepoRef, description: string, visibility: "private" | "public"):
        Promise<ActionResult<this>>;

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     */
    raisePullRequest(title: string, body: string): Promise<ActionResult<this>>;

    /**
     * Commit to local git
     * @param {string} message
     */
    commit(message: string): Promise<ActionResult<this>>;

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param sha sha or branch identifier
     */
    checkout(sha: string): Promise<ActionResult<this>>;

    /**
     * Push to the remote.
     */
    push(): Promise<ActionResult<this>>;

    /**
     * Create a new branch and switch to it.
     * @param {string} name Name of the new branch
     */
    createBranch(name: string): Promise<ActionResult<this>>;

    /**
     * Check for existence of a branch
     */
    hasBranch(name: string): Promise<boolean>;

}
