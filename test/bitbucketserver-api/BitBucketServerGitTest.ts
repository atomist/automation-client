import axios from "axios";
import MockAdapter = require("axios-mock-adapter");
import * as assert from "power-assert";
import {BasicAuthCredentials} from "../../src/operations/common/BasicAuthCredentials";
import {BitBucketServerRepoRef} from "../../src/operations/common/BitBucketServerRepoRef";

export const BitBucketServerUsername = "username";
export const BitBucketServerPassword = "password";

export const BitBucketServerCredentials = {
    username: BitBucketServerUsername,
    password: BitBucketServerPassword,
} as BasicAuthCredentials;

describe("BitBucketServer support", () => {

    describe("should return correct clone url", () => {
        it("for project", done => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-project", "test-app");
            assert(bitbucketServerRepoRef.cloneUrl(BitBucketServerCredentials) === "https://username:password@bitbucket.organistation.co.za/scm/a-project/test-app.git");
            done();
        });
        it("for user", done => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-user", "test-app", false);
            assert(bitbucketServerRepoRef.cloneUrl(BitBucketServerCredentials) === "https://username:password@bitbucket.organistation.co.za/scm/a-user/test-app.git");
            done();
        });
    });

    describe("should return correct api path url component", () => {
        it("for project", done => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-project", "test-app");
            assert(bitbucketServerRepoRef.apiPathComponent === "projects/a-project/repos/test-app");
            done();
        });
        it("for user", done => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-user", "test-app", false);
            assert(bitbucketServerRepoRef.apiPathComponent === "projects/~a-user/repos/test-app");
            done();
        });
    });

    it("should create repo", () => {
        const mock = new MockAdapter(axios);

        mock.onPost("https://bitbucket.organistation.co.za/rest/api/1.0/projects/a-project/repos/")
            .reply(200, {});

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.createRemote(BitBucketServerCredentials, "a description", "true");
    });

    it("should delete repo", () => {
        const mock = new MockAdapter(axios);

        mock.onDelete("https://bitbucket.organistation.co.za/rest/api/1.0/projects/a-project/repos/test-app")
            .reply(200, {});

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.deleteRemote(BitBucketServerCredentials);
    });

    it("should create pr", () => {
        const mock = new MockAdapter(axios);

        mock.onPost("https://bitbucket.organistation.co.za/rest/api/1.0/projects/a-project/repos/test-app/pull-requests")
            .reply(200, {});

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("bitbucket.organistation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.raisePullRequest(
            BitBucketServerCredentials, "Add a thing",
            "Dr Seuss is fun", "refs/heads/thing1",
            "refs/heads/master");
    });
});
