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
