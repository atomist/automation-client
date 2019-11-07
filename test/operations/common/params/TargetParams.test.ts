import * as assert from "power-assert";
import { MappedRepoParameters } from "../../../../lib/operations/common/params/MappedRepoParameters";

describe("operations/common/params/TargetParams", () => {

    describe("usesRegex", () => {

        it("returns false for simple repo and owner", () => {
            const p = new MappedRepoParameters();
            p.owner = "foo";
            p.repo = "bar";
            assert(!p.usesRegex);
        });

        it("returns true for repo regular expression", () => {
            const p = new MappedRepoParameters();
            p.repo = "ba[rz]";
            assert(p.usesRegex);
        });

        it("returns true for repo regular expression and owner", () => {
            const p = new MappedRepoParameters();
            p.owner = "foo";
            p.repo = "ba[rz]";
            assert(p.usesRegex);
        });

        it("returns true for when no owner", () => {
            const p = new MappedRepoParameters();
            p.repo = "bar";
            assert(p.usesRegex);
        });

        it("returns false when no repo", () => {
            const p = new MappedRepoParameters();
            assert(!p.usesRegex);
        });

    });

    describe("test", () => {

        it("returns true for a matching simple repo", () => {
            const p = new MappedRepoParameters();
            p.owner = "foo";
            p.repo = "bar";
            assert(p.test({ owner: "foo", repo: "bar", url: "https://github.com/foo/bar" }));
        });

        it("returns false for a non-matching simple repo", () => {
            const p = new MappedRepoParameters();
            p.owner = "foo";
            p.repo = "bar";
            assert(!p.test({ owner: "bar", repo: "foo", url: "https://github.com/bar/foo" }));
        });

        it("returns true for a matching regular expression", () => {
            const p = new MappedRepoParameters();
            p.repo = "ba[rz]";
            assert(p.test({ owner: "foo", repo: "bar", url: "https://github.com/foo/bar" }));
        });

        it("returns false for a non-matching regular expression", () => {
            const p = new MappedRepoParameters();
            p.repo = "ba[rz]";
            assert(!p.test({ owner: "foo", repo: "bab", url: "https://github.com/foo/bab" }));
        });

        it("returns true for a matching regular expression and owner", () => {
            const p = new MappedRepoParameters();
            p.repo = "ba[rz]";
            p.owner = "foo";
            assert(p.test({ owner: "foo", repo: "bar", url: "https://github.com/foo/bar" }));
        });

        it("returns false for a matching regular expression and non-matching regular expression", () => {
            const p = new MappedRepoParameters();
            p.repo = "ba[rz]";
            p.owner = "oof";
            assert(!p.test({ owner: "foo", repo: "bar", url: "https://github.com/foo/bab" }));
        });

        it("returns false for a non-matching regular expression and matching owner", () => {
            const p = new MappedRepoParameters();
            p.repo = "ba[rz]";
            p.owner = "foo";
            assert(!p.test({ owner: "foo", repo: "bab", url: "https://github.com/foo/bab" }));
        });

    });

});
