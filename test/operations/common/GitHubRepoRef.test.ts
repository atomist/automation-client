// tslint:disable-next-line:import-blacklist
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as assert from "power-assert";

import {beautifyPullRequestBody, GitHubRepoRef,} from "../../../lib/operations/common/GitHubRepoRef";
import {PullRequestReviewerType} from "../../../lib/operations/common/RepoId";
import {AxiosHttpClientFactory} from "../../../lib/spi/http/axiosHttpClient";

describe("GitHubRepoRef tests", () => {
    before(() => {
        (global as any).__runningAutomationClient = {
            configuration: {
                http: {
                    client: {
                        factory: new AxiosHttpClientFactory(),
                    },
                },
            },
        };
    });

    after(() => {
        delete (global as any).__runningAutomationClient;
    });

    it("defaults apiBase correctly", () => {
        const gh = new GitHubRepoRef("owner", "repo");
        assert(gh.apiBase === "api.github.com");
    });

    it("guesses the remote from the apiBase for github.com", () => {
        const gh = new GitHubRepoRef("owner", "repo");
        assert(gh.remoteBase === "github.com");
    });

    it("guesses the remote from the apiBase for GHE", () => {
        // Note: I am basing this on docs, not empirical testing.
        const gh = new GitHubRepoRef("owner", "repo", undefined, "https://my.ghe.host/api/v3/");
        assert(gh.remoteBase === "my.ghe.host");
        assert(gh.scheme === "https://");
    });

    it("takes new apiBase correctly", () => {
        const apiBase = "https://somewhere.com";
        const gh = new GitHubRepoRef("owner", "repo", undefined, apiBase);
        assert(gh.apiBase === "somewhere.com");
    });

    it("strips new apiBase trailing / correctly", () => {
        const apiBase = "https://somewhere.com/api/v3";
        const gh = new GitHubRepoRef("owner", "repo", undefined, apiBase + "/");
        assert.equal(gh.apiBase, "somewhere.com/api/v3");
    });

    it("doesn't set sha when sha is not provided", () => {
        const gh = GitHubRepoRef.from({ owner: "owner", repo: "repo", branch: "fester" });
        assert(!gh.sha);
    });

    it("does not let you provide a sha that is not a sha, when you could put that in branch", () => {
        assert.throws(() => GitHubRepoRef.from({ owner: "owner", repo: "repo", sha: "fester" }));
    });

    describe("GitHubRepoRef Pull Request tests", () => {
        it("should assign reviewers to an existing pr", async () => {
            const mock = new MockAdapter(axios);
            mock.onPost("https://api.github.com/repos/a-project/test-app/pulls/5/requested_reviewers") // Used to add reviewers to existing PR
                .reply(200, {});
            const gRR = new GitHubRepoRef("a-project", "test-app");
            await gRR.addReviewersToPullRequest(
                {token: "fake"},
                "5",
                [
                    {type: PullRequestReviewerType.individual, name: "mr-peanut"},
                    {type: PullRequestReviewerType.individual, name: "friend"},
                    {type: PullRequestReviewerType.team, name: "friends"},
                ]);

            assert.strictEqual(mock.history.post.length, 1);
            assert.deepStrictEqual(JSON.parse((mock.history.post[0] as any).data).team_reviewers, ["friends"]);
            assert.deepStrictEqual(JSON.parse((mock.history.post[0] as any).data).reviewers, ["mr-peanut", "friend"]);
        });
        it("should create pr", async () => {
            const mock = new MockAdapter(axios);
            mock.onGet("https://api.github.com/repos/a-project/test-app/pulls?state=open&head=a-project:thing1")
                .reply(() => [200, []]);  // Respond that this PR doesn't exist
            mock.onPost("https://api.github.com/repos/a-project/test-app/pulls")
                .reply(201,  {}); // Respond that this PR was created successfully

            const gRR = new GitHubRepoRef("a-project", "test-app");
            await gRR.raisePullRequest(
                {token: "fake"}, "Add a thing",
                "Mr Peanut Butter goes woof", "thing1",
                "master");

            // Check for expected calls
            assert.strictEqual(mock.history.post.length, 1);
            assert.strictEqual(mock.history.get.length, 1);

            // Validate data that was posted
            const postData = JSON.parse((mock.history.post[0] as any).data);
            assert.strictEqual(postData.title, "Add a thing");
            assert.strictEqual(postData.body, "Mr Peanut Butter goes woof");
            assert.strictEqual(postData.head, "thing1");
            assert.strictEqual(postData.base, "master");
        });
        it("should create pr with supplied reviewers", async () => {
            const mock = new MockAdapter(axios);
            // On the first get, return that the PR does not exist, on the second call (after we created) respond that it does and its number
            mock.onGet("https://api.github.com/repos/a-project/test-app/pulls?state=open&head=a-project:thing1")
                .reply(() => mock.history.get.length === 2 ? [200, [{number: 5}]] : [200, []]);
            mock.onPost("https://api.github.com/repos/a-project/test-app/pulls") // Endpoint used to raise PR
                .reply(201, [{number: 5}]);
            mock.onPost("https://api.github.com/repos/a-project/test-app/pulls/5/requested_reviewers") // Used to add reviewers to existing PR
                .reply(200, {});

            const gRR = new GitHubRepoRef("a-project", "test-app");
            await gRR.raisePullRequest(
                {token: "fake"},
                "Add a thing",
                "Mr Peanut Butter goes woof",
                "thing1",
                "master",
                [
                    {type: PullRequestReviewerType.individual, name: "mr-peanut"},
                    {type: PullRequestReviewerType.team, name: "dog-friends"},
                ]);

            assert.strictEqual(mock.history.post.length, 2);
            assert.strictEqual(mock.history.get.length, 2);
            assert.deepStrictEqual(JSON.parse((mock.history.post[1] as any).data).reviewers, ["mr-peanut"]);
            assert.deepStrictEqual(JSON.parse((mock.history.post[1] as any).data).team_reviewers, ["dog-friends"]);
        });
        it("should update pr that already exists", async () => {
            const mock = new MockAdapter(axios);
            mock.onGet("https://api.github.com/repos/a-project/test-app/pulls?state=open&head=a-project:thing1")
                .reply(() => [200, [{number: 5}]]); // Respond that the PR already exists when getPr is run
            mock.onPatch("https://api.github.com/repos/a-project/test-app/pulls/5")
                .reply(200,  {}); // Respond 200 when the patch is sent
            mock.onPost("https://api.github.com/repos/a-project/test-app/issues/5/comments")
                .reply(201,  {}); // Respond 201 when the PR comment is added

            const gRR = new GitHubRepoRef("a-project", "test-app");
            await gRR.raisePullRequest(
                {token: "fake"}, "Add a thing",
                "Mr Peanut Butter goes woof", "thing1",
                "master");

            // Check for expected calls
            assert.strictEqual(mock.history.get.length, 1);
            assert.strictEqual(mock.history.post.length, 1);
            assert.strictEqual(mock.history.patch.length, 1);

            // Validate data that was sent
            assert.strictEqual(JSON.parse((mock.history.patch[0] as any).data).title, "Add a thing");
            assert.strictEqual((mock.history.post[0] as any).data, "Mr Peanut Butter goes woof");
        });
        it("should process tags in PR body", () => {
            const body = `#### New NPM Package Target
Target version for NPM package *@atomist/sdm* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.
[atomist:generated]



#### New NPM Package Target
Target version for NPM package *@atomist/sdm-core* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.



[auto-merge:on-approve]




[auto-merge-method:squash] [auto-merge:on-approve] [auto-merge-method:squash] `;
            const expectedBody = `#### New NPM Package Target
Target version for NPM package *@atomist/sdm* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.

#### New NPM Package Target
Target version for NPM package *@atomist/sdm-core* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.

---
<details>
  <summary>Tags</summary>
<br/>
<code>[atomist:generated]</code><br/><code>[auto-merge-method:squash]</code><br/><code>[auto-merge-method:squash]</code><br/><code>[auto-merge:on-approve]</code><br/><code>[auto-merge:on-approve]</code>
</details>`;

            const newBody = beautifyPullRequestBody(body);
            assert.strictEqual(newBody, expectedBody);
        });

    });

});
