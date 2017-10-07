import "mocha";

import * as assert from "power-assert";
import { evaluateExpression } from "../../../src/tree/path/expressionEngine";
import { AllNodeTest } from "../../../src/tree/path/nodeTests";
import { LocationStep } from "../../../src/tree/path/pathExpression";
import { TreeNode } from "../../../src/tree/TreeNode";

describe("expressionEngine", () => {

    it("should evaluateExpression no matches", () => {
        const tn: TreeNode = {$name: "foo"};
        const pe = {
            locationSteps: [new LocationStep("child", AllNodeTest, [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, []);
    });

    it("should find children", () => {
        const thing1 = {$name: "Thing1"};
        const thing2 = {$name: "Thing2"};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep("child", AllNodeTest, [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [ thing1, thing2]);
    });

    it("should find grandchildren", () => {
        const grandkid1 = {$name: "Grandkid1"};
        const grandkid2 = {$name: "Grandkid2"};
        const thing1 = {$name: "Thing1", $children: [ grandkid1 ]};
        const thing2 = {$name: "Thing2", $children: [ grandkid2 ]};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep("descendant", AllNodeTest, [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [ thing1, thing2, grandkid1, grandkid2 ]);
    });

})
;
