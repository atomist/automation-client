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
        res = chalk.blue(res);

        const urls = automations.team_ids.map(t => {
            return `
  ${chalk.grey("Url")}  ${chalk.underline(`https://app.atomist.com/workspace/${t}/automations`)}
  ${chalk.grey("GraphQL")}  ${chalk.underline(`${runningAutomationClient.configuration.endpoints.graphql}/${t}`)}`;
        });

        /* tslint:disable */
        const msg = `
${res}
  ${chalk.grey("Version")} ${automations.version}${gitInfo.git ? `  ${chalk.grey("Sha")} ${gitInfo.git.sha.slice(0, 7)}  ${chalk.grey("Repository")} ${gitInfo.git.repository}` : ""}
  ${automations.groups && automations.groups.length > 0 ? `${chalk.grey("Groups")} all` : `${chalk.grey(`${automations.team_ids.length > 1 ? "Teams" : "Team"}`)} ${automations.team_ids.join(", ")}`}  ${chalk.grey("Policy")} ${automations.policy}  ${chalk.grey("Cluster")} ${runningAutomationClient.configuration.cluster.enabled ? "enabled" : "disabled"}
  ${chalk.grey(automations.commands.length === 1 ? "Command" : "Commands")} ${automations.commands.length}  ${chalk.grey(automations.events.length === 1 ? "Event" : "Events")} ${automations.events.length}  ${chalk.grey(automations.ingesters.length === 1 ? "Ingester" : "Ingesters")} ${automations.ingesters.length}
  ${chalk.grey("JWT")}  ${registration.jwt}
${urls}
`;      /* tslint:enable */
        logger.info(msg);
    });

}
