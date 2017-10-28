import "mocha";
import * as assert from "power-assert";

import * as GraphQL from "../../src/graph/graphQL";

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

    it("should successfully validate valid query", () => {
        const query = GraphQL.subscriptionFromFile("graphql/repos");
        const errors = GraphQL.validateQuery(query);
        assert(errors.length === 0);
    });

    it("should successfully validate invalid query and return errors", () => {
        const errors = GraphQL.validateQuery(InvalidQuery);
        assert(errors.length === 3);
    });

    it("should pretty print errors", () => {
        const errors = GraphQL.validateQuery(InvalidQuery);
        const message = GraphQL.prettyPrintErrors(errors, InvalidQuery);
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

    it("should successfully load query from relative path out of project root", () => {
        const query = GraphQL.subscriptionFromFile("../../graphql/repos", __dirname);
        const errors = GraphQL.validateQuery(query);
        assert(errors.length === 0);
    });

    it("should successfully load query from relative path", () => {
        const query = GraphQL.subscriptionFromFile("./someOtherQuery.graphql", __dirname);
        const errors = GraphQL.validateQuery(query);
        assert(errors.length === 0);
    });
});
