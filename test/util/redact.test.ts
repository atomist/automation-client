import { TransformableInfo } from "logform";
import * as assert from "power-assert";
import { DEFAULT_REDACTION_PATTERNS } from "../../lib/configuration";
import {
    addRedaction,
    redactLog,
} from "../../lib/util/redact";
// tslint:disable-next-line:no-var-requires
require("../../lib/operations/common/AbstractRemoteRepoRef.ts");

describe("util/redact", () => {

    describe("redaction", () => {

        before(() => {
            DEFAULT_REDACTION_PATTERNS.forEach(d => addRedaction(d.regexp, d.replacement));
        });

        it("redacts things", async () => {
            const replacement = "[DO NOT LOOK]";
            // sorry, but this will replace all booogers for the rest of the tests.
            // That is why I spelled it oddly.
            addRedaction(/booo+gers/, replacement);
            const l: TransformableInfo = {
                level: "info",
                message: "booogers and carrots",
            };
            const result = redactLog(l);
            assert(!result.message.includes("booogers"), "This should have been redacted");
            assert(result.message.includes(replacement), "Don't look at me when I'm picking my nose");
        });

        it("if the regexp has groups, redact those and not the whole thing", async () => {

            addRedaction(/(84 )tomprince( \w+ )t\w+( nal)/, "$1[RIP_TOM]$2[RIP_TOM]$3");
            const l: TransformableInfo = {
                level: "info",
                message: "bujo84 tomprince malakai821 treguy nallaj",
            };
            const result = redactLog(l);
            assert.strictEqual(result.message, "bujo84 [RIP_TOM] malakai821 [RIP_TOM] nallaj",
                "The groups should have been redacted");
        });

        it("prints ordinary stuff", () => {
            const l: TransformableInfo = {
                level: "info",
                message: "boogers and carrots",
            };
            const result = redactLog(l);
            assert.strictEqual(result.message, "boogers and carrots");
        });

        it("should redact github token in username position", () => {
            const l: TransformableInfo = {
                level: "warn",
                message: "https://12093847103847561098457012abfcdefab456ef:x-oauth-basic@blah blah blah blah",
            };
            const r = redactLog(l);
            const e = {
                level: "warn",
                message: "https://[GITHUB_TOKEN]:x-oauth-basic@blah blah blah blah",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should redact github app token in username position", () => {
            const l: TransformableInfo = {
                level: "warn",
                message: "https://v1.12093847103847561098457012abfcdefab456ef:x-oauth-basic@blah blah blah blah",
            };
            const r = redactLog(l);
            const e = {
                level: "warn",
                message: "https://[GITHUB_TOKEN]:x-oauth-basic@blah blah blah blah",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should redact github token without x-oauth-basic", () => {
            const l: TransformableInfo = {
                level: "error",
                message: "https://12093847103847561098457012abfcdefab456ef@blah.com/ blah blah blah",
            };
            const r = redactLog(l);
            const e = {
                level: "error",
                message: "https://[GITHUB_TOKEN]@blah.com/ blah blah blah",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact normal user name in URL", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "Not https://1209384710@blah.com/ blah blah blah",
            };
            const r = redactLog(l);
            assert.deepStrictEqual(r, l);
        });

        it("should not redact a Git SHA", () => {
            const ms = [
                "\n\n\tThis 0123456789abcdef0123456789abcdef01234567 is a Git SHA\n",
                "This 0123456 is a short Git SHA",
                "\n\n\tThis 0123456789abcdef0123456789abcdef01234567",
                "0123456789abcdef0123456789abcdef01234567",
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "error",
                    message: m,
                };
                const r = redactLog(l);
                assert.deepStrictEqual(r, l);
            });
        });

        it("removes url auth password", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "https://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
            };
            const result = redactLog(l);
            assert(!result.message.includes("passwordy"), "This should have been redacted");
            assert(result.message.includes("https://urlencoded%2Fusername:[URL_PASSWORD]@some"), "Be clear about why this is changed");
        });

        it("should not redact non-url auth password", () => {
            const ms = [
                "ahttps://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
                "xtp://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "debug",
                    message: m,
                };
                const r = redactLog(l);
                assert.deepStrictEqual(r, l);
            });
        });

        // `${this.scheme}gitlab-ci-token:${creds.privateToken}@`
        it("removes gitlab ci token", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "https://gitlab-ci-token:something-tokeny@blah blah blah blah",
            };
            const result = redactLog(l);
            assert(!result.message.includes("something-tokeny"), "This should have been redacted");
            assert(result.message.includes("https://gitlab-ci-token:[URL_PASSWORD]@blah"), "Be clear about why this is changed");
        });

        it("should redact the entire Atomist API key", () => {
            const ms = [
                "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
                "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
                "Not real 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF\nis not a real API key",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF\nis not a real API key",
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "warn",
                    message: m,
                };
                const r = redactLog(l);
                const e = {
                    level: "warn",
                    message: m.replace("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF", "[ATOMIST_API_KEY]"),
                };
                assert.deepStrictEqual(r, e);
            });
        });

        it("should not redact something longer than an Atomist API key", () => {
            const ms = [
                "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01 is not a real API key",
                "F0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0 is not a real API key",
                "Not real ABCEDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0 is not a real API key",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0\nis not a real API key",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0\nis not a real API key",
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "warn",
                    message: m,
                };
                const r = redactLog(l);
                assert.deepStrictEqual(r, l);
            });
        });

        it("should redact the entire Twitter access token", () => {
            const l: TransformableInfo = {
                level: "warn",
                message: "This 123456789-0123456789abcdef0123456789abcdef01234567 is not a real access token",
            };
            const r = redactLog(l);
            const e = {
                level: "warn",
                message: "This [TWITTER_ACCESS_TOKEN] is not a real access token",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should redact the entire AWS access key", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "This\nAKIA0123456789ABCDEF\nis not a real access key",
            };
            const r = redactLog(l);
            const e = {
                level: "debug",
                message: "This\n[AMAZON_ACCESS_KEY]\nis not a real access key",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact something longer than an AWS access key", () => {
            const l: TransformableInfo = {
                level: "warn",
                message: "This\nAKIA0123456789ABCDEF01234\nis not a real access key",
            };
            const r = redactLog(l);
            assert.deepStrictEqual(r, l);
        });

        it("should redact a lot", () => {
            const l: TransformableInfo = {
                level: "error",
                message: `AKIJ0123456789ABCDEF is not a real AWS secret key
GitHub tokens 0123456789abcdef0123456789abcdef01234567 are the same as Git SHAs.
Similarly, this may look like a Google OAuth ID but it is not 123456789-0123456789ABCDEFabcdef01234567Aa.apps.googleusercontent.com
https://user:p%40$$w04D@en.wikipedia.org/ blah blah blah blah "https://12093847103847561098457012abfcdefab456ef:x-oauth-basic@github.com/goo/nar"
Not Atomist API key ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789.
Do not redact BAKIJ0123456789ABCDEF
`,
            };
            const r = redactLog(l);
            const e = {
                level: "error",
                message: `[AMAZON_ACCESS_KEY] is not a real AWS secret key
GitHub tokens 0123456789abcdef0123456789abcdef01234567 are the same as Git SHAs.
Similarly, this may look like a Google OAuth ID but it is not [GOOGLE_OAUTH_ID]
https://user:[URL_PASSWORD]@en.wikipedia.org/ blah blah blah blah "https://[GITHUB_TOKEN]:x-oauth-basic@github.com/goo/nar"
Not Atomist API key [ATOMIST_API_KEY].
Do not redact BAKIJ0123456789ABCDEF
`,
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact discontinuous URL-like structures", () => {
            const ms = [
                `{"text":"https://some.where.com","author":"@atomist"}`,
                `https://some.where.com: @atomist`,
                `<https://some.where.com>@atomist</>`,
                `<https://some.where.com|@atomist>`,
                `{https://some.where.com}(@atomist)`,
                `[https://some.where.com](@atomist)`,
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "warn",
                    message: m,
                };
                const r = redactLog(l);
                assert.deepStrictEqual(r, l);
            });
        });

    });

});
