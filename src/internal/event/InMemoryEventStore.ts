import { LRUMap } from "lru_map";
import { EventStore } from "../../spi/event/EventStore";
import { CommandIncoming, EventIncoming } from "../transport/RequestProcessor";
import { guid, hideString } from "../util/string";

/**
 * Simple {EventStore} implementation that stores events in memory.
 */
export class InMemoryEventStore implements EventStore {

    private eventCache: LRUMap<CacheKey, EventIncoming>;
    private commandCache: LRUMap<CacheKey, CommandIncoming>;
    private messageCache: LRUMap<CacheKey, any>;

    //                         5 mins for 3 hours
    private eventSer = new RRD(60 * 5, 12 * 3);
    private commandSer = new RRD(60 * 5, 12 * 3);

    constructor() {
        this.eventCache = new LRUMap<CacheKey, EventIncoming>(100);
        this.commandCache = new LRUMap<CacheKey, CommandIncoming>(100);
        this.messageCache = new LRUMap<CacheKey, any>(100);
    }

    public recordEvent(event: EventIncoming) {
        const id = event.extensions.correlation_id ? event.extensions.correlation_id : guid();
        this.eventCache.set({guid: id, ts: new Date().getTime() }, event);
        this.eventSer.update(1);
        return id;
    }

    public recordCommand(command: CommandIncoming) {
        const id = command.corrid ? command.corrid : guid();
        this.commandCache.set({guid: id, ts: new Date().getTime() }, command);
        this.commandSer.update(1);
        return id;
    }

    public recordMessage(id: string, message: any) {
        this.messageCache.set({ guid: id, ts: new Date().getTime() }, message);
        return id;
    }

    public events(from: number = -1): any[] {
        const entries: any[] = [];
        this.eventCache.forEach((v, k) => k.ts > from ? entries.push({key: k, value: hideSecrets(v)}) : null);
        return entries;
    }

    public eventSeries(): [number[], number[]] {
        const buckets = this.eventSer.fetch().filter(b => b.ts);
        return [buckets.map(b => b.value), buckets.map(b => b.ts)];
    }

    public commands(from: number = -1): any[] {
        const entries: any[] = [];
        this.commandCache.forEach((v, k) => k.ts > from ? entries.push({key: k, value: hideSecrets(v)}) : null);
        return entries;
    }

    public commandSeries(): [number[], number[]] {
        const buckets = this.commandSer.fetch().filter(b => b.ts);
        return [buckets.map(b => b.value), buckets.map(b => b.ts)];
    }

    public messages(from: number = -1): any[] {
        const entries: any[] = [];
        this.messageCache.forEach((v, k) => k.ts > from ? entries.push({key: k, value: v}) : null);
        return entries;
    }
}

function hideSecrets(event: EventIncoming | CommandIncoming) {
    event.secrets = event.secrets
        ? event.secrets.map(s => ({ name: s.name, value: hideString(s.value) })) : undefined;
    return event;
}

interface CacheKey {
    guid: string;   
    ts: number;
}

class Count {

    private value: number = 0;

    public update(data: number): number {
        this.value++;
        return this.value;
    }

    public result() {
        const value = this.value;
        this.value = 0;
        return value;
    }
}

class RRD {

    private buckets: any[];
    private interval: any;
    private index: number;
    private iid: any;
    private dataFunc = new Count();

    constructor(interval, count) {
        this.buckets = new Array(count).fill(0);
        this.buckets[0] = { ts: Math.floor( Date.now() / 1000 ), value: 0 };
        this.index = 1;
        this.interval = interval * 1000;
        this.iid = setInterval( this.increment.bind( this ), this.interval );
    }

    public increment() {
        if ( this.index < this.buckets.length ) {
            this.buckets[ this.index ] = { ts: Math.floor( Date.now() / 1000 ), value: this.dataFunc.result() };
            this.index += 1;
        } else {
            this.buckets.push( { ts: Math.floor( Date.now() / 1000 ), value: this.dataFunc.result() } );
            this.buckets.shift();
        }
    }

    public update(data: any) {
        this.buckets[ this.index ] = { ts: Math.floor( Date.now() / 1000 ), value: this.dataFunc.update(data) };
    }

    public fetch(): any[] {
        return this.buckets;
    }
}
