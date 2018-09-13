import "mocha";
import * as assert from "power-assert";
import {
    ProjectEditor,
    SimpleProjectEditor,
    successfulEdit,
} from "../../../lib/operations/edit/projectEditor";
import {
    chainEditors,
    NoOpEditor,
} from "../../../lib/operations/edit/projectEditorOps";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { Project } from "../../../lib/project/Project";
import { tempProject } from "../../project/utils";

describe("editor chaining", () => {

    it("should allow invoking simple ProjectEditor with single argument", done => {
        // Check for compilation
        const spe: SimpleProjectEditor = (p: Project) => Promise.resolve(p);
        const np = InMemoryProject.of();
        spe(np).then(r => {
            assert(r === np);
            done();
        }).catch(done);
    });

    it("should make no op with empty chainEditors", done => {
        const project = tempProject();
        const editorChain = chainEditors();
        editorChain(project, null, null)
            .then(r => {
                assert(!r.edited);
                done();
            }).catch(done);
    });

    it("should not edit with no op editor", done => {
        const project = tempProject();
        const editorChain = chainEditors(NoOpEditor);
        editorChain(project, null, null)
            .then(r => {
                assert(!r.edited);
                done();
            }).catch(done);
    });

    it("should edit with real editor", done => {
        const project = new InMemoryProject();
        const editor: ProjectEditor = p => {
            p.addFileSync("thing", "1");
            return Promise.resolve(successfulEdit(p, true));
        };
        const editorChain = chainEditors(editor, NoOpEditor);
        editorChain(project, null)
            .then(r => {
                assert(r.edited);
                assert(!!project.findFileSync("thing"));
                done();
            }).catch(done);
    });

    it("should edit with promise editor", done => {
        const project = new InMemoryProject();
        const editor = p => {
            p.addFileSync("thing", "1");
            return Promise.resolve(p);
        };
        const editorChain = chainEditors(editor, NoOpEditor);
        editorChain(project, null)
            .then(r => {
                assert(r.edited === undefined);
                assert(!!project.findFileSync("thing"));
                done();
            }).catch(done);
    });

    it("should work in both directions", done => {
        const project = new InMemoryProject();
        const editor: ProjectEditor = p => {
            p.addFileSync("thing", "1");
            return Promise.resolve(successfulEdit(p, true));
        };
        const editorChain = chainEditors(NoOpEditor, editor);
        editorChain(project, null)
            .then(r => {
                assert(r.edited);
                done();
            }).catch(done);
    });

    function failingOp(p: Project): Promise<Project> {
        return Promise.reject(new Error("This was supposed to fail"));
    }

    function happyOp(p: Project): Promise<Project> {
        return Promise.resolve(p);
    }

    it("should handle a series of project transforms", done => {
        const chain = chainEditors(happyOp, happyOp, happyOp);

        const project = new InMemoryProject();

        chain(project, null).then(res => {
            assert(res.success);
            done();
        }).catch(done);
    });

    it("should fail when project transforms fail a series of project transforms", done => {
        const chain = chainEditors(happyOp, failingOp, happyOp);

        const project = new InMemoryProject();

        chain(project, null).then(res => {
            assert(!res.success);
            assert(res.error.message === "This was supposed to fail");
            done();
        }).catch(done);
    });

    it("should allow project function to be included", done => {
        const project = new InMemoryProject();
        const projectFunction = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = chainEditors(projectFunction, NoOpEditor);
        editorChain(project, null)
            .then(r => {
                assert(r.edited === undefined);
                done();
            }).catch(done);
    });

    it("should allow project function to be included after editor", done => {
        const project = new InMemoryProject();
        const projectFunction = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = chainEditors(projectFunction, NoOpEditor, (p: Project) => Promise.resolve(p));
        editorChain(project, null)
            .then(r => {
                assert(r.edited === undefined);
                done();
            }).catch(done);
    });

});
