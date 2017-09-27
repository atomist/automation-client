import { Configuration } from "../src/configuration";
import { HelloWorld } from "./command/HelloWorld";
import { PlainHelloWorld } from "./command/PlainHelloWorld";
import { HelloIngestor } from "./event/HelloIngestor";
import { HelloIssue } from "./event/HelloIssue";

export const GitHubToken = process.env.GITHUB_TOKEN;

const host = "https://automation-staging.atomist.services";

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.4",
    teamId: "T095SFFBK",
    commands: [
        () => new HelloWorld(),
        // () => new PlainHelloWorld(),
        // () => new UniversalSeed(),
        // () => new JavaSeed(),
        // () => new SpringBootSeed(),
    ],
    events: [
        () => new HelloIssue(),
        // () => new AlwaysOkEventHandler(),
    ],
    ingestors: [
        () => new HelloIngestor(),
    ],
    token: GitHubToken,
    http: {
        enabled: true,
        auth: {
            basic: {
                enabled: false,
            },
            bearer: {
                enabled: false,
            },
        },
    },
    endpoints: {
        graphql: `${host}/graphql`,
        api: `${host}/registration`,
    },
};
