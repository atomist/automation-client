import * as _ from "lodash";
import { runningAutomationClient } from "../../automationClient";
import { Automations } from "../metadata/metadata";
import { info } from "../util/info";
import { logger } from "../util/logger";
import { RegistrationConfirmation } from "./websocket/WebSocketRequestProcessor";

export function banner(registration: RegistrationConfirmation,
                       automations: Automations) {

    if (!runningAutomationClient) {
        return;
    }

    let message = automations.name;
    const b = _.get(runningAutomationClient, "configuration.logging.banner");
    if (typeof b === "string") {
        message = b as string;
    } else if (b === false) {
        return;
    }

    const asciify = require("asciify");
    asciify(message, { font: "ogre" }, (err, res) => {
        const gitInfo = info(automations);

        const chalk = require("chalk");
        res = chalk.green(res);

        const urls = automations.team_ids.map(t => {
            return `
  ${chalk.grey("Url")} ${chalk.underline(`https://app.atomist.com/workspace/${t}/automations`)}
  ${chalk.grey("GraphiQL")} ${chalk.underline(`https://app.atomist.com/workspace/${t}/graphql`)}`;
        });

        const commands = automations.commands
            .sort((c1, c2) => c1.name.localeCompare(c2.name))
            .map(c => `    ${c.name} ${c.description ? `(${c.description})` : ""}`);
        const events = automations.events
            .sort((e1, e2) => e1.name.localeCompare(e2.name))
            .map(e => `    ${e.name} ${e.description ? `(${e.description})` : ""}`);

        /* tslint:disable */
        const msg = `
${res}
  ${chalk.grey("Version")} ${automations.version}${gitInfo.git ? `  ${chalk.grey("Sha")} ${gitInfo.git.sha.slice(0, 7)}  ${chalk.grey("Repository")} ${gitInfo.git.repository}` : ""}
  ${automations.groups && automations.groups.length > 0 ? `${chalk.grey("Groups")} all` : `${chalk.grey(`${automations.team_ids.length > 1 ? "Teams" : "Team"}`)} ${automations.team_ids.join(", ")}`}  ${chalk.grey("Policy")} ${automations.policy ? automations.policy : "ephemeral"}  ${chalk.grey("Cluster")} ${runningAutomationClient.configuration.cluster.enabled ? "enabled" : "disabled"}
  ${chalk.grey(commands.length === 1 ? "Command" : "Commands")} ${commands.length}  ${chalk.grey(events.length === 1 ? "Event" : "Events")} ${events.length}  ${chalk.grey(automations.ingesters.length === 1 ? "Ingester" : "Ingesters")} ${automations.ingesters.length}
  ${chalk.grey("JWT")} ${registration.jwt}
  ${commands.length > 0 ? `
  ${chalk.grey(commands.length === 1 ? "Command" : "Commands")}
${commands.join("\n")}` : ""}
  ${events.length > 0 ? `
  ${chalk.grey(events.length === 1 ? "Event" : "Events")}
${events.join("\n")}` : ""}
${urls.join("\n")}
${urls.length > 0 ? "\n": ""}  ${chalk.grey("Docs")} https://docs.atomist.com  ${chalk.grey("Support")} https://join.atomist.com
`;      /* tslint:enable */
        logger.info(msg);
    });

}
