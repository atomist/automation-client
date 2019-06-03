import * as assert from "power-assert";

import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { PullRequest } from "../../../lib/operations/edit/editModes";
import { toEditor } from "../../../lib/operations/edit/projectEditor";
import {
    editProjectUsingBranch,
    editProjectUsingPullRequest,
} from "../../../lib/operations/support/editorUtils";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { Creds } from "../../credentials";

describe("editorUtils", () => {

    const NoOpEditor = toEditor(p => {
        return Promise.resolve(p);
    });

    const thisRepo = new GitHubRepoRef("atomist", "automation-client");

    it("doesn't attempt to commit without changes", async () => {
        const p = await GitCommandGitProject.cloned(Creds, thisRepo);
        const er = await editProjectUsingBranch(undefined, p, NoOpEditor,
            { branch: "dont-create-me-or-i-barf&&&####&&& we", message: "whocares" });
        assert(!er.edited);
        await p.release();
    }).timeout(5000);

    it("doesn't attempt to create PR without changes", async () => {
        const p = await GitCommandGitProject.cloned(Creds, thisRepo);
        const status = await p.gitStatus();
        assert(status.isClean);
        const er = await editProjectUsingPullRequest(undefined, p, NoOpEditor, new PullRequest("x", "y"));
        assert(!er.edited);
        await p.release();
    }).timeout(5000);

});
