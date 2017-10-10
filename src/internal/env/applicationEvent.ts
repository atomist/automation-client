import * as appRoot from "app-root-path";
import * as exitHook from "async-exit-hook";
import axios from "axios";
import * as os from "os";
import { logger } from "../util/logger";
import { guid } from "../util/string";

// tslint:disable-next-line:no-var-requires
const git = require(`${appRoot.path}/git-info.json`);

const sha = git.sha;
const branch = git.branch;
const repo = git.repository;
const url = "https://webhook.atomist.com/atomist/application/teams";

const env = process.env.VCAP_APPLICATION ? JSON.parse(process.env.VCAP_APPLICATION) : undefined;

const payload: any = {
    git: {
        sha,
        branch,
        repo,
    },
    domain: env ? env.space_name : "local",
    pod: env ? env.instance_id : os.hostname(),
    host: env ? env.instance_id : os.hostname(),
    id: env ? env.instance_id : guid(),
};

if (env) {
    payload.data = JSON.stringify({
        cloudfoundry: process.env.VCAP_APPLICATION,
    });
}

function started(teamId: string): Promise<any> {
    return sendEvent("started", teamId);
}

function stopping(teamId: string): Promise<any> {
    return sendEvent("stopping", teamId);
}

function sendEvent(state: "stopping" | "started", teamId: string): Promise<any> {
    payload.state = state;
    payload.ts = new Date().getTime();

    logger.info("Sending application event:", JSON.stringify(payload));

    return axios.post(`${url}/${teamId}`, payload)
        .catch(err => {
            console.error(err);
        });
}

export function registerApplicationEvents(teamId: string): Promise<any> {
    // register shutdown hook
    exitHook(callback => {
        setTimeout(() => {
            stopping(teamId)
                .then(() => {
                    callback();
                })
                .catch(() => {
                    callback();
                });
        }, 1000);
    });

    // trigger application started event
    return started(teamId);
}
