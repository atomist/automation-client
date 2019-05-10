import * as os from "os";
import { Configuration } from "../configuration";

import {ClientOptions, StatsD} from "hot-shots"

export type StatsdAdapterStat = string | string[];
export type StatsdAdapterTags = { [key: string]: string } | string[];
export type StatsdAdapterCallback = (err?: Error) => void;
export interface StatsdAdapterOptions {
    prefix?: string;
    suffix?: string;
    globalTags?: string[];

    // This is to support client library specific options
    additionalOptions?: {
        [key: string]: string;
    };
}

export interface StatsdAdapter {
    increment(stat: StatsdAdapterStat, value: number, sampleRate?: number, tags?: StatsdAdapterTags, callback?: StatsdAdapterCallback): void;
    timing(stat: StatsdAdapterStat, value: number, sampleRate?: number, tags?: StatsdAdapterTags, callback?: StatsdAdapterCallback): void;
    gauge(stat: StatsdAdapterStat, value: number, sampleRate?: number, tags?: StatsdAdapterTags, callback?: StatsdAdapterCallback): void;

    // TODO: This one is dogstatsd specific, as such it should be removed or made optional
    event(stat: StatsdAdapterStat, text?: string, options?: {}, tags?: StatsdAdapterTags, callback?: StatsdAdapterCallback): void;

    close(callback: StatsdAdapterCallback): void;

}

export interface StatsdAdapterConfig {
    adapterOptions?: StatsdAdapterOptions;
    adaptClient?(adapterOptions: StatsdAdapterOptions): StatsdAdapter;
}

export function defaultStatsdAdapterConfig(configuration: Configuration): StatsdAdapterConfig {
    return {
        adapterOptions: {
            prefix: "automation_client.",
            globalTags: [
                `atomist_name:${configuration.name.replace("@", "").replace("/", ".")}`,
                `atomist_version:${configuration.version}`,
                `atomist_environment:${configuration.environment}`,
                `atomist_application_id:${configuration.application}`,
                `atomist_process_id:${process.pid}`,
                `atomist_host:${os.hostname()}`,
            ],
        },
        adaptClient(adapterOptions: StatsdAdapterOptions): StatsdAdapter {
            const options: ClientOptions = {
                prefix: adapterOptions.prefix,
                host: configuration.statsd.host || "localhost",
                port: configuration.statsd.port || 8125,
                globalTags: adapterOptions.globalTags,
            };

            const client = new StatsD(options);

            return client;
        },

    };
}
