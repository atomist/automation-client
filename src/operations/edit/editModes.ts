
import { Project } from "../../project/Project";
import { EditResult } from "./projectEditor";

/**
 * Used to determine EditInfo on a per project basis,
 * for example if we want to use a different branch name on different repos
 */
export type EditInfoFactory = (p: Project) => EditInfo;

export function toEditInfoFactory(ei: EditInfo | EditInfoFactory): EditInfoFactory {
    return p => isEditInfo(ei) ? ei : ei(p);
}

/**
 * Root interface for information on how to apply an edit:
 * E.g via a PR or commit to master
 */
export interface EditInfo {
    commitMessage: string;
}

export function isEditInfo(ei: any): ei is EditInfo {
    return !!ei.commitMessage;
}

/**
 * Represents a commit to a project
 */
export interface CommitInfo extends EditInfo {
    branch: string;
    commitMessage: string;
}

export function isCommitInfo(ei: EditInfo): ei is CommitInfo {
    const maybeCi = ei as CommitInfo;
    return !!maybeCi.branch && !!maybeCi.commitMessage;
}

/**
 * Captures extra steps that must go into raising a PR
 */
export class PullRequestInfo implements CommitInfo {
    constructor(public branch: string,
                public title: string,
                public body: string = title,
                public commitMessage: string = title) {
    }
}

export function isPullRequestInfo(ei: EditInfo): ei is PullRequestInfo {
    const maybePr = ei as PullRequestInfo;
    return !!maybePr.branch && !!maybePr.body && !!maybePr.title;
}

/**
 * Use for edit modes that require custom persistence
 */
export interface CustomExecutionEditInfo extends EditInfo {

    edit(p: Project): Promise<EditResult>;
}

export function isCustomExecutionEditInfo(ei: EditInfo): ei is CustomExecutionEditInfo {
    const maybeCei = ei as CustomExecutionEditInfo;
    return !!maybeCei.edit;
}
