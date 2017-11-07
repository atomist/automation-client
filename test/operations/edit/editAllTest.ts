import "mocha";

import * as assert from "power-assert";

import { fromListRepoFinder, fromListRepoLoader } from "../../../src/operations/common/fromProjectList";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { editAll } from "../../../src/operations/edit/editAll";
import { CustomExecutionEditMode } from "../../../src/operations/edit/editModes";
import { failedEdit, ProjectEditor, successfulEdit } from "../../../src/operations/edit/projectEditor";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

describe("editAll", () => {

    it("should edit repo", done => {
        class Params {
            constructor(public name: string) {}
        }

        const editor: ProjectEditor<Params> = (p, ctx, params) => {
            p.addFileSync("thing", "1");
            assert(!!params.name);
            return Promise.resolve(successfulEdit(p, true));
        };

        const projects = [
            new InMemoryProject(new GitHubRepoRef("org", "name")),
        ];

        const projectsEdited: Project[] = [];

        const cei: CustomExecutionEditMode = {
            message: "Thing",
            edit: (p, theEditor, ctx, params) => {
                projectsEdited.push(p);
                return theEditor(p, ctx, params);
            },
        };

        editAll(null, null, editor, cei,
            new Params("antechinus"),
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

    it("should edit repo", done => {

        const editor: ProjectEditor<{}> = (p, ctx, params) => {
            return Promise.resolve(failedEdit(p, new Error("this didn't work")));
        };

        const projects = [
            new InMemoryProject(new GitHubRepoRef("org", "name")),
        ];

        const projectsEdited: Project[] = [];

        const cei: CustomExecutionEditMode = {
            message: "Thing",
            edit: (p, theEditor, ctx, params) => {
                projectsEdited.push(p);
                return theEditor(p, ctx, params);
            },
        };

        editAll(null, null, editor, cei,
            {},
            fromListRepoFinder(projects),
            p => true,
            fromListRepoLoader(projects))
            .then(edits => {
                assert(edits.length === projects.length);
                assert(edits.some(e => !e.edited), JSON.stringify(edits));
                assert(edits.some(e => !e.success));
                assert.deepEqual(projectsEdited, projects);
                done();
            }).catch(done);

    });

});
