import { AutomationClient } from "./automationClient";
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
 * Globally available instance of {EventStore} to be used across the automation client.
 * @type {InMemoryEventStore}
 */
export function eventStore(): EventStore {
    return es;
}

export function setEventStore(newEventStore: EventStore) {
    es = newEventStore;
}

/**
 * Instance of running client.  It will be assigned when the client is
 * created.  Useful to access client instance variables like its
 * configuration.
 */
export let runningAutomationClient: AutomationClient;

/**
 * Since imports are read-only, provide a way to set the
 * runningAutomationClient.
 */
export function setRunningAutomationClient(ac: AutomationClient): AutomationClient {
    runningAutomationClient = ac;
    return runningAutomationClient;
}
