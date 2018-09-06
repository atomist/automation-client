import * as assert from "power-assert";

import { PullRequest } from "../../../src/operations/edit/editModes";
import { toEditor } from "../../../src/operations/edit/projectEditor";
import {
    editProjectUsingBranch,
    editProjectUsingPullRequest,
} from "../../../src/operations/support/editorUtils";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import {
    Creds,
    RepoThatExists,
} from "../../credentials";

describe("editorUtils", () => {

    const NoOpEditor = toEditor(p => {
        return Promise.resolve(p);
    });

    it("doesn't attempt to commit without changes", async () => {
        const p = await GitCommandGitProject.cloned(Creds, RepoThatExists);
        const er = await editProjectUsingBranch(undefined, p, NoOpEditor,
            { branch: "dont-create-me-or-i-barf&&&####&&& we", message: "whocares" });
        assert(!er.edited);
        await p.release();
    });

    it("doesn't attempt to create PR without changes", async () => {
        const p = await GitCommandGitProject.cloned(Creds, RepoThatExists);
        const status = await p.gitStatus();
        assert(status.isClean);
        const er = await editProjectUsingPullRequest(undefined, p, NoOpEditor, new PullRequest("x", "y"));
        assert(!er.edited);
        await p.release();
    });

});
