import * as assert from "power-assert";
import { defaultConfiguration } from "../../lib/configuration";
import { StatsdAutomationEventListener } from "../../lib/util/statsd";
import {
    defaultStatsdAdapterConfig,
    StatsdAdapter,
    StatsdAdapterCallback,
    StatsdAdapterOptions,
    StatsdAdapterStat,
    StatsdAdapterTags,
} from "../../lib/util/statsdAdapter";

import * as HotShots from "hot-shots";
import * as NodeStatsD from "node-statsd";
import * as StatsdClient from "statsd-client";

describe("StatsdAutomationEventListener", () => {
    describe("constructor", () => {
        it("works with default configuration", () => {
            const config = defaultConfiguration();
            assert.doesNotThrow(() => {
                const statsdListener = new StatsdAutomationEventListener(config);
            });
        });
        it("works with hot-shots statsd", () => {
            const config = defaultConfiguration();
            const expectedStatsdAdapterConfig = defaultStatsdAdapterConfig(config);
            config.statsd.adapterConfig = {
                adaptClient: (adapterOptions: StatsdAdapterOptions) => {
                    assert.deepEqual(adapterOptions, expectedStatsdAdapterConfig.adapterOptions);

                    return new HotShots.StatsD(adapterOptions);
                },
            };
            assert.doesNotThrow(() => {
                const statsdListener = new StatsdAutomationEventListener(config);
            });
        });

        it("works with node-statsd", () => {
            const config = defaultConfiguration();
            const expectedStatsdAdapterConfig = defaultStatsdAdapterConfig(config);

            class NodeStatsDAdapter implements StatsdAdapter {
                private statsd: NodeStatsD.StatsD;

                constructor(adapterOptions: StatsdAdapterOptions) {
                    this.statsd = new NodeStatsD.StatsD(adapterOptions);
                }
                public increment(
                    stat: StatsdAdapterStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    this.statsd.increment(stat, value, sampleRate, tags as string[], callback);
                }
                public timing(
                    stat: StatsdAdapterStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    this.statsd.timing(stat, value, sampleRate, tags as string[], callback);
                }
                public gauge(
                    stat: StatsdAdapterStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    this.statsd.gauge(stat, value, sampleRate, tags as string[], callback);
                }
                public event(
                    stat: StatsdAdapterStat,
                    text?: string,
                    options?: {},
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    // Datadog specific, not supported by NodeStatsD
                }
                public close(callback: StatsdAdapterCallback): void {
                    this.statsd.close();
                }
            }

            config.statsd.adapterConfig = {
                adaptClient: (adapterOptions: StatsdAdapterOptions) => {
                    assert.deepEqual(adapterOptions, expectedStatsdAdapterConfig.adapterOptions);

                    return new NodeStatsDAdapter(adapterOptions);
                },
            };
            assert.doesNotThrow(() => {

                const statsdListener = new StatsdAutomationEventListener(config);
            });
        });

        it("works with statsd-client", () => {
            const config = defaultConfiguration();
            const expectedStatsdAdapterConfig = defaultStatsdAdapterConfig(config);

            class StatsdClientAdapter implements StatsdAdapter {
                private statsd: StatsdClient;

                constructor(adapterOptions: StatsdAdapterOptions) {
                    this.statsd = new StatsdClient(adapterOptions);
                }
                public increment(
                    stat: StatsdAdapterStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    this.statsd.increment(stat as string, value, tags as {[key: string]: string});
                }
                public timing(
                    stat: StatsdAdapterStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    this.statsd.timing(stat as string, value, tags as {[key: string]: string});
                }
                public gauge(
                    stat: StatsdAdapterStat,
                    value: number,
                    sampleRate?: number,
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    this.statsd.gauge(stat as string, value, tags as {[key: string]: string});
                }
                public event(
                    stat: StatsdAdapterStat,
                    text?: string,
                    options?: {},
                    tags?: StatsdAdapterTags,
                    callback?: StatsdAdapterCallback,
                ): void {
                    // Datadog specific, not supported by NodeStatsD
                }
                public close(callback: StatsdAdapterCallback): void {
                    this.statsd.close();
                }
            }

            config.statsd.adapterConfig = {
                adaptClient: (adapterOptions: StatsdAdapterOptions) => {
                    assert.deepEqual(adapterOptions, expectedStatsdAdapterConfig.adapterOptions);

                    return new StatsdClientAdapter(adapterOptions);
                },
            };
            assert.doesNotThrow(() => {

                const statsdListener = new StatsdAutomationEventListener(config);
            });
        });
    });
});
