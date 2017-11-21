import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../../../metadata/automationMetadata";
import { Automations } from "../../metadata/metadata";
import { info } from "../../util/info";

export function prepareRegistration(automations: Automations): any {
    return {
        name: automations.name,
        version: automations.version,
        policy: { name: (automations.policy ? automations.policy : "ephemeral") },
        team_ids: automations.team_ids && automations.team_ids.length > 0 ? automations.team_ids : undefined,
        groups: automations.groups && automations.groups.length > 0 ? automations.groups : undefined,
        commands: automations.commands.map(prepareCommandRegistration),
        events: automations.events.map(prepareEventRegistration),
        ingesters: automations.ingesters,
        metadata: { labels: prepareMetadata(automations) },
    };
}

function prepareMetadata(automations: Automations) {
    const i = info(automations);
    return {
        "atomist.description": i.description,
        "atomist.license": i.license,
        "atomist.author": i.author,
        "atomist.homepage": i.homepage,
        "atomist.client": i.client ? `${i.client.name}#${i.client.version}` : undefined,
        "atomist.git.sha": i.git ? i.git.sha : undefined,
        "atomist.git.branch": i.git ? i.git.branch : undefined,
        "atomist.git.repository": i.git ? i.git.repository : undefined,
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
