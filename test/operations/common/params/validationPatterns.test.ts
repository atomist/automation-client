import * as assert from "power-assert";

import {
    GitBranchRegExp,
    GitHubNameRegExp,
} from "../../../../lib/operations/common/params/validationPatterns";

describe("gitHubPatterns", () => {

    describe("GitBranchRegExp", () => {

        it("should match simple branches", () => {
            const branches = [
                "guided-by-voices",
                "daniel.johnston",
                "m1ss1on-0f-burma-",
                "the_breeders",
                "Fuga21",
            ];
            branches.forEach(b => assert(GitBranchRegExp.pattern.test(b)));
        });

        it("should match hierarchical branches", () => {
            const branches = [
                "guided-by-voices/i-am-a-scientist",
                "daniel.johnston/Some/Things/Last/a/Long/Time",
                "m1ss1on-0f-burma-/s3cr3t5-",
                "the_breeders/GLORIOUS",
                "Fuga21/Wa1t1ngR00m",
            ];
            branches.forEach(b => assert(GitBranchRegExp.pattern.test(b)));
        });

        it("should not match invalid branches", () => {
            const branches = [
                "guided-by-voices/i-am-a-scientist.",
                "-daniel.johnston/Some/Things/Last/a/Long/Time",
                "m1ss1on-0f-burma-//s3cr3t5-",
                "the_breeders..GLORIOUS",
                "Fuga21\\W1t1ngR00m",
                "LizPhair/",
                "/Minutemen",
                "Dinosaur Jr. - Freak Scene",
                "@",
                "x~y",
                "x^y",
                "x:y",
                "x?y",
                "x*y",
                "x[y]",
                // "x.lock",
            ];
            branches.forEach(b => assert(!GitBranchRegExp.pattern.test(b)));
        });

    });

    describe("GitHubNameRegExp", () => {

        it("should match simple repo names", () => {
            const repos = [
                "guided-by-voices",
                "daniel.johnston",
                "m1ss1on-0f-burma-",
                "the_breeders",
                "Fuga21",
            ];
            repos.forEach(r => assert(GitHubNameRegExp.pattern.test(r)));
        });

        it("should match complicated repo names", () => {
            const repos = [
                "------",
                "....",
                "_____",
                "0000",
                "-",
                ".",
                "_",
                "0",
            ];
            repos.forEach(r => assert(GitHubNameRegExp.pattern.test(r)));
        });

        it("should not match invalid repo names", () => {
            const repos = [
                "guided-by-vo!ces",
                "daniel.john$ton",
                "m1ss1on-0f-burma;",
                "the~breeders",
                "Fug&21",
            ];
            repos.forEach(r => assert(!GitHubNameRegExp.pattern.test(r)));
        });

    });

});
