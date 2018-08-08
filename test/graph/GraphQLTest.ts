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

    it("should successfully validate valid query", () => {
        const query = GraphQL.subscriptionFromFile("../graphql/query/repos", __dirname);
        const errors = internalGraphql.validateQuery(query);
        assert(errors.length === 0);
    });

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

    it("should successfully load query from relative path out of project root", () => {
        const query = GraphQL.subscriptionFromFile("../graphql/query/repos", __dirname );
        const errors = internalGraphql.validateQuery(query);
        assert(errors.length === 0);
    });

    it("should successfully load query from relative path", () => {
        const query = GraphQL.subscriptionFromFile("./someOtherQuery.graphql", __dirname);
        const errors = internalGraphql.validateQuery(query);
        assert(errors.length === 0);
    });

    const ReplacedSubscription1 = `subscription SomeSubscription_4120321184 {
    ChatTeam(id: "T1L0VDKJP") {
        orgs {
            repo(first: 50, offset: 100, private: true) {
                owner
                name
                bla(test: "T1L0VDKJP", fooBar: "fooBar", foo: "foo") {
                    name
                }
            }
        }
    }
}`;

    it("should successfully load query from relative path and replace parameters in subscription", () => {
        const query = GraphQL.subscriptionFromFile(
            "./someSubscription",
             __dirname,
            {
                teamId: "T1L0VDKJP",
                offset: 100,
                isPrivate: true,
                foo: "foo",
                fooBar: "fooBar",
            });
        assert.equal(query, ReplacedSubscription1);
    });

    const ReplacedSubscription2 = `subscription BuildWithStatus_3862387884 {
    Build(status: passed) {
        id
    }
}`;

    it("should successfully load query from relative path and replace parameter enum in subscription", () => {
        const query = GraphQL.subscriptionFromFile(
            "./someSubscriptionWithEnum",
            __dirname,
            {
                status: GraphQL.enumValue("passed"),
            });
        assert.equal(query, ReplacedSubscription2);
    });

    const ReplacedSubscription3 = `subscription BuildWithStatus_3088198089 {
    Build(statuss: [passed]) {
        id
    }
}`;

    it("should successfully load query from relative path and replace parameter enum array in subscription", () => {
        const query = GraphQL.subscriptionFromFile(
            "./someSubscriptionWithEnumArray",
            __dirname,
            {
                statuses: GraphQL.enumValue(["passed"]),
            });
        assert.equal(query, ReplacedSubscription3);
    });

    const ReplaceQuery1 = `query BlaBla ($teamId: ID!, $offset: Int!) {
    ChatTeam(id: $teamId) {
        orgs {
            repo(first: 100, offset: $offset) {
                owner
                name
            }
        }
    }
}
`;

    it("should successfully load query from relative path and replace parameter enum array in subscription", () => {
        let query = GraphQL.subscriptionFromFile(
            "./someOtherQueryWithTheSameName",
            __dirname,
            {});
        query = internalGraphql.replaceOperationName(query, "BlaBla");
        assert.equal(query, ReplaceQuery1);
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
