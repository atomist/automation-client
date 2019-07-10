import * as assert from "power-assert";

import { obfuscateJson } from "../../../lib/internal/util/string";

describe("string", () => {

    describe("obfuscateJson", () => {

        it("should do nothing", () => {
            const k = "nothing";
            const v = "something";
            const r = obfuscateJson(k, v);
            assert(r === v);
        });

        it("should remove handler values", () => {
            const ks = ["commands", "events", "ingesters", "listeners", "customizers", "postProcessors"];
            ks.forEach(k => {
                const r = obfuscateJson(k, ["one", "two", "three"]);
                assert(r === undefined);
            });
        });

        it("should obfuscate sensitive information", () => {
            const ks = [
                "token",
                "password",
                "jwt",
                "url",
                "secret",
                "authorization",
                "jazzToken",
                "my_password",
                "JWT",
                "LongURL",
                "dbl-secret",
                "authorization response",
            ];
            ks.forEach(k => {
                const r = obfuscateJson(k, "doublesecret");
                assert(r === "d**********t", `failing key '${k}'`);
            });
        });

    });

});
