import "mocha";
import * as assert from "power-assert";

import { GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { PullRequest } from "../../src/operations/edit/editModes";
import {
    ProjectEditor,
    successfulEdit,
    toEditor,
} from "../../src/operations/edit/projectEditor";
import {
    editProjectUsingBranch,
    editProjectUsingPullRequest,
} from "../../src/operations/support/editorUtils";
import { GitCommandGitProject } from "../../src/project/git/GitCommandGitProject";
import { Project } from "../../src/project/Project";
import { Creds } from "./gitHubTest";
import {
    deleteRepoIfExists,
    newRepo,
} from "./GitProjectRemoteTest";

const EditorThatChangesProject = toEditor(p => p.addFile("thing", "thing"));

describe("editorUtils tests with GitHub pull requests", () => {

    it("creates branch with changes in simple editor", async () => {
        await newRepo()
            .then(repo => {
                return GitCommandGitProject.cloned(Creds, new GitHubRepoRef(repo.owner, repo.repo))
                    .then(p => {
                        return editProjectUsingBranch(undefined, p, EditorThatChangesProject,
                            new PullRequest("x", "y"))
                            .then(er => {
                                assert(er.edited);
                            }).then(() => deleteRepoIfExists(repo));
                    }).catch(err => deleteRepoIfExists(repo)
                        .then(() => Promise.reject(err)));
            });
    }).timeout(15000);

    it("creates PR with changes in simple editor", async () => {
        await newRepo()
            .then(repo => {
                return GitCommandGitProject.cloned(Creds, new GitHubRepoRef(repo.owner, repo.repo))
                    .then(p => {
                        return editProjectUsingPullRequest(undefined, p, EditorThatChangesProject,
                            new PullRequest("x", "y"))
                            .then(er => {
                                assert(er.edited);
                            }).then(() => deleteRepoIfExists(repo));
                    }).catch(err => deleteRepoIfExists(repo)
                        .then(() => Promise.reject(err)));
            });
    }).timeout(15000);

});

const TinyChangeEditor: ProjectEditor = (p: Project) => {
    return p.findFile("README.md")
        .then(f => f.getContent()
            .then(fileContent => f.setContent(fileContent + "\nmore stuff\n")),
        err => p.addFile("README.md", "stuff"))
        .then(() => successfulEdit(p, true));
};

describe("editorUtils with branch commit", () => {

    it("can edit a project on an existing branch", async () => {
        await newRepo().then(rr =>
            GitCommandGitProject.cloned(Creds, new GitHubRepoRef(rr.owner, rr.repo))
                .then(p => editProjectUsingBranch(undefined, p,
                    TinyChangeEditor, { branch: "hello", message: "thanks" })
                    .then(r => editProjectUsingBranch(undefined, p,
                        TinyChangeEditor, { branch: "hello", message: "thanks" })))
                .then(() => deleteRepoIfExists(rr),
                err => deleteRepoIfExists(rr).then(() => Promise.reject(err))));
    }).timeout(25000);

});
