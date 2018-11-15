import Timer = NodeJS.Timer;
import * as cluster from "cluster";
import * as Heavy from "heavy";
import {
    ClientOptions,
    StatsD,
} from "hot-shots";
import * as os from "os";
import * as trace from "stack-trace";
import { Configuration } from "../configuration";
import { EventFired } from "../HandleEvent";
import {
    AutomationContextAware,
    HandlerContext,
} from "../HandlerContext";
import { HandlerResult } from "../HandlerResult";
import { CommandInvocation } from "../internal/invoker/Payload";
import { RequestProcessor } from "../internal/transport/RequestProcessor";
import { registerShutdownHook } from "../internal/util/shutdown";
import { AutomationEventListenerSupport } from "../server/AutomationEventListener";
import {
    MutationOptions,
    QueryOptions,
} from "../spi/graph/GraphClient";
import {
    Destination,
    MessageOptions,
    SlackDestination,
} from "../spi/message/MessageClient";
import { logger } from "./logger";

const GcTypes = {
    0: "unknown",
    1: "scavenge",
    2: "mark_sweep_compact",
    3: "scavenge_and_mark_sweep_compact",
    4: "incremental_marking",
    8: "weak_phantom",
    15: "all",
};

export class StatsdAutomationEventListener extends AutomationEventListenerSupport {

    private statsd: StatsD;
    private timer: Timer;
    private registrationName: string;
    private heavy: Heavy;

    constructor(private configuration: Configuration) {
        super();
        this.registrationName = `${this.configuration.name}/${this.configuration.version}`;
        this.initStatsd();
        this.initGc();
    }

    public registrationSuccessful(handler: RequestProcessor) {
        this.increment("counter.registration");
        this.event("event.registration", `New registration for ${this.registrationName}`);
    }

