import * as assert from "power-assert";

import { fromListRepoLoader } from "../../../lib/operations/common/fromProjectList";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { BaseEditorOrReviewerParameters } from "../../../lib/operations/common/params/BaseEditorOrReviewerParameters";
import { MappedRepoParameters } from "../../../lib/operations/common/params/MappedRepoParameters";
import { editOne } from "../../../lib/operations/edit/editAll";
import { CustomExecutionEditMode } from "../../../lib/operations/edit/editModes";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { Project } from "../../../lib/project/Project";

describe("editOne", () => {

    it("should edit repo", done => {

        const editor: (p: Project) => Promise<Project> = p => {
            p.addFileSync("thing", "1");
            return Promise.resolve(p);
        };

        const repoRef = new GitHubRepoRef("org", "name");

        const projects = [
            new InMemoryProject(repoRef),
        ];

        const projectsEdited: Project[] = [];

        const cei: CustomExecutionEditMode = {
            message: "Thing",
            edit: (p, theEditor, ctx, params) => {
                projectsEdited.push(p);
                return theEditor(p, ctx, params);
            },
        };

        editOne(undefined, undefined, editor, cei,
            repoRef, undefined,
            fromListRepoLoader(projects))
            .then(editResult => {
                assert(editResult.edited === undefined, "Simple editors don't know what they did. They are truly simple");
                assert.deepEqual(projectsEdited, projects);
                return editResult.target.findFile("thing")
                    .then(f => f.getContent()
                        .then(content => assert(content === "1")));
            }).then(done, done);

    });

    it("should edit repo that fails", done => {

        const editor = (p: Project) => {
            return Promise.reject(new Error("this didn't work"));
        };

        const repoRef = new GitHubRepoRef("org", "name");

        const projects = [
            new InMemoryProject(repoRef),
        ];

        const projectsEdited: Project[] = [];

        const cei: CustomExecutionEditMode = {
            message: "Thing",
            edit: (p, theEditor, ctx, params) => {
                projectsEdited.push(p);
                return theEditor(p, ctx, params);
            },
        };

        editOne(undefined, undefined, editor, cei, repoRef,
            new BaseEditorOrReviewerParameters(new MappedRepoParameters()),
            fromListRepoLoader(projects))
            .then(editResult => {
                assert(!editResult.edited);
                assert(!editResult.success);
                assert.deepEqual(projectsEdited, projects);
                return;
            }).then(done, done);

    });

});
