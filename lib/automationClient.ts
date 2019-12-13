import * as cluster from "cluster";
import * as stringify from "json-stringify-safe";
import { Configuration } from "./configuration";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { HandlerResult } from "./HandlerResult";
import { registerApplicationEvents } from "./internal/env/applicationEvent";
import { ClusterMasterRequestProcessor } from "./internal/transport/cluster/ClusterMasterRequestProcessor";
import {
    ClusterWorkerRequestProcessor,
    startWorker,
} from "./internal/transport/cluster/ClusterWorkerRequestProcessor";
import { EventStoringAutomationEventListener } from "./internal/transport/EventStoringAutomationEventListener";
import { ExpressRequestProcessor } from "./internal/transport/express/ExpressRequestProcessor";
import { ExpressServer } from "./internal/transport/express/ExpressServer";
import { MetricEnabledAutomationEventListener } from "./internal/transport/MetricEnabledAutomationEventListener";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "./internal/transport/RequestProcessor";
import {
    StartupMessageAutomationEventListener,
    StartupTimeMessageUatomationEventListener,
} from "./internal/transport/showStartupMessages";
import { DefaultWebSocketRequestProcessor } from "./internal/transport/websocket/DefaultWebSocketRequestProcessor";
import { prepareRegistration } from "./internal/transport/websocket/payloads";
import { WebSocketClient } from "./internal/transport/websocket/WebSocketClient";
import { WebSocketRequestProcessor } from "./internal/transport/websocket/WebSocketRequestProcessor";
import {
    setForceExitTimeout,
    terminationGracePeriod,
} from "./internal/util/shutdown";
import { obfuscateJson } from "./internal/util/string";
import { AutomationEventListener } from "./server/AutomationEventListener";
import { AutomationServer } from "./server/AutomationServer";
import { BuildableAutomationServer } from "./server/BuildableAutomationServer";
import { StatsdAutomationEventListener } from "./spi/statsd/statsd";
import { Maker } from "./util/constructionUtils";
import {
    clientLoggingConfiguration,
    configureLogging,
    logger,
} from "./util/logger";
import { addRedaction } from "./util/redact";

export class AutomationClient implements RequestProcessor {

    public automations: BuildableAutomationServer;
    public webSocketClient: WebSocketClient;
    public httpServer: ExpressServer;
    public webSocketHandler: RequestProcessor;
    public httpHandler: RequestProcessor;
    public requestProcessor: RequestProcessor;

    private readonly defaultListeners: AutomationEventListener[] = [
        new MetricEnabledAutomationEventListener(),
        new EventStoringAutomationEventListener(),
        new StartupMessageAutomationEventListener(),
        new StartupTimeMessageUatomationEventListener(),
    ];

