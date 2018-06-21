import * as _ from "lodash";
import { promisify } from "util";
import { automationClientInstance } from "../../globals";
import { CommandHandlerMetadata } from "../../metadata/automationMetadata";
import { Automations } from "../metadata/metadata";
import { info } from "../util/info";
import { logger } from "../util/logger";
import { OnLogName } from "./OnLog";
import { RegistrationConfirmation } from "./websocket/WebSocketRequestProcessor";

const chalk = require("chalk");

/**
 * Build and log startup message, including any user banner
 * @param {RegistrationConfirmation} registration
 * @param {Automations} automations
 */
export async function showStartupMessages(registration: RegistrationConfirmation,
                                          automations: Automations) {

    if (!automationClientInstance()) {
        return;
    }

    let message = automations.name;
    const b = _.get(automationClientInstance(), "configuration.logging.banner");
    if (typeof b === "string") {
        message = chalk.green(await toAscii(b as string));
    } else if (b === true) {
        message = chalk.green(await toAscii(message));
    } else if (_.isFunction(b)) {
        // It's a function returning a banner object
        const banner = b(registration);
        message = chalk[banner.color](banner.asciify ? await toAscii(banner.banner) : banner.banner);
    } else if (b === false) {
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
        .map(c => `    ${c.name} ${c.description ? `(${_.upperFirst(c.description)})` : ""}`);
    const events = automations.events
        // filter internal atomist log event handler
        .filter(e => e.name !== OnLogName)
        .sort((e1, e2) => e1.name.localeCompare(e2.name))
        .map(e => `    ${e.name} ${e.description ? `(${_.upperFirst(e.description)})` : ""}`);

    /* tslint:disable */
    const msg = `
${message}
  ${chalk.grey("Version")} ${automations.version}${gitInfo.git ? `  ${chalk.grey("Sha")} ${gitInfo.git.sha.slice(0, 7)}  ${chalk.grey("Repository")} ${gitInfo.git.repository}` : ""}
  ${automations.groups && automations.groups.length > 0 ? `${chalk.grey("Groups")} all` : `${chalk.grey(`${automations.team_ids.length > 1 ? "Teams" : "Team"}`)} ${automations.team_ids.join(", ")}`}  ${chalk.grey("Policy")} ${automations.policy ? automations.policy : "ephemeral"}  ${chalk.grey("Cluster")} ${automationClientInstance().configuration.cluster.enabled ? "enabled" : "disabled"}
  ${chalk.grey(commands.length === 1 ? "Command" : "Commands")} ${commands.length}  ${chalk.grey(events.length === 1 ? "Event" : "Events")} ${events.length}  ${chalk.grey(automations.ingesters.length === 1 ? "Ingester" : "Ingesters")} ${automations.ingesters.length}
  ${chalk.grey("JWT")} ${registration.jwt}${handlers(commands, events)}
${urls.join("\n")}
${urls.length > 0 ? "\n" : ""}  ${chalk.grey("Docs")} https://docs.atomist.com  ${chalk.grey("Support")} https://join.atomist.com
`;
    /* tslint:enable */
    logger.info(msg);
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

function handlers(commands: string[], events: string[]): string {
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
