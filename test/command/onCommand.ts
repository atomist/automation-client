import * as _ from "lodash";
import * as assert from "power-assert";
import {addRegExIntentAnchors, parseRegExIntent} from "../../lib/onCommand";

describe("parseIntent", () => {
    it("should pass string through unmodified", () => {
        const result = parseRegExIntent("foo");
        assert.strictEqual(result, "foo");
    });
    it("should pass string array through unmodified", () => {
        const intent = ["test", "test1", "test2"];
        const result = parseRegExIntent(intent);
        assert.strictEqual(result, intent);
    });
    it("should parse complete regex and return it as string", () => {
        const result = parseRegExIntent(/^Foo\sBar$/);
        assert.strictEqual(typeof result, "string");
        assert.strictEqual(result, "^Foo\\sBar$");
    });
    it("should throw for invalid object type", () => {
        assert.throws(() => parseRegExIntent(new Date() as any), /Unknown Intent type of object supplied!/);
    });
    it("should throw for empty string or undefined input", () => {
        assert.throws(() => parseRegExIntent(""), /Intent cannot be undefined, null, or empty!/);
        assert.throws(() => parseRegExIntent(undefined), /Intent cannot be undefined, null, or empty!/);
    });
    it("should permit empty array input", () => {
        const result = parseRegExIntent([]);
        assert(_.isArray(result));
        assert(_.isEmpty(result));
    });
});

describe("addRegExIntentAnchors", () => {
    it("should throw for non-RegExp input", () => {
        assert.throws(() => addRegExIntentAnchors(new Date() as any), /Intent must be an instance of RegExp!/);
    });
    it("should add both anchors when missing", () => {
        const result = addRegExIntentAnchors(/Foo\sBar/);
        assert(new RegExp(result));
        assert.strictEqual(result, "^([\\s\\S]+)?Foo\\sBar([\\s\\S]+)?$");
    });
    it("should add prefix anchor when missing", () => {
        const result = addRegExIntentAnchors(/Foo\sBar$/);
        assert(new RegExp(result));
        assert.strictEqual(result, "^([\\s\\S]+)?Foo\\sBar$");
    });
    it("should add suffix anchor when missing", () => {
        const result = addRegExIntentAnchors(/^Foo\sBar/);
        assert(new RegExp(result));
        assert.strictEqual(result, "^Foo\\sBar([\\s\\S]+)?$");
    });
    it("should not modify regex that already contains anchors", () => {
        const result = addRegExIntentAnchors(/^Foo\sBar$/);
        assert(new RegExp(result));
        assert.strictEqual(result, "^Foo\\sBar$");
    });
})
