// tslint:disable-next-line:import-blacklist
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as assert from "power-assert";
import { GitlabRepoRef } from "../../../lib/operations/common/GitlabRepoRef";
import {
    ProviderType,
    PullRequestReviewerType,
} from "../../../lib/operations/common/RepoId";
import { AxiosHttpClientFactory } from "../../../lib/spi/http/axiosHttpClient";

describe("GitlabRepoRef", () => {
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

    it("should set the base urls & provider type appropriately when not provided", () => {
        const gl = GitlabRepoRef.from({
            owner: "a-project",
            repo: "test-project",
        });
        assert.strictEqual(gl.apiBase, "gitlab.com/api/v4");
        assert.strictEqual(gl.remoteBase, "gitlab.com");
        assert.strictEqual(gl.scheme, "https://");
        assert.strictEqual(gl.providerType, ProviderType.gitlab_com);
    });
    it("should set the base urls & provider type appropriately when provided", () => {
        const gl = GitlabRepoRef.from({
            owner: "a-project",
            repo: "test-project",
            rawApiBase: "http://mygitlab.com/api/v4",
            gitlabRemoteUrl: "http://mygitlab.com",
        });
        assert.strictEqual(gl.apiBase, "mygitlab.com/api/v4");
        assert.strictEqual(gl.remoteBase, "mygitlab.com");
        assert.strictEqual(gl.scheme, "http://");
        assert.strictEqual(gl.providerType, ProviderType.gitlab_enterprise);
    });
    it("should throw for invalid git sha", () => {
        assert.throws(() => {
            GitlabRepoRef.from({
                sha: "#$234;",
                owner: "a-project",
                repo: "test-project",
            });
        }, /You provided an invalid SHA/);
    });
    describe("Approver Lookup", () => {
        it("should resolve user id", async () => {
            const mock = new MockAdapter(axios);
            mock.onGet(`https://gitlab.com/api/v4/users?username=johndoe`)
                .reply(200, [{id: 5, name: "John Doe", username: "johndoe"}]);
            const result = await GitlabRepoRef.from({owner: "a", repo: "a"}).getUserId({}, "johndoe");
            assert.strictEqual(result, 5);
        });
        it("should throw for unresolvable user", async () => {
            const mock = new MockAdapter(axios);
            mock.onGet(`https://gitlab.com/api/v4/users?username=johndoe`)
                .reply(200, []);
            try {
                await GitlabRepoRef.from({owner: "a", repo: "a"}).getUserId({}, "johndoe");
            } catch (err) {
                assert.strictEqual(err.message, `Failed retrieve Gitlab user id for johndoe; does user exist?`);
            }
        });
        it("should resolve group id", async () => {
            const mock = new MockAdapter(axios);
            mock.onGet(`https://gitlab.com/api/v4/groups/test-group?with_projects=false`)
                .reply(200, {id: 5});
            const result = await GitlabRepoRef.from({owner: "a", repo: "a"}).getGroupId({}, "test-group");
            assert.strictEqual(result, 5);
        });
        it("should throw for unresolvable group id", async () => {
            const mock = new MockAdapter(axios);
            mock.onGet(`https://gitlab.com/api/v4/groups/test-group?with_projects=false`)
                .reply(404, [{message: "404 Group Not Found"}]);
            try {
                await GitlabRepoRef.from({owner: "a", repo: "a"}).getGroupId({}, "test-group");
            } catch (err) {
                assert.strictEqual(err.message, `Failed to resolve ID for group test-group.  Does it exist?`);
            }
        });
    });
    describe("Merge Request Tests", () => {
        it("should create merge request", async () => {
            const mock = new MockAdapter(axios);
            mock.onPost("https://gitlab.com/api/v4/projects/a-project%2ftest-project/merge_requests")
                .reply(200, {});

            const repoRef = GitlabRepoRef.from({ owner: "a-project", repo: "test-project"});
            await repoRef.raisePullRequest({token: "fake"},
                "Test Merge Request",
                "This is a test",
                "test-branch",
                "master");

            assert.strictEqual(mock.history.post.length, 1); // Did we post?
            const data = JSON.parse(mock.history.post[0].data); // Did we post with the correct data?
            assert.strictEqual(data.title, "Test Merge Request");
            assert.strictEqual(data.description, "This is a test");
            assert.strictEqual(data.source_branch, "test-branch");
            assert.strictEqual(data.target_branch, "master");
        });
        describe("MR Creation with Approvers", () => {
            describe("Gitlab Version < 10.6", () => {
                it("should throw error if reviewers are supplied", async () => {
                    const mock = new MockAdapter(axios);
                    mock.onPost("https://gitlab.com/api/v4/projects/a-project%2ftest-project/merge_requests")
                        .reply(200, {});
                    mock.onGet("https://gitlab.com/api/v4/version")
                        .reply(200, {version: "10.5.0", revision: "doesntmatter"});
                    const repoRef = GitlabRepoRef.from({ owner: "a-project", repo: "test-project"});
                    try {
                        await repoRef.raisePullRequest({token: "fake"},
                            "Test Merge Request",
                            "This is a test",
                            "test-branch",
                            "master",
                            [{type: PullRequestReviewerType.individual, name: "fakeuser"}]);
                    } catch (err) {
                        assert.strictEqual(err.message, "Failed to add reviewers to Merge Request. Error: Cannot set merge request approvers, Gitlab version 10.5.0 not supported!");
                    }
                });
            });
            describe("Gitlab Version > 10.6 < 12.3", () => {
                it("should create mr using approvers api", async () => {
                    const mock = new MockAdapter(axios);
                    mock.onPost("https://gitlab.com/api/v4/projects/a-project%2ftest-project/merge_requests")
                        .reply(200, {iid: 5, project_id: 5});
                    mock.onGet("https://gitlab.com/api/v4/version")
                        .reply(200, {version: "11.1.0", revision: "doesntmatter"});
                    mock.onPut("https://gitlab.com/api/v4/projects/5/merge_requests/5/approvers")
                        .reply(200, {});
                    mock.onPost("https://gitlab.com/api/v4/projects/5/merge_requests/5/approvals")
                        .reply(200, {});
                    mock.onGet(`https://gitlab.com/api/v4/users?username=fakeuser`)
                        .reply(200, [{id: 5, name: "John Doe", username: "fakeuser"}]);
                    mock.onGet(`https://gitlab.com/api/v4/groups/fakegroup?with_projects=false`)
                        .reply(200, {id: 5});

                    const repoRef = GitlabRepoRef.from({owner: "a-project", repo: "test-project"});
                    await repoRef.raisePullRequest({token: "fake"},
                        "Test Merge Request",
                        "This is a test",
                        "test-branch",
                        "master",
                        [
                            {type: PullRequestReviewerType.individual, name: "fakeuser"},
                            {type: PullRequestReviewerType.team, name: "fakegroup"},
                        ]);

                    assert.strictEqual(mock.history.get.length, 3);
                    assert.strictEqual(mock.history.post.length, 2);
                    assert.strictEqual(mock.history.put.length, 1);
                    assert.strictEqual(JSON.parse(mock.history.post[1].data).approvals_required, 2);
                    assert.deepStrictEqual(JSON.parse(mock.history.put[0].data).approver_ids, [5]);
                    assert.deepStrictEqual(JSON.parse(mock.history.put[0].data).approver_group_ids, [5]);
                });
            });
            describe("Gitlab Version >= 12.3", () => {
                it("should use the approval rules API", async () => {
                    const mock = new MockAdapter(axios);
                    mock.onPost("https://gitlab.com/api/v4/projects/a-project%2ftest-project/merge_requests")
                        .reply(200, {iid: 5, project_id: 5});
                    mock.onGet("https://gitlab.com/api/v4/version")
                        .reply(200, {version: "12.6.0", revision: "doesntmatter"});
                    mock.onGet(`https://gitlab.com/api/v4/users?username=fakeuser`)
                        .reply(200, [{id: 5, name: "John Doe", username: "fakeuser"}]);
                    mock.onGet(`https://gitlab.com/api/v4/groups/fakegroup?with_projects=false`)
                        .reply(200, {id: 5});
                    mock.onPost("https://gitlab.com/api/v4/projects/5/merge_requests/5/approval_rules")
                        .reply(200, {});

                    const repoRef = GitlabRepoRef.from({owner: "a-project", repo: "test-project"});
                    await repoRef.raisePullRequest({token: "fake"},
                        "Test Merge Request",
                        "This is a test",
                        "test-branch",
                        "master",
                        [
                            {type: PullRequestReviewerType.individual, name: "fakeuser"},
                            {type: PullRequestReviewerType.team, name: "fakegroup"},
                        ]);

                    assert.strictEqual(mock.history.get.length, 3);
                    assert.strictEqual(mock.history.post.length, 2);
                    assert.strictEqual(JSON.parse(mock.history.post[1].data).approvals_required, 2);
                    assert.deepStrictEqual(JSON.parse(mock.history.post[1].data).user_ids, [5]);
                    assert.deepStrictEqual(JSON.parse(mock.history.post[1].data).group_ids, [5]);
                });
            });
        });
    });
    describe("Namespace lookup", () => {
        // TODO: Add Namespace tests
        it("should return id when found", async () => {
        });
        it("should throw when know namespace with the supplied name can be found", async () => {
        });
    });
});
