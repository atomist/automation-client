import "mocha";
import * as assert from "power-assert";

import { PullRequest } from "../../../src/operations/edit/editModes";
import { toEditor } from "../../../src/operations/edit/projectEditor";
import { editProjectUsingBranch, editProjectUsingPullRequest } from "../../../src/operations/support/editorUtils";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { Creds, RepoThatExists } from "../../credentials";

const NoOpEditor = toEditor(p => {
    return Promise.resolve(p);
});

describe("editorUtils", () => {

    it("doesn't attempt to commit without changes", done => {
        GitCommandGitProject.cloned(Creds, RepoThatExists)
            .then(p => {
                return editProjectUsingBranch(undefined, p, NoOpEditor,
                    { branch: "dont-create-me-or-i-barf&&&####&&& we", message: "whocares" })
                    .then(er => {
                        assert(!er.edited);
                        done();
                    });
            }).catch(done);
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

});
