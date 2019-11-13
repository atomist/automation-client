import * as assert from "power-assert";
import { ActionResult } from "../../../lib/action/ActionResult";
import {
    GitHubDotComBase,
    GitHubRepoRef,
} from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../../lib/project/git/GitProject";
import { Project } from "../../../lib/project/Project";
import { execPromise } from "../../../lib/util/child_process";
import {
    Creds,
    ExistingRepoName,
    ExistingRepoOwner,
} from "../../credentials";
import { tempProject } from "../utils";

function checkProject(p: Project): void {
    const f = p.findFileSync("package.json");
    assert(!!p.id);
    assert(!!p.id.sha);
    assert(!!p.id.owner);
    assert(!!p.id.repo);
    assert(f.getContentSync());
}

describe("GitProject", () => {

    const getAClone = (repoName: string = ExistingRepoName) => {
        const repositoryThatExists = new GitHubRepoRef(ExistingRepoOwner, repoName);
        return GitCommandGitProject.cloned(Creds, repositoryThatExists);
    };

    it("never returns the same place on the filesystem twice at once", async () => {
        const clones = [getAClone(), getAClone()];
        let them: GitProject[] = [];
        const clean = () => Promise.all(them.filter(c => !!c).map(c => c.release()));
        try {
            them = await Promise.all(clones);
        } catch (e) {
            await clean();
            assert.fail(e.message);
        }
        assert(them[0].baseDir !== them[1].baseDir, "two simultaneous projects in " + them[0].baseDir);
        await clean();
    }).timeout(10000);

    it("knows about the branch passed by the repo ref", () => {
        const p = tempProject(new GitHubRepoRef("owneryo", "repoyo", "branchyo"));
        const gp = GitCommandGitProject.fromProject(p, Creds);

        assert(gp.branch === "branchyo", `Branch was <${gp.branch}>`);
    });

    it("add a file, init and commit", async () => {
        const p = tempProject();
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        const c = await gp.commit("Added a Thing");
    });

    it("properly escape commit message", async () => {
        const p = tempProject();
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        await gp.commit(`Added a "Thing a ding"`);
    });

    it("properly escape an already escaped commit message", async () => {
        const p = tempProject();
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        await gp.commit(`Added a \"Thing a ding\"`);
    });

    it("leaves newlines alone", async () => {
        const p = tempProject();
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        await gp.commit(`Added a Thing

ding dong ding
`);
        const commandResult = await execPromise("git", ["log", "-1", "--pretty=format:%B"], { cwd: gp.baseDir });
        assert(commandResult.stdout === `Added a Thing

ding dong ding
`);
    });

    it("add then init has uncommitted", async () => {
        const p = tempProject(new GitHubRepoRef("owner", "repo"));
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        assert(!await gp.isClean());
        assert(!!gp.branch);
        assert(!!gp.id);
        assert(!gp.id.sha);
    });

    it("commit a file, check doesn't have uncommitted", async () => {
        const p = tempProject();
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        await gp.commit("Added a Thing");
        assert(await gp.isClean());
    });

    it("check out commit", async () => {
        const sha = "590ed8f7a2430d45127ea04cc5bdf736fe698712";
        const p = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef("atomist", "microgrammar", sha));
        checkProject(p);
        const gs1 = await p.gitStatus();
        const p2 = GitCommandGitProject.fromProject(p, Creds);
        const gs2 = await p2.gitStatus();
        assert(gs1.sha === gs2.sha);
        await p.release();
    }).timeout(10000);

    it("clones a project subdirectory", async () => {
        const gp = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef("pallets", "flask",
            "0cbe698958f81efe202e71ac07446b87ad694789", GitHubDotComBase, "examples/tutorial"));
        assert(!!gp.findFileSync("flaskr/__init__.py"), "Should be able to find file under subdirectory");
        assert(await gp.isClean(), "We should be able to get git status for a subdirectory");
        await gp.release();
    }).timeout(10000);

    it("can tell whether a branch exists", async () => {
        const p = tempProject();
        await p.addFile("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        await gp.init();
        await gp.addFile("something", "here");
        await gp.commit("you have to make an initial commit before you can create a branch");
        assert(!await gp.hasBranch("der"));
        await gp.createBranch("der");
        assert(await gp.hasBranch("der"));
    }).timeout(10000);

});
