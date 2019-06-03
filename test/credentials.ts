import { GitHubRepoRef } from "../lib/operations/common/GitHubRepoRef";

export const GitHubToken: string = "NOT_A_LEGIT_TOKEN";
export const Creds = { token: GitHubToken };

function visibility(): "public" | "private" {
    const vis = process.env.GITHUB_VISIBILITY || "public";
    if (vis === "public" || vis === "private") {
        return vis;
    }
    throw new Error(`GITHUB_VISIBILITY must be 'public' or 'private', yours is '${vis}'`);
}

export const TestRepositoryVisibility = visibility();

export const ExistingRepoOwner = "atomisthqtest";
export const ExistingRepoName = "this-repository-exists";
export const ExistingRepoSha = "68ffbfaa4b6ddeff563541b4b08d3b53060a51d8";
// export const ExistingRepoSha = "c756508d31484d67e3b13805608a1be4e928900c";
export const ExistingRepoRef = new GitHubRepoRef(ExistingRepoOwner, ExistingRepoName, ExistingRepoSha);
export const SeedRepoOwner = "atomist-seeds";
export const SeedRepoName = "spring-rest";
export const SeedRepoSha = "1c097a4897874b08e3b3ddb9675a1ac460ae46de";
export const SeedRepoRef = new GitHubRepoRef(SeedRepoOwner, SeedRepoName, SeedRepoSha);
