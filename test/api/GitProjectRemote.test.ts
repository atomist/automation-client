import {
    GitHubRepoRef,
} from "../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import { TestRepositoryVisibility } from "../credentials";
import { tempProject } from "../project/utils";
import {
    cleanAfterTest,
    Creds,
    getOwnerByToken,
    GitHubToken,
    newRepo,
    TestRepo,
} from "./apiUtils";

describe("GitProject remote", () => {

    before(function(): void {
        if (!GitHubToken) {
            // tslint:disable-next-line:no-invalid-this
            this.skip();
        }
    });

    it("add a file, init and commit, then push to new remote repo", async function(): Promise<void> {
        // tslint:disable-next-line:no-invalid-this
        this.retries(5);

        const repo = `test-repo-2-${new Date().getTime()}`;
        const owner = await getOwnerByToken();
        let gp: GitProject;
        try {
            const p = tempProject();
            p.addFileSync("Thing", "1");
            gp = GitCommandGitProject.fromProject(p, Creds);
            await gp.init();
            await gp.createAndSetRemote(new GitHubRepoRef(owner, repo), "Thing1", TestRepositoryVisibility);
            await gp.commit("Added a Thing");
            await gp.push();
            await p.release();
            await cleanAfterTest(gp, { owner, repo });
        } catch (e) {
            await cleanAfterTest(gp, { owner, repo });
            throw e;
        }
    }).timeout(16000);

    it.skip("add a file, then PR push to remote repo", async function(): Promise<void> {
        // tslint:disable-next-line:no-invalid-this
        this.retries(3);

        let repo: TestRepo;
        let gp: GitProject;
        try {
            repo = await newRepo();
            gp = await GitCommandGitProject.cloned(Creds, new GitHubRepoRef(repo.owner, repo.repo));
            gp.addFileSync("Cat", "hat");
            const branch = "thing2";
            await gp.createBranch(branch);
            await gp.commit("Added a Thing");
            await gp.push();
            await gp.raisePullRequest("Thing2", "Adds another character");
            await cleanAfterTest(gp, repo);
        } catch (e) {
            await cleanAfterTest(gp, repo);
            throw e;
        }
    }).timeout(20000);

});
