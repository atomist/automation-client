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
    "https://automation-staging.atomist.services/registration";
export const DefaultStagingAtomistGraphQLServer =
    "https://automation-staging.atomist.services/graphql";

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

    public run(): Promise<any> {
        logger.info(`Starting Atomist automation client for ${this.configuration.name}@${this.configuration.version}`);
        return Promise.all([
            Promise.resolve(this.runWs()),
            Promise.resolve(this.runHttp()),
        ]);
    }

    private runWs(): void {
        const webSocketOptions: WebSocketClientOptions = {
            graphUrl: DefaultStagingAtomistGraphQLServer,
            registrationUrl: DefaultStagingAtomistServer,
            token: this.configuration.token,
        };
        this.webSocketClient = new WebSocketClient(() => prepareRegistration(this.automations.rugs), webSocketOptions,
            [new DefaultWebSocketAutomationEventListener(this.automations, webSocketOptions)]);
    }

    private runHttp(): void {
        const http = this.configuration.http;
        this.httpPort = http && http.port ? http.port : (process.env.PORT ? +process.env.PORT : 2866);
        const expressOptions: ExpressServerOptions = {
            port: this.httpPort,
            auth: {
                basic: {
                    enabled: true,
                },
                bearer: {
                    enabled: true,
                    token: this.configuration.token,
                },
            },
        };

        if (http && http.enabled) {
            // Set up auth options
            if (http.auth) {
                if (http.auth.basic && http.auth.basic.enabled) {
                    expressOptions.auth.basic.enabled = true;
                    expressOptions.auth.basic.username = http.auth.basic.username;
                    expressOptions.auth.basic.password = http.auth.basic.password;
                }
                if (http.auth.bearer && http.auth.bearer.enabled) {
                    expressOptions.auth.bearer.enabled = http.auth.bearer.enabled;
                    expressOptions.auth.bearer.token = http.auth.bearer.token;
                }
            }

        }
        if (!http || http.enabled) {
            this.httpServer = new ExpressServer(this.automations, expressOptions,
                [new DefaultExpressAutomationEventListener(this.automations)]);
        }
    }
}

export function automationClient(configuration: Configuration): AutomationClient {
    return new AutomationClient(configuration);
}
