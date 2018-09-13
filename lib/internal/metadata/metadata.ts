/**
 * Describes the automations available on an automation server.
 */

import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../../metadata/automationMetadata";

export interface Automations {

    name: string;
    version: string;
    policy: "ephemeral" | "durable";
    team_ids: string[];
    groups?: string[];

    commands: CommandHandlerMetadata[];

    events: EventHandlerMetadata[];

    ingesters: any[];

    keywords: string[];
}

export function isCommandHandlerMetadata(object: any): object is CommandHandlerMetadata {
    return object.intent || object.mapped_parameters;
}

export function isEventHandlerMetadata(object: any): object is EventHandlerMetadata {
    return object.subscriptionName && object.subscription;
}
