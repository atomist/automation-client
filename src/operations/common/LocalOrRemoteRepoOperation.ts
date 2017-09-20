import { defaultRepoLoader } from "../common/DefaultRepoLoader";
import { LocalOrRemote } from "./LocalOrRemote";
import { RepoLoader } from "./repoLoader";
import { Secrets } from "../../Handlers";
import { Secret } from "../../decorators";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemoteRepoOperation extends LocalOrRemote {

    @Secret(Secrets.ORG_TOKEN)
    protected githubToken: string;

    protected repoLoader(): RepoLoader {
        return defaultRepoLoader(this.githubToken);
    }

}
