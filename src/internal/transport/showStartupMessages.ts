import chalk from "chalk";
import * as _ from "lodash";
import { promisify } from "util";
import { Configuration } from "../../configuration";
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

    const gitInfo = info(automations);
    const urls = automations.team_ids.map(t => {
        return `
  ${chalk.grey("Url")} ${chalk.underline(`https://app.atomist.com/workspace/${t}/automations`)}
  ${chalk.grey("GraphiQL")} ${chalk.underline(`https://app.atomist.com/workspace/${t}/graphql`)}`;
    });

    const commands = automations.commands
        .sort((c1, c2) => c1.name.localeCompare(c2.name))
        .map(c => `    ${c.name} ${c.description ? `(${_.upperFirst(c.description)})` : ""} ${c.intent ? c.intent.join(", ") : ""}`);
    const events = automations.events
        .sort((e1, e2) => e1.name.localeCompare(e2.name))
        .map(e => `    ${e.name} ${e.description ? `(${_.upperFirst(e.description)})` : ""}`);

    /* tslint:disable */
    const msg = `
${message}
  ${chalk.grey("Version")} ${automations.version}${gitInfo.git ? `  ${chalk.grey("Sha")} ${gitInfo.git.sha.slice(0, 7)}  ${chalk.grey("Repository")} ${gitInfo.git.repository}` : ""}
  ${automations.groups && automations.groups.length > 0 ? `${chalk.grey("Groups")} all` : `${chalk.grey(`${automations.team_ids.length > 1 ? "Teams" : "Team"}`)} ${automations.team_ids.join(", ")}`}  ${chalk.grey("Policy")} ${automations.policy ? automations.policy : "ephemeral"}  ${chalk.grey("Cluster")} ${automationClientInstance().configuration.cluster.enabled ? "enabled" : "disabled"}
  ${chalk.grey(commands.length === 1 ? "Command" : "Commands")} ${commands.length}  ${chalk.grey(events.length === 1 ? "Event" : "Events")} ${events.length}  ${chalk.grey(automations.ingesters.length === 1 ? "Ingester" : "Ingesters")} ${automations.ingesters.length}
  ${chalk.grey("JWT")} ${(configuration.ws as any).session ? (configuration.ws as any).session.jwt : "n/a"}${handlers(commands, events, configuration)}
${urls.join("\n")}
${urls.length > 0 ? "\n" : ""}  ${chalk.grey("Docs")} https://docs.atomist.com  ${chalk.grey("Support")} https://join.atomist.com
`;
    /* tslint:enable */
    return msg;
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

function handlers(commands: string[],
                  events: string[],
                  configuration: Configuration): string {
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

    const contributors = configuration.logging.banner.contributors || [];
    if (contributors && contributors.length > 0) {
        if (commands.length > 0 || events.length > 0) {
            c += "\n\n";
        }
        c += contributors.map(cfg => cfg(configuration)).join("\n\n");
    }
    return c;
}
