/**
 * Describes the automations available on an automation server.
 */

import { CommandHandlerMetadata, EventHandlerMetadata, IngestorMetadata } from "../../metadata/automationMetadata";

export interface Rugs {

    name: string;
    version: string;
    team_ids: string[];
    groups?: string[];

    commands: CommandHandlerMetadata[];

    events: EventHandlerMetadata[];

    ingestors: IngestorMetadata[];

    keywords: string[];
}

export function isCommandHandlerMetadata(object: any): object is CommandHandlerMetadata {
    return object.intent || object.mapped_parameters;
}

export function isEventHandlerMetadata(object: any): object is EventHandlerMetadata {
    return object.subscriptionName && object.subscription;
}

export function isIngestorMetadata(object: any): object is EventHandlerMetadata {
    return object.route;
}
