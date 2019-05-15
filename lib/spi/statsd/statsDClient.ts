import * as HotShots from "hot-shots";
import {
    StatsD,
    StatsDConfig,
} from "node-statsd";
import * as os from "os";
import { Configuration } from "../../configuration";

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

    event?(stat: StatsDClientStat, text?: string, options?: {}, tags?: StatsDClientTags, callback?: StatsDClientCallback): void;

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

    public create(clientOptions: StatsDClientOptions): StatsDClient {
        const options: HotShots.ClientOptions = {
            prefix: clientOptions.prefix,
            host: clientOptions.host || "localhost",
            port: clientOptions.port || 8125,
            globalTags: clientOptions.globalTags,
        };

        return new HotShots.StatsD(options);
    }

}

export class NodeStatsDClientFactory implements StatsDClientFactory {

    public create(clientOptions: StatsDClientOptions): StatsDClient {
        const nodeStatsDClientOptions: StatsDConfig = {
            host: clientOptions.host,
            port: clientOptions.port,
            prefix: clientOptions.prefix,
            suffix: clientOptions.suffix,
            global_tags: clientOptions.globalTags,
        };
        return new NodeStatsDClient(nodeStatsDClientOptions);
    }
}

class NodeStatsDClient implements StatsDClient {
    private statsd: StatsD;

    constructor(clientOptions: StatsDClientOptions) {
        this.statsd = new StatsD(clientOptions);
    }

    public increment(
        stat: StatsDClientStat,
        value: number,
        sampleRate?: number,
        tags?: StatsDClientTags,
        callback?: StatsDClientCallback,
    ): void {
        this.statsd.increment(stat, value, sampleRate, tags as string[], callback);
    }

    public timing(
        stat: StatsDClientStat,
        value: number,
        sampleRate?: number,
        tags?: StatsDClientTags,
        callback?: StatsDClientCallback,
    ): void {
        this.statsd.timing(stat, value, sampleRate, tags as string[], callback);
    }

    public gauge(
        stat: StatsDClientStat,
        value: number,
        sampleRate?: number,
        tags?: StatsDClientTags,
        callback?: StatsDClientCallback,
    ): void {
        this.statsd.gauge(stat, value, sampleRate, tags as string[], callback);
    }

    public close(callback: StatsDClientCallback): void {
        this.statsd.close();
    }
}

export const DefaultStatsDClientFactory = new HotShotStatsDClientFactory();
