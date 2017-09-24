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
        .then(gp => {
            return editor(repo, gp, context)
                .then(edited => edited ? gp : false);
        })
        .then(r => {
            if (r === false) {
                return Promise.resolve(false);
            } else {
                const gp = r as GitProject;
                return gp.createBranch(pr.branch)
                    .then(x => gp.commit(pr.commitMessage))
                    .then(x => gp.push())
                    .then(x => {
                        return gp.raisePullRequest(pr.title, pr.body);
                    });
            }
        });
}

export class PullRequestEdit {
    constructor(public branch: string,
                public title: string,
                public body: string = title,
                public commitMessage: string = title) {
    }
}
