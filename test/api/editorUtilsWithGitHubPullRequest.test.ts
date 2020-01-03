import * as assert from "power-assert";

import { GitHubRepoRef } from "../../lib/operations/common/GitHubRepoRef";
import { PullRequest } from "../../lib/operations/edit/editModes";
import {
    ProjectEditor,
    successfulEdit,
    toEditor,
} from "../../lib/operations/edit/projectEditor";
import {
    editProjectUsingBranch,
    editProjectUsingPullRequest,
} from "../../lib/operations/support/editorUtils";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import { Project } from "../../lib/project/Project";
import {
    cleanAfterTest,
    Creds,
    GitHubToken,
    newRepo,
    TestRepo,
} from "./apiUtils";

describe("editorUtils", () => {

    describe("GitHub pull requests", () => {

        before(function(): void {
            if (!GitHubToken) {
                // tslint:disable-next-line:no-invalid-this
                this.skip();
            }
        });

        const EditorThatChangesProject = toEditor(p => p.addFile("thing", "thing"));

        it("creates branch with changes in simple editor", async () => {
            let p: GitProject;
            let repo: TestRepo;
            try {
                repo = await newRepo();
                p = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef(repo.owner, repo.repo));
                const er = await editProjectUsingBranch(undefined, p, EditorThatChangesProject, new PullRequest("x", "y"));
                assert(er.edited);
                await cleanAfterTest(p, repo);
            } catch (e) {
                await cleanAfterTest(p, repo);
                throw e;
            }
        }).timeout(40000);

        it("creates PR with changes in simple editor", async () => {
            let p: GitProject;
            let repo: TestRepo;
            try {
                repo = await newRepo();
                p = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef(repo.owner, repo.repo));
                const er = await editProjectUsingPullRequest(undefined, p, EditorThatChangesProject, new PullRequest("x", "y"));
                assert(er.edited);
                await cleanAfterTest(p, repo);
            } catch (e) {
                await cleanAfterTest(p, repo);
                throw e;
            }
        }).timeout(40000);

    });

    describe("branch commit", () => {

        before(function(): void {
            if (!GitHubToken) {
                // tslint:disable-next-line:no-invalid-this
                this.skip();
            }
        });

        const TinyChangeEditor: ProjectEditor = (p: Project) => {
            return p.findFile("README.md")
                .then(f => f.getContent()
                    .then(fileContent => f.setContent(fileContent + "\nmore stuff\n")),
                    () => p.addFile("README.md", "stuff"))
                .then(() => successfulEdit(p, true));
        };

        it("can edit a project on an existing branch", async () => {
            let p: GitProject;
            let repo: TestRepo;
            try {
                repo = await newRepo();
                p = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef(repo.owner, repo.repo));
                await editProjectUsingBranch(undefined, p, TinyChangeEditor, { branch: "hello", message: "thanks" });
                await editProjectUsingBranch(undefined, p, TinyChangeEditor, { branch: "hello", message: "thanks" });
                await cleanAfterTest(p, repo);
            } catch (e) {
                await cleanAfterTest(p, repo);
                throw e;
            }
        }).timeout(25000);

    });
});
