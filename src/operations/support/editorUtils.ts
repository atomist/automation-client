import { HandlerContext } from "../../HandlerContext";
import { ActionResult } from "../../internal/util/ActionResult";
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
 */
export function editUsingPullRequest(token: string,
                                     context: HandlerContext,
                                     repo: RepoId,
                                     editor: ProjectEditor,
                                     pr: PullRequestInfo): Promise<ActionResult<GitProject>> {
    console.log("Editing project " + JSON.stringify(repo));
    return GitCommandGitProject.cloned(token, repo.owner, repo.repo)
        .then(gp => editProjectUsingPullRequest(context, gp, editor, pr));
}

export function editProjectUsingPullRequest(context: HandlerContext,
                                            gp: GitProject,
                                            editor: ProjectEditor,
                                            pr: PullRequestInfo): Promise<ActionResult<GitProject>> {

    return editor(gp, context)
        .then(r => r.edited ?
            raisePr(gp, pr) :
            {
                target: gp,
                success: false,
            });
}

export function editProjectUsingBranch(context: HandlerContext,
                                       gp: GitProject,
                                       editor: ProjectEditor,
                                       ci: CommitInfo): Promise<ActionResult<GitProject>> {

    return editor(gp, context)
        .then(r => r.edited ?
            createAndPushBranch(gp, ci) :
            {
                target: gp,
                success: false,
            });
}

/**
 * Create a branch, commit with current content and push
 * @param {GitProject} gp
 * @param {CommitInfo} ci
 */
export function createAndPushBranch(gp: GitProject, ci: CommitInfo): Promise<ActionResult<GitProject>> {
    return gp.createBranch(ci.branch)
        .then(x => gp.commit(ci.commitMessage))
        .then(x => gp.push());
}

/**
 * Raise a PR from the current state of the project
 * @param {GitProject} gp
 * @param {PullRequestInfo} pr
 */
export function raisePr(gp: GitProject, pr: PullRequestInfo): Promise<ActionResult<GitProject>> {
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
