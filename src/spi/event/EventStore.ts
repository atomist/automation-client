/**
 * Implementations of {EventStore} can be used to store and retrieve automation node releated events.
 */
import { InMemoryEventStore } from "../../internal/event/InMemoryEventStore";
import { CommandIncoming, EventIncoming } from "../../internal/transport/TransportEventHandler";

export interface EventStore {

    recordEvent(event: EventIncoming): string;

    recordCommand(command: CommandIncoming): string;

    recordMessage(id: string, message: any): string;

    events(from?: number): any[];

    commands(from?: number): any[];

    messages(from?: number): any[];
}

let EventStore: EventStore = new InMemoryEventStore();

/**
 * Globally available instance of {EventStore} to be use across the automation node.
 * @type {InMemoryEventStore}
 */
export function eventStore() {
    return EventStore;
}

export function setEventStore(es: EventStore) {
    EventStore = es;
}
