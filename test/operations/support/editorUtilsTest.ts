import "mocha";
import * as assert from "power-assert";

import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { PullRequest } from "../../../src/operations/edit/editModes";
import { toEditor } from "../../../src/operations/edit/projectEditor";
import { editProjectUsingBranch, editProjectUsingPullRequest } from "../../../src/operations/support/editorUtils";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { Creds, RepoThatExists } from "../../credentials";
import { deleteRepoIfExists, newRepo } from "../../project/git/GitProjectTest";

const NoOpEditor = toEditor(p => {
    return Promise.resolve(p);
});

const EditorThatChangesProject = toEditor(p => p.addFile("thing", "thing"));

describe("editorUtils", () => {

    it("doesn't attempt to commit without changes", done => {
        GitCommandGitProject.cloned(Creds, RepoThatExists)
            .then(p => {
                return editProjectUsingBranch(undefined, p, NoOpEditor,
                    {branch: "dont-create-me-or-i-barf&&&####&&& we", message: "whocares"})
                    .then(er => {
                        console.log(p.baseDir);
                        assert(!er.edited);
                        done();
                    });
            }).catch(done);
    }).timeout(15000);

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

    it("doesn't attempt to create PR without changes", done => {
        GitCommandGitProject.cloned(Creds, RepoThatExists)
            .then(p => p.gitStatus().then(status => {
                assert(status.isClean);
                return p;
            }))
            .then(p => {
                return editProjectUsingPullRequest(undefined, p, NoOpEditor,
                    new PullRequest("x", "y"))
                    .then(er => {
                        assert(!er.edited);
                    });
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