    public contextCreated(ctx: HandlerContext) {
        const context = (ctx as any as AutomationContextAware).context;
        const graphClient = ctx.graphClient;

        // On the cluster master we don't have a GraphClient
        if (graphClient) {

            const tags = [
                `atomist_operation:${context.operation}`,
                `atomist_operation_type:command`,
            ];

            ctx.graphClient = {
                endpoint: graphClient.endpoint,
                mutate: (optionsOrName: MutationOptions<any> | string) => {
                    const start = Date.now();
                    if (typeof optionsOrName === "string") {
                        optionsOrName = {
                            name: optionsOrName,
                        };
                    }
                    (optionsOrName as any).moduleDir = trace.get()[1].getFileName();
                    return graphClient.mutate(optionsOrName)
                        .then(result => {
                            this.statsd.increment("counter.graphql.mutation.success", 1, 1, tags, this.callback);
                            this.statsd.timing("timer.graphql.mutation", Date.now() - start, 1, tags, this.callback);
                            return result;
                        })
                        .catch(err => {
                            this.statsd.increment("counter.graphql.mutation.failure", 1, 1, tags, this.callback);
                            this.statsd.timing("timer.graphql.mutation", Date.now() - start, 1, tags, this.callback);
                            return err;
                        });
                },
                query: (optionsOrName: QueryOptions<any> | string) => {
                    const start = Date.now();
                    if (typeof optionsOrName === "string") {
                        optionsOrName = {
                            name: optionsOrName,
                        };
                    }
                    (optionsOrName as any).moduleDir = trace.get()[1].getFileName();
                    return graphClient.query(optionsOrName)
                        .then(result => {
                            this.statsd.increment("counter.graphql.query.success", 1, 1, tags, this.callback);
                            this.statsd.timing("timer.graphql.query", Date.now() - start, 1, tags, this.callback);
                            return result;
                        })
                        .catch(err => {
                            this.statsd.increment("counter.graphql.query.failure", 1, 1, tags, this.callback);
                            this.statsd.timing("timer.graphql.query", Date.now() - start, 1, tags, this.callback);
                            return err;
                        });
                },
            };
        }
    }

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any> {
        const tags = [
            `atomist_operation_type:command`,
        ];
        this.increment("counter.operation.success", tags);
        this.timing("timer.operation", ctx, tags);
        return Promise.resolve();
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any> {
        const tags = [
            `atomist_operation:${payload.name}`,
            `atomist_operation_type:command`,
        ];
        this.increment("counter.operation.failure", tags);
        this.timing("timer.operation", ctx, tags);
        this.event("event.operation.failure", "Unsuccessfully invoked command", tags);
        return Promise.resolve();
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any> {
        const tags = [
            `atomist_operation_type:event`,
        ];
        this.increment("counter.operation.success", tags);
        this.timing("timer.operation", ctx, tags);
        return Promise.resolve();
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any> {
        const tags = [
            `atomist_operation:${payload.extensions.operationName}`,
            `atomist_operation_type:event`,
        ];
        this.increment("counter.operation.failure", tags);
        this.timing("timer.operation", ctx, tags);
        this.event("event.operation.failure", "Unsuccessfully invoked event", tags);
        return Promise.resolve();
    }

    public messageSent(message: any,
                       destinations: Destination | Destination[],
                       options: MessageOptions,
                       ctx: HandlerContext & AutomationContextAware) {
        let type: string;
        destinations = Array.isArray(destinations) ? destinations : [destinations];
        destinations.forEach(d => {
            if (d.userAgent === "slack") {
                const sd = d as SlackDestination;
                if (sd.users && sd.users.length > 0) {
                    type = "slack_users";
                } else if (sd.channels && sd.channels.length > 0) {
                    type = "slack_channels";
                } else {
                    type = "slack_response";
                }
            }
        });
        this.increment("counter.message", [
            `atomist_message_type:${type}`,
        ]);
        return Promise.resolve();
    }

    /** Do-nothing callback */
    private callback(err: Error) {
        return;
    }

    private increment(stat: string | string[],
                      tags?: string[]) {
        if (cluster.isMaster) {
            this.statsd.increment(stat, 1, 1, tags, this.callback);
        }
    }

    private event(title: string, text?: string, tags?: string[]) {
        if (cluster.isMaster) {
            this.statsd.event(`automation_client.${title}`, text, {}, tags, this.callback);
        }
    }

    private timing(stat: string | string[],
                   ctx: HandlerContext,
                   tags?: string[]) {
        if (cluster.isMaster &&
            ctx &&
            (ctx as any as AutomationContextAware).context &&
            (ctx as any as AutomationContextAware).context.ts) {
            const context = (ctx as any as AutomationContextAware).context;
            this.statsd.timing(stat, Date.now() - context.ts, 1, tags, this.callback);
        }
    }

    private initStatsd() {
        const options: ClientOptions = {
            prefix: "automation_client.",
            host: this.configuration.statsd.host || "localhost",
            port: this.configuration.statsd.port || 8125,
            globalTags: [
                `atomist_name:${this.configuration.name.replace("@", "").replace("/", ".")}`,
                `atomist_version:${this.configuration.version}`,
                `atomist_environment:${this.configuration.environment}`,
                `atomist_application_id:${this.configuration.application}`,
                `atomist_process_id:${process.pid}`,
                `atomist_host:${os.hostname()}`,
            ],
        };
        this.statsd = new StatsD(options);
        this.timer = setInterval(() => {
            this.submitHeapStats();
            this.submitEventLoopDelay();
        }, 2500);

        this.heavy = new Heavy({
            sampleInterval: 1000,
        });
        this.heavy.start();

        // Register orderly shutdown
        registerShutdownHook(() => {
            this.event("event.shutdown", `Shutting down client ${this.registrationName}`);
            this.statsd.close(() => {
                logger.debug("Closing StatsD connection");
            });
            return Promise.resolve(0);
        });
        (this.configuration.statsd as any).__instance = this.statsd;
    }

    private submitHeapStats() {
        const heap = process.memoryUsage();
        this.statsd.gauge("heap.rss", heap.rss, 1, [], this.callback);
        this.statsd.gauge("heap.total", heap.heapTotal, 1, [], this.callback);
        this.statsd.gauge("heap.used", heap.heapUsed, 1, [], this.callback);
    }

    private submitEventLoopDelay() {
        if (this.heavy && this.heavy.load) {
            this.statsd.timing(
                "event_loop.delay",
                this.heavy.load.eventLoopDelay,
                1,
                [],
                this.callback);
        }
    }

    private initGc() {
        try {
            const gc = require("gc-stats");
            gc().on('stats', stats => {
                const gcType = GcTypes[stats.gctype];

                const tags = [
                    `atomist_gc_type:${gcType}`,
                ];

                this.statsd.increment(
                    "gc",
                    1,
                    1,
                    tags,
                    this.callback);
                this.statsd.timing(
                    "gc.duration",
                    stats.pause / 1e9 * 1000,
                    1,
                    tags,
                    this.callback);

                if (stats.diff.usedHeapSize < 0) {
                    this.statsd.gauge(
                        "gc.head.reclaimed",
                        stats.diff.usedHeapSize * -1,
                        1,
                        tags,
                        this.callback);
                }
            });
        } catch (err) {
            // Ignore missing gc-stats package
        }
    }
}
