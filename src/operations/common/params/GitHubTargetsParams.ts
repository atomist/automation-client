import { Parameters, Secret, Secrets } from "../../../decorators";
import { GitHubRepoRef } from "../GitHubRepoRef";
import { RepoRef } from "../RepoId";
import { GitHubNameRegExp } from "./gitHubPatterns";

import { RepoFilter } from "../repoFilter";

/**
 * Base parameters for working with GitHub repo(s).
 * Allows use of regex.
 */
@Parameters()
export abstract class GitHubTargetsParams {

    @Secret(Secrets.userToken(["repo", "user"]))
    public githubToken: string;

    public abstract owner;

    /**
     * Repo name. May be a repo name or a regex.
     */
    public abstract repo;

    public abstract sha;

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * @return {RepoRef}
     */
    get repoRef(): GitHubRepoRef {
        return (!!this.owner && !!this.repo && !this.usesRegex) ?
            new GitHubRepoRef(this.owner, this.repo, this.sha) :
            undefined;
    }

    get usesRegex() {
        return !!this.repo && !GitHubNameRegExp.pattern.test(this.repo);
    }

    /**
     * If we're not tied to a single repo ref, test this RepoRef
     * @param {RepoRef} rr
     * @return {boolean}
     */
    public test: RepoFilter = rr => {
        if (this.repoRef) {
            const my = this.repoRef;
            return my.owner === rr.owner && my.repo === rr.repo;
        }
        if (this.usesRegex) {
            return new RegExp(this.repo).test(rr.repo);
        }
        return false;
    }

}
