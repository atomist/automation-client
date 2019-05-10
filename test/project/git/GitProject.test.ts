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
import { GitHubToken } from "../../credentials";
import { tempProject } from "../utils";

function checkProject(p: Project) {
    const f = p.findFileSync("package.json");
    assert(!!p.id);
    assert(!!p.id.sha);
    assert(!!p.id.owner);
    assert(!!p.id.repo);
    assert(f.getContentSync());
}

const Creds = { token: GitHubToken };
const Owner = "atomist-travisorg";
const RepoName = "this-repository-exists";

describe("GitProject", () => {

    const getAClone = (repoName: string = RepoName) => {
        const repositoryThatExists = new GitHubRepoRef(Owner, repoName);
        return GitCommandGitProject.cloned(Creds, repositoryThatExists);
    };

    it("never returns the same place on the filesystem twice at once", done => {
        const clones = [getAClone(), getAClone()];
        const cleaningDone = (err: Error | void) => {
            Promise.all(clones)
                .then(them =>
                    them.forEach(clone => clone.release()))
                .then(() => done(err));
        };

        Promise.all(clones)
            .then(them => {
                assert(them[0].baseDir !== them[1].baseDir,
                    "Oh no! two simultaneous projects in " + them[0].baseDir);
            })
            .then(cleaningDone, cleaningDone);
    }).timeout(5000);

    it("knows about the branch passed by the repo ref", () => {
        const p = tempProject(new GitHubRepoRef("owneryo", "repoyo", "branchyo"));
        const gp = GitCommandGitProject.fromProject(p, Creds);

        assert(gp.branch === "branchyo", `Branch was <${gp.branch}>`);
    });

    it("add a file, init and commit", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit("Added a Thing"))
            .then(c => {
                // TODO: check that the SHA has changed.
                // this will be easy after #58 is closed
            })
            .then(() => done(), done);
    });

    it("properly escape commit message", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit(`Added a "Thing a ding"`))
            .then(() => done(), done);
    });

    it("properly escape an already escaped commit message", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit(`Added a \"Thing a ding\"`))
            .then(() => done(), done);
    });

    it("leaves newlines alone", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit(`Added a Thing

ding dong ding
`))
            .then(() => execPromise("git", ["log", "-1", "--pretty=format:%B"], { cwd: gp.baseDir }))
            .then(commandResult => {
                assert.equal(commandResult.stdout, `Added a Thing

ding dong ding
`);
            })
            .then(() => done(), done);
    });

    it("commit then add has uncommitted", done => {
        const p = tempProject(new GitHubRepoRef("owner", "repo"));
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.isClean())
            .then(clean => {
                assert(!clean);
                assert(!!gp.branch);
                assert(!!gp.id);
                assert(!gp.id.sha);
            })
            .then(() => done(), done);
    });

    it("uses then function", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.isClean())
            .then(clean => assert(!clean))
            .then(() => done(), done);
    });

    it("add a file, check doesn't have uncommitted", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit("Added a Thing"))
            .then(() => gp.isClean())
            .then(clean => {
                assert(clean);
            })
            .then(() => done(), done);
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
        const clean = await gp.isClean();
        assert(clean, "We should be able to get git status for a subdirectory");
        gp.release();
    }).timeout(10000);

    it("can tell whether a branch exists", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.addFile("something", "here"))
            .then(() => gp.commit("you have to make an initial commit before you can create a branch"))
            .then(() => gp.hasBranch("der"))
            .then(result => assert(!result))
            .then(() => gp.createBranch("der"))
            .then(() => gp.hasBranch("der"))
            .then(result => assert(result))
            .then(() => done(), done);
    }).timeout(10000);

});
