import * as assert from "power-assert";
import * as GraphQL from "../../lib/graph/graphQL";
import { replaceParameters } from "../../lib/internal/graph/graphQL";

describe("GraphQL", () => {

    it("should successfully inline fragments", () => {
        const query = GraphQL.subscription({
            path: "./subscriptionWithFragment",
        });
        assert.equal(query, "subscription Test { Repo { name owner org { team { name } } channels { name } }}");
    });

    it("should successfully inline fragments from graphql folder (file name lookup)", () => {
        const query = GraphQL.subscription("subscriptionWithFragmentInGraphql");
        assert.equal(query, "subscription Test { Repo { name owner org { team { name } } channels { name } }}");
    });

    it("should successfully inline fragments from graphql folder (operation lookup)", () => {
        const query = GraphQL.subscription("TestFooBar");
        assert.equal(query, "subscription TestFooBar { Repo { name owner org { team { name } } channels { name } }}");
    });

    it("should successfully inline fragments with path and fragmentDir", () => {
        const query = GraphQL.subscription({
            path: "./subscriptionWithFragment",
            fragmentDir: ".",
        });
        assert.equal(query, "subscription Test { Repo { name owner org { team { name } } channels { name } }}");
    });

    it("should successfully inline fragments with name and fragmentDir", () => {
        const query = GraphQL.subscription({
            name: "subscriptionWithFragmentInGraphql",
            fragmentDir: "../graphql/fragment",
            operationName: "BlaBla",
        });
        assert.equal(query, "subscription BlaBla { Repo { name owner org { team { name } } channels { name } }}");
    });

    const subscription = `subscription FulfillGoalOnRequested($owner: [String], $registration: [String]) {
  SdmGoal(state: [requested], owner: $owner) {
    fulfillment(registration: $registration) @required {
      registration
    }
}`;

    it("should successfully replace subscription parameters", () => {
        const result = replaceParameters(subscription, { registration: ["test"], owner: () => "owner" }, { hash: false});
        assert.deepStrictEqual(result, `subscription FulfillGoalOnRequested {
  SdmGoal(state: [requested], owner: "owner") {
    fulfillment(registration: ["test"]) @required {
      registration
    }
}`);
    });

    it("should successfully replace and remove missing subscription parameters", () => {
        const result = replaceParameters(subscription, { registration: ["test"], owner: undefined }, { hash: false});
        assert.deepStrictEqual(result, `subscription FulfillGoalOnRequested {
  SdmGoal(state: [requested]) {
    fulfillment(registration: ["test"]) @required {
      registration
    }
}`);
    });

    it("should successfully remove missing subscription parameters", () => {
        const subscription = `subscription FulfillGoalOnRequested($owner: [String], $registration: [String]) {
  SdmGoal(owner: $owner) {
    fulfillment(registration: $registration) @required {
      registration
    }
}`;
        const result = replaceParameters(subscription, { registration: undefined, owner: undefined }, { hash: false});
        assert.deepStrictEqual(result, `subscription FulfillGoalOnRequested {
  SdmGoal {
    fulfillment @required {
      registration
    }
}`);
    });

});
