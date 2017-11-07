
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
 * E.g via a PR or commit to master
 */
export interface EditMode {

    message: string;
}

export function isEditMode(em: any): em is EditMode {
    return !!em.message;
}

/**
 * Represents a commit to a project
 */
export interface BranchCommit extends EditMode {
    branch: string;
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
