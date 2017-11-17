import { RemoteRepoRefSupport, RepoRef } from "./RepoId";

export const GitHubDotComBase = "https://api.github.com";

/**
 * GitHub repo ref
 */
export class GitHubRepoRef extends RemoteRepoRefSupport {

    constructor(owner: string,
                repo: string,
                sha: string = "master",
                public apiBase = GitHubDotComBase,
                path?: string) {
        super("github.com", owner, repo, sha, path);
    }

}

export function isGitHubRepoRef(rr: RepoRef): rr is GitHubRepoRef {
    const maybe = rr as GitHubRepoRef;
    return maybe && !!maybe.apiBase;
}
