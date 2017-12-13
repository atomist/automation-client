import { Configuration } from "../src/configuration";
import { ingester, type } from "../src/ingesters";
import { HelloWorld } from "./command/HelloWorld";
import { CircleCIPayload } from "./event/circleIngester";
import { GitLabPushPayload } from "./event/gitLabIngester";
import { GitLabPush } from "./event/GitLabPush";
import { HelloCircle } from "./event/HelloCircle";
import { HelloWorldIngester } from "./event/HelloWorld";

// const host = "https://automation.atomist.com";
const host = "https://automation-staging.atomist.services";

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.7",
    // policy: "durable",
    keywords: ["test", "automation"],
    commands: [
        // ...scanCommands( ["**/metadata/addAtomistSpringAgent.js", "**/command/Search*.js"] ),
        HelloWorld,
    ],
    events: [
        HelloCircle,
        GitLabPush,
        HelloWorldIngester,
        // ...scanEvents("**/event/*.js"),
    ],
    ingesters: [
        CircleCIPayload,
        GitLabPushPayload,
        ingester(
            type("HelloWorld")
                .withObjectField("sender", "HelloWorldPerson")
                .withObjectField("recipient", "HelloWorldPerson"))
            .withType(type("HelloWorldPerson").withStringField("name")),
    ],
    ws: {
        enabled: true,
        termination: {
            graceful: false,
        },
    },
    http: {
        enabled: true,
        auth: {
            basic: {
                enabled: false,
                username: "test",
                password: "test",
            },
            bearer: {
                enabled: true,
                adminOrg: "atomisthq",
            },
        },
    },
    endpoints: {
        graphql: `${host}/graphql/team`,
        api: `${host}/registration`,
    },
    applicationEvents: {
        enabled: true,
        teamId: "T1L0VDKJP",
    },
    cluster: {
        enabled: false,
        workers: 2,
    },
};
