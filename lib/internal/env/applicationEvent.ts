import * as appRoot from "app-root-path";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Configuration } from "../../configuration";
import { HttpMethod } from "../../spi/http/httpClient";
import { logger } from "../../util/logger";
import { registerShutdownHook } from "../util/shutdown";
import { guid } from "../util/string";

const Url = "https://webhook.atomist.com/atomist/application/teams";

function started(teamId: string,
                 event: ApplicationEvent,
                 configuration: Configuration): Promise<void> {
    return sendEvent("started", teamId, event, configuration);
}

function stopping(teamId: string,
                  event: ApplicationEvent,
                  configuration: Configuration): Promise<void> {
    return sendEvent("stopping", teamId, event, configuration);
}

async function sendEvent(state: "stopping" | "started",
                         teamId: string,
                         event: ApplicationEvent,
                         configuration: Configuration): Promise<void> {
    event.state = state;
    event.ts = Date.now();

    logger.debug("Sending application event: %j", event);

    try {
        await configuration.http.client.factory.create(Url).exchange(
            `${Url}/${teamId}`,
            {
                method: HttpMethod.Post,
                body: event,
            });
    } catch (e) {
        logger.error("Failed to send application event: %s", e.message);
        logger.debug(e);
    }
}

/**
 * Register the automation client to send application events to Atomist.
 * This is useful to show starting and stopping automation clients as part of their general lifecycle in eg Slack.
 */
export async function registerApplicationEvents(workspaceId: string,
                                                configuration: Configuration): Promise<void> {
    const gitInfo = path.join(appRoot.path, "git-info.json");
    if (!fs.existsSync(gitInfo)) {
        return;
    }
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
        domain: configuration.environment,
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
    registerShutdownHook(
        () => stopping(workspaceId, event, configuration)
            .then(() => Promise.resolve(0), () => Promise.resolve(1)),
        2000,
        "application stopping event");

    // trigger application started event
    await started(workspaceId, event, configuration);
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
