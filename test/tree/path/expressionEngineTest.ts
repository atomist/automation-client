import "mocha";

import * as assert from "power-assert";
import {
    ChildAxisSpecifier, DescendantAxisSpecifier,
    DescendantOrSelfAxisSpecifier,
} from "../../../src/tree/path/axisSpecifiers";
import { evaluateExpression } from "../../../src/tree/path/expressionEngine";
import { AllNodeTest, NamedNodeTest } from "../../../src/tree/path/nodeTests";
import { LocationStep } from "../../../src/tree/path/pathExpression";
import { parsePathExpression } from "../../../src/tree/path/pathExpressionParser";
import { NestedPathExpressionPredicate, ValuePredicate } from "../../../src/tree/path/predicates";
import { TreeNode } from "../../../src/tree/TreeNode";

describe("expressionEngine", () => {

    it("should evaluateExpression no matches", () => {
        const tn: TreeNode = {$name: "foo"};
        const pe = {
            locationSteps: [new LocationStep(ChildAxisSpecifier, AllNodeTest, [])],
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
            locationSteps: [new LocationStep(ChildAxisSpecifier, AllNodeTest, [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [thing1, thing2]);
    });

    it("should find children matching on name", () => {
        const thing1 = {$name: "Thing"};
        const thing2 = {$name: "Thing"};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep(ChildAxisSpecifier, new NamedNodeTest("Thing"), [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [thing1, thing2]);
    });

    it("should not find children excluding on name", () => {
        const thing1 = {$name: "Thing"};
        const thing2 = {$name: "Thing"};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep(ChildAxisSpecifier, new NamedNodeTest("Thingxxx"), [])],
        };
        const result = evaluateExpression(tn, pe);
        assert(result.length === 0);
    });

    it("should find children matching on value", () => {
        const thing1 = {$name: "Thing1", $value: "x"};
        const thing2 = {$name: "Thing2", $value: "x"};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep(ChildAxisSpecifier, AllNodeTest, [new ValuePredicate("x")])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [thing1, thing2]);
    });

    it("should not find children excluding on value", () => {
        const thing1 = {$name: "Thing1", $value: "x"};
        const thing2 = {$name: "Thing2", $value: "x"};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep(ChildAxisSpecifier, AllNodeTest, [new ValuePredicate("xyz")])],
        };
        const result = evaluateExpression(tn, pe);
        assert(result.length === 0);
    });

    it("should find grandchildren", () => {
        const grandkid1 = {$name: "Grandkid1"};
        const grandkid2 = {$name: "Grandkid2"};
        const thing1 = {$name: "Thing1", $children: [grandkid1]};
        const thing2 = {$name: "Thing2", $children: [grandkid2]};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep(DescendantAxisSpecifier, AllNodeTest, [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [thing1, thing2, grandkid1, grandkid2]);
    });

    it("should execute nested predicate: match", () => {
        const grandkid1 = {$name: "Grandkid1"};
        const grandkid2 = {$name: "Grandkid2"};
        const thing1 = {$name: "Thing1", $children: [grandkid1]};
        const thing2 = {$name: "Thing2", $children: [grandkid2]};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [
                new LocationStep(DescendantOrSelfAxisSpecifier, AllNodeTest, [
                    new NestedPathExpressionPredicate(parsePathExpression("/Thing1")),
                ]),
                new LocationStep(ChildAxisSpecifier, new NamedNodeTest("Thing2"), [])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, [thing2]);
    });

    it("should execute nested predicate: excludes", () => {
        const grandkid1 = {$name: "Grandkid1"};
        const grandkid2 = {$name: "Grandkid2"};
        const thing1 = {$name: "Thing1", $children: [grandkid1]};
        const thing2 = {$name: "Thing2", $children: [grandkid2]};
        const tn: TreeNode = {
            $name: "foo", $children: [
                thing1, thing2,
            ],
        };
        const pe = {
            locationSteps: [new LocationStep(DescendantOrSelfAxisSpecifier, AllNodeTest, [
                new NestedPathExpressionPredicate(parsePathExpression("/no/such/thing")),
            ])],
        };
        const result = evaluateExpression(tn, pe);
        assert.deepEqual(result, []);
    });

});
