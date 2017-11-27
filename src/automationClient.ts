import * as cluster from "cluster";
import * as _ from "lodash";
import { Configuration } from "./configuration";
import {
    HandleCommand,
    HandleEvent,
} from "./index";
import { registerApplicationEvents } from "./internal/env/applicationEvent";
import {
    ClusterMasterRequestProcessor,
} from "./internal/transport/cluster/ClusterMasterRequestProcessor";
import { startWorker } from "./internal/transport/cluster/ClusterWorkerRequestProcessor";
import { EventStoringAutomationEventListener } from "./internal/transport/EventStoringAutomationEventListener";
import {
    ExpressServer,
    ExpressServerOptions,
} from "./internal/transport/express/ExpressServer";
import { MetricEnabledAutomationEventListener } from "./internal/transport/MetricEnabledAutomationEventListener";
import { DefaultWebSocketRequestProcessor } from "./internal/transport/websocket/DefaultWebSocketRequestProcessor";
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
import { Maker } from "./util/constructionUtils";

export const DefaultApiServer =
    "https://automation.atomist.com/registration";
export const DefaultGraphQLServer =
    "https://automation.atomist.com/graphql/team";

const DefaultListeners = [
    new MetricEnabledAutomationEventListener(),
    new EventStoringAutomationEventListener(),
];

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
                policy: this.configuration.policy,
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

    public withCommandHandler(chm: Maker<HandleCommand>): AutomationClient {
        this.automations.registerCommandHandler(chm);
        return this;
    }

    public withEventHandler(event: Maker<HandleEvent<any>>): AutomationClient {
        this.automations.registerEventHandler(event);
        return this;
    }

    public withIngester(ingester: any): AutomationClient {
        this.automations.registerIngester(ingester);
        return this;
    }

    public run(): Promise<any> {
        const webSocketOptions: WebSocketClientOptions = {
            graphUrl: _.get(this.configuration, "endpoints.graphql", DefaultGraphQLServer),
            registrationUrl: _.get(this.configuration, "endpoints.api", DefaultApiServer),
            token: this.configuration.token,
            gracePeriod: _.get(this.configuration, "ws.gracePeriod", 15000),
        };

        if (this.configuration.logging && this.configuration.logging.level) {
            (logger as any).level = this.configuration.logging.level;
        }

        if (!(this.configuration.cluster && this.configuration.cluster.enabled)) {
            logger.info(`Starting Atomist automation client ${this.configuration.name}@${this.configuration.version}`);
            if ((this.configuration.ws && this.configuration.ws.enabled) || !this.configuration.ws) {
                return Promise.all([
                    this.runWs(this.setupWebSocketRequestHandler(webSocketOptions), webSocketOptions),
                    Promise.resolve(this.runHttp()),
                    this.setupApplicationEvents(),
                ]);
            } else {
                return Promise.all([
                    Promise.resolve(this.runHttp()),
                    this.setupApplicationEvents(),
                ]);
            }
        } else if (cluster.isMaster || !(this.configuration.cluster && this.configuration.cluster.enabled)) {
            logger.info(
                `Starting Atomist automation client master ${this.configuration.name}@${this.configuration.version}`);
            const wsHandler = this.setupWebSocketClusterRequestHandler(webSocketOptions);
            return wsHandler.run()
                .then(() => {
                    return Promise.all([
                        this.runWs(wsHandler, webSocketOptions),
                        Promise.resolve(this.runHttp()),
                        this.setupApplicationEvents(),
                    ]);
                });
        } else if (cluster.isWorker) {
            logger.info(
                `Starting Atomist automation client worker ${this.configuration.name}@${this.configuration.version}`);
            return Promise.resolve(startWorker(this.automations, webSocketOptions, this.configuration.listeners));
        }
    }

    private setupWebSocketClusterRequestHandler(
        webSocketOptions: WebSocketClientOptions): ClusterMasterRequestProcessor {
        if (this.configuration.listeners) {
            return new ClusterMasterRequestProcessor(this.automations, webSocketOptions,
                [...DefaultListeners, ...this.configuration.listeners],
                this.configuration.cluster.workers);
        } else {
            return new ClusterMasterRequestProcessor(this.automations, webSocketOptions,
                DefaultListeners, this.configuration.cluster.workers);
        }
    }

    private setupWebSocketRequestHandler(webSocketOptions: WebSocketClientOptions): WebSocketRequestProcessor {
        if (this.configuration.listeners) {
            return new DefaultWebSocketRequestProcessor(this.automations, webSocketOptions,
                [...DefaultListeners, ...this.configuration.listeners]);
        } else {
            return new DefaultWebSocketRequestProcessor(this.automations, webSocketOptions,
                DefaultListeners);
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
        this.webSocketClient = new WebSocketClient(() => prepareRegistration(this.automations.automations),
            options, handler);
        return this.webSocketClient.start();
    }

    private runHttp(): void {
        const http = this.configuration.http;
        this.httpPort = http && http.port ? http.port :
            (process.env.PORT ? +process.env.PORT : 2866);
        const host = http && http.host ? http.host : "localhost";
        const expressOptions: ExpressServerOptions = {
            port: this.httpPort,
            customizers: http.customizers,
            host,
            auth: {
                basic: {
                    enabled: true,
                },
                bearer: {
                    enabled: true,
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
                    expressOptions.auth.bearer.org = http.auth.bearer.org;
                } else if (http.auth.bearer) {
                    expressOptions.auth.bearer.enabled = http.auth.bearer.enabled;
                }
            }
        }
        if (!http || http.enabled) {
            this.httpServer = new ExpressServer(this.automations, this.configuration.listeners, expressOptions);
        }
    }
}

export function automationClient(configuration: Configuration): AutomationClient {
    const client = new AutomationClient(configuration);
    if (configuration.commands) {
        configuration.commands.forEach(c => {
            client.withCommandHandler(c);
        });
    }
    if (configuration.events) {
        configuration.events.forEach(e => {
            client.withEventHandler(e);
        });
    }

    if (configuration.ingesters) {
        configuration.ingesters.forEach(e => {
            client.withIngester(e);
        });
    }
    return client;
}
