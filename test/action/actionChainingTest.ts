import * as stringify from "json-stringify-safe";
import "mocha";
import * as assert from "power-assert";
import { promisify } from "util";
import { actionChain, actionChainWithCombiner, NoAction } from "../../src/action/actionOps";
import { ActionResult } from "../../src/action/ActionResult";
import { GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { InMemoryProject } from "../../src/project/mem/InMemoryProject";

class Person {
    constructor(public name: string) {
    }
}

describe("action chaining", () => {

    it("should make no op with empty actionChain", done => {
        const ac = actionChain();
        const p = new Person("tom");
        ac(p)
            .then(r => {
                assert(r.success);
                assert(r.target === p);
                done();
            }).catch(done);
    });

    it("should not edit with no op step", done => {
        const p = new Person("tom");
        const editorChain = actionChain(NoAction);
        editorChain(p)
            .then(r => {
                assert(r.success);
                assert(r.target === p);
                done();
            }).catch(done);
    });

    it("should edit with real editor", done => {
        const project = new InMemoryProject(new GitHubRepoRef("org", "name"));
        const editor = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = actionChain(editor, p => Promise.resolve(p));
        editorChain(project)
            .then(r => {
                assert(!!r.target.findFileSync("thing"));
                done();
            }).catch(done);
    });

    it("should work in both directions", done => {
        const project = new InMemoryProject(new GitHubRepoRef("org", "name"));
        const editor = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = actionChain(p => Promise.resolve(p), editor);
        editorChain(project)
            .then(r => {
                assert(!!r.target.findFileSync("thing"));
                done();
            }).catch(done);
    });
    // how is this in any way different from the previous two except a variable name?
    it("should allow project function to be included", done => {
        const project = new InMemoryProject(new GitHubRepoRef("org", "name"));
        const projectFunction = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = actionChain(projectFunction, p => Promise.resolve(p));
        editorChain(project)
            .then(r => {
                assert(!!r.target.findFileSync("thing"));
                done();
            }).catch(done);
    });

    it("should call actions in sequence", done => {
        const f1 = (s: string) => Promise.resolve(s + " and 1");
        const f2 = (s: string) => Promise.resolve(s + " and 2");
        const chain = actionChain(f1, f2);
        chain("Southwest").then(result => {
            assert(result.success);
            assert(result.target === "Southwest and 1 and 2");
            done();
        }).catch(done);
    });

    it("should catch errors and return failure", done => {
        const f1 = (s: string) => Promise.resolve(s + " yeah!");
        const f2 = (s: string) => { throw new Error("What is " + s); };

        const chain = actionChain(f1, f2);
        chain("Southwest").then(result => {
            assert(result.success === false);
            assert(result.error.message === "What is Southwest yeah!");
            assert(result.errorStep === "f2");
            done();
        }).catch(done);

    });

    it("should catch errors in the first function", done => {
        const f2 = (s: string) => Promise.resolve(s + " yeah!");
        const f1 = (s: string) => { throw new Error("What is " + s); };

        const chain = actionChain(f1, f2);
        chain("Southwest").then(result => {
            assert(result.success === false);
            assert(result.error.message === "What is Southwest");
            assert(result.errorStep === "f1");
            done();
        }).catch(done);

    });

    interface BonusActionResult extends ActionResult<string> {
        bonusField: string;
    }
    it("should allow for custom combination of results", done => {
        const f1 = (s: string) => Promise.resolve({ success: true, target: s + " and 1", bonusField: "yes" });
        const f2 = (s: string) => Promise.resolve({ success: true, target: s + " and 2", bonusField: " and no" });

        const chain = actionChainWithCombiner<string, BonusActionResult>((r1, r2) =>
            ({ ...r1, ...r2, bonusField: (r1 as any).bonusField + (r2 as any).bonusField }), f1, f2);
        chain("Southwest").then(result => {
            assert(result.success);
            assert(result.target === "Southwest and 1 and 2");
            assert((result as BonusActionResult).bonusField === "yes and no");
            done();
        }).catch(done);
    });

    const sleepPlease: (timeout: number) => Promise<void> =
        promisify((a, b) => setTimeout(b, a));

    it("runs all of them for realz", done => {
        const report = [];
        const f1 = (s: string) => {
            return sleepPlease(50).then(_ => {
                report.push("f1");
                return Promise.resolve({ success: true, target: s + " and 1" });
            });
        };
        const f2 = (s: string) => {
            return sleepPlease(50).then(_ => {
                report.push("f2");
                return Promise.resolve({ success: true, target: s + " and 2" });
            });
        };
        const chain = actionChain<string>(f1, f2);
        chain("Southwest").then(result => {
            if (!result.success) {
                done(result.error);
            }
            assert(result.success);
            assert(report.length === 2, "Report was: " + stringify(report));
            assert(result.target === "Southwest and 1 and 2");
            done();
        }).catch(done);
    }).timeout(20000);

});
