import { microgrammar } from "@atomist/microgrammar";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { Project } from "../../../lib/project/Project";
import { gatherFromFiles } from "../../../lib/project/util/projectUtils";
import { findMatches } from "../../../lib/tree/ast/astUtils";
import { MicrogrammarBasedFileParser } from "../../../lib/tree/ast/microgrammar/MicrogrammarBasedFileParser";

let project: Project;

async function getProject(): Promise<Project> {
    if (project) {
        return project;
    }
    project = await GitCommandGitProject.cloned(undefined, new GitHubRepoRef(
        "xylocarp-whelky", "spring-boot"));
    return project;
}

/**
 * Pre optimization, with 6000 files, 42K imports
 * file countx5: 5562ms
 * look for one filex5: 1ms
 * look for globx5: 5491ms
 * read from globx5: 7552ms
 * parse globx5: 21510ms
 */
describe("disk read performance", () => {

    it("should count files", async () => {
        await time("do it", async () => {
            const p = await getProject();
            await time("file count", async () => {
                const count = await p.totalFileCount();
            }, 5);
        });
    }).timeout(200000);

    it("should look for file", async () => {
        const p = await getProject();
        await time("look for one file", async () => {
            const yes = await p.hasFile("pom.xml");
        }, 5);
    }).timeout(200000);

    it("should look for glob", async () => {
        const p = await getProject();
        await time("look for glob", async () => {
            await gatherFromFiles(p, "**/*.java", async f => true);
        }, 5);
    }).timeout(200000);

    it("should read glob", async () => {
        const p = await getProject();
        await time("read from glob", async () => {
            await gatherFromFiles(p, "**/*.java", async f => {
                return f.getContent();
            });
        }, 5);
    }).timeout(200000);

    it("should parse glob", async () => {
        const mg = microgrammar({
            _import: "import",
            fqn: /[a-z0-9A-Z\.]+/,
        });
        const p = await getProject();
        await time("parse glob", async () => {
            const matches = await findMatches(p, new MicrogrammarBasedFileParser("x", "x", mg),
                "**/*.java", "//fqn");
            // console.log("count=" + matches.length);
        }, 5);
    }).timeout(200000);

});

async function time(name: string,
                    what: () => Promise<any>,
                    n: number = 1): Promise<number> {
    const st = new Date().getTime();
    for (let i = 0; i < n; i++) {
        await what();
    }
    const et = new Date().getTime();
    const millis = et - st;
    console.log(`${name}x${n}: ${millis}ms`);
    return millis;
}
