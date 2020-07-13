import * as assert from "power-assert";
import { ApolloGraphClient } from "../../lib/graph/ApolloGraphClient";
import { GitHubRepoRef } from "../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import { ReposQuery, ReposQueryVariables } from "../../lib/schema/schema";
import { AtomistApiKey, GitHubToken, SlackTeamId } from "./apiUtils";

describe("graph/ApolloGraphClient", () => {
    describe("ApolloGraphClient", () => {
        let headers: any;
        before(function b(this: Mocha.Context): void {
            if (AtomistApiKey) {
                headers = { Authorization: `Bearer ${AtomistApiKey}` };
            } else {
                this.skip();
            }
        });

        it("should run repos query", async () => {
            const agc = new ApolloGraphClient(`https://automation.atomist.com/graphql/team/${SlackTeamId}`, headers);
            const result = await agc.query<ReposQuery, ReposQueryVariables>({
                name: "Repos",
                variables: { teamId: SlackTeamId, offset: 0 },
                options: {
                    log: false,
                },
            });
            const org = result.ChatTeam[0].orgs[0];
            assert(org.repo.length > 0);
            const repo1 = org.repo[0];
            assert(repo1.name);
            assert(repo1.owner);
            await agc.query<ReposQuery, ReposQueryVariables>({
                name: "Repos",
                variables: { teamId: SlackTeamId, offset: 0 },
            });
        }).timeout(5000);

        it("should run repos query and clone repo", async function i(this: Mocha.Context): Promise<void> {
            if (!GitHubToken) {
                this.skip();
            }
            let p: GitProject;
            try {
                const agc = new ApolloGraphClient(
                    `https://automation.atomist.com/graphql/team/${SlackTeamId}`,
                    headers,
                );
                const result = await agc.query<ReposQuery, ReposQueryVariables>({
                    name: "Repos",
                    variables: { teamId: SlackTeamId, offset: 0 },
                    options: {
                        log: false,
                    },
                });
                const org = result.ChatTeam[0].orgs[0];
                assert(org.repo.length > 0);
                let ri = 0;
                while (!p && ri < org.repo.length) {
                    const r = org.repo[ri++];
                    try {
                        p = await GitCommandGitProject.cloned(
                            { token: GitHubToken },
                            new GitHubRepoRef(r.owner, r.name),
                        );
                    } catch (e) {
                        // ignore
                    }
                }
                const gitHead = p.findFileSync(".git/HEAD");
                assert(gitHead);
                assert(gitHead.path === ".git/HEAD");
                await p.release();
            } catch (e) {
                if (p) {
                    await p.release();
                }
                throw e;
            }
        }).timeout(10000);

        it("should mutate preferences", async () => {
            const agc = new ApolloGraphClient(`https://automation.atomist.com/graphql/team/${SlackTeamId}`, headers);
            const result = await agc.mutate({
                name: "SetChatUserPreference",
                variables: {
                    teamId: SlackTeamId,
                    userId: "U095T3BPF",
                    name: "test",
                    value: `{"disable_for_test":true}`,
                },
            });
            assert.equal((result as any).setChatUserPreference[0].name, "test");
            assert.equal((result as any).setChatUserPreference[0].value, `{"disable_for_test":true}`);
        }).timeout(5000);
    });
});
