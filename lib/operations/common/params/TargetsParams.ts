import { ProjectOperationCredentials } from "../ProjectOperationCredentials";
import { RepoFilter } from "../repoFilter";
import {
    RemoteRepoRef,
    RepoRef,
} from "../RepoId";
import { Credentialed } from "./Credentialed";
import { RemoteLocator } from "./RemoteLocator";
import { GitHubNameRegExp } from "./validationPatterns";

/**
 * Base parameters for working with repo(s).
 * Allows use of regex.
 */
export abstract class TargetsParams implements Credentialed, RemoteLocator {

    public abstract owner: string;

    /**
     * Repo name. May be a repo name or a string containing a regular expression.
     */
    public abstract repo: string;

    public abstract sha: string;

    public abstract branch: string;

    public abstract credentials: ProjectOperationCredentials;

    get usesRegex(): boolean {
        return !!this.repo && (!GitHubNameRegExp.pattern.test(this.repo) || !this.owner);
    }

    public abstract repoRef: RemoteRepoRef;

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
            if (this.owner && this.owner !== rr.owner) {
                return false;
            }
            return new RegExp(this.repo).test(rr.repo);
        }
        return false;
    }

}
