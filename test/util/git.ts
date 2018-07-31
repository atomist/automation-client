import { SpawnOptions } from "child_process";
import * as fs from "fs-extra";
import "mocha";
import * as path from "path";
import * as assert from "power-assert";
import { obtainGitInfo } from "../../src/internal/env/gitInfo";

/**
 * Command-line options for git.
 */
export type GitOptions = Pick<SpawnOptions, "cwd">;

/**
 * Generate git-info.json for automation client.
 *
 * @param opts see GitOptions
 * @return integer return value
 */
export async function git(opts: GitOptions): Promise<number> {
    const gitInfoName = "git-info.json";
    const gitInfoPath = path.join(opts.cwd, gitInfoName);
    try {
        const gitInfo = await obtainGitInfo(opts.cwd);
        await fs.writeJson(gitInfoPath, gitInfo, { spaces: 2, encoding: "utf8" });
    } catch (e) {
        assert.fail(`Failed to write git information to '${gitInfoPath}': ${e.message}`);
        return 1;
    }
    return 0;
}

describe("git", () => {

    it("should write git-info.json", () => {
        git({ cwd: process.cwd() });
    });

});
