import "mocha";
import { ApolloGraphClient } from "../../src/graph/ApolloGraphClient";

import * as assert from "power-assert";
import { GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../src/project/git/GitCommandGitProject";
import { ReposQuery, ReposQueryVariables } from "../../src/schema/schema";
import { GitHubToken } from "../atomist.config";

const teamId = "T095SFFBK";

describe("ApolloGraphClient", () => {

    it("should run repos query", done => {

        const agc = new ApolloGraphClient("https://automation.atomist.com/graphql/team/" + teamId,
            { Authorization: `token ${process.env.GITHUB_TOKEN}` });
        let start = Date.now();
        agc.executeQueryFromFile<ReposQuery, ReposQueryVariables>("graphql/repos",
            { teamId, offset: 0 })
            .then(result => {
                console.log("query took " + (Date.now() - start));
                // console.log(`Repos were ${JSON.stringify(result)}`);
                const org = result.ChatTeam[0].orgs[0];
                assert(org.repo.length > 0);
                const repo1 = org.repo[0];
                assert(repo1.name);
                assert(repo1.owner);
                start = Date.now();
                agc.executeQueryFromFile<ReposQuery, ReposQueryVariables>("graphql/repos",
                    { teamId, offset: 0 })
                    .then(r1 => {
                        console.log("query took " + (Date.now() - start));
                    });
            })
            .then(done, done);
    }).timeout(5000);

    it("should run repos query and clone repo", done => {
        const agc = new ApolloGraphClient("https://automation.atomist.com/graphql/team/T095SFFBK"
            , { Authorization: `token ${process.env.GITHUB_TOKEN}` });
        agc.executeQueryFromFile<ReposQuery, ReposQueryVariables>("graphql/repos",
            { teamId: "T095SFFBK", offset: 0 })
            .then(result => {
                // console.log(`Repos were ${JSON.stringify(result)}`);
                const org = result.ChatTeam[0].orgs[0];
                assert(org.repo.length > 0);
                const repo1 = org.repo[0];
                GitCommandGitProject.cloned({ token: GitHubToken },
                    new GitHubRepoRef(repo1.owner, repo1.name))
                    .then(p => {
                        const gitHead = p.findFileSync(".git/HEAD");
                        assert(gitHead);
                        console.log(`.git/HEAD path=${gitHead.path}`);
                    });
            })
            .then(done, done);
    }).timeout(10000);

    it("should mutate preferences", done => {
        const agc = new ApolloGraphClient("https://automation.atomist.com/graphql/team/T095SFFBK"
            , { Authorization: `token ${process.env.GITHUB_TOKEN}` });
        agc.executeMutationFromFile("graphql/setUserPreference",
            {
                userId: "T095SFFBK",
                name: "test",
                value: `{"disable_for_test":true}`,
            })
            .then(result => {
                assert((result as any).setUserPreference[0].name === "test");
                assert((result as any).setUserPreference[0].value === `{"disable_for_test":true}`);
            })
            .then(done, done);
    }).timeout(5000);

});
