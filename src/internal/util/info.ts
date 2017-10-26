import * as appRoot from "app-root-path";
import { Automations } from "../metadata/metadata";

export function info(automations: Automations): any {
    const i: any = {};

    i.name = automations.name;
    i.version = automations.version;
    if (automations.team_ids) {
        i.team_ids = automations.team_ids;
    }
    if (automations.groups) {
        i.groups = automations.groups;
    }

    try {
        const pj = require("../../package.json");
        i.client = {
            name: pj.name,
            version: pj.version,
        };
    } catch (err) {
        // Ignore the missing package.json
    }

    try {
        // see if we can load git-info.json from the root of the project
        const gi = require(`${appRoot.path}/git-info.json`);
        i.git = {
            ...gi,
        };
    } catch (err) {
        // Ignore the missing git-info.json
    }

    return i;
}
