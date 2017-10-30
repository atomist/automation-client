import * as shell from "shelljs";

import { Parameter } from "../../decorators";
import { allReposInTeam } from "./allReposInTeamRepoFinder";
import { RepoFinder } from "./repoFinder";

import { AllRepos, RepoFilter } from "./repoFilter";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemote {

    @Parameter({
        displayName: "local",
        displayable: false,
        description: "should the editor run locally or query Atomist for repos?",
        pattern: /^(?:true|false)$/,
        validInput: "Boolean",
        required: false,
        type: "boolean",
    })
    public local: boolean = false;

    @Parameter({
        displayName: "directory to look for projects in if working locally",
        displayable: false,
        description: "directory to look for repos in. Must follow <org>/<repo> convention",
        pattern: /^.*$/,
        validInput: "Valid path for your OS",
        required: false,
    })
    public dir: string;

    /**
     * For a command handler, decorate with
     * @Secret(Secrets.userToken(["repo", "user"]))
     * To use this in an event handler rather than a command handler,
     * please override this to be decorated with @Secret(Secrets.OrgToken)
     */
    protected abstract get githubToken(): string;

    /**
     * Operate on all repos matching this filter.
     * @param {(r: RepoRef) => boolean} repoFilter
     */
    constructor(public repoFilter: RepoFilter = AllRepos) {
    }

    protected repoFinder(): RepoFinder {
        return this.local ? allReposInTeam(this.cwd()) : allReposInTeam();
    }

    /**
     * Return the current working directory to use for finding local repos
     * @return {string}
     */
    protected cwd(): string {
        return this.dir || shell.pwd();
    }

}
