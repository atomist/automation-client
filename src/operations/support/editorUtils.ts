import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { isRepoId, RepoId } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import {
    CommitInfo, EditInfo, isCommitInfo, isCustomExecutionEditInfo, isPullRequestInfo,
    PullRequestInfo,
} from "../edit/editModes";
import { EditResult, ProjectEditor, successfulEdit } from "../edit/projectEditor";

/**
 * Edit a GitHub project using a PR or branch
 * @param token GitHub token
 * @param context handler context for this operation
 * @param repo repo id
 * @param editor editor to use
 * @param repoLoader repo loading strategy
 * @param ei how to persist the edit
 */
export function loadAndEditRepo(token: string,
                                context: HandlerContext,
                                repo: RepoId | Project,
                                editor: ProjectEditor,
                                ei: EditInfo,
                                repoLoader: RepoLoader =
                                    defaultRepoLoader(token)): Promise<EditResult> {
    const loadRepo: Promise<Project> = isRepoId(repo) ? repoLoader(repo) : Promise.resolve(repo);
    if (isPullRequestInfo(ei)) {
        return loadRepo.then(gp => editProjectUsingPullRequest(context, gp as GitProject, editor, ei));
    } else if (isCommitInfo(ei)) {
        return loadRepo.then(gp => editProjectUsingBranch(context, gp as GitProject, editor, ei));
    } else if (isCustomExecutionEditInfo(ei)) {
        return loadRepo.then(ei.edit);
    } else {
        // No edit to do
        return loadRepo.then(gp => successfulEdit(gp, true));
    }
}

export function editProjectUsingPullRequest(context: HandlerContext,
                                            gp: GitProject,
                                            editor: ProjectEditor,
                                            pr: PullRequestInfo): Promise<EditResult> {

    return editor(gp, context)
        .then(r => r.edited ?
            raisePr(gp, pr) :
            {
                target: gp,
                success: false,
                edited: false,
            });
}

export function editProjectUsingBranch(context: HandlerContext,
                                       gp: GitProject,
                                       editor: ProjectEditor,
                                       ci: CommitInfo): Promise<EditResult> {

    return editor(gp, context)
        .then(r => r.edited ?
            createAndPushBranch(gp, ci) :
            {
                target: gp,
                success: false,
                edited: false,
            });
}

/**
 * Create a branch, commit with current content and push
 * @param {GitProject} gp
 * @param {CommitInfo} ci
 */
export function createAndPushBranch(gp: GitProject, ci: CommitInfo): Promise<EditResult> {
    return gp.createBranch(ci.branch)
        .then(x => gp.commit(ci.commitMessage))
        .then(x => gp.push())
        .then(r => successfulEdit(r.target, true));
}

/**
 * Raise a PR from the current state of the project
 * @param {GitProject} gp
 * @param {PullRequestInfo} pr
 */
export function raisePr(gp: GitProject, pr: PullRequestInfo): Promise<EditResult> {
    return createAndPushBranch(gp, pr)
        .then(x => {
            return gp.raisePullRequest(pr.title, pr.body)
                .then(r => successfulEdit(gp));
        });
}
