import * as appRoot from "app-root-path";
import * as os from "os";
import { Automations } from "../metadata/metadata";

export function info(automations: Automations): AutomationInfo {
    const i: AutomationInfo = {
        name: automations.name,
        version: automations.version,
    };

    if (automations.team_ids) {
        i.team_ids = automations.team_ids;
    }
    if (automations.groups) {
        i.groups = automations.groups;
    }

    try {
        const pj = require(`${appRoot.path}/package.json`);
        i.description = pj.description;
        i.license = pj.license;
        i.author = pj.author && pj.author.name ? pj.author.name : pj.author;
        i.homepage = pj.homepage;
    } catch (err) {
        // Ignore missing app package.json
    }

    try {
        const pj = require("../../../package.json");
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

    i.system = {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        platform: os.platform(),
    };

    return i;
}

export interface AutomationInfo {
    name: string;
    version: string;
    team_ids?: string[];
    groups?: string[];
    description?: string;
    license?: string;
    author?: string;
    homepage?: string;
    client?: {
        name: string;
        version: string;
    };
    git?: {
        sha: string;
        branch: string;
        repository: string;
    };
    system?: {
        hostname: string;
        type: string;
        release: string;
        platform: string;
    };
}
