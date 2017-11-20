import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../../../metadata/automationMetadata";
import { Automations } from "../../metadata/metadata";

export function prepareRegistration(metadata: Automations): any {
    return {
        name: metadata.name,
        version: metadata.version,
        policy: { name: (metadata.policy ? metadata.policy : "ephemeral") },
        team_ids: metadata.team_ids && metadata.team_ids.length > 0 ? metadata.team_ids : undefined,
        groups: metadata.groups && metadata.groups.length > 0 ? metadata.groups : undefined,
        commands: metadata.commands.map(prepareCommandRegistration),
        events: metadata.events.map(prepareEventRegistration),
        ingesters: metadata.ingesters,
    };
}

function prepareCommandRegistration(c: CommandHandlerMetadata) {
    return {
        name: c.name,
        description: c.description,
        tags: c.tags,
        intent: c.intent,
        parameters: c.parameters,
        mapped_parameters: c.mapped_parameters,
        secrets: c.secrets ? c.secrets.map(s => s.path) : [],
    };
}

function prepareEventRegistration(e: EventHandlerMetadata) {
    return {
        subscription: e.subscription,
        secrets: e.secrets ? e.secrets.map(s => s.path) : [],
    };
}
