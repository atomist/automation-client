import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { ExpressServer, ExpressServerOptions } from "./internal/transport/express/ExpressServer";
import { WebSocketClient, WebSocketClientOptions } from "./internal/transport/websocket/WebSocketClient";
import { BuildableAutomationServer } from "./server/BuildableAutomationServer";

import { Configuration } from "./configuration";
import {
    DefaultExpressAutomationEventListener,
} from "./internal/transport/express/DefaultExpressAutomationEventListener";
import { DefaultWebSocketAutomationEventListener,
} from "./internal/transport/websocket/DefaultWebSocketAutomationEventListener";
import { prepareRegistration } from "./internal/transport/websocket/Payloads";
import { logger } from "./internal/util/logger";
import { AutomationServer } from "./server/AutomationServer";

export const DefaultStagingAtomistServer =
    "https://ws-staging.atomist.services/node-agent/register";
export const DefaultStagingAtomistGraphQLServer =
    "https://ws-staging.atomist.services/graphql";

export class AutomationClient {

    public httpPort: number;

    private automations: BuildableAutomationServer;
    private webSocketClient: WebSocketClient;
    private httpServer: ExpressServer;

    constructor(private configuration: Configuration) {
        this.automations = new BuildableAutomationServer(
            {
                name: configuration.name,
                version: configuration.version,
                teamId: configuration.teamId,
                keywords: [],
                token: process.env.GITHUB_TOKEN,
                graphqlEndpoint: DefaultStagingAtomistGraphQLServer,
            });
    }

    get automationServer(): AutomationServer {
        return this.automations;
    }

    public withCommandHandler(command: () => HandleCommand): AutomationClient {
        this.automations.fromCommandHandlerInstance(command);
        return this;
    }

    public withEventHandler(event: () => HandleEvent<any>): AutomationClient {
        this.automations.fromEventHandlerInstance(event);
        return this;
    }

    public withIngestor(event: () => HandleEvent<any>): AutomationClient {
        this.automations.fromIngestorInstance(event);
        return this;
    }

    public run(): void {
        logger.info(`Starting Atomist automation client for ${this.configuration.name}@${this.configuration.version}`);
        const webSocketOptions: WebSocketClientOptions = {
            graphUrl: DefaultStagingAtomistGraphQLServer,
            registrationUrl: DefaultStagingAtomistServer,
            token: this.configuration.token,
        };
        this.webSocketClient = new WebSocketClient(() => prepareRegistration(this.automations.rugs), webSocketOptions,
            [new DefaultWebSocketAutomationEventListener(this.automations, webSocketOptions)]);

        const http = this.configuration.http;
        if (http && http.enabled) {
            this.httpPort = http.port ? http.port : (process.env.PORT ? +process.env.PORT : 2866);
            if (http.basicAuth) {
                const expressOptions: ExpressServerOptions = {
                    port: this.httpPort,
                    basicAuth: {
                        enabled: http.basicAuth.enabled,
                        username: http.basicAuth.username,
                        password: http.basicAuth.password,
                    },
                };
                this.httpServer = new ExpressServer(this.automations, expressOptions,
                    [new DefaultExpressAutomationEventListener(this.automations)]);
            } else {
                this.httpServer = new ExpressServer(this.automations, {port: this.httpPort},
                    [new DefaultExpressAutomationEventListener(this.automations)]);
            }
        } else if (!http) {
            this.httpServer = new ExpressServer(this.automations,
                {port: process.env.PORT ? +process.env.PORT : 2866, basicAuth: {enabled: true}},
                [new DefaultExpressAutomationEventListener(this.automations)]);
        }
    }
}

export function automationClient(configuration: Configuration): AutomationClient {
    return new AutomationClient(configuration);
}
