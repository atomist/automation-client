import "mocha";

import * as assert from "power-assert";
import { toFactory } from "../../lib/util/constructionUtils";
import { AddAtomistSpringAgent } from "../internal/invoker/TestHandlers";

describe("toFactory", () => {

    it("should work from factory", () => {
        const chm = toFactory(() => new AddAtomistSpringAgent());
        assert(chm().handle);
    });

    it("should work from constructor", () => {
        const chm = toFactory(AddAtomistSpringAgent);
        assert(chm().handle);
    });

});
