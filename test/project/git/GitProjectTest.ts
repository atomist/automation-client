import "mocha";

import * as assert from "power-assert";
import {ActionResult} from "../../../src/action/ActionResult";
import {runCommand} from "../../../src/action/cli/commandLine";
import {GitHubDotComBase, GitHubRepoRef} from "../../../src/operations/common/GitHubRepoRef";
import {GitCommandGitProject} from "../../../src/project/git/GitCommandGitProject";
import {GitProject} from "../../../src/project/git/GitProject";
import {Project} from "../../../src/project/Project";
import {GitHubToken} from "../../credentials";
import {tempProject} from "../utils";

function checkProject(p: Project) {
    const f = p.findFileSync("package.json");
    assert(!!p.id);
    assert(!!p.id.sha);
    assert(!!p.id.owner);
    assert(!!p.id.repo);
    assert(f.getContentSync());
}

const Creds = {token: GitHubToken};
const Owner = "atomist-travisorg";
const RepoName = "this-repository-exists";

describe("GitProject cloning on filesystem", () => {

    const getAClone = (repoName: string = RepoName) => {
        const repositoryThatExists = new GitHubRepoRef(Owner, repoName);
        return GitCommandGitProject.cloned(Creds, repositoryThatExists);
    };

    it("can give me a URL", done => {
        getAClone()
            .then(clone => {
                assert.equal(clone.id.url, `https://github.com/${Owner}/${RepoName}`);
                return clone.release();
            })
            .then(() => done(), done);
    }).timeout(5000);

    it("never returns the same place on the filesystem twice at once", done => {
        const clones = [getAClone(), getAClone()];
        const cleaningDone = (err: Error | void) => {
            Promise.all(clones)
                .then(them =>
                    them.forEach(clone => clone.release()))
                .then(done(err));
        };

        Promise.all(clones)
            .then(them => {
                assert(them[0].baseDir !== them[1].baseDir,
                    "Oh no! two simultaneous projects in " + them[0].baseDir);
            })
            .then(cleaningDone, cleaningDone);
    }).timeout(5000);

});

describe("GitProject", () => {

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
            .then(() => runCommand("git log -1 --pretty=format:'%B'", {cwd: gp.baseDir}))
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
                assert(!clean.success);
                assert(!!clean.target.branch);
                assert(!!clean.target.id);
                assert(clean.target.id.sha === "master");
                done();
            })
            .catch(done);
    });

    it("uses then function", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.isClean())
            .then(assertNotClean)
            .then(() => done(), done);
    });

    function assertNotClean(r: ActionResult<GitCommandGitProject>) {
        assert(r.target);
        assert(!r.success);
    }

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

    it("check out commit", done => {
        const sha = "590ed8f7a2430d45127ea04cc5bdf736fe698712";
        GitCommandGitProject.cloned(Creds, new GitHubRepoRef("atomist", "microgrammar", sha))
            .then(p => {
                checkProject(p);
                return p.gitStatus()
                    .then(gs1 => {
                        const p2 = GitCommandGitProject.fromProject(p, Creds);
                        return p2.gitStatus().then(gs2 => {
                            assert(gs1.sha === gs2.sha);
                        });
                    });
            })
            .then(() => done(), done);
    }).timeout(5000);

    it("clones a project subdirectory", done => {
        GitCommandGitProject.cloned(Creds, new GitHubRepoRef("pallets", "flask", "master",
            GitHubDotComBase, "examples/flaskr"))
            .then(gp => {
                assert(!!gp.findFileSync("flaskr/__init__.py"), "Should be able to find file under subdirectory");
                gp.isClean()
                    .then(r => {
                        assert(r.success, "We should be able to get git status for a subdirectory");
                        done();
                    });
            }).catch(done);
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
