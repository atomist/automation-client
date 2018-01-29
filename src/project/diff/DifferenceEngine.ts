import { HandlerContext } from "../../HandlerContext";
import * as _ from "lodash";

import { Chain } from "./Chain";

import { GitHubRepoRef } from "../../operations/common/GitHubRepoRef";
import { RepoRef } from "../../operations/common/RepoId";
import { GitCommandGitProject } from "../git/GitCommandGitProject";
import { GitProject } from "../git/GitProject";

/**
 * Extracts fingerprints, diffs them, and invokes actions on Github shas that are being compared
 */
export class DifferenceEngine {

    constructor(private githubIssueAuth: GithubIssueAuth, private chains: Array<Chain<any, any>>) {
    }

    /**
     * Run configured diff chains for these shas
     * @param baseSha
     * @param headSha
     */
    public run(context: HandlerContext, baseSha: string, headSha: string) {
        const baseProjectPromise = this.cloneRepo(context, this.githubIssueAuth, baseSha);
        baseProjectPromise.then(project => {
            const baseFingerprintPromises: Array<Promise<any>> = _.map(this.chains, c => c.extractor.extract(project));
            Promise.all(baseFingerprintPromises).then(baseFps => {
                const headProjectCheckout = project.checkout(headSha);
                headProjectCheckout.then(headProjectCheckoutSuccess => {
                    const headFingerprintPromises: Array<Promise<any>> =
                        _.map(this.chains, c => c.extractor.extract(project));
                    Promise.all(headFingerprintPromises).then(headFps => {
                        const diffs = this.chains.map((c, i) => c.differ.diff(baseFps[i], headFps[i]));
                        diffs.map((d, i) => this.chains[i].actions.forEach(a => a.invoke(baseFps[i], headFps[i], d)));
                    });
                });
            });
        });
    }

    private cloneRepo(context: HandlerContext, githubIssueAuth: GithubIssueAuth, sha: string): Promise<GitProject> {
        return GitCommandGitProject.cloned(context, 
            { token: githubIssueAuth.githubToken },
            new GitHubRepoRef(githubIssueAuth.owner, githubIssueAuth.repo, githubIssueAuth.sha));
    }
}

/**
 * Details that allow a GitHub issue to be referenced and modified
 */
export interface GithubIssueAuth extends RepoRef {
    githubToken: string;
    issueNumber: number;
}
