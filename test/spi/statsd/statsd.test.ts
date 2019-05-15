import * as HotShotsLib from "hot-shots";
import * as assert from "power-assert";
import * as StatsdClientLib from "statsd-client";
import { defaultConfiguration } from "../../../lib/configuration";
import { StatsdAutomationEventListener } from "../../../lib/spi/statsd/statsd";
import {
    defaultStatsDClientOptions,
    NodeStatsDClientFactory,
    StatsDClient,
    StatsDClientCallback,
    StatsDClientOptions,
    StatsDClientStat,
    StatsDClientTags,
} from "../../../lib/spi/statsd/statsDClient";

describe("StatsdAutomationEventListener", () => {
    describe("constructor", () => {
        it("works with default configuration", () => {
            const config = defaultConfiguration();
            assert.doesNotThrow(() => {
                const statsdListener = new StatsdAutomationEventListener(config);
                statsdListener.close();
            });
        });
        it("works with hot-shots statsd", () => {
            const config = defaultConfiguration();
            const expectedStatsdClientOptions = defaultStatsDClientOptions(config);

            config.statsd.enabled = true;
            config.statsd.client = {
                factory: {
                    create(clientOptions: StatsDClientOptions) {
                        assert.deepEqual(clientOptions, expectedStatsdClientOptions);

                        return new HotShotsLib.StatsD(clientOptions);
                    },
                },
            };
            assert.doesNotThrow(() => {
                const statsdListener = new StatsdAutomationEventListener(config);
                statsdListener.close();
            });
        });

        it("works with node-statsd", () => {
            const config = defaultConfiguration();
            const expectedStatsdClientOptions = defaultStatsDClientOptions(config);

            config.statsd.enabled = true;
            config.statsd.client = {
                factory: new NodeStatsDClientFactory(),
            };
            assert.doesNotThrow(() => {
                const statsdListener = new StatsdAutomationEventListener(config);
                statsdListener.close();
            });
        });

        it("works with statsd-client", () => {
            const config = defaultConfiguration();
            const expectedStatsdClientOptions = defaultStatsDClientOptions(config);

            class StatsdclientStatsD implements StatsDClient {
                private statsd: StatsdClientLib;

                constructor(adapterOptions: StatsDClientOptions) {
                    this.statsd = new StatsdClientLib(adapterOptions);
                }
                public increment(
                    stat: StatsDClientStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsDClientTags,
                    callback?: StatsDClientCallback,
                ): void {
                    this.statsd.increment(stat as string, value, tags as {[key: string]: string});
                }
                public timing(
                    stat: StatsDClientStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsDClientTags,
                    callback?: StatsDClientCallback,
                ): void {
                    this.statsd.timing(stat as string, value, tags as {[key: string]: string});
                }
                public gauge(
                    stat: StatsDClientStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsDClientTags,
                    callback?: StatsDClientCallback,
                ): void {
                    this.statsd.gauge(stat as string, value, tags as {[key: string]: string});
                }
                public event(
                    stat: StatsDClientStat,
                    text?: string,
                    options?: {},
                    tags?: StatsDClientTags,
                    callback?: StatsDClientCallback,
                ): void {
                    // Datadog specific, not supported by NodeStatsD
                }
                public close(callback: StatsDClientCallback): void {
                    this.statsd.close();
                }
            }

            config.statsd.enabled = true;
            config.statsd.client = {
                factory: {
                    create(clientOptions: StatsDClientOptions) {
                        assert.deepEqual(clientOptions, expectedStatsdClientOptions);
                        return new StatsdclientStatsD(clientOptions);
                    },
                }
            };
            assert.doesNotThrow(() => {
                const statsdListener = new StatsdAutomationEventListener(config);
                statsdListener.close();
            });
        });
    });
});
