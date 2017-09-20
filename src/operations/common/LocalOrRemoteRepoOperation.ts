import { MappedParameter } from "@atomist/rug/operations/Decorators";
import { defaultRepoLoader } from "../common/DefaultRepoLoader";
import { LocalOrRemote } from "./LocalOrRemote";
import { RepoLoader } from "./repoLoader";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemoteRepoOperation extends LocalOrRemote {

    @MappedParameter("atomist://github_token")
    protected githubToken: string;

    protected repoLoader(): RepoLoader {
        return defaultRepoLoader(this.githubToken);
    }

}
