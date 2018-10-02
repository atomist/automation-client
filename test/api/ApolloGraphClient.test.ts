import "mocha";
import * as assert from "power-assert";
import { ApolloGraphClient } from "../../lib/graph/ApolloGraphClient";
import { GitHubRepoRef } from "../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import {
    ReposQuery,
    ReposQueryVariables,
} from "../../lib/schema/schema";
import { logger } from "../../lib/util/logger";
import {
    GitHubToken,
    SlackTeamId,
} from "./apiUtils";

describe("ApolloGraphClient", () => {

    describe("api", () => {

        it("should run repos query", done => {

            const agc = new ApolloGraphClient(`https://automation.atomist.com/graphql/team/${SlackTeamId}`,
                { Authorization: `token ${GitHubToken}` });
            let start = Date.now();
            agc.query<ReposQuery, ReposQueryVariables>({
                name: "Repos",
                variables: { teamId: SlackTeamId, offset: 0 },
            })
                .then(result => {
                    logger.debug("query took " + (Date.now() - start));
                    const org = result.ChatTeam[0].orgs[0];
                    assert(org.repo.length > 0);
                    const repo1 = org.repo[0];
                    assert(repo1.name);
                    assert(repo1.owner);
                    start = Date.now();
                    agc.query<ReposQuery, ReposQueryVariables>({
                        name: "Repos",
                        variables: { teamId: SlackTeamId, offset: 0 },
                    })
                        .then(r1 => {
                            logger.debug("query took " + (Date.now() - start));
                        });
                })
                .then(() => done(), done);
        }).timeout(5000);

        it("should run repos query and clone repo", async () => {
            let p: GitProject;
            try {
                const agc = new ApolloGraphClient(`https://automation.atomist.com/graphql/team/${SlackTeamId}`,
                    { Authorization: `token ${GitHubToken}` });
                const result = await agc.query<ReposQuery, ReposQueryVariables>({
                    name: "Repos",
                    variables: { teamId: SlackTeamId, offset: 0 },
                });
                const org = result.ChatTeam[0].orgs[0];
                assert(org.repo.length > 0);
                const repo1 = org.repo[0];
                p = await GitCommandGitProject.cloned({ token: GitHubToken },
                    new GitHubRepoRef(repo1.owner, repo1.name));
                const gitHead = p.findFileSync(".git/HEAD");
                assert(gitHead);
                assert(gitHead.path === ".git/HEAD");
                await p.release();
            } catch (e) {
                await p.release();
                throw e;
            }
        }).timeout(10000);

        it("should mutate preferences", done => {
            const agc = new ApolloGraphClient(`https://automation.atomist.com/graphql/team/${SlackTeamId}`,
                { Authorization: `token ${GitHubToken}` });
            agc.mutate({
                name: "SetChatUserPreference",
                variables: {
                    teamId: SlackTeamId,
                    userId: "U095T3BPF",
                    name: "test",
                    value: `{"disable_for_test":true}`,
                },
            })
                .then(result => {
                    assert.equal((result as any).setChatUserPreference[0].name, "test");
                    assert.equal((result as any).setChatUserPreference[0].value, `{"disable_for_test":true}`);
                })
                .then(() => done(), done);
        }).timeout(5000);

    });
});
