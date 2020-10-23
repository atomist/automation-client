import * as fs from "fs-extra";
import * as path from "path";
import * as assert from "power-assert";
import {
    GitHubRepoRef,
} from "../../lib/operations/common/GitHubRepoRef";
import { generate } from "../../lib/operations/generate/generatorUtils";
import { RemoteGitProjectPersister } from "../../lib/operations/generate/remoteGitProjectPersister";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import { Project } from "../../lib/project/Project";
import { hasFile } from "../../lib/util/gitHub";
import {
    SeedRepoName,
    SeedRepoOwner,
} from "../credentials";
import {
    Creds,
    deleteOrIgnore,
    getOwnerByToken,
    GitHubToken,
    tempRepoName,
} from "./apiUtils";

describe("generator end to end", () => {

    before(function(): void {
        if (!GitHubToken) {
            // tslint:disable-next-line:no-invalid-this
            this.skip();
        }
    });

    const noEd = (p: Project) => Promise.resolve(p);

    it.skip("should create a new GitHub repo using generate function", async function(): Promise<void> {
        // tslint:disable-next-line:no-invalid-this
        this.retries(3);

        let rr: GitHubRepoRef;
        let clonedSeed: GitProject;
        let gp: GitProject;
        try {
            const targetOwner = await getOwnerByToken();
            const repoName = tempRepoName();
            rr = new GitHubRepoRef(targetOwner, repoName);
            clonedSeed = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef(SeedRepoOwner, SeedRepoName));
            const targetRepo = new GitHubRepoRef(targetOwner, repoName);
            const result = await generate(clonedSeed, undefined, Creds, noEd, RemoteGitProjectPersister, targetRepo);
            gp = result.target;
            assert(result.success);
            const r = await hasFile(GitHubToken, targetOwner, repoName, "pom.xml");
            assert(r);
            await verifyPermissions(gp);
            await deleteOrIgnore(rr, Creds);
            await Promise.all([clonedSeed, gp].map(p => p.release()));
            // generate leaks local projects because the returned GitProject has a no-op release function
            await fs.remove(gp.baseDir);
        } catch (e) {
            if (rr) {
                await deleteOrIgnore(rr, Creds);
            }
            await Promise.all([clonedSeed, gp].filter(p => p).map(p => p.release()));
            if (gp) {
                await fs.remove(gp.baseDir);
            }
            throw e;
        }
    }).timeout(20000);

    it("should refuse to create a new GitHub repo using existing repo name", async () => {
        const clonedSeed = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef(SeedRepoOwner, SeedRepoName));
        const targetRepo = new GitHubRepoRef("atomist", "welcome");

        try {
            const result = await generate(clonedSeed, undefined, Creds, noEd, RemoteGitProjectPersister, targetRepo);
            await fs.remove(clonedSeed.baseDir);
            assert.fail("Should not have succeeded");
        } catch (e) {
            await fs.remove(clonedSeed.baseDir);
            assert(e.message.includes("Unable to create new repo")); // testing to make sure we recieve the error message we raise
        }
    }).timeout(20000);

    function verifyPermissions(p: GitProject): Promise<GitProject> {
        // Check that Maven wrapper mvnw from Spring project is executable
        const fp = path.join(p.baseDir, "mvnw");
        assert(fs.statSync(fp).isFile());
        fs.access(fp, fs.constants.X_OK, err => {
            if (err) {
                assert.fail("Not executable");
            }
        });
        return Promise.resolve(p);
    }

});
