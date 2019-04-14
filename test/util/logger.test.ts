import { TransformableInfo } from "logform";
import * as assert from "power-assert";
import {
    addLogRedaction,
    redact,
} from "../../lib/util/logger";

// require for its addLogRedaction calls
// tslint:disable-next-line:no-var-requires
require("../../lib/operations/common/AbstractRemoteRepoRef.ts");

describe("util/logger", () => {

    describe("redaction", () => {

        it("redacts things", async () => {
            const replacement = "[DO NOT LOOK]";

            // sorry, but this will replace all booogers for the rest of the tests.
            // That is why I spelled it oddly.
            addLogRedaction(/booo+gers/, replacement);

            const result = redact({
                message: "booogers and carrots",
            } as TransformableInfo);

            assert(!result.message.includes("booogers"), "This should have been redacted");
            assert(result.message.includes(replacement), "Don't look at me when I'm picking my nose");
        });

        it("if the regexp has groups, redact those and not the whole thing", async () => {

            addLogRedaction(/(84 )tomprince( \w+ )t\w+( nal)/, "$1[RIP_TOM]$2[RIP_TOM]$3");

            const result = redact({
                message: "bujo84 tomprince malakai821 treguy nallaj",
            } as TransformableInfo);

            assert.strictEqual(result.message, "bujo84 [RIP_TOM] malakai821 [RIP_TOM] nallaj",
                "The groups should have been redacted");
        });

        it("prints ordinary stuff", () => {
            const originalMessage = "boogers and carrots";
            const result = redact({
                message: originalMessage,
            } as TransformableInfo);

            assert.strictEqual(result.message, originalMessage);
        });

        it("removes github token in username position", () => {

            const result = redact({
                message: "https://12093847103847561098457012abfcdefab456ef:x-oauth-basic@blah blah blah blah",
            } as TransformableInfo);

            assert(!result.message.includes("12093847103847561098457012abfcdefab456ef"), "This should have been redacted");
            assert(result.message.includes("https://[REDACTED_GITHUB_TOKEN]:x-oauth-basic@blah"),
                "Should be obvious about why it is changed");
        });

        it("removes github token with x-oauth-basic", () => {

            const result = redact({
                message: "https://12093847103847561098457012abfcdefab456ef@blah blah blah blah",
            } as TransformableInfo);

            assert(!result.message.includes("12093847103847561098457012abfcdefab456ef"), "This should have been redacted");
            assert(result.message.includes("https://[REDACTED_GITHUB_TOKEN]@blah"), "bare token not removed");
        });

        // now let's try the other creds that get into cloneUrls

        //  `${this.scheme}${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@`
        it("removes url auth password", () => {
            const result = redact({
                message: "https://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
            } as TransformableInfo);

            assert(!result.message.includes("passwordy"), "This should have been redacted");
            assert(result.message.includes("https://urlencoded%2Fusername:[REDACTED_URL_PASSWORD]@some"), "Be clear about why this is changed");
        });

        // `${this.scheme}gitlab-ci-token:${creds.privateToken}@`
        it("removes gitlab ci token", () => {
            const result = redact({
                message: "https://gitlab-ci-token:something-tokeny@blah blah blah blah",
            } as TransformableInfo);

            assert(!result.message.includes("something-tokeny"), "This should have been redacted");
            assert(result.message.includes("https://gitlab-ci-token:[REDACTED_URL_PASSWORD]@blah"), "Be clear about why this is changed");
        });

    });

});
