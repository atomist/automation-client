import { exec } from "child-process-promise";
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
    setRemote(remote: string): Promise<any>;

    setGitHubRemote(owner: string, repo: string): Promise<any>;

    /**
     * Create a remote repository and set this repository's remote to it.
     * @param {string} owner
     * @param {string} name
     * @param {string} description
     * @return {Promise<any>}
     */
    createAndSetGitHubRemote(owner: string, name: string, description: string): Promise<any>;

    /**
     * Raise a PR after a push to this branch
     * @param title
     * @param body
     * @return {any}
     */
    raisePullRequest(title: string, body: string): Promise<any>;

    /**
     * Commit to local git
     * @param {string} message
     * @return {Promise<any>}
     */
    commit(message: string): Promise<any>;

    /**
     * Check out a particular commit. We'll end in detached head state
     * @param sha sha or branch identifier
     * @return {any}
     */
    checkout(sha: string): Promise<any>;

    /**
     * Push to the remote.
     * @return {Promise<any>}
     */
    push(): Promise<any>;

    /**
     * Create a new branch and switch to it.
     * @param {string} name Name of the new branch
     * @return {Promise<any>}
     */
    createBranch(name: string): Promise<any>;

}

/**
 * Information used in creating a GitHub pull request.
 */
export interface PullRequestInfo {

    title: string;

    body: string;

}
