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
});
