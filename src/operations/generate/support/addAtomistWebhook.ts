import { ActionResult, successOn } from "../../../action/ActionResult";
import { logger } from "../../../internal/util/logger";
import { GitProject } from "../../../project/git/GitProject";
import { isGitHubRepoRef } from "../../common/GitHubRepoRef";
import { ProjectAction } from "../../common/projectAction";
import { BaseSeedDrivenGeneratorParameters } from "../BaseSeedDrivenGeneratorParameters";

/**
 * afterAction for use in generatorUtils.generate function that adds the Atomist web hook
 * for the repo
 * @param {GitProject} p
 * @param {BaseSeedDrivenGeneratorParameters} params
 * @return {any}
 */
export const addAtomistWebhook: ProjectAction<BaseSeedDrivenGeneratorParameters, GitProject> =
    (p, params) => {
        if (!params.addAtomistWebhook) {
            return Promise.resolve(successOn(p));
        } else {
            return addWebhook(p)
                .then(r => ({
                    ...r,
                    target: p,
                }));
        }
    };

function addWebhook(p: GitProject): Promise<ActionResult<any>> {
    if (isGitHubRepoRef(p.id)) {
        // TODO GitHub info is here
        return Promise.resolve(successOn(p));
    } else {
        logger.warn("Unable to add Atomist web hook: Not a GitHub repo [%j]", p.id);
        return Promise.resolve(successOn(p));
    }
}
