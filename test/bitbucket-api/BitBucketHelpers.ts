import { BasicAuthCredentials } from "../../lib/operations/common/BasicAuthCredentials";
import { BitBucketRepoRef } from "../../lib/operations/common/BitBucketRepoRef";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import { TestRepositoryVisibility } from "../credentials";
import { tempProject } from "../project/utils";

export const BitBucketUser = process.env.ATLASSIAN_USER;
export const BitBucketPassword = process.env.ATLASSIAN_PASSWORD;
export const BitBucketCredentials: BasicAuthCredentials = { username: BitBucketUser, password: BitBucketPassword };

export function skipBitBucketTests(): boolean {
    if (BitBucketCredentials && BitBucketCredentials.username && BitBucketCredentials.password) {
        return false;
    }
    return true;
}

export async function doWithNewRemote(testAndVerify: (p: GitProject) => Promise<any>) {
    const p = tempProject();
    p.addFileSync("README.md", "Here's the readme for my new repo");

    const repo = `test-${new Date().getTime()}`;

    const gp: GitProject = GitCommandGitProject.fromProject(p, BitBucketCredentials);
    const owner = BitBucketUser;

    const bbid = new BitBucketRepoRef(owner, repo);

    try {
        await gp.init();
        await gp.createAndSetRemote(bbid, "Thing1", TestRepositoryVisibility);
        await gp.commit("Added a README");
        await gp.push();
        const clonedp = await GitCommandGitProject.cloned(BitBucketCredentials, bbid);
        await testAndVerify(clonedp);
        await bbid.deleteRemote(BitBucketCredentials);
    } catch (e) {
        await bbid.deleteRemote(BitBucketCredentials);
        throw e;
    }
}
