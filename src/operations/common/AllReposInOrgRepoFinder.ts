import { HandlerContext } from "../../HandlerContext";
import { logger } from "../../internal/util/logger";
import { ReposQuery, ReposQueryVariables } from "../../schema/schema";
import { twoTierDirectoryRepoFinder } from "./localRepoFinder";
import { RepoFinder } from "./RepoFinder";
import { SimpleRepoId } from "./RepoId";

/**
 * Use a GraphQL query to find all repos for the current org,
 * or look locally if appropriate, in current working directory
 * @param cwd directory to look in if this is local
 * @constructor
 */
export function allReposInOrg(cwd?: string): RepoFinder {
    return (context: HandlerContext) => {
        if (cwd) {
            return twoTierDirectoryRepoFinder(cwd)(context);
        }
        return context.graphClient.executeFile<ReposQuery, ReposQueryVariables>(
            "repos",
            {teamId: context.teamId, offset: 0})
            .then(result => {
                const org = result.ChatTeam[0].orgs[0];
                return org.repo.map(r => new SimpleRepoId(r.owner, r.name));
            });
    };
}
