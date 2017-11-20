import { runCommand } from "../../action/cli/commandLine";

export interface GitStatus {
    isClean: boolean;
    raw?: string;
    sha: string;
    branch: string;
    upstream?: {
        branch: string;
        inSync: boolean;
    };
}

export function runStatusIn(baseDir: string): Promise<GitStatus> {

    return determineBranch(baseDir)
        .then(branch => collectUpstream(baseDir, branch)
            .then(upstreamData => collectFullSha(baseDir)
                .then(shaData => collectCleanliness(baseDir)
                    .then(cleanlinessData =>
                        Promise.resolve({
                            branch,
                            ...cleanlinessData,
                            ...shaData,
                            ...upstreamData
                        })))))
}

function determineBranch(baseDir: string): Promise<string> {
    return runIn(baseDir, "git rev-parse --abbrev-ref HEAD")
        .then(branchNameResult => {
            return branchNameResult.stdout.trim();
        });
}

function collectCleanliness(baseDir: string): Promise<{ isClean: boolean }> {
    return runIn(baseDir, "git status --porcelain --ignored")
        .then(porcelainStatusResult => {
            const raw = porcelainStatusResult.stdout;
            return { isClean: raw.length === 0 }
        });
}


function collectFullSha(baseDir: string, commit: string = "HEAD"): Promise<{ sha: string }> {
    return runIn(baseDir, `git rev-list -1 ${commit} --`).then(result => {
        return {
            sha: result.stdout.trim(),
        }
    });
}

function collectUpstream(baseDir: string, branch: string): Promise<{ upstream?: { branch: string, inSync: boolean } }> {
    return runIn(baseDir,
        `git for-each-ref --format "%(upstream:short) %(upstream:trackshort)" refs/heads/${branch}`)
        .then(branchResult => {
            const branchResultParts = branchResult.stdout.trim().split(" ");
            const upstream = branchResultParts.length > 0 ?
                { branch: branchResultParts[0], inSync: branchResultParts[1] === "=" }
                : undefined;
            return { upstream };
        });
}

function runIn(baseDir: string, command: string) {
    return runCommand(command, { cwd: baseDir });
}
