import * as stringify from "json-stringify-safe";
import "mocha";

import * as assert from "power-assert";

import {
    fromListRepoFinder,
    fromListRepoLoader,
} from "../../../src/operations/common/fromProjectList";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { AlwaysAskRepoParameters } from "../../../src/operations/common/params/AlwaysAskRepoParameters";
import { BaseEditorOrReviewerParameters } from "../../../src/operations/common/params/BaseEditorOrReviewerParameters";
import { editAll } from "../../../src/operations/edit/editAll";
import { CustomExecutionEditMode } from "../../../src/operations/edit/editModes";
import {
    failedEdit,
    ProjectEditor,
    SimpleProjectEditor,
    successfulEdit,
} from "../../../src/operations/edit/projectEditor";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

describe("editAll", () => {

    it("should edit with simple function", done => {
        const editor: SimpleProjectEditor = p => {
            p.addFileSync("thing", "1");
            return Promise.resolve(p);
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
            undefined,
            fromListRepoFinder(projects),
            p => true,
            fromListRepoLoader(projects))
            .then(edits => {
                assert(edits.length === projects.length);
                assert(!edits.some(e => e.edited !== undefined));
                assert.deepEqual(projectsEdited, projects);
                return edits[0].target.findFile("thing")
                    .then(f => f.getContent()
                        .then(content => assert(content === "1")));
            }).then(done, done);
    });

    it("should edit repo using params", done => {
        class VerySpecialParams extends BaseEditorOrReviewerParameters {
            constructor(public name: string) {
                super();
            }
        }

        const editor: ProjectEditor<VerySpecialParams> = (p, ctx, params) => {
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
            new VerySpecialParams("thing"),
            fromListRepoFinder(projects),
            p => true,
            fromListRepoLoader(projects))
            .then(edits => {
                assert(edits.length === projects.length);
                assert(!edits.some(e => !e.edited));
                assert.deepEqual(projectsEdited, projects);
                return edits[0].target.findFile("thing")
                    .then(f => f.getContent()
                        .then(content => assert(content === "1")));
            }).then(done, done);
    });

    it("should edit repo with failure", done => {
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
            new BaseEditorOrReviewerParameters(new AlwaysAskRepoParameters()),
            fromListRepoFinder(projects),
            p => true,
            fromListRepoLoader(projects))
            .then(edits => {
                assert(edits.length === projects.length);
                assert(edits.some(e => !e.edited), stringify(edits));
                assert(edits.some(e => !e.success));
                assert.deepEqual(projectsEdited, projects);
                done();
            }).catch(done);

    });

});
