import "mocha";

import * as assert from "power-assert";

import { fromListRepoFinder, fromListRepoLoader } from "../../../src/operations/common/fromProjectList";
import { editAll } from "../../../src/operations/edit/editAll";
import { CustomExecutionEditMode } from "../../../src/operations/edit/editModes";
import { ProjectEditor, successfulEdit } from "../../../src/operations/edit/projectEditor";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

describe("editAll", () => {

    it("should edit repo", done => {
        const editor: ProjectEditor = p => {
            p.addFileSync("thing", "1");
            return Promise.resolve(successfulEdit(p, true));
        };

        const projects = [
            new InMemoryProject(""),
        ];

        const projectsEdited: Project[] = [];

        const cei: CustomExecutionEditMode = {
            message : "Thing",
            edit: p => {
                projectsEdited.push(p);
                return Promise.resolve(successfulEdit(p));
            },
        };

        editAll(null, null, editor, cei,
            fromListRepoFinder(projects),
            p => true,
            fromListRepoLoader(projects))
            .then(edits => {
                assert(edits.length === projects.length);
                assert(!edits.some(e => !e.edited));
                assert.deepEqual(projectsEdited, projects);
                done();
            }).catch(done);

    });

});
