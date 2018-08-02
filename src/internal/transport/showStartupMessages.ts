import chalk from "chalk";
import * as _ from "lodash";
import { promisify } from "util";
import {
    BannerSection,
    Configuration,
} from "../../configuration";
import { automationClientInstance } from "../../globals";
import { Automations } from "../metadata/metadata";
import { info } from "../util/info";
import { logger } from "../util/logger";
import { RegistrationConfirmation } from "./websocket/WebSocketRequestProcessor";

/**
 * Build and log startup message, including any user banner
 * @param {RegistrationConfirmation} registration
 * @param {Automations} automations
 */
export async function showStartupMessages(configuration: Configuration,
                                          automations: Automations) {
    logger.info(await createStartupMessage(configuration, automations));
}

export async function createStartupMessage(configuration: Configuration,
                                           automations: Automations) {
    if (!automationClientInstance()) {
        return;
    }

    const msg = `
${await header(configuration, automations)}
${firstRow(configuration, automations)}
${secondRow(configuration, automations)}
${thirdRow(configuration, automations)}
${forthRow(configuration, automations)}

${handlers(configuration, automations)}

${contributors(configuration)}

${urls(configuration, automations)}

${footer()}
`;
    return msg.replace(/^\s*[\r\n]/gm, "\n");
}

async function toAscii(s: string): Promise<string> {
    const asciify = require("asciify");
    const promisified = promisify(asciify);
    try {
        return promisified(s, {font: "ogre"});
    } catch {
        return s;
    }
}

async function header(configuration: Configuration,
                      automations: Automations): Promise<string> {
    let message = configuration.name;
    const b = configuration.logging.banner.message;

    if (typeof b === "string") {
        message = chalk.green(await toAscii(b as string));
    } else if (configuration.logging.banner.enabled === true) {
        message = chalk.green(await toAscii(message));
    } else if (_.isFunction(b)) {
        // It's a function returning a banner object
        const banner = b(configuration);
        message = chalk[banner.color](banner.asciify ? await toAscii(banner.banner) : banner.banner);
    } else if (configuration.logging.banner.enabled === false) {
        return;
    }
    return message;
}

function firstRow(configuration: Configuration,
                  automations: Automations): string {
    const gitInfo = info(automations);
    let c: string = "";

    c += `  ${chalk.grey("Version")} ${automations.version}`;
    if (gitInfo.git) {
        c += `  ${chalk.grey("Sha")} ${gitInfo.git.sha.slice(0, 7)}`;
    }
    c += `  ${chalk.grey("Repository")} ${gitInfo.git.repository}`;
    return c;
}

function secondRow(configuration: Configuration,
                   automations: Automations): string {
    let c: string = "";
    if (automations.groups && automations.groups.length > 0) {
        c += `  ${chalk.grey("Groups")} all`;
    } else {
        c += `  ${chalk.grey(`${automations.team_ids.length > 1 ? "Workspaces" : "Workspace"}`)} ${automations.team_ids.join(", ")}`;
    }
    c += `  ${chalk.grey("Policy")} ${automations.policy ? automations.policy : "ephemeral"}`;
    c += `  ${chalk.grey("Cluster")} ${automationClientInstance().configuration.cluster.enabled ? "enabled" : "disabled"}`;
    return c;
}

function thirdRow(configuration: Configuration,
                  automations: Automations): string {
    let c: string = "";
    c += `  ${chalk.grey(automations.commands.length === 1 ? "Command" : "Commands")} ${automations.commands.length}`;
    c += `  ${chalk.grey(automations.events.length === 1 ? "Event" : "Events")} ${automations.events.length}`;
    c += `  ${chalk.grey(automations.ingesters.length === 1 ? "Ingester" : "Ingesters")} ${automations.ingesters.length}`;
    return c;
}

function forthRow(configuration: Configuration,
                  automations: Automations): string {
    let c: string = "";
    if ((configuration.ws as any).session) {
        c += `  ${chalk.grey("JWT")} ${(configuration.ws as any).session.jwt}`;
    }
    return c;
}

function handlers(configuration: Configuration,
                  automations: Automations): string {

    const events = automations.events
        .sort((e1, e2) => e1.name.localeCompare(e2.name))
        .map(e => `    ${e.name} ${e.description ? `(${_.upperFirst(e.description)})` : ""}`);
    const commands = automations.commands
        .sort((c1, c2) => c1.name.localeCompare(c2.name))
        .map(cmd => `    ${cmd.name} ${cmd.description ?
            `(${_.upperFirst(cmd.description)})` : ""} ${cmd.intent ? chalk.italic(cmd.intent.join(", ")) : ""}`);

    let c = "";
    if (commands.length > 0 || events.length > 0) {
        c += "\n\n";
    }
    if (commands.length > 0) {
        c += `${chalk.grey(commands.length === 1 ? "  Command" : "  Commands")}
${commands.join("\n")}`;
    }
    if (commands.length > 0 && events.length > 0) {
        c += "\n\n";
    }
    if (events.length > 0) {
        c += `${chalk.grey(events.length === 1 ? "  Event" : "  Events")}
${events.join("\n")}`;
    }
    return c;
}

function contributors(configuration: Configuration): string {
    let c: string = "";
    const contribs = configuration.logging.banner.contributors || [];
    if (contribs && contribs.length > 0) {
        c += contribs.map(cfg => {
            const section = cfg(configuration);

            if (typeof section === "string") {
                return section;
            } else {
                const bs = section as BannerSection;
                return `  ${chalk.gray(bs.title)}
    ${bs.body}`;
            }

        }).join("\n\n");
    }
    return c;
}

function urls(configuration: Configuration,
              automations: Automations): string {
    const c = automations.team_ids.map(t => {
        return `
  ${chalk.grey("Url")} ${chalk.underline(`https://app.atomist.com/workspace/${t}/automations`)}
  ${chalk.grey("GraphiQL")} ${chalk.underline(`https://app.atomist.com/workspace/${t}/graphql`)}`;
    });
    return c.join("\n\n");
}

function footer() {
    return `  ${chalk.grey("Docs")} https://docs.atomist.com  ${chalk.grey("Support")} https://join.atomist.com`;
}
