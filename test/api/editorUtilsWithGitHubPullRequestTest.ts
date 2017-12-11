import "mocha";
import * as assert from "power-assert";

import { GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { PullRequest } from "../../src/operations/edit/editModes";
import { toEditor } from "../../src/operations/edit/projectEditor";
import { editProjectUsingBranch, editProjectUsingPullRequest } from "../../src/operations/support/editorUtils";
import { GitCommandGitProject } from "../../src/project/git/GitCommandGitProject";
import { Creds } from "./gitHubTest";
import { deleteRepoIfExists, newRepo } from "./GitProjectRemoteTest";

const EditorThatChangesProject = toEditor(p => p.addFile("thing", "thing"));

describe("editorUtils tests with GitHub pull requests", () => {

    it("creates branch with changes in simple editor", done => {
        newRepo()
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
            }).then(() => done(), done);
    }).timeout(15000);

    it("creates PR with changes in simple editor", done => {
        newRepo()
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
            }).then(() => done(), done);
    }).timeout(15000);

});
