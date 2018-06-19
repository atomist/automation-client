import { ProjectOperationCredentials } from "../ProjectOperationCredentials";
import { RepoFilter } from "../repoFilter";
import {
    RemoteRepoRef,
    RepoRef,
} from "../RepoId";
import { Credentialed } from "./Credentialed";
import { GitHubNameRegExp } from "./gitHubPatterns";
import { RemoteLocator } from "./RemoteLocator";

/**
 * Base parameters for working with repo(s).
 * Allows use of regex.
 */
export abstract class TargetsParams implements Credentialed, RepoRef, RemoteLocator {

    public abstract owner;

    /**
     * Repo name. May be a repo name or a regex.
     */
    public abstract repo;

    public abstract sha;

    public abstract credentials: ProjectOperationCredentials;

    get usesRegex() {
        return !!this.repo && !GitHubNameRegExp.pattern.test(this.repo);
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
            return new RegExp(this.repo).test(rr.repo);
        }
        return false;
    }

}
