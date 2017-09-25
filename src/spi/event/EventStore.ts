/**
 * Implementations of {EventStore} can be used to store and retrieve automation node releated events.
 */
import { CommandIncoming, EventIncoming } from "../../internal/transport/TransportEventHandler";

export interface EventStore {

    recordEvent(event: EventIncoming): string;

    recordCommand(command: CommandIncoming): string;

    recordMessage(id: string, message: any): string;

    events(from?: number): any[];

    commands(from?: number): any[];

    messages(from?: number): any[];
}
