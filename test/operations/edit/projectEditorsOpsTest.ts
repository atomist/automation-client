import "mocha";
import * as assert from "power-assert";
import { ProjectEditor, successfulEdit } from "../../../src/operations/edit/projectEditor";
import { chainEditors, NoOpEditor } from "../../../src/operations/edit/projectEditorOps";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { tempProject } from "../../project/utils";

describe("editor chaining", () => {

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

    it("should allow project function to be included", done => {
        const project = new InMemoryProject();
        const projectFunction = p => {
            return p.addFile("thing", "1");
        };
        const editorChain = chainEditors(projectFunction, NoOpEditor);
        editorChain(project, null)
            .then(r => {
                assert(r.edited);
                done();
            }).catch(done);
    });

});
