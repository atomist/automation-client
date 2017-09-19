import { LRUMap } from "lru_map";
import { EventStore } from "../../spi/event/EventStore";
import { CommandIncoming, EventIncoming } from "../transport/AutomationEventListener";
import { guid, hideString } from "../util/string";

/**
 * Simple {EventStore} implementation that stores events in memory.
 */
export class InMemoryEventStore implements EventStore {

    private eventCache: LRUMap<CacheKey, EventIncoming>;
    private commandCache: LRUMap<CacheKey, CommandIncoming>;
    private messageCache: LRUMap<CacheKey, any>;

    constructor() {
        this.eventCache = new LRUMap<CacheKey, EventIncoming>(100);
        this.commandCache = new LRUMap<CacheKey, CommandIncoming>(100);
        this.messageCache = new LRUMap<CacheKey, any>(100);
    }

    public recordEvent(event: EventIncoming) {
        const id = event.extensions.correlation_id ? event.extensions.correlation_id : guid();
        this.eventCache.set({guid: id, ts: new Date().getTime() }, event);
        return id;
    }

    public recordCommand(command: CommandIncoming) {
        const id = command.corrid ? command.corrid : guid();
        this.commandCache.set({guid: id, ts: new Date().getTime() }, command);
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

    public commands(from: number = -1): any[] {
        const entries: any[] = [];
        this.commandCache.forEach((v, k) => k.ts > from ? entries.push({key: k, value: hideSecrets(v)}) : null);
        return entries;
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

/**
 * Globally available instance of {EventStore} to be use across the automation node.
 * @type {InMemoryEventStore}
 */
export const eventStore = new InMemoryEventStore();
