import { AutomationClient } from "./automationClient";
import { InMemoryEventStore } from "./internal/event/InMemoryEventStore";
import { EventStore } from "./spi/event/EventStore";

////////////////////////////////////////////////////////
let es: EventStore;

function initEventStore() {
    if (!es) {
        es = new InMemoryEventStore();
    }
}

/**
 * Globally available instance of {EventStore} to be used across the automation client.
 * @type {InMemoryEventStore}
 */
export function eventStore(): EventStore {
    initEventStore();
    return es;
}

export function setEventStore(newEventStore: EventStore) {
    es = newEventStore;
}

export function automationClientInstance(): AutomationClient {
    return (global as any).__runningAutomationClient;
}
