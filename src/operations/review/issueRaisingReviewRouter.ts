/**
 * Raise issue in this repo
 * @param pr ProjectReview
 * @param {BaseEditorParameters} params
 * @param name name of issue finder
 * @return {any}
 */

import { failureOn, successOn } from "../../action/ActionResult";
import { deepLink, Issue, raiseIssue } from "../../util/gitHub";
import { GitHubRepoRef, isGitHubRepoRef } from "../common/GitHubRepoRef";
import { BaseEditorParameters } from "../edit/BaseEditorParameters";
import { ReviewRouter } from "./reviewerToCommand";
import { ProjectReview, ReviewComment } from "./ReviewResult";

/**
 * Create an issue from a review, using Markdown
 * @param {ProjectReview} pr
 * @param {BaseEditorParameters} params
 * @param {string} name
 * @return {any}
 */
export const issueRaisingReviewRouter: ReviewRouter<BaseEditorParameters> =
    (pr: ProjectReview, params: BaseEditorParameters, name: string) => {
        if (isGitHubRepoRef(pr.repoId)) {
            const issue = toIssue(pr, name);
            return raiseIssue(params.githubToken, pr.repoId, issue)
                .then(ap => successOn(pr.repoId));
        } else {
            return Promise.resolve(failureOn(pr.repoId, new Error(`Not a GitHub Repo: ${JSON.stringify(pr.repoId)}`)));
        }
    };

function toIssue(pr: ProjectReview, name: string): Issue {
    return {
        title: `${pr.comments.length} problems found by ${name}`,
        body: "Problems:\n\n" + pr.comments.map(c =>
            toMarkdown(pr.repoId as GitHubRepoRef, c)).join("\n"),
    };
}

function toMarkdown(grr: GitHubRepoRef, rc: ReviewComment) {
    return `-\t**${rc.severity}** - [${rc.comment}](${deepLink(grr, rc.sourceLocation)})`;
}
