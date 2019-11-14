import { EventStore } from "../../spi/event/EventStore";
import {
    CommandIncoming,
    EventIncoming,
} from "../transport/RequestProcessor";
import { guid } from "../util/string";

export class NoOpEventStore implements EventStore {

    public commandSeries(): [number[], number[]] {
        return [[], []];
    }

    public commands(from?: number): any[] {
        return [];
    }

    public eventSeries(): [number[], number[]] {
        return [[], []];
    }

    public events(from?: number): any[] {
        return [];
    }

    public messages(from?: number): any[] {
        return [];
    }

    public recordCommand(command: CommandIncoming): string {
        return command.correlation_id ? command.correlation_id : guid();
        return "";
    }

    public recordEvent(event: EventIncoming): string {
        return event.extensions.correlation_id ? event.extensions.correlation_id : guid();
    }

    public recordMessage(id: string, correlationId: string, message: any): string {
        return id;
    }
}
