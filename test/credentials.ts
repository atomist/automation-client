function barf(): string {
    throw new Error("<please set GITHUB_TOKEN env variable>");
}

export const GitHubToken: string = process.env.GITHUB_TOKEN || barf();

function visibility(): "public" | "private" {
    const vis = process.env.GITHUB_VISIBILITY || "private";
    if (vis === "public" || vis === "private") {
        return vis;
    }
    throw new Error(`GITHUB_VISIBILITY must be public or private. yours is '${vis}'`);
}

export const TestRepositoryVisibility = visibility();
