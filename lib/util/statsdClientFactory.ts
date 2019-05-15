import * as os from "os";
import { Configuration } from "../configuration";

import * as HotShots from "hot-shots";

export type StatsDClientStat = string | string[];
export type StatsDClientTags = { [key: string]: string } | string[];
export type StatsDClientCallback = (err?: Error) => void;
export interface StatsDClientOptions {
    host?: string;
    port?: number;
    prefix?: string;
    suffix?: string;
    globalTags?: string[];

    // This is to support client library specific options
    additionalOptions?: {
        [key: string]: string;
    };
}

export interface StatsDClient {
    increment(stat: StatsDClientStat, value: number, sampleRate?: number, tags?: StatsDClientTags, callback?: StatsDClientCallback): void;
    timing(stat: StatsDClientStat, value: number, sampleRate?: number, tags?: StatsDClientTags, callback?: StatsDClientCallback): void;
    gauge(stat: StatsDClientStat, value: number, sampleRate?: number, tags?: StatsDClientTags, callback?: StatsDClientCallback): void;

    // TODO: This one is dogstatsd specific, as such it should be removed or made optional
    event(stat: StatsDClientStat, text?: string, options?: {}, tags?: StatsDClientTags, callback?: StatsDClientCallback): void;

    close(callback: StatsDClientCallback): void;

}

/**
 * Factory to construct StatsDClient instances.
 */
export interface StatsDClientFactory {

    /**
     * Create a StatsDClient with the given options.
     * @param {StatsDClientOptions} url
     * @returns {HttpClient}
     */
    create(clientOptions: StatsDClientOptions): StatsDClient;
}

export function defaultStatsDClientOptions(configuration: Configuration): StatsDClientOptions {

    const options: StatsDClientOptions = {
        prefix: "automation_client.",
        globalTags: [
            `atomist_name:${configuration.name.replace("@", "").replace("/", ".")}`,
            `atomist_version:${configuration.version}`,
            `atomist_environment:${configuration.environment}`,
            `atomist_application_id:${configuration.application}`,
            `atomist_process_id:${process.pid}`,
            `atomist_host:${os.hostname()}`,
        ],
    };
    return options;
}

export class HotShotStatsDClientFactory implements StatsDClientFactory {
    create(clientOptions: StatsDClientOptions): StatsDClient {
        const options: HotShots.ClientOptions = {
            prefix: clientOptions.prefix,
            host: clientOptions.host || "localhost",
            port: clientOptions.port || 8125,
            globalTags: clientOptions.globalTags,
        };

        return new HotShots.StatsD(options);
    }

}

export const DefaultStatsDClientFactory = new HotShotStatsDClientFactory();
