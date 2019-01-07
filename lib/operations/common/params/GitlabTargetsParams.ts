import {
    MappedParameter,
    MappedParameters,
    Parameter,
    Parameters,
} from "../../../decorators";
import { ValidationResult } from "../../../SmartParameters";
import { GitlabPrivateTokenCredentials } from "../GitlabPrivateTokenCredentials";
import { GitlabRepoRef } from "../GitlabRepoRef";
import { ProjectOperationCredentials } from "../ProjectOperationCredentials";
import { TargetsParams } from "./TargetsParams";
import {
    GitBranchRegExp,
    GitShaRegExp,
} from "./validationPatterns";

@Parameters()
export class GitlabTargetsParams extends TargetsParams {

    @MappedParameter(MappedParameters.GitHubApiUrl, false)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubOwner, false)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository, false)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubUrl, false)
    public url: string;

    @Parameter({ description: "Ref", ...GitShaRegExp, required: false })
    public sha: string;

    @Parameter({ description: "Branch Defaults to 'master'", ...GitBranchRegExp, required: false })
    public branch: string = "master";

    @Parameter({ description: "regex", required: false })
    public repos: string = ".*";

    @Parameter({ description: "Repository visibility. 'public' or 'private", required: false })
    public visibility: "public" | "private";

    get credentials(): ProjectOperationCredentials {
        const creds: GitlabPrivateTokenCredentials = { privateToken: this.token };
        return creds;
    }

    get description(): string {
        return "Gitlab";
    }

    constructor(public token: string) {
        super();
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * @return {RepoRef}
     */
    get repoRef(): GitlabRepoRef {
        return (!!this.owner && !!this.repo && !this.usesRegex) ?
            GitlabRepoRef.from({
                owner: this.owner,
                repo: this.repo,
                sha: this.sha,
                branch: this.branch,
                rawApiBase: this.apiUrl,
                gitlabRemoteUrl: this.url,
            }) :
            undefined;
    }

    public bindAndValidate(): ValidationResult {
        if (!this.repo) {
            if (!this.repos) {
                return {
                    message:
                        "If not executing in a mapped channel, must identify a repo via: `targets.owner`" +
                        "and `targets.repo`, or a repo name regex via `targets.repos`",
                };
            }
            this.repo = this.repos;
        }
    }

}
