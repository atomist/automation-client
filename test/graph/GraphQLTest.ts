import "mocha";
import * as assert from "power-assert";
import * as GraphQL from "../../src/graph/graphQL";
import * as internalGraphql from "../../src/internal/graph/graphQL";

describe("GraphQL", () => {

    const InvalidQuery = `query Repos($teamId: ID!, $offset: Int!) {
    ChatTeam(id: $_teamId) {
        orgs {
            repo(first: 100, offset: $offset) {
                owner
                name
                invalid
            }
        }
    }
}
`;

    it("should successfully validate invalid query and return errors", () => {
        const errors = internalGraphql.validateQuery(InvalidQuery);
        assert(errors.length === 3);
    });

    it("should pretty print errors", () => {
        const errors = internalGraphql.validateQuery(InvalidQuery);
        const message = internalGraphql.prettyPrintErrors(errors, InvalidQuery);
        assert(message === `Cannot query field "invalid" on type "Repo". [7,17]
                invalid
----------------^

Variable "$_teamId" is not defined by operation "Repos". [2,18], [1,1]
    ChatTeam(id: $_teamId) {
-----------------^
query Repos($teamId: ID!, $offset: Int!) {
^

Variable "$teamId" is never used in operation "Repos". [1,13]
query Repos($teamId: ID!, $offset: Int!) {
------------^`);
    });

    it("should successfully inline fragments", () => {
        const query = GraphQL.subscription({
            path:  "./subscriptionWithFragment",
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
            path:  "./subscriptionWithFragment",
            fragmentDir: ".",
        });
        assert.equal(query, "subscription Test { Repo { name owner org { team { name } } channels { name } }}");
    });

    it("should successfully inline fragments with name and fragmentDir", () => {
        const query = GraphQL.subscription({
            name:  "subscriptionWithFragmentInGraphql",
            fragmentDir: "../graphql/fragment",
            operationName: "BlaBla",
        });
        assert.equal(query, "subscription BlaBla { Repo { name owner org { team { name } } channels { name } }}");
    });

});
