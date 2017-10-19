import { Parameters } from "../../HandleCommand";
import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import {
    BranchCommit,
    EditMode,
    isBranchCommit,
    isCustomExecutionEditMode,
    isPullRequest,
    PullRequest,
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
export function editRepo<T extends Parameters>(
                                               context: HandlerContext,
                                               repo: Project,
                                               editor: ProjectEditor,
                                               ei: EditMode,
                                               parameters?: T): Promise<EditResult> {
    const loadRepo: Promise<Project> = Promise.resolve(repo);
    if (isPullRequest(ei)) {
        return loadRepo.then(gp =>
            editProjectUsingPullRequest(context, gp as GitProject, editor, ei, parameters));
    } else if (isBranchCommit(ei)) {
        return loadRepo.then(gp =>
            editProjectUsingBranch(context, gp as GitProject, editor, ei, parameters));
    } else if (isCustomExecutionEditMode(ei)) {
        return loadRepo.then(ei.edit);
    } else {
        // No edit to do
        return loadRepo.then(gp => successfulEdit(gp, true));
    }
}

export function editProjectUsingPullRequest<T extends Parameters>(context: HandlerContext,
                                                                  gp: GitProject,
                                                                  editor: ProjectEditor<T>,
                                                                  pr: PullRequest,
                                                                  parameters?: T): Promise<EditResult> {

    return editor(gp, context, parameters)
        .then(r => r.edited ?
            raisePr(gp, pr) :
            {
                target: gp,
                success: false,
                edited: false,
            });
}

export function editProjectUsingBranch<T extends Parameters>(context: HandlerContext,
                                                             gp: GitProject,
                                                             editor: ProjectEditor<T>,
                                                             ci: BranchCommit,
                                                             parameters?: T): Promise<EditResult> {

    return editor(gp, context, parameters)
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
 * @param {BranchCommit} ci
 */
export function createAndPushBranch(gp: GitProject, ci: BranchCommit): Promise<EditResult> {
    return gp.createBranch(ci.branch)
        .then(x => gp.commit(ci.message))
        .then(x => gp.push())
        .then(r => successfulEdit(r.target, true));
}

/**
 * Raise a PR from the current state of the project
 * @param {GitProject} gp
 * @param {PullRequest} pr
 */
export function raisePr(gp: GitProject, pr: PullRequest): Promise<EditResult> {
    return createAndPushBranch(gp, pr)
        .then(x => {
            return gp.raisePullRequest(pr.title, pr.body)
                .then(r => successfulEdit(gp));
        });
}
