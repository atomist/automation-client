import * as ShutdownHook from "shutdown-hook";
import { InMemoryEventStore } from "./internal/event/InMemoryEventStore";
import { EventStore } from "./spi/event/EventStore";

////////////////////////////////////////////////////////
let jwtT: string = "";

export function setJwtToken(token: string) {
    jwtT = token;
}

export function jwtToken() {
    return jwtT;
}
////////////////////////////////////////////////////////
const sdh = new ShutdownHook();
sdh.register();

export function shutdownHook() {
    return sdh;
}

////////////////////////////////////////////////////////
let es: EventStore = new InMemoryEventStore();

/**
 * Globally available instance of {EventStore} to be use across the automation client.
 * @type {InMemoryEventStore}
 */
export function eventStore(): EventStore {
    return es;
}

export function setEventStore(newEventStore: EventStore) {
    es = newEventStore;
}
