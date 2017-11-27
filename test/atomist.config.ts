import { Configuration } from "../src/configuration";
import { HelloWorld } from "./command/HelloWorld";
import { CircleCIPayload } from "./event/circleIngester";
import { GitLabPushPayload } from "./event/gitLabIngester";
import { GitLabPush } from "./event/GitLabPush";
import { HelloCircle } from "./event/HelloCircle";

export const GitHubToken = process.env.GITHUB_TOKEN || "<please set GITHUB_TOKEN env variable>";

// const host = "https://automation.atomist.com";
const host = "https://automation-staging.atomist.services";

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.7",
    // policy: "durable",
    teamIds: ["T1L0VDKJP"],
    token: GitHubToken,
    keywords: ["test", "automation"],
    commands: [
        // ...scanCommands( ["**/metadata/addAtomistSpringAgent.js", "**/command/Search*.js"] ),
        HelloWorld,
    ],
    events: [
        HelloCircle,
        GitLabPush,
        // ...scanEvents("**/event/*.js"),
    ],
    ingesters: [
        CircleCIPayload,
        GitLabPushPayload,
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
