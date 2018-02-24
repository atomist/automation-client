import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { EditResult, ProjectEditor } from "./projectEditor";

/**
 * Used to determine EditMode on a per project basis,
 * for example if we want to use a different branch name on different repos
 */
export type EditModeFactory = (p: Project) => EditMode;

export function toEditModeFactory(em: EditMode | EditModeFactory): EditModeFactory {
    return p => isEditMode(em) ? em : em(p);
}

/**
 * Root interface for information on how to apply an edit:
 * E.g via a PR or commit to a branch (including master)
 */
export interface EditMode {

    message: string;

    /**
     * Optional method to perform any additional actions on the project before
     * applying the edit to persistent store--for example, getting the sha from a git repo
     * @param {Project} p
     * @return {Promise<any>}
     */
    beforePersist?(p: Project): Promise<any>;

    /**
     * Optional method to perform any additional actions on the project after
     * applying the edit to persistent store--for example, setting a GitHub status
     * @param {Project} p
     * @return {Promise<any>}
     */
    afterPersist?(p: Project): Promise<any>;
}

export function isEditMode(em: any): em is EditMode {
    return !!em.message;
}

/**
 * Represents a commit to a project on a branch
 */
export interface BranchCommit extends EditMode {
    branch: string;
}

/**
 * Return a commit to master branch with the given message. Use with care!
 */
export function commitToMaster(message: string): BranchCommit {
    return {
        message,
        branch: "master",
    };
}

export function isBranchCommit(em: EditMode): em is BranchCommit {
    const maybeBc = em as BranchCommit;
    return !!maybeBc.branch && !!maybeBc.message;
}

/**
 * Captures extra steps that must go into raising a PR
 */
export class PullRequest implements BranchCommit {

    constructor(public branch: string,
                public title: string,
                public body: string = title,
                public message: string = title) {
    }
}

export function isPullRequest(em: EditMode): em is PullRequest {
    const maybePr = em as PullRequest;
    return !!maybePr.branch && !!maybePr.body && !!maybePr.title;
}

/**
 * Use for edit modes that require custom persistence
 */
export interface CustomExecutionEditMode extends EditMode {
    edit<P>(p: Project, action: ProjectEditor<P>, context: HandlerContext, parameters: P): Promise<EditResult>;
}

export function isCustomExecutionEditMode(ei: EditMode): ei is CustomExecutionEditMode {
    const maybeCei = ei as CustomExecutionEditMode;
    return !!maybeCei.edit;
}
