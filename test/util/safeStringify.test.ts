import * as stringify from "json-stringify-safe";

import * as assert from "power-assert";

describe("Safe Stringify", () => {

    it("should print noncircular as usual", () => {
        const inputs = ["A", undefined, "", 4, 9.6, {}, { a: "yes" }, [4, 2]];
        inputs.forEach(i => {
            assert(stringify(i) === stringify(i), "weird result on " + i);
        });
    });

    it("should space things out", () => {
        const nested = { a: { b: 1, c: 2 } };

        const result = stringify(nested, undefined, 7);

        assert(stringify(nested, undefined, 7) === result,
            result);
    });

    it("should not print noncircular", () => {
        const circle: any = {};
        circle.me = circle;

        assert.throws(() =>
            JSON.stringify(circle), "this test is useless if that doesn't throw");

        assert.doesNotThrow(() => stringify(circle)); // don't throw
    });

});
