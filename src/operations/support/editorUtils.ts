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
                                     pr: PullRequestEdit): Promise<any> {
    console.log("Editing project " + JSON.stringify(repo));
    return GitCommandGitProject.cloned(token, repo.owner, repo.repo)
        .then(gp => editProjectUsingPullRequest(context, repo, gp, editor, pr));
}

export function editProjectUsingPullRequest(context: HandlerContext,
                                            repo: RepoId,
                                            gp: GitProject,
                                            editor: ProjectEditor<any>,
                                            pr: PullRequestEdit): Promise<any> {

    return editor(repo, gp, context)
        .then(r => r.edited ?
            raisePr(gp, pr) :
            Promise.resolve(false));
}

/**
 * Raise a PR from the current state of the project
 * @param {GitProject} gp
 * @param {PullRequestEdit} pr
 * @return {Promise<any>}
 */
export function raisePr(gp: GitProject, pr: PullRequestEdit): Promise<any> {
    return gp.createBranch(pr.branch)
        .then(x => gp.commit(pr.commitMessage))
        .then(x => gp.push())
        .then(x => {
            return gp.raisePullRequest(pr.title, pr.body);
        });
}

export class PullRequestEdit {
    constructor(public branch: string,
                public title: string,
                public body: string = title,
                public commitMessage: string = title) {
    }
}
