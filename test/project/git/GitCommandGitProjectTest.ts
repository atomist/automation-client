import "mocha";
import * as assert from "power-assert";

import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";

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
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                pushCmd = args.join(" ");
                return Promise.resolve({ target: gp });
            };
            await gp.push();
            assert(pushCmd === "push --set-upstream origin master");
        });

        it("should execute a force push", async () => {
            let pushCmd: string;
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                pushCmd = args.join(" ");
                return Promise.resolve({ target: gp });
            };
            await gp.push({ force: true });
            assert(pushCmd === "push --force --set-upstream origin master");
        });

        it("should be quiet and not verbose", async () => {
            let pushCmd: string;
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                pushCmd = args.join(" ");
                return Promise.resolve({ target: gp });
            };
            await gp.push({ quiet: true, verbose: false });
            assert(pushCmd === "push --quiet --no-verbose --set-upstream origin master");
        });

        it("should be treat --force-with-lease as a boolean", async () => {
            let pushCmd: string;
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                pushCmd = args.join(" ");
                return Promise.resolve({ target: gp });
            };
            await gp.push({ force_with_lease: true });
            assert(pushCmd === "push --force-with-lease --set-upstream origin master");
        });

        it("should be treat --force-with-lease as a string", async () => {
            let pushCmd: string;
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                pushCmd = args.join(" ");
                return Promise.resolve({ target: gp });
            };
            await gp.push({ force_with_lease: "master" });
            assert(pushCmd === "push --force-with-lease=master --set-upstream origin master");
        });

        it("should push to the provided remote", async () => {
            let pushCmd: string;
            const gh = GitCommandGitProject.fromProject(p, c);
            gh.branch = "gh-pages";
            gh.remote = "github";
            (gh as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                pushCmd = args.join(" ");
                return Promise.resolve({ target: gp });
            };
            await gh.push({ force: true });
            assert(pushCmd === "push --force github gh-pages");
        });

    });

    describe("checkout", () => {

        const p = InMemoryProject.of();
        (p as any).baseDir = "DRAM";
        (p as any).id = {
            sha: "master",
        };
        const c = { token: "blah" };
        const gp = GitCommandGitProject.fromProject(p, c);

        it("should checkout and set branch", async () => {
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                return Promise.resolve({ target: gp });
            };
            gp.branch = "master";
            const branch = "16-horsepower";
            await gp.checkout(branch);
            assert(gp.branch === branch);
        });

        it("should not set branch if checkout fails", async () => {
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                return Promise.reject(new Error("testing"));
            };
            gp.branch = "master";
            const branch = "16-horsepower";
            let err: string;
            try {
                await gp.checkout(branch);
            } catch (e) {
                err = e.message;
            }
            assert(gp.branch === "master");
            assert(err === "testing");
        });

    });

    describe("createBranch", () => {

        const p = InMemoryProject.of();
        (p as any).baseDir = "DRAM";
        (p as any).id = {
            sha: "master",
        };
        const c = { token: "blah" };
        const gp = GitCommandGitProject.fromProject(p, c);

        it("should create and set branch", async () => {
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                return Promise.resolve({ target: gp });
            };
            gp.branch = "master";
            const branch = "16-horsepower";
            await gp.createBranch(branch);
            assert(gp.branch === branch);
        });

        it("should not set branch if create fails", async () => {
            (gp as any).gitInProjectBaseDir = (args: string[]): Promise<any> => {
                return Promise.reject(new Error("testing"));
            };
            gp.branch = "master";
            const branch = "16-horsepower";
            let err: string;
            try {
                await gp.createBranch(branch);
            } catch (e) {
                err = e.message;
            }
            assert(gp.branch === "master");
            assert(err === "testing");
        });

    });

});
