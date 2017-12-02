import { Parameters, Secret, Secrets } from "../../../decorators";
import { RepoRef } from "../RepoId";

/**
 * Base parameters for working with GitHub repo(s)
 */
@Parameters()
export abstract class GitHubParams implements RepoRef {

    @Secret(Secrets.userToken(["repo", "user"]))
    public githubToken: string;

    public abstract owner;

    public abstract repo;

    public abstract sha;

}
