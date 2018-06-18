import { Configuration } from "../src/configuration";
import {
    isCommandHandlerMetadata,
    isEventHandlerMetadata,
} from "../src/internal/metadata/metadata";
import {
    AutomationMetadata,
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../src/metadata/automationMetadata";
import { githubTeam } from "../src/secured";
import { AutomationMetadataProcessor } from "../src/spi/env/MetadataProcessor";
import { FileMessageTest } from "./command/FileMessageTest";
import { HelloWorld } from "./command/HelloWorld";
import { MessageTest } from "./command/MessageTest";
import { HelloIssueViaProperties } from "./event/HelloIssue";

// const host = "https://automation.atomist.com";
const host = "https://automation-staging.atomist.services";

/**
 * AutomationMetadataProcessor that rewrites all requested secrets to use values instead
 */
export class LocalSecretRewritingMetadataProcessor implements AutomationMetadataProcessor {

    public process<T extends AutomationMetadata>(metadata: T): T {
        if (isCommandHandlerMetadata(metadata)) {
            const cmd = metadata as CommandHandlerMetadata;
            cmd.secrets.filter(s => s.uri.startsWith("github://"))
                .forEach(s => {
                    cmd.values.push({ name: s.name, path: "token", required: true, type: "string" });
                });
            cmd.secrets = cmd.secrets.filter(s => !s.uri.startsWith("github://"));
        }
        return metadata;
    }
}

/**
 * AutomationMetadataProcessor that rewrites all requested token values to use sdm.token
 */
export class SdmTokenRewritingMetadataProcessor implements AutomationMetadataProcessor {

    public process<T extends AutomationMetadata>(metadata: T): T {
        if (isEventHandlerMetadata(metadata)) {
            const cmd = metadata as EventHandlerMetadata;

            cmd.values.filter(s => s.path === "token")
                .forEach(s => {
                    s.path = "sdm.token";
                });

            // Rewrite GitHub token requests to the sdm.token configuration property
            cmd.secrets.filter(s => s.uri.startsWith("github://"))
                .forEach(s => {
                    cmd.values.push({ name: s.name, path: "sdm.token", required: true, type: "string" });
                });
            cmd.secrets = cmd.secrets.filter(s => !s.uri.startsWith("github://"));

        }
        return metadata;
    }
}

export const configuration: Configuration = {
    name: "@atomist/automation-node-tests",
    version: "0.0.7",
    // policy: "durable",
    teamIds: ["T1L0VDKJP"],
    keywords: ["test", "automation"],
    token: process.env.GITHUB_TOKEN,
    commands: [
        // ...scanCommands( ["**/metadata/addAtomistSpringAgent.js", "**/command/Search*.js"] ),
        githubTeam(HelloWorld, "atomist-automation"),
        MessageTest,
        FileMessageTest,
        () => {
            return null;
        },
    ],
    events: [
        // HelloCircle,
        // GitLabPush,
        // HelloWorldIngester,
        HelloIssueViaProperties,
        // ...scanEvents("**/event/*.js"),
    ],
    ingesters: [
        // CircleCIPayload,
        // GitLabPushPayload,
        /* buildIngester("HelloWorld")
            .withType(buildType("HelloWorldPerson").withStringField("name", "Name of the person"))
            .withEnum(buildEnum("Urgency", ["high", "low", "normal"], "How important is your message"))
            .withType(buildType("HelloWorld")
                .withEnumField("urgency", "Urgency", "Field description")
                .withObjectField("sender", "HelloWorldPerson", "sender desc", ["name"])
                .withObjectField("recipient", "HelloWorldPerson", "recipient desc", ["name"])),*/
        // fs.readFileSync(p.join(appRoot.path, "test", "graphql", "ingester", "helloWorld.graphql")).toString(),
        // fs.readFileSync(p.join(appRoot.path, "test", "graphql", "ingester", "sdmGoal.graphql")).toString(),
        // ingester("helloWorld"),
    ],
    ws: {
        enabled: true,
        termination: {
            graceful: false,
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
            token: {
                enabled: false,
                verify: async token => "12222" === token,
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
        enabled: false
        // workers: 4,
    },
    postProcessors: [
        config => {
            config.custom = { test: "123456" };
            return Promise.resolve(config);
        },
    ],
    logging: {
        level: "debug",
        banner: true,
        file: {
            enabled: false,
            level: "debug",
        },
        logEvents: {
            enabled: false,
        },
    },
    // metadataProcessor: new SdmTokenRewritingMetadataProcessor(),
};
