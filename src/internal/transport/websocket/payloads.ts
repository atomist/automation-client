
import { CommandHandlerMetadata, EventHandlerMetadata } from "../../../metadata/automationMetadata";
import { Automations } from "../../metadata/metadata";

export function prepareRegistration(metadata: Automations): any {
    return convertRegExpValuesToString({
        name: metadata.name,
        version: metadata.version,
        team_ids: metadata.team_ids && metadata.team_ids.length > 0 ? metadata.team_ids : undefined,
        groups: metadata.groups && metadata.groups.length > 0 ? metadata.groups : undefined,
        commands: metadata.commands.map(prepareCommandRegistration),
        events: metadata.events.map(prepareEventRegistration),
    });
}

function convertRegExpValuesToString(data: any): any {
    const payload = JSON.stringify(data, function replacer(key, value) {
        if (value instanceof RegExp) {
            return value.source;
        } else {
            return value;
        }
    });
    return JSON.parse(payload);
}

function prepareCommandRegistration(c: CommandHandlerMetadata) {
    return {
        ...c,
        secrets: c.secrets ? c.secrets.map(s => s.path) : [],
    };
}

function prepareEventRegistration(e: EventHandlerMetadata) {
    return {
        subscription: e.subscription,
        secrets: e.secrets ? e.secrets.map(s => s.path) : [],
    };
}
