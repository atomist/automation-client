import { defaultRepoLoader } from "./defaultRepoLoader";
import { LocalOrRemote } from "./LocalOrRemote";
import { RepoLoader } from "./repoLoader";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemoteRepoOperation extends LocalOrRemote {

    protected repoLoader(): RepoLoader {
        return defaultRepoLoader(this.githubToken);
    }

}
