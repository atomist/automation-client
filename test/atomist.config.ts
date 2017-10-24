import { Configuration } from "../src/configuration";
import { RequestProcessor } from "../src/internal/transport/RequestProcessor";
import { guid } from "../src/internal/util/string";
import { SpringBootSeed } from "../src/operations/generate/java/SpringBootSeed";
import { AutomationEventListenerSupport } from "../src/server/AutomationEventListener";
import { HelloWorld } from "./command/HelloWorld";
import { PlainHelloWorld } from "./command/PlainHelloWorld";
import { SendStartupMessage } from "./command/SendStartupMessage";
import { HelloIngestor } from "./event/HelloIngestor";
import { HelloIssue } from "./event/HelloIssue";

export const GitHubToken = process.env.GITHUB_TOKEN;

// const host = "https://automation.atomist.com";
const host = "https://automation-staging.atomist.services";

class StartUpListener extends AutomationEventListenerSupport {

    public registrationSuccessful(transport: RequestProcessor) {

        // TODO CD this way of declaring an incoming command isn't nice.
        // We'll fix it with the general polish of API messages.
        transport.processCommand({
            name: "SendStartupMessage",
            atomist_type: "command_handler_request",
            correlation_context: {team: {id: "T1L0VDKJP"}},
            corrid: guid(),
            parameters: [{
                name: "owner",
                value: "cd",
            }, {
                name: "name",
                value: "@atomist/automation-node-tests",
            }, {
                name: "version",
                value: "0.0.4",
            }],
            mapped_parameters: [],
            secrets: [],
            team: {id: "T1L0VDKJP"},
            rug: {},
        });
    }
}

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.6",
    teamIds: ["T1L0VDKJP"],
    commands: [
        HelloWorld,
        SendStartupMessage,
        () => new PlainHelloWorld(),
        // () => new UniversalSeed(),
        // () => new JavaSeed(),
        () => new SpringBootSeed(),
    ],
    events: [
        HelloIssue,
        // () => new AlwaysOkEventHandler(),
    ],
    ingestors: [
        HelloIngestor,
    ],
    token: GitHubToken,
    http: {
        enabled: true,
        forceSecure: false,
        auth: {
            basic: {
                enabled: false,
                username: "test",
                password: "test",
            },
            bearer: {
                enabled: false,
            },
            github: {
                enabled: true,
                clientId: "092b3124ced86d5d1569",
                clientSecret: "71d72f657d4402009bd8d728fc1967939c343793",
                callbackUrl: "http://localhost:2866",
                org: "atomisthqa",
                adminOrg: "atomisthq",
            },
        },
    },
    listeners: [
        // new StartUpListener(),
    ],
    endpoints: {
        graphql: `${host}/graphql/team`,
        api: `${host}/registration`,
    },
    applicationEvents: {
        enabled: true,
    },
};
