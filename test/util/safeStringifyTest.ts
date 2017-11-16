
import "mocha";
import * as assert from "power-assert";
import { safeStringify } from "../../src/util/safeStringify";

describe("Safe Stringify", () => {

    it("should print noncircular as usual", () => {
        const inputs = ["A", undefined, "", 4, 9.6, {}, { a: "yes" }, [4, 2]];
        inputs.forEach(i => {
            assert(JSON.stringify(i) === safeStringify(i), "weird result on " + i);
        });
    });

    it("should space things out", () => {
        const nested = { a: { b: 1, c: 2} };

        const result = safeStringify(nested, { spaces: 7, name: "nested"});

        assert(JSON.stringify(nested, null, 7) === result,
            result);
    });

    it("should not print noncircular", () => {
        const circle: any = {};
        circle.me = circle;

        assert.throws(() =>
            JSON.stringify(circle), "this test is useless if that doesn't throw");

        assert.doesNotThrow(() => safeStringify(circle)); // don't throw
    });

    it("includes the description if you give it", () => {
        const circle: any = {};
        circle.me = circle;

        assert.throws(() =>
            JSON.stringify(circle), "this test is useless if that doesn't throw");

        assert(safeStringify(circle, {name: "happyCircle"}).indexOf("happyCircle") >= 0);
    });

});
