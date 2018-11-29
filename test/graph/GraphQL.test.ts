import * as assert from "power-assert";
import * as GraphQL from "../../lib/graph/graphQL";
import * as internalGraphql from "../../lib/internal/graph/graphQL";

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

});
