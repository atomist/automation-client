import { Parameters, Secret, Secrets } from "../../../decorators";

import { ProjectOperationCredentials } from "../ProjectOperationCredentials";
import { RepoFilter } from "../repoFilter";
import { TargetsParams } from "./TargetsParams";

/**
 * Base parameters for working with GitHub repo(s).
 * Allows use of regex.
 */
@Parameters()
export abstract class GitHubTargetsParams extends TargetsParams {

    get credentials(): ProjectOperationCredentials {
        return { token: this.githubToken };
    }

    @Secret(Secrets.userToken(["repo", "user"]))
    private githubToken: string;

}
