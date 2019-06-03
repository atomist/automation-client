import * as assert from "power-assert";

import {
    GitCommandGitProject,
    isValidSHA1,
} from "../../../lib/project/git/GitCommandGitProject";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";

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

    describe("isValidSHA1", () => {

        it("should validate a SHA1", () => {
            const ss = [
                "1234567890abcdef1234567890abcdef12345678",
                "33e38b6c72788866004acfd736ed12b2e9529ea7",
                "f6dee8b272248aab385f840f4799a707dcb7af26",
                "b8947fc4370c99d3137d7d6b6e20ec26c8036370",
            ];
            ss.forEach(s => assert(isValidSHA1(s)));
        });

        it("should not validate invalid SHA1", () => {
            const ss = [
                // tslint:disable-next-line:no-null-keyword
                null,
                undefined,
                "",
                "master",
                "some-branch",
                "other/branch",
                "b8947fc4370c99d3137d7d6b6e20ec26c8036370a",
                "masterb8947fc4370c99d3137d7d6b6e20ec26c8036370",
            ];
            ss.forEach(s => assert(!isValidSHA1(s)));
        });

    });

});
