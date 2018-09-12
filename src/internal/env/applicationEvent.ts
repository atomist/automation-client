import * as appRoot from "app-root-path";
import axios from "axios";
import * as stringify from "json-stringify-safe";
import * as os from "os";
import { automationClientInstance } from "../../globals";
import { logger } from "../../util/logger";
import { registerShutdownHook } from "../util/shutdown";
import { guid } from "../util/string";

const Url = "https://webhook.atomist.com/atomist/application/teams";

function started(teamId: string, event: ApplicationEvent): Promise<any> {
    return sendEvent("started", teamId, event);
}

function stopping(teamId: string, event: ApplicationEvent): Promise<any> {
    return sendEvent("stopping", teamId, event);
}

function sendEvent(state: "stopping" | "started", teamId: string, event: ApplicationEvent): Promise<any> {
    event.state = state;
    event.ts = Date.now();

    logger.debug("Sending application event:", stringify(event));

    return axios.post(`${Url}/${teamId}`, event)
        .catch(err => {
            logger.error(err);
        });
}

/**
 * Register the automation client to send application events to Atomist.
 * This is useful to show starting and stopping automation clients as part of their general lifecycle in eg Slack.
 * @param {string} workspaceId
 * @returns {Promise<any>}
 */
export function registerApplicationEvents(workspaceId: string): Promise<any> {

    // tslint:disable-next-line:no-var-requires
    const git = require(`${appRoot.path}/git-info.json`);
    const sha = git.sha;
    const branch = git.branch;
    const repo = git.repository;

    const env = process.env.VCAP_APPLICATION ? JSON.parse(process.env.VCAP_APPLICATION) : undefined;

    const event: ApplicationEvent = {
        git: {
            sha,
            branch,
            repo,
        },
        domain: automationClientInstance().configuration.environment,
        pod: env ? env.instance_id : os.hostname(),
        host: env ? env.instance_id : os.hostname(),
        id: env ? env.instance_id : guid(),
    };

    if (env) {
        event.data = JSON.stringify({
            cloudfoundry: process.env.VCAP_APPLICATION,
        });
    }

    // register shutdown hook
    registerShutdownHook(() => {
        return stopping(workspaceId, event)
            .then(() => Promise.resolve(0))
            .catch(() => Promise.resolve(1));
    });

    // trigger application started event
    return started(workspaceId, event);
}

interface ApplicationEvent {
    git: {
        sha: string;
        branch: string;
        repo: string;
    };
    domain: string;
    pod: string;
    host: string;
    id: string;
    data?: any;
    state?: string;
    ts?: number;
}
