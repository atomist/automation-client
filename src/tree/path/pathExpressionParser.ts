import { Concat } from "@atomist/microgrammar/matchers/Concat";
import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { firstOf, optional } from "@atomist/microgrammar/Ops";
import { isPatternMatch } from "@atomist/microgrammar/PatternMatch";
import { Rep1Sep, zeroOrMore } from "@atomist/microgrammar/Rep";
import { logger } from "../../internal/util/logger";
import { ChildAxisSpecifier, DescendantOrSelfAxisSpecifier, SelfAxisSpecifier } from "./axisSpecifiers";
import { AllNodeTest, NamedNodeTest } from "./nodeTests";
import { LocationStep, PathExpression, Predicate, stringify } from "./pathExpression";
import { NestedPathExpressionPredicate, AttributeEqualityPredicate } from "./predicates";

/**
 * Parse the given string to path expression. Throw an error in the event of failure.
 * @param {string} expr expression ot path
 * @return {PathExpression}
 */
export function parsePathExpression(expr: string): PathExpression {
    const pg = PredicateGrammarDefs as any;
    // TODO the _initialized property is being added to microgrammar LazyMatcher
    // to avoid the need for adding a property here
    if (!pg._initialized) {
        pg._term = firstOf(ValuePredicateGrammar, PathExpressionGrammar);
        pg._initialized = true;
        PredicateGrammar._init();
    }

    const m = PathExpressionGrammar.exactMatch(expr);
    if (isPatternMatch(m)) {
        logger.debug("Successfully parsed path expression [%s]: %s", expr, stringify(m));
        return m;
    } else {
        logger.info("Error parsing path expression [%s]: %s", expr, m);
        throw new Error("Failure: " + JSON.stringify(m));
    }
}

const NodeName = /[.a-zA-Z0-9_\-$#]+/;

// TODO allow double quotes, and string escaping, and possibly integer literals
const ValuePredicateGrammar = Microgrammar.fromString<Predicate>(
    "@${name}='${value}'");

const PredicateGrammarDefs = {
    _lb: "[",
    _term: null, // Will be set later to avoid circularity
    term: ctx => {
        if (!!ctx._term.name && !!ctx._term.value) {
            return new AttributeEqualityPredicate(ctx._term.name, ctx._term.value);
        } else if (!!ctx._term.locationSteps) {
            return new NestedPathExpressionPredicate(ctx._term as PathExpression);
        }
        throw new Error(`Unsupported predicate: ${JSON.stringify(ctx._term)}`);
    },
    _rb: "]",
    $lazy: true,
};

const PredicateGrammar = Concat.of(PredicateGrammarDefs);

const NodeTestGrammar = {
    _it: firstOf("*", NodeName),
    test: ctx => ctx._it === "*" ? AllNodeTest : new NamedNodeTest(ctx._it),
};

const LocationStepGrammar = Microgrammar.fromDefinitions<LocationStep>({
    _axis: optional(firstOf("/", ".")),
    axis: ctx => {
        switch (ctx._axis) {
            case undefined :
                return ChildAxisSpecifier;
            case "/" :
                return DescendantOrSelfAxisSpecifier;
            case "." :
                return SelfAxisSpecifier;
            default:
                throw new Error(`Unsupported axis specifier [${ctx._axis}]`);
        }
    },
    ...NodeTestGrammar,
    _predicates: zeroOrMore(PredicateGrammar),
    predicates: ctx => ctx._predicates.map(p => p.term),
});

const RelativePathExpressionDefs = {
    _locationSteps: new Rep1Sep(LocationStepGrammar, "/"),
    locationSteps: ctx => ctx._locationSteps.map(l => new LocationStep(l.axis, l.test, l.predicates)),
};

const PathExpressionGrammar = Microgrammar.fromDefinitions<PathExpression>({
    _slash: optional("/"),
    absolute: ctx => !!ctx._slash,
    ...RelativePathExpressionDefs,
});
