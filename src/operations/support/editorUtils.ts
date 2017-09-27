import { HandlerContext } from "../../HandlerContext";
import { GitCommandGitProject } from "../../project/git/GitCommandGitProject";
import { GitProject } from "../../project/git/GitProject";
import { RepoId } from "../common/RepoId";
import { ProjectEditor } from "../edit/projectEditor";

/**
 * Edit a GitHub project using a PR
 * @param token GitHub token
 * @param context handler context for this operation
 * @param repo repo id
 * @param editor editor to use
 * @param pr structure of the PR
 * @return {Promise<TResult2|boolean>}
 */
export function editUsingPullRequest(token: string,
                                     context: HandlerContext,
                                     repo: RepoId,
                                     editor: ProjectEditor<any>,
                                     pr: PullRequestInfo): Promise<any> {
    console.log("Editing project " + JSON.stringify(repo));
    return GitCommandGitProject.cloned(token, repo.owner, repo.repo)
        .then(gp => editProjectUsingPullRequest(context, repo, gp, editor, pr));
}

export function editProjectUsingPullRequest(context: HandlerContext,
                                            repo: RepoId,
                                            gp: GitProject,
                                            editor: ProjectEditor<any>,
                                            pr: PullRequestInfo): Promise<any> {

    return editor(repo, gp, context)
        .then(r => r.edited ?
            raisePr(gp, pr) :
            Promise.resolve(false));
}

export function editProjectUsingBranch(context: HandlerContext,
                                       repo: RepoId,
                                       gp: GitProject,
                                       editor: ProjectEditor<any>,
                                       ci: CommitInfo): Promise<any> {

    return editor(repo, gp, context)
        .then(r => r.edited ?
            createAndPushBranch(gp, ci) :
            Promise.resolve(false));
}

/**
 * Create a branch, commit with current content and push
 * @param {GitProject} gp
 * @param {CommitInfo} ci
 * @return {Promise<any>}
 */
export function createAndPushBranch(gp: GitProject, ci: CommitInfo): Promise<any> {
    return gp.createBranch(ci.branch)
        .then(x => gp.commit(ci.commitMessage))
        .then(x => gp.push());
}

/**
 * Raise a PR from the current state of the project
 * @param {GitProject} gp
 * @param {PullRequestInfo} pr
 * @return {Promise<any>}
 */
export function raisePr(gp: GitProject, pr: PullRequestInfo): Promise<any> {
    return createAndPushBranch(gp, pr)
        .then(x => {
            return gp.raisePullRequest(pr.title, pr.body);
        });
}

export interface CommitInfo {
    branch: string;
    commitMessage: string;
}

export class PullRequestInfo implements CommitInfo {
    constructor(public branch: string,
                public title: string,
                public body: string = title,
                public commitMessage: string = title) {
    }
}