    constructor(public configuration: Configuration) {
        this.automations = new BuildableAutomationServer(configuration);
        (global as any).__runningAutomationClient = this as AutomationClient;
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

    public withIngester(ingester: string): AutomationClient {
        this.automations.registerIngester(ingester);
        return this;
    }

    public processCommand(command: CommandIncoming, callback?: (result: Promise<HandlerResult>) => void): void {
        if (this.requestProcessor) {
            return this.requestProcessor.processCommand(command, callback);
        } else if (this.webSocketHandler) {
            return this.webSocketHandler.processCommand(command, callback);
        } else if (this.httpHandler) {
            return this.httpHandler.processCommand(command, callback);
        } else {
            throw new Error("No request processor available");
        }
    }

    public processEvent(event: EventIncoming, callback?: (results: Promise<HandlerResult[]>) => void): void {
        if (this.requestProcessor) {
            return this.requestProcessor.processEvent(event, callback);
        } else if (this.webSocketHandler) {
            return this.webSocketHandler.processEvent(event, callback);
        } else if (this.httpHandler) {
            return this.httpHandler.processEvent(event, callback);
        } else {
            throw new Error("No request processor available");
        }
    }

    public run(): Promise<void> {
        this.configureRedactions();
        configureLogging(clientLoggingConfiguration(this.configuration));
        this.configureShutdown();
        this.configureStatsd();

        const clientSig = `${this.configuration.name}:${this.configuration.version}`;
        const clientConf = stringify(this.configuration, obfuscateJson);

        if (!!this.configuration.requestProcessorFactory) {
            this.requestProcessor = this.configuration.requestProcessorFactory(
                this.automations,
                this.configuration,
                [...this.defaultListeners, ...this.configuration.listeners]);
        }

        if (!this.configuration.cluster.enabled) {
            logger.info(`Starting Atomist automation client ${clientSig}`);
            logger.debug(`Using automation client configuration: ${clientConf}`);

            if (this.configuration.ws.enabled) {
                return Promise.all([
                    this.runWs(() => this.setupWebSocketRequestHandler()),
                    this.runHttp(() => this.setupExpressRequestHandler()),
                ])
                    .then(() => this.setupApplicationEvents())
                    .then(() => this.raiseStartupEvent());
            } else {
                return this.runHttp(() => this.setupExpressRequestHandler())
                    .then(() => this.setupApplicationEvents())
                    .then(() => this.raiseStartupEvent());
            }
        } else if (cluster.isMaster) {
            logger.info(`Starting Atomist automation client master ${clientSig}`);
            logger.debug(`Using automation client configuration: ${clientConf}`);

            this.webSocketHandler = this.setupWebSocketClusterRequestHandler();

            return (this.webSocketHandler as ClusterMasterRequestProcessor).run()
                .then(() => {
                    return Promise.all([
                        this.runWs(() => this.webSocketHandler as ClusterMasterRequestProcessor),
                        this.runHttp(() => this.setupExpressRequestHandler()),
                    ])
                        .then(() => this.setupApplicationEvents())
                        .then(() => this.raiseStartupEvent());
                });
        } else if (cluster.isWorker) {
            logger.info(`Starting Atomist automation client worker ${clientSig}`);
            return Promise.resolve(this.setupWebSocketClusterWorkerRequestHandler())
                .then(workerProcessor => {
                    this.webSocketHandler = workerProcessor;
                    return this.raiseStartupEvent();
                });
        }
    }

    private configureRedactions(): void {
        if (!!this.configuration.redact && !!this.configuration.redact.patterns) {
            this.configuration.redact.patterns.forEach(p => {
                let regexp: RegExp;
                if (typeof p.regexp === "string") {
                    regexp = new RegExp(p.regexp, "g");
                } else {
                    regexp = p.regexp;
                }
                addRedaction(regexp, p.replacement);
            });
        }
    }

    private raiseStartupEvent(): Promise<void> {
        return [...this.defaultListeners, ...this.configuration.listeners].filter(l => l.startupSuccessful)
            .map(l => () => l.startupSuccessful(this))
            .reduce((p, f) => p.then(f), Promise.resolve());
    }

    private configureShutdown(): void {
        const gracePeriod = terminationGracePeriod(this.configuration);
        setForceExitTimeout(gracePeriod * 10);
    }

    private configureStatsd(): void {
        if (this.configuration.statsd.enabled === true) {
            this.defaultListeners.push(new StatsdAutomationEventListener(this.configuration));
        }
    }

    private setupWebSocketClusterRequestHandler(): ClusterMasterRequestProcessor {
        return new ClusterMasterRequestProcessor(this.automations, this.configuration,
            [...this.defaultListeners, ...this.configuration.listeners],
            this.configuration.cluster.workers, this.configuration.cluster.maxConcurrentPerWorker);
    }

    private setupWebSocketClusterWorkerRequestHandler(): ClusterWorkerRequestProcessor {
        return startWorker(this.automations, this.configuration,
            [...this.defaultListeners, ...this.configuration.listeners]);
    }

    private setupWebSocketRequestHandler(): WebSocketRequestProcessor {
        return new DefaultWebSocketRequestProcessor(this.automations, this.configuration,
            [...this.defaultListeners, ...this.configuration.listeners]);
    }

    private setupApplicationEvents(): Promise<any> {
        if (this.configuration.applicationEvents.enabled) {
            if (this.configuration.applicationEvents.workspaceId) {
                return registerApplicationEvents(this.configuration.applicationEvents.workspaceId, this.configuration);
            } else if (this.configuration.workspaceIds.length > 0) {
                return registerApplicationEvents(this.configuration.workspaceIds[0], this.configuration);
            }
        }
        return Promise.resolve();
    }

    private setupExpressRequestHandler(): ExpressRequestProcessor {
        return new ExpressRequestProcessor(this.automations, this.configuration,
            [...this.defaultListeners, ...this.configuration.listeners]);
    }

    private runWs(handlerMaker: () => WebSocketRequestProcessor): Promise<void> {
        const payloadOptions: any = {};
        if (this.configuration.ws && this.configuration.ws.compress) {
            payloadOptions.accept_encoding = "gzip";
        }

        this.webSocketHandler = handlerMaker();
        this.webSocketClient = new WebSocketClient(
            () => prepareRegistration(this.automations.automations,
                payloadOptions,
                this.configuration.metadata),
            this.configuration,
            this.webSocketHandler as WebSocketRequestProcessor);

        return this.webSocketClient.start();
    }

    private runHttp(handlerMaker: () => ExpressRequestProcessor): Promise<any> {
        if (!this.configuration.http.enabled) {
            return Promise.resolve();
        }

        this.httpHandler = handlerMaker();
        this.httpServer = new ExpressServer(
            this.automations,
            this.configuration,
            this.httpHandler);

        return this.httpServer.run();
    }
}

export function automationClient(configuration: Configuration,
                                 requestProcessorMaker?: (automations: AutomationServer, configuration: Configuration, listeners: AutomationEventListener[]) => RequestProcessor): AutomationClient {
    const client = new AutomationClient(configuration, requestProcessorMaker);
    configuration.commands.forEach(c => {
        client.withCommandHandler(c);
    });
    configuration.events.forEach(e => {
        client.withEventHandler(e);
    });
    configuration.ingesters.forEach(e => {
        client.withIngester(e);
    });
    return client;
}
