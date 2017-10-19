import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { editProjectUsingPullRequest, PullRequestInfo } from "../support/editorUtils";
import { ProjectPersister } from "./projectPersister";

export function pullRequestProjectPersister(context: HandlerContext,
                                            pr: PullRequestInfo): ProjectPersister<GitProject> {
    return (p, editor) => editProjectUsingPullRequest(context, p, editor, pr);
}
