import { ActionResult } from "../../internal/util/ActionResult";
import { LocalProject } from "../local/LocalProject";

export const GitHubBase = "https://api.github.com";

/**
 * Local project using git. Provides the ability to perform git operations
 * such as commit, and to set and push to a remote.
 */
export interface GitProject extends LocalProject {

    /**
     * Undefined unless set
     */
    newBranch: string;

    remote: string;

    newRepo: boolean;

    repoName: string;

    owner: string;

    /**
     * Init git for this project.
     * @return {Promise<any>}
     */
    init(): Promise<any>;

    /**
     * Remote is of form https://github.com/USERNAME/REPOSITORY.git
     * @param remote
     */
    setRemote(remote: string): Promise<ActionResult<this>>;

    setGitHubRemote(owner: string, repo: string): Promise<ActionResult<this>>;

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
    setGitHubUserConfig(): Promise<ActionResult<this>>;

    /**
     * Does the project have uncommitted changes in Git? Success means it's clean
     */
    isClean(): Promise<ActionResult<this>>;

    /**
     * Create a remote repository and set this repository's remote to it.
     * @param {string} owner
     * @param {string} name
     * @param {string} description
     * @param {"private" | "public"} visibility
     */
    createAndSetGitHubRemote(owner: string, name: string, description: string, visibility?: "private" | "public"):
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

}

/**
 * Information used in creating a GitHub pull request.
 */
export interface PullRequestInfo {

    title: string;

    body: string;

}
