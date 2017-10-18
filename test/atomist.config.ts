import { Configuration } from "../src/configuration";
import { RequestProcessor } from "../src/internal/transport/RequestProcessor";
import { guid } from "../src/internal/util/string";
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
            correlation_context: { team: { id: "T1L0VDKJP" } },
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
            team: { id: "T1L0VDKJP" },
            rug: {},
        });
    }
}

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.6",
    teamIds: ["T1L0VDKJP"],
    commands: [
        () => new HelloWorld(),
        () => new SendStartupMessage(),
        () => new PlainHelloWorld(),
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
        },
    },
    listeners: [
        new StartUpListener(),
    ],
    endpoints: {
        graphql: `${host}/graphql/team`,
        api: `${host}/registration`,
    },
    applicationEvents: {
        enabled: true,
    },
};
