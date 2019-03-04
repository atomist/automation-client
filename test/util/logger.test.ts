import * as assert from "assert";
import { TransformableInfo } from "logform";
import { addLogRedaction, redact } from "../../lib/util/logger";

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
    it("prints ordinary stuff", () => {
        const originalMessage = "boogers and carrots";
        const result = redact({
            message: originalMessage,
        } as TransformableInfo);

        assert.strictEqual(result.message, originalMessage);
    });

    it("hides github tokens after the file that might result in them being printed is loaded", () => {
        require("../../lib/operations/common/AbstractRemoteRepoRef.ts");

        {
            const result = redact({
                message: "https://12093847103847561098457012abfcdefab456ef:x-oauth-basic@blah blah blah blah",
            } as TransformableInfo);

            assert(!result.message.includes("12093847103847561098457012abfcdefab456ef"), "This should have been redacted");
            assert(result.message.includes("[REDACTED_GITHUB_TOKEN]"), "Should be obvious about why it is changed");
        }

        // now let's try the other creds that get into cloneUrls

        //  `${this.scheme}${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@`
        {
            const result = redact({
                message: "https://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
            } as TransformableInfo);

            assert(!result.message.includes("passwordy"), "This should have been redacted");
            assert(result.message.includes("[REDACTED_URL_PASSWORD]"), "Be clear about why this is changed");
        }

        // `${this.scheme}gitlab-ci-token:${creds.privateToken}@`
        {
            const result = redact({
                message: "https://gitlab-ci-token:something-tokeny@blah blah blah blah",
            } as TransformableInfo);

            assert(!result.message.includes("something-tokeny"), "This should have been redacted");
            assert(result.message.includes("[REDACTED_GITLAB_CI_TOKEN]"), "Be clear about why this is changed");
        }

    });

});
