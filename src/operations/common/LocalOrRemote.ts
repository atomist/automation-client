import * as shell from "shelljs";

import { MappedParameter } from "@atomist/rug/operations/Decorators";
import { Parameter } from "../../decorators";
import { allReposInOrg } from "../common/AllReposInOrgRepoFinder";
import { RepoFinder } from "../common/RepoFinder";
import { RepoId } from "../common/RepoId";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemote {

    @Parameter({
        displayName: "local",
        displayable: false,
        description: "Should the editor run locally or query Atomist for repos?",
        pattern: /^(?:true|false)$/,
        validInput: "Boolean",
        required: false,
        type: "boolean",
    })
    public local: boolean = false;

    @MappedParameter("atomist://github_token")
    protected githubToken: string;

    constructor(public repoFilter: (r: RepoId) => boolean = r => true) {
    }

    protected repoFinder(): RepoFinder {
        return this.local ? allReposInOrg(this.cwd()) : allReposInOrg();
    }

    /**
     * Return the current working directory to use for finding local repos
     * @return {string}
     */
    protected cwd() {
        return shell.pwd();
    }

}
