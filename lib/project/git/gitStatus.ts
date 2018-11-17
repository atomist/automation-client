/*
 * Copyright © 2018 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { execPromise } from "../../util/child_process";

export interface GitStatus {
    isClean: boolean;
    ignoredChanges: string[];
    raw: string;
    sha: string;
    branch: string;
    upstream?: {
        branch: string;
        inSync: boolean;
    };
}

export function isFullyClean(gs: GitStatus): boolean {
    return gs.isClean && gs.ignoredChanges.length === 0;
}

export async function runStatusIn(baseDir: string): Promise<GitStatus> {
    const branch = await determineBranch(baseDir);
    const upstreamData = await collectUpstream(baseDir, branch);
    const shaData = await collectFullSha(baseDir);
    const cleanlinessData = await collectCleanliness(baseDir);
    const ignoredChangeData = await collectIgnoredChanges(baseDir);
    return {
        branch,
        ...ignoredChangeData,
        ...cleanlinessData,
        ...shaData,
        ...upstreamData,
    };
}

async function determineBranch(baseDir: string): Promise<string> {
    const branchNameResult = await execPromise("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: baseDir });
    return branchNameResult.stdout.trim();
}

async function collectCleanliness(baseDir: string): Promise<{ isClean: boolean }> {
    const porcelainStatusResult = await execPromise("git", ["status", "--porcelain"], { cwd: baseDir });
    const raw = porcelainStatusResult.stdout;
    return { isClean: (raw.length) === 0 };
}

async function collectIgnoredChanges(baseDir: string): Promise<{ ignoredChanges: string[], raw: string }> {

    const porcelainStatusResult = await execPromise("git", ["status", "--porcelain", "--ignored"], { cwd: baseDir });
    const raw = porcelainStatusResult.stdout;
    const ignored = raw.trim()
        .split("\n")
        .filter(s => s.startsWith("!"))
        .map(s => s.substring(3));
    return {
        raw,
        ignoredChanges: ignored,
    };
}

async function collectFullSha(baseDir: string, commit: string = "HEAD"): Promise<{ sha: string }> {
    const result = await execPromise("git", ["rev-list", "-1", commit, "--"], { cwd: baseDir });
    return {
        sha: result.stdout.trim(),
    };
}

async function collectUpstream(baseDir: string, branch: string): Promise<{ upstream?: { branch: string, inSync: boolean } }> {
    const branchArgs = ["for-each-ref", "--format", "%(upstream:short) %(upstream:trackshort)", `refs/heads/${branch}`];
    const branchResult = await execPromise("git", branchArgs, { cwd: baseDir });
    const branchResultParts = branchResult.stdout.trim().split(" ");
    const upstream = branchResultParts.length > 0 ?
        { branch: branchResultParts[0], inSync: branchResultParts[1] === "=" }
        : undefined;
    return { upstream };
}
