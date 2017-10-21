import * as _ from "lodash";
import { CommandHandlerMaker, Configuration, toCommandHanderFactory } from "./configuration";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { registerApplicationEvents } from "./internal/env/applicationEvent";
import {
    ExpressServer,
    ExpressServerOptions,
} from "./internal/transport/express/ExpressServer";
import { MetricEnabledAutomationEventListener } from "./internal/transport/MetricEnabledAutomationEventListener";
import { RequestProcessor } from "./internal/transport/RequestProcessor";
import {
    DefaultWebSocketRequestProcessor,
} from "./internal/transport/websocket/DefaultWebSocketRequestProcessor";
import { prepareRegistration } from "./internal/transport/websocket/payloads";
import {
    WebSocketClient,
    WebSocketClientOptions,
} from "./internal/transport/websocket/WebSocketClient";
import { WebSocketRequestProcessor } from "./internal/transport/websocket/WebSocketRequestProcessor";
import { logger } from "./internal/util/logger";
import { toStringArray } from "./internal/util/string";
import { AutomationServer } from "./server/AutomationServer";
import { BuildableAutomationServer } from "./server/BuildableAutomationServer";
import { AutomationServerOptions } from "./server/options";

export const DefaultApiServer =
    "https://automation.atomist.com/registration";
export const DefaultGraphQLServer =
    "https://automation.atomist.com/graphql/team";

export class AutomationClient {

    public httpPort: number;

    private automations: BuildableAutomationServer;
    private webSocketClient: WebSocketClient;
    private httpServer: ExpressServer;

    private teamIds: string[];
    private groups: string[];

    constructor(private configuration: Configuration) {
        this.teamIds = toStringArray(this.configuration.teamIds);
        this.groups = toStringArray((this.configuration as any).groups);

        this.automations = new BuildableAutomationServer(
            {
                name: configuration.name,
                version: configuration.version,
                teamIds: this.teamIds,
                groups: this.groups,
                keywords: [],
                token: configuration.token,
                endpoints: {
                    graphql: _.get(this.configuration, "endpoints.graphql", DefaultGraphQLServer),
                    api: _.get(this.configuration, "endpoints.api", DefaultApiServer),
                },
            } as AutomationServerOptions);
    }

    get automationServer(): AutomationServer {
        return this.automations;
    }

    public withCommandHandler(chm: CommandHandlerMaker): AutomationClient {
        this.automations.fromCommandHandlerInstance(toCommandHanderFactory(chm));
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
            graphUrl: _.get(this.configuration, "endpoints.graphql", DefaultGraphQLServer),
            registrationUrl: _.get(this.configuration, "endpoints.api", DefaultApiServer),
            token: this.configuration.token,
        };
        const handler = this.setupEventHandler(webSocketOptions);
        return Promise.all([
            this.runWs(handler, webSocketOptions),
            Promise.resolve(this.runHttp(handler)),
            this.setupApplicationEvents(),
        ]);
    }

    private setupEventHandler(webSocketOptions: WebSocketClientOptions): WebSocketRequestProcessor {
        if (this.configuration.listeners) {
            return new DefaultWebSocketRequestProcessor(this.automations, webSocketOptions,
                [new MetricEnabledAutomationEventListener(), ...this.configuration.listeners]);
        } else {
            return new DefaultWebSocketRequestProcessor(this.automations, webSocketOptions,
                [new MetricEnabledAutomationEventListener()]);
        }
    }

    private setupApplicationEvents(): Promise<any> {
        if (this.configuration.applicationEvents
            && this.configuration.applicationEvents.enabled
            && this.configuration.applicationEvents.enabled === true) {
            const teamId = this.configuration.applicationEvents.teamId
                ? this.configuration.applicationEvents.teamId : this.teamIds[0];
            return registerApplicationEvents(teamId);
        } else {
            return Promise.resolve();
        }
    }

    private runWs(handler: WebSocketRequestProcessor, options: WebSocketClientOptions): Promise<void> {
        this.webSocketClient = new WebSocketClient(() => prepareRegistration(this.automations.rugs),
            options, handler);
        return this.webSocketClient.start();
    }

    private runHttp(handler: RequestProcessor): void {
        const http = this.configuration.http;
        this.httpPort = http && http.port ? http.port :
            (process.env.PORT ? +process.env.PORT : 2866);
        const host = http && http.host ? http.host : "localhost";
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
                github: {
                    enabled: false,
                    clientId: "",
                    clientSecret: "",
                    callbackUrl: "",
                },
            },
            endpoint: {
                graphql: _.get(this.configuration, "endpoints.graphql")
                    ? _.get(this.configuration, "endpoints.graphql") : DefaultGraphQLServer,
            },
        };

        if (http && http.enabled) {
            expressOptions.forceSecure = http.forceSecure;
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
                if (http.auth.github && http.auth.github.enabled) {
                    expressOptions.auth.github.enabled = http.auth.github.enabled;
                    expressOptions.auth.github.clientId = http.auth.github.clientId;
                    expressOptions.auth.github.clientSecret = http.auth.github.clientSecret;
                    expressOptions.auth.github.callbackUrl = http.auth.github.callbackUrl;
                    expressOptions.auth.github.org = http.auth.github.org;
                    expressOptions.auth.github.scopes = toStringArray(http.auth.github.scopes);
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
