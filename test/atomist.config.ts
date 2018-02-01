import { Configuration } from "../src/configuration";
import { ingester, type } from "../src/ingesters";
import { initMemoryMonitoring } from "../src/internal/util/memory";
import { FileMessageTest } from "./command/FileMessageTest";
import { HelloWorld } from "./command/HelloWorld";
import { MessageTest } from "./command/MessageTest";
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
    teamIds: "T1L0VDKJP",
    keywords: ["test", "automation"],
    commands: [
        // ...scanCommands( ["**/metadata/addAtomistSpringAgent.js", "**/command/Search*.js"] ),
        HelloWorld,
        MessageTest,
        FileMessageTest,
    ],
    events: [
        // HelloCircle,
        // GitLabPush,
        // HelloWorldIngester,
        // ...scanEvents("**/event/*.js"),
    ],
    /*ingesters: [
        CircleCIPayload,
        GitLabPushPayload,
        ingester(
            type("HelloWorld")
                .withObjectField("sender", "HelloWorldPerson")
                .withObjectField("recipient", "HelloWorldPerson"))
            .withType(type("HelloWorldPerson").withStringField("name")),
    ],*/
    ws: {
        enabled: true,
        termination: {
            graceful: true,
        },
        compress: true,
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
        enabled: true,
        // workers: 2,
    },
};

initMemoryMonitoring();
