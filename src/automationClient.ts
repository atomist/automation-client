import * as _ from "lodash";
import * as os from "os";
import { Configuration } from "./configuration";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { ExpressServer, ExpressServerOptions } from "./internal/transport/express/ExpressServer";
import { MetricEnabledAutomationEventListener } from "./internal/transport/MetricEnabledAutomationEventListener";
import { TransportEventHandler } from "./internal/transport/TransportEventHandler";
import { DefaultWebSocketTransportEventHandler,
} from "./internal/transport/websocket/DefaultWebSocketTransportEventHandler";
import { prepareRegistration } from "./internal/transport/websocket/Payloads";
import { WebSocketClient, WebSocketClientOptions } from "./internal/transport/websocket/WebSocketClient";
import { WebSocketTransportEventHandler } from "./internal/transport/websocket/WebSocketTransportEventHandler";
import { logger } from "./internal/util/logger";
import { AutomationServer } from "./server/AutomationServer";
import { BuildableAutomationServer } from "./server/BuildableAutomationServer";

export const DefaultApiServer =
    "https://automation.atomist.com/registration";
export const DefaultGraphQLServer =
    "https://automation.atomist.com/graphql/team";

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
                endpoints: {
                    graphql: _.get(this.configuration, "endpoints.graphql")
                        ? _.get(this.configuration, "endpoints.graphql") : DefaultGraphQLServer,
                    api: _.get(this.configuration, "endpoints.api")
                        ? _.get(this.configuration, "endpoints.api") : DefaultApiServer,
                },
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
        const webSocketOptions: WebSocketClientOptions = {
            graphUrl: _.get(this.configuration, "endpoints.graphql")
                ? _.get(this.configuration, "endpoints.graphql") : DefaultGraphQLServer,
            registrationUrl: _.get(this.configuration, "endpoints.api")
                ? _.get(this.configuration, "endpoints.api") : DefaultApiServer,
            token: this.configuration.token,
        };
        const handler = this.setupEventHandler(webSocketOptions);
        return Promise.all([
            Promise.resolve(this.runWs(handler, webSocketOptions)),
            Promise.resolve(this.runHttp(handler)),
        ]);
    }

    private setupEventHandler(webSocketOptions: WebSocketClientOptions): WebSocketTransportEventHandler {

        if (this.configuration.listeners) {
            return new DefaultWebSocketTransportEventHandler(this.automations, webSocketOptions,
                [ new MetricEnabledAutomationEventListener(), ...this.configuration.listeners]);
        } else {
            return new DefaultWebSocketTransportEventHandler(this.automations, webSocketOptions,
                [ new MetricEnabledAutomationEventListener() ]);
        }
    }

    private runWs(handler: WebSocketTransportEventHandler, options: WebSocketClientOptions): void {
        this.webSocketClient = new WebSocketClient(() => prepareRegistration(this.automations.rugs), options,
            handler );
    }

    private runHttp(handler: TransportEventHandler): void {
        const http = this.configuration.http;
        this.httpPort = http && http.port ? http.port : (process.env.PORT ? +process.env.PORT : 2866);
        const host = http && http.host ? http.host : os.hostname();
        const expressOptions: ExpressServerOptions = {
            port: this.httpPort,
            host,
            auth: {
                basic: {
                    enabled: true,
                },
                bearer: {
                    enabled: true,
                    token: this.configuration.token,
                },
            },
            endpoint: {
                graphql: _.get(this.configuration, "endpoints.graphql")
                    ? _.get(this.configuration, "endpoints.graphql") : DefaultGraphQLServer,
            },
        };

        if (http && http.enabled) {
            // Set up auth options
            if (http.auth) {
                if (http.auth.basic && http.auth.basic.enabled) {
                    expressOptions.auth.basic.enabled = true;
                    expressOptions.auth.basic.username = http.auth.basic.username;
                    expressOptions.auth.basic.password = http.auth.basic.password;
                } else if (http.auth.basic) {
                    expressOptions.auth.basic.enabled = http.auth.basic.enabled;
                }
                if (http.auth.bearer && http.auth.bearer.enabled) {
                    expressOptions.auth.bearer.enabled = http.auth.bearer.enabled;
                    expressOptions.auth.bearer.token = http.auth.bearer.token;
                } else if (http.auth.bearer) {
                    expressOptions.auth.bearer.enabled = http.auth.bearer.enabled;
                }
            }
        }
        if (!http || http.enabled) {
            this.httpServer = new ExpressServer(this.automations, expressOptions, handler);
        }
    }
}

export function automationClient(configuration: Configuration):
    AutomationClient {
    return new AutomationClient(configuration);
}
