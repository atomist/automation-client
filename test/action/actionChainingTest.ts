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

});
