import * as util from "util";

import { ActionResult, failureOn, successOn } from "../../../action/ActionResult";
import { logger } from "../../../internal/util/logger";
import { GitProject } from "../../../project/git/GitProject";
import { addRepoWebhook, GitHubRepoWebhookPayload } from "../../../util/gitHub";
import { isGitHubRepoRef } from "../../common/GitHubRepoRef";
import { ProjectAction } from "../../common/projectAction";
import { isTokenCredentials } from "../../common/ProjectOperationCredentials";
import { SeedDrivenGeneratorParameters } from "../SeedDrivenGeneratorParameters";

/**
 * afterAction for use in generatorUtils.generate function that adds the Atomist web hook
 * for the repo
 * @param {GitProject} p
 * @param {SeedDrivenGeneratorParameters} params
 * @return {any}
 */
export const addAtomistWebhook: ProjectAction<SeedDrivenGeneratorParameters, GitProject> =
    (p, params) => addWebhook(p, params)
        .then(r => ({
            ...r,
            target: p,
        }));

function addWebhook(p: GitProject, params: SeedDrivenGeneratorParameters): Promise<ActionResult<any>> {
    if (!params.addAtomistWebhook) {
        return Promise.resolve(successOn(p));
    }

    function logAndFail(fmt: string, ...args: any[]): Promise<ActionResult<GitProject>> {
        const msg = util.format(fmt, ...args);
        logger.error(msg);
        return Promise.resolve(failureOn(p, new Error(msg), { name: "addWebhook" }));
    }

    if (!isGitHubRepoRef(p.id)) {
        return logAndFail("Unable to add Atomist web hook: Not a GitHub repo [%j]", p.id);
    }
    if (!params.target.webhookUrl) {
        return logAndFail("Requested to add webhook but no URL provided");
    }
    if (!isTokenCredentials(params.target.credentials)) {
        return logAndFail("Requested to add webhook but no GitHub token provided");
    }

    const payload: GitHubRepoWebhookPayload = {
        name: "web",
        events: ["*"],
        active: true,
        config: {
            url: params.target.webhookUrl,
            content_type: "json",
        },
    };
    if (!isTokenCredentials(params.target.credentials)) {
        return logAndFail("GitHub token must be provided");
    }
    return addRepoWebhook(params.target.credentials.token, p.id, payload)
        .then(() => Promise.resolve(successOn(p)), err => {
            const status: number = (err.response && err.response.status) ? err.response.status : -1;
            return logAndFail("Failed to install Atomist webhook on %s/%s [%d]: %s", p.id.owner, p.id.repo, status,
                err.message);
        });
}
