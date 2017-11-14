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

    return runIn(baseDir, "git rev-parse --abbrev-ref HEAD")
        .then(branchNameResult => {
            const branch = branchNameResult.stdout.trim();
            return runIn(baseDir,
                `git branch --list ${branch} --format "%(objectname) %(upstream:short) %(upstream:trackshort)"`)
                .then(branchResult => {
                    const branchResultParts = branchResult.stdout.trim().split(" ");
                    const sha = branchResultParts[0];
                    const upstream = branchResultParts.length > 1 ?
                        { branch: branchResultParts[1], inSync: branchResultParts[2] === "=" }
                        : undefined;
                    return runIn(baseDir, "git status --porcelain --ignored")
                        .then(porcelainStatusResult => {
                            const raw = porcelainStatusResult.stdout;
                            if (raw.length === 0) {
                                return Promise.resolve({ isClean: true, branch, sha, upstream });
                            } else {
                                return Promise.resolve({ isClean: false, raw, branch, sha, upstream });
                            }
                        });
                });
        });
}

function runIn(baseDir: string, command: string) {
    return runCommand(command, { cwd: baseDir });
}
