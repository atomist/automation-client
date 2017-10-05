import { CommandHandlerMetadata, EventHandlerMetadata, Rugs } from "../../metadata/metadata";
import { SecretDeclaration } from "./../../metadata/metadata";

export function prepareRegistration(metadata: Rugs): any {
    // we write it to a string, in a custom way, and then parse it back.
    // is this a way of copying the object with a few modifications?

    // May I rewrite this like this?
    return convertRegExpValuesToString({
        name: metadata.name,
        version: metadata.version,
        team_ids: metadata.team_ids,
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
        secrets: c.secrets ? c.secrets.map(s => s.path) : undefined,
        // do I need to preserve the handling-undefined behavior?
    };
}
function prepareEventRegistration(e: EventHandlerMetadata) {
    return {
        subscription: e.subscription,
        secrets: e.secrets.map(s => s.path),
    };
}
