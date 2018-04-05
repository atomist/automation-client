import { CommandIncoming, EventIncoming } from "../../internal/transport/RequestProcessor";

/**
 * Implementations of {EventStore} can be used to store and retrieve automation node releated events.
 */
export interface EventStore {

    recordEvent(event: EventIncoming): string;

    recordCommand(command: CommandIncoming): string;

    recordMessage(id: string, correlationId: string, message: any): string;

    events(from?: number): any[];

    eventSeries(): [number[], number[]];

    commands(from?: number): any[];

    commandSeries(): [number[], number[]];

    messages(from?: number): any[];
}
