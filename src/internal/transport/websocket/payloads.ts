import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../../../metadata/automationMetadata";
import { Automations } from "../../metadata/metadata";
import { info } from "../../util/info";

export function prepareRegistration(automations: Automations): any {
    return {
        api_version: "1",
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
        "atomist.system.hostname": i.system ? i.system.hostname : undefined,
        "atomist.system.type": i.system ? i.system.type : undefined,
        "atomist.system.release": i.system ? i.system.release : undefined,
        "atomist.system.platform": i.system ? i.system.platform : undefined,
    };
}

function prepareCommandRegistration(c: CommandHandlerMetadata) {
    return {
        name: c.name,
        description: c.description,
        tags: c.tags.map(t => t.name),
        intent: c.intent,
        auto_submit: c.auto_submit ? c.auto_submit : false,
        parameters: c.parameters,
        mapped_parameters: c.mapped_parameters,
        secrets: c.secrets ? c.secrets.map(s => ({ uri: s.uri })) : [],
    };
}

function prepareEventRegistration(e: EventHandlerMetadata) {
    return {
        subscription: e.subscription,
        secrets: e.secrets ? e.secrets.map(s => ({ uri: s.uri })) : [],
    };
}
