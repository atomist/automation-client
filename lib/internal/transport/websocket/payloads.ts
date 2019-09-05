import * as _ from "lodash";
import { automationClientInstance } from "../../../globals";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../../../metadata/automationMetadata";
import { Automations } from "../../metadata/metadata";
import { info } from "../../util/info";
import { toStringArray } from "../../util/string";

export function prepareRegistration(automations: Automations, options: any = {}, metadata: any = {}): any {
    return {
        api_version: "1",
        name: automations.name,
        version: automations.version,
        policy: { name: (automations.policy ? automations.policy : "ephemeral") },
        team_ids: automations.team_ids && automations.team_ids.length > 0 ? automations.team_ids : undefined,
        groups: automations.groups && automations.groups.length > 0 ? automations.groups : undefined,
        commands: automations.commands.filter(c => c.expose !== false).map(prepareCommandRegistration),
        events: automations.events.filter(e => e.expose !== false).map(prepareEventRegistration),
        ingesters: automations.ingesters,
        metadata: { labels: prepareMetadata(automations, metadata) },
        ...options,
    };
}

function prepareMetadata(automations: Automations, metadata: any) {
    const i = info(automations);
    const cfg = automationClientInstance().configuration;
    return {
        "atomist.version": cfg.version,
        "atomist.description": i.description,
        "atomist.license": i.license,
        "atomist.author": i.author,
        "atomist.homepage": i.homepage,
        "atomist.client": i.client ? `${i.client.name}:${i.client.version}` : undefined,
        "atomist.git.sha": i.git ? i.git.sha : undefined,
        "atomist.git.branch": i.git ? i.git.branch : undefined,
        "atomist.git.repository": i.git ? i.git.repository : undefined,
        "atomist.system.hostname": i.system ? i.system.hostname : undefined,
        "atomist.system.type": i.system ? i.system.type : undefined,
        "atomist.system.release": i.system ? i.system.release : undefined,
        "atomist.system.platform": i.system ? i.system.platform : undefined,
        "atomist.environment": cfg.environment,
        "atomist.cluster": cfg.cluster ? `${cfg.cluster.enabled}` : "false",
        "atomist.policy": cfg.policy,
        ...metadata,
    };
}

function prepareCommandRegistration(c: CommandHandlerMetadata) {
    return {
        name: c.name,
        description: c.description,
        tags: _.uniq(typeof c.tags === "string" ? [c.tags] : (c.tags || []).map(t => t.name)),
        intent: _.uniq(toStringArray(c.intent)),
        auto_submit: c.auto_submit ? c.auto_submit : false,
        question: c.question,
        parameters: _.uniqBy(c.parameters, "name"),
        mapped_parameters: _.uniqBy(c.mapped_parameters, "name"),
        secrets: _.uniqBy(c.secrets ? c.secrets.map(s => ({ uri: s.uri })) : [], "uri"),
    };
}

function prepareEventRegistration(e: EventHandlerMetadata) {
    return {
        subscription: e.subscription,
        secrets: _.uniqBy(e.secrets ? e.secrets.map(s => ({ uri: s.uri })) : [], "uri"),
    };
}
