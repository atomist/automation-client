import { Secret } from "../../decorators";
import { Secrets } from "../../Handlers";
import { defaultRepoLoader } from "./defaultRepoLoader";
import { LocalOrRemote } from "./LocalOrRemote";
import { RepoLoader } from "./repoLoader";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemoteRepoOperation extends LocalOrRemote {

    @Secret(Secrets.OrgToken)
    protected githubToken: string;

    protected repoLoader(): RepoLoader {
        return defaultRepoLoader(this.githubToken);
    }

}
