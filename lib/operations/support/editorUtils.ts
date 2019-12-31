import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { logger } from "../../util/logger";
import { EditorOrReviewerParameters } from "../common/params/BaseEditorOrReviewerParameters";
import {
    BranchCommit,
    EditMode,
    isBranchCommit,
    isCustomExecutionEditMode,
    isPullRequest,
    PullRequest,
} from "../edit/editModes";
import {
    EditResult,
    ProjectEditor,
    successfulEdit,
} from "../edit/projectEditor";

/**
 * Edit a GitHub project using a PR or branch.
 * Do not attempt any git updates if (a) edited is explicitly set to false by the editor
 * or (b) edited is undefined and git status is not dirty. If edited is explicitly
 * set to true by the editor and the git status is not dirty, this is a developer error
 * which should result in a runtime error.
 * @param context handler context for this operation
 * @param p project
 * @param editor editor to use
 * @param editMode how to persist the edit
 * @param parameters to editor
 * @return EditResult instance that reports as to whether the project was actually edited
 */
export function editRepo<P extends EditorOrReviewerParameters>(context: HandlerContext,
                                                               p: Project,
                                                               editor: ProjectEditor<P>,
                                                               editMode: EditMode,
                                                               parameters?: P): Promise<EditResult> {
    const afterPersist = editMode.afterPersist || doNothing;
    const after = x => afterPersist(p, context).then(() => addEditModeToResult(editMode, x));
    if (isPullRequest(editMode)) {
        return editProjectUsingPullRequest(context, p as GitProject, editor, editMode, parameters)
            .then(after);
    } else if (isBranchCommit(editMode)) {
        return editProjectUsingBranch(context, p as GitProject, editor, editMode, parameters)
            .then(after);
    } else if (isCustomExecutionEditMode(editMode)) {
        return editMode.edit(p, editor, context, parameters)
            .then(after);
    } else {
        // No edit to do
        return Promise.resolve(successfulEdit(p, true));
    }
}

async function doNothing() {
    return;
}

function addEditModeToResult(editMode: EditMode, x: EditResult) {
    if (x.edited) {
        return { editMode, ...x };
    } else {
        return x;
    }
}

export function editProjectUsingPullRequest<P>(context: HandlerContext,
                                               gp: GitProject,
                                               editor: ProjectEditor<P>,
                                               pr: PullRequest,
                                               parameters?: P): Promise<EditResult> {

    return editor(gp, context, parameters)
        .then(r => doWithEditResult(r as EditResult<GitProject>, () => raisePr(gp, pr)));
}

export function editProjectUsingBranch<P>(context: HandlerContext,
                                          gp: GitProject,
                                          editor: ProjectEditor<P>,
                                          ci: BranchCommit,
                                          parameters?: P): Promise<EditResult> {

    return editor(gp, context, parameters)
        .then(r =>
            // TODO fix this type cast
            doWithEditResult(r as EditResult<GitProject>, () => createAndPushBranch(gp, ci)));
}

/**
 * Perform git operation on the project only if edited != false or status is dirty
 * @param {EditResult<GitProject>} r
 * @param {() => Promise<EditResult>} gitop what to do with a dirty project
 * @return {Promise<EditResult>}
 */
function doWithEditResult(r: EditResult<GitProject>, gitop: () => Promise<EditResult>): Promise<EditResult> {
    if (r.edited === true) {
        logger.debug("Declared dirty; executing git operation. Project: %j\n Directory: %s", r.target.id, r.target.baseDir);
        return gitop();
    }
    if (r.edited === undefined) {
        // Check git status
        return r.target.gitStatus()
            .then(status => {
                if (status.isClean) {
                    logger.debug("Observed clean; skipping git operation. Project: %j\n Directory: %s", r.target.id, r.target.baseDir);
                    return {
                        target: r.target,
                        success: true,
                        edited: false,
                    };
                } else {
                    logger.debug("Observed dirty; executing git operation. Project: %j\n Directory: %s", r.target.id, r.target.baseDir);
                    return gitop();
                }
            });
    }
    logger.debug("Declared not dirty; skipping git operation. Project: %j\n Directory: %s\nEdited=%s", r.target.id, r.target.baseDir, r.edited);
    return Promise.resolve(r);
}

/**
 * Create a branch (if it doesn't exist), commit with current content and push
 * @param {GitProject} gp
 * @param {BranchCommit} ci
 */
export function createAndPushBranch(gp: GitProject, ci: BranchCommit): Promise<EditResult> {
    return gp.configureFromRemote()
        .then(() => gp.hasBranch(ci.branch).then(branchExists => {
            if (branchExists) {
                return gp.checkout(ci.branch);
            } else {
                return gp.createBranch(ci.branch); // this also checks it out
            }
        }))
        .then(() => {
            let cm = ci.message;
            if (ci.autoMerge) {
                const needsLineBreaks = !cm.trim().endsWith("]");
                cm = `${cm}${needsLineBreaks ? "\n\n" : " "}${ci.autoMerge.mode} ${ci.autoMerge.method ? ci.autoMerge.method : ""}`.trim();
            }
            return gp.commit(cm);
        })
        .then(() => gp.push())
        .then(tp => successfulEdit(tp, true));
}

/**
 * Raise a PR from the current state of the project
 * @param {GitProject} gp
 * @param {PullRequest} pr
 */
export function raisePr(gp: GitProject, pr: PullRequest): Promise<EditResult> {
    const targetBranch = pr.targetBranch || gp.branch;
    return createAndPushBranch(gp, pr)
        .then(x => {
            let body = pr.body;
            const needsLineBreaks = !body.trim().endsWith("]");
            if (pr.autoMerge) {
                body = `${body}${needsLineBreaks ? "\n\n" : " "}${pr.autoMerge.mode} ${pr.autoMerge.method ? pr.autoMerge.method : ""}`.trim();
            }
            return gp.raisePullRequest(pr.title, body, targetBranch, pr.reviewers)
                .then(r => successfulEdit(gp, true));
        });
}
