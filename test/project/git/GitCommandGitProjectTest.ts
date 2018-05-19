import "mocha";
import * as assert from "power-assert";

import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

describe("GitCommandGitProject", () => {

    describe("push", () => {

        const p = InMemoryProject.of();
        (p as any).baseDir = "DRAM";
        (p as any).id = {
            sha: "master",
        };
        const c = { token: "blah" };
        const gp = GitCommandGitProject.fromProject(p, c);

        it("should execute a clean push", async () => {
            let pushCmd: string;
            (gp as any).runCommandInCurrentWorkingDirectory = (cmd: string): Promise<typeof gp> => {
                pushCmd = cmd;
                return Promise.resolve(gp);
            };
            await gp.push();
            assert(pushCmd === "git push --set-upstream origin master");
        });

        it("should execute a force push", async () => {
            let pushCmd: string;
            (gp as any).runCommandInCurrentWorkingDirectory = (cmd: string): Promise<typeof gp> => {
                pushCmd = cmd;
                return Promise.resolve(gp);
            };
            await gp.push({ force: true });
            assert(pushCmd === "git push --force --set-upstream origin master");
        });

        it("should be quiet and not verbose", async () => {
            let pushCmd: string;
            (gp as any).runCommandInCurrentWorkingDirectory = (cmd: string): Promise<typeof gp> => {
                pushCmd = cmd;
                return Promise.resolve(gp);
            };
            await gp.push({ quiet: true, verbose: false });
            assert(pushCmd === "git push --quiet --no-verbose --set-upstream origin master");
        });

        it("should be treat --force-with-lease as a boolean", async () => {
            let pushCmd: string;
            (gp as any).runCommandInCurrentWorkingDirectory = (cmd: string): Promise<typeof gp> => {
                pushCmd = cmd;
                return Promise.resolve(gp);
            };
            await gp.push({ force_with_lease: true });
            assert(pushCmd === "git push --force-with-lease --set-upstream origin master");
        });

        it("should be treat --force-with-lease as a string", async () => {
            let pushCmd: string;
            (gp as any).runCommandInCurrentWorkingDirectory = (cmd: string): Promise<typeof gp> => {
                pushCmd = cmd;
                return Promise.resolve(gp);
            };
            await gp.push({ force_with_lease: "master" });
            assert(pushCmd === "git push --force-with-lease=master --set-upstream origin master");
        });

        it("should push to the provided remote", async () => {
            let pushCmd: string;
            const gh = GitCommandGitProject.fromProject(p, c);
            gh.branch = "gh-pages";
            gh.remote = "github";
            (gh as any).runCommandInCurrentWorkingDirectory = (cmd: string): Promise<typeof gh> => {
                pushCmd = cmd;
                return Promise.resolve(gp);
            };
            await gh.push({ force: true });
            assert(pushCmd === "git push --force github gh-pages");
        });

    });

});
