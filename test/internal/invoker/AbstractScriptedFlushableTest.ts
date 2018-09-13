import "mocha";

import * as assert from "power-assert";
import { AbstractScriptedFlushable } from "../../../lib/internal/common/AbstractScriptedFlushable";

class TestFlushable extends AbstractScriptedFlushable<TestFlushable> {

    public count = 0;
}

describe("AbstractScriptedFlushable", () => {

    it("is born clean", () => {
        const f = new TestFlushable();
        assert(!f.dirty);
    });

    it("is dirtied by an action", () => {
        const f = new TestFlushable();
        f.recordAction(a => Promise.resolve(a.count++));
        assert(f.dirty);
        assert(f.count === 0);
    });

    it("shows effect after flush", done => {
        const f = new TestFlushable();
        f.recordAction(a => Promise.resolve(a.count++));
        assert(f.count === 0);
        f.flush().then(_ => {
            assert(!f.dirty);
            assert(f.count === 1);
            done();
        });
    });

});
