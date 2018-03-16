import * as cluster from "cluster";
import * as _ from "lodash";
import { AutomationServerOptions, Configuration } from "./configuration";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import {
    Ingester,
    IngesterBuilder,
} from "./ingesters";
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
import { Maker } from "./util/constructionUtils";
import { StatsdAutomationEventListener, StatsdOptions } from "./util/statsd";

const DefaultListeners = [
    new MetricEnabledAutomationEventListener(),
    new EventStoringAutomationEventListener(),
];

export class AutomationClient {

    public automations: BuildableAutomationServer;
    public webSocketClient: WebSocketClient;
    public httpServer: ExpressServer;
    public wsHandler: WebSocketRequestProcessor;

    constructor(public configuration: Configuration) {
        this.automations = new BuildableAutomationServer(
            {
                name: configuration.name,
                version: configuration.version,
                policy: configuration.policy,
                teamIds: configuration.teamIds,
                groups: configuration.groups,
                keywords: [],
                token: configuration.token,
                endpoints: {
                    graphql: configuration.endpoints.graphql,
                    api: configuration.endpoints.api,
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

    public withIngester(ingester: Ingester): AutomationClient {
        this.automations.registerIngester(ingester);
        return this;
    }

    public run(): Promise<any> {
        const webSocketOptions: WebSocketClientOptions = {
            graphUrl: this.configuration.endpoints.graphql,
            registrationUrl: this.configuration.endpoints.api,
            token: this.configuration.token,
            termination: this.configuration.ws.termination,
            compress: this.configuration.ws.compress,
        };

        (logger as any).level = this.configuration.logging.level;

        if (this.configuration.statsd.enabled) {
            const statsdOptions: StatsdOptions = {
                host: this.configuration.statsd.host,
                port: this.configuration.statsd.port,
            };
            DefaultListeners.push(new StatsdAutomationEventListener(statsdOptions));
        }

        if (!this.configuration.cluster.enabled) {
            logger.info(`Starting Atomist automation client ${this.configuration.name}@${this.configuration.version}`);
            if (this.configuration.ws.enabled) {
                this.wsHandler = this.setupWebSocketRequestHandler(webSocketOptions);
                return Promise.all([
                    this.runWs(this.wsHandler, webSocketOptions),
                    Promise.resolve(this.runHttp()),
                    this.setupApplicationEvents(),
                ]);
            } else {
                return Promise.all([
                    Promise.resolve(this.runHttp()),
                    this.setupApplicationEvents(),
                ]);
            }
        } else if (cluster.isMaster) {
            logger.info(
                `Starting Atomist automation client master ${this.configuration.name}@${this.configuration.version}`);
            this.wsHandler = this.setupWebSocketClusterRequestHandler(webSocketOptions);
            return (this.wsHandler as ClusterMasterRequestProcessor).run()
                .then(() => {
                    return Promise.all([
                        this.runWs(this.wsHandler, webSocketOptions),
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
        webSocketOptions: WebSocketClientOptions,
    ): ClusterMasterRequestProcessor {

        return new ClusterMasterRequestProcessor(this.automations, webSocketOptions,
            [...DefaultListeners, ...this.configuration.listeners],
            this.configuration.cluster.workers);
    }

    private setupWebSocketRequestHandler(webSocketOptions: WebSocketClientOptions): WebSocketRequestProcessor {

        return new DefaultWebSocketRequestProcessor(this.automations, webSocketOptions,
            [...DefaultListeners, ...this.configuration.listeners]);
    }

    private setupApplicationEvents(): Promise<any> {
        if (this.configuration.applicationEvents.enabled) {
            if (this.configuration.applicationEvents.teamId) {
                return registerApplicationEvents(this.configuration.applicationEvents.teamId);
            } else if (this.configuration.teamIds.length > 0) {
                return registerApplicationEvents(this.configuration.teamIds[0]);
            }
        }
        return Promise.resolve();
    }

    private runWs(handler: WebSocketRequestProcessor, options: WebSocketClientOptions): Promise<void> {

        const payloadOptions: any = {};
        if (options.compress) {
            payloadOptions.accept_encoding = "gzip";
        }

        this.webSocketClient = new WebSocketClient(
            () => prepareRegistration(this.automations.automations, payloadOptions),
            options,
            handler);
        return this.webSocketClient.start();
    }

    private runHttp(): void {
        if (!this.configuration.http.enabled) {
            return;
        }
        const expressOptions: ExpressServerOptions = {
            port: this.configuration.http.port,
            customizers: this.configuration.http.customizers,
            host: this.configuration.http.host,
            auth: {
                basic: _.cloneDeep(this.configuration.http.auth.basic),
                bearer: _.cloneDeep(this.configuration.http.auth.bearer),
            },
            endpoint: {
                graphql: this.configuration.endpoints.graphql,
            },
        };
        this.httpServer = new ExpressServer(this.automations, this.configuration.listeners, expressOptions);
    }
}

export let runningAutomationClient: AutomationClient;

export function automationClient(configuration: Configuration): AutomationClient {
    const client = new AutomationClient(configuration);
    configuration.commands.forEach(c => {
        client.withCommandHandler(c);
    });
    configuration.events.forEach(e => {
        client.withEventHandler(e);
    });
    configuration.ingesters.forEach(e => {
        if ((e as any).build) {
            client.withIngester((e as IngesterBuilder).build());
        } else {
            client.withIngester(e as Ingester);
        }
    });
    runningAutomationClient = client;
    return client;
}
