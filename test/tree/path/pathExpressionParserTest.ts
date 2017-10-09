import "mocha";

import * as assert from "power-assert";
import { ChildAxisSpecifier, DescendantOrSelfAxisSpecifier } from "../../../src/tree/path/axisSpecifiers";
import { AllNodeTest, NamedNodeTest } from "../../../src/tree/path/nodeTests";
import { parsePathExpression } from "../../../src/tree/path/pathExpressionParser";
import { AttributeEqualityPredicate, NestedPathExpressionPredicate } from "../../../src/tree/path/predicates";

describe("pathExpressionParser", () => {

    it("should parse all children", () => {
        const expr = "/*";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis ===  ChildAxisSpecifier);
        assert(parsed.locationSteps[0].test === AllNodeTest, JSON.stringify(parsed.locationSteps[0].test));
    });

    it("should parse all descendants", () => {
        const expr = "//*";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === DescendantOrSelfAxisSpecifier);
        assert(parsed.locationSteps[0].test === AllNodeTest);
    });

    it("should parse all descendants with name", () => {
        const expr = "//thing";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === DescendantOrSelfAxisSpecifier);
        const nt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nt.name === "thing");
    });

    it("should parse named children", () => {
        const expr = "/foo";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
    });

    it("should parse named descendants", () => {
        const expr = "//foo";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === DescendantOrSelfAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
        assert(parsed.locationSteps[0].predicates.length === 0);
    });

    it("should parse named child then named descendants", () => {
        const expr = "/fizz//foo";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 2);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt1 = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt1.name === "fizz");
        assert(parsed.locationSteps[1].axis === DescendantOrSelfAxisSpecifier);
        const nnt2 = parsed.locationSteps[1].test as NamedNodeTest;
        assert(nnt2.name === "foo");
    });

    it("should parse named children with attribute", () => {
        const expr = "/foo[@value='bar']";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
        assert(parsed.locationSteps[0].predicates.length === 1);
        const pred = parsed.locationSteps[0].predicates[0] as AttributeEqualityPredicate;
        assert(pred.value === "bar");
    });

    it("should parse children with custom attribute", () => {
        const expr = "/foo[@smeg='smog']";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
        assert(parsed.locationSteps[0].predicates.length === 1);
        const pred = parsed.locationSteps[0].predicates[0] as AttributeEqualityPredicate;
        assert(pred.name === "smeg");
        assert(pred.value === "smog");
    });

    it("should parse nested path expression predicate", () => {
        const expr = "/foo[/bar/baz]";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
        assert(parsed.locationSteps[0].predicates.length === 1);
        const pred = parsed.locationSteps[0].predicates[0] as NestedPathExpressionPredicate;
        assert(!!pred.pathExpression);
    });

    it("should parse multiple nested path expression predicates", () => {
        const expr = "/foo[/bar/baz][/dog/cat]";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
        assert(parsed.locationSteps[0].predicates.length === 2);
        const pred1 = parsed.locationSteps[0].predicates[0] as NestedPathExpressionPredicate;
        assert(!!pred1.pathExpression);
        const pred2 = parsed.locationSteps[0].predicates[0] as NestedPathExpressionPredicate;
        assert(!!pred2.pathExpression);
    });

    it("should parse nested nested path expression", () => {
        const expr = "/foo[/bar/baz[/dog/cat]]";
        const parsed = parsePathExpression(expr);
        assert(parsed.locationSteps.length === 1);
        assert(parsed.locationSteps[0].axis === ChildAxisSpecifier);
        const nnt = parsed.locationSteps[0].test as NamedNodeTest;
        assert(nnt.name === "foo");
        assert(parsed.locationSteps[0].predicates.length === 1);
        const pred1 = parsed.locationSteps[0].predicates[0] as NestedPathExpressionPredicate;
        assert(!!pred1.pathExpression);
        assert(pred1.pathExpression.locationSteps.length === 2);
        assert(pred1.pathExpression.locationSteps[1].predicates.length === 1);
        const pred2 = pred1.pathExpression.locationSteps[1].predicates[0] as NestedPathExpressionPredicate;
        assert(!!pred2.pathExpression);
    });

    it("should AND predicates");

});
