import { runCommand } from "../../action/cli/commandLine";

export function obtainGitInfo(directory: string): Promise<GitInformation> {

    return Promise.all([
        runCommand("git rev-parse HEAD", { cwd: directory }),
        runCommand("git rev-parse --abbrev-ref HEAD", { cwd: directory }),
        runCommand("git remote get-url origin", { cwd: directory }),
    ])
        .then(results => {
            return Promise.resolve({
                sha: results[0].stdout.trim(),
                branch: results[1].stdout.trim(),
                repository: results[2].stdout.trim(),
            });
        });
}

export interface GitInformation {
    sha: string;
    branch: string;
    repository: string;
}
