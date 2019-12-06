import { AutomationClient } from "./automationClient";
import { NoOpEventStore } from "./internal/event/NoOpEventStore";
import { EventStore } from "./spi/event/EventStore";

////////////////////////////////////////////////////////
let es: EventStore;

function initEventStore(): void {
    if (!es) {
        es = new NoOpEventStore();
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

export function setEventStore(newEventStore: EventStore): void {
    es = newEventStore;
}

export function automationClientInstance(): AutomationClient {
    return (global as any).__runningAutomationClient;
}
