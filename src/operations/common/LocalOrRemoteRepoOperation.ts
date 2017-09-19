import { MappedParameter } from "@atomist/rug/operations/Decorators";
import { Parameter } from "../../decorators";
import { defaultRepoLoader } from "../common/DefaultRepoLoader";
import { RepoId } from "../common/RepoId";
import { LocalOrRemote } from "./LocalOrRemote";
import { RepoLoader } from "./repoLoader";

/**
 * Convenient superclass that can handle operating on projects transparently locally or from GitHub.
 */
export abstract class LocalOrRemoteRepoOperation extends LocalOrRemote {

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
        super();
    }

    protected repoLoader(): RepoLoader {
        return defaultRepoLoader(this.githubToken);
    }

}
