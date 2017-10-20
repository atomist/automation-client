import "mocha";
import * as assert from "power-assert";
import { actionChain, NoAction } from "../../src/action/actionOps";
import { ProjectOp } from "../../src/operations/edit/projectEditorOps";
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
        const project = new InMemoryProject("");
        const editor: ProjectOp = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = actionChain(editor, p => Promise.resolve(p));
        editorChain(project)
            .then(r => {
                assert(!!r.target.findFileSync("thing"));
                done();
            }).catch(done);
    });

    // this looks identical to the previous test
    it("should work in both directions", done => {
        const project = new InMemoryProject("");
        const editor: ProjectOp = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = actionChain(editor, p => Promise.resolve(p));
        editorChain(project)
            .then(r => {
                assert(!!r.target.findFileSync("thing"));
                done();
            }).catch(done);
    });
    // how is this in any way different from the previous two except a variable name?
    it("should allow project function to be included", done => {
        const project = new InMemoryProject("");
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

    it("should call actions in sequence", (done) => {
        const f1 = (s: string) => Promise.resolve(s + " and 1");
        const f2 = (s: string) => Promise.resolve(s + " and 2");
        const chain = actionChain(f1, f2)
        chain("Southwest").then(result => {
            assert(result.success);
            assert(result.target === "Southwest and 1 and 2");
            done();
        }).catch(done)
    })

    it("should catch errors and return failure", (done) => {
        const f1 = (s: string) => Promise.resolve(s + " yeah!");
        const f2 = (s: string) => { throw new Error("What is " + s); }

        const chain = actionChain(f1, f2)
        chain("Southwest").then(result => {
            assert(result.success === false);
            assert(result.error.message === "What is Southwest yeah!");
            assert(result.errorStep === "f2");
            done();
        }).catch(done)

    });

});
