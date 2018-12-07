import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import {
    EditResult,
    ProjectEditor,
} from "./projectEditor";

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
     * Optional method to perform any additional actions on the project after
     * applying the edit to persistent store--for example, setting a GitHub status
     * @param {Project} p
     * @param ctx HandlerContext for the current edit operation
     * @return {Promise<any>}
     */
    afterPersist?(p: Project, ctx: HandlerContext): Promise<any>;
}

export function isEditMode(em: any): em is EditMode {
    return !!em.message;
}

/**
 * Merge method to use when auto merging the branches
 */
export enum AutoMergeMethod {
    Merge = "[auto-merge-method:merge]",
    Rebase = "[auto-merge-method:rebase]",
    Squash = "[auto-merge-method:squash]",
}

/**
 * Trigger for branch auto merge
 */
export enum AutoMergeMode {
    ApprovedReview = "[auto-merge:on-approve]",
    SuccessfulCheck = "[auto-merge:on-check-success]",
}

/**
 * Describe the auto merge behavior
 */
export interface AutoMerge {
    mode: AutoMergeMode | string;
    method?: AutoMergeMethod;
}

/**
 * Represents a commit to a project on a branch
 */
export interface BranchCommit extends EditMode {
    branch: string;
    autoMerge?: AutoMerge;
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
 * Captures basic information to create a commit
 */
export class Commit implements BranchCommit {

    constructor(public branch: string,
                public message: string,
                public autoMerge?: AutoMerge) {}
}

/**
 * Captures extra steps that must go into raising a PR
 */
export class PullRequest extends Commit {

    constructor(public branch: string,
                public title: string,
                public body: string = title,
                public message: string = title,
                // Make default to master for backwards-compatible reasons
                public targetBranch: string = "master",
                public autoMerge?: AutoMerge) {
        super(branch, message, autoMerge);
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
