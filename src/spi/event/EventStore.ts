/**
 * Implementations of {EventStore} can be used to store and retrieve automation node releated events.
 */
import { CommandIncoming, EventIncoming } from "../../internal/transport/TransportEventHandler";
import { InMemoryEventStore } from "../../internal/event/InMemoryEventStore";

export interface EventStore {

    recordEvent(event: EventIncoming): string;

    recordCommand(command: CommandIncoming): string;

    recordMessage(id: string, message: any): string;

    events(from?: number): any[];

    commands(from?: number): any[];

    messages(from?: number): any[];
}

let _eventStore: EventStore = new InMemoryEventStore();

/**
 * Globally available instance of {EventStore} to be use across the automation node.
 * @type {InMemoryEventStore}
 */
export function eventStore() {
    return _eventStore;
}

export function setEventStore(es: EventStore) {
    _eventStore = es;
}