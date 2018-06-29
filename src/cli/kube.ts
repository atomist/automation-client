/*
 * Copyright © 2018 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { execFileSync } from "child_process";
import * as stringify from "json-stringify-safe";

import { webhookBaseUrl } from "../atomistWebhook";
import {
    Configuration,
    getUserConfig,
    resolveTeamIds,
    resolveToken,
} from "../configuration";

function ghRawUrl(repo: string): string {
    return `https://raw.githubusercontent.com/atomist/${repo}/master`;
}

/**
 * Install the Atomist Kubernetes utilities in a Kubernetes cluster
 * using kubectl.
 *
 * @param argv yargs processed command-line arguments
 * @return 0 if successful, non-zero otherwise
 */
export async function cliAtomistKube(argv: any): Promise<number> {

    const ns: string = argv.namespace;
    const environment: string = (argv.environment) ? argv.environment : "kubernetes";

    const userConfig = getUserConfig();
    const token = resolveToken(userConfig);
    if (!token) {
        console.error(`No token set, try running 'atomist config' first`);
        return Promise.resolve(1);
    }
    const teamIds = resolveTeamIds(userConfig);
    if (!teamIds || teamIds.length < 1) {
        console.error(`No Atomist workspace/team IDs set, try running 'atomist config' first`);
        return Promise.resolve(1);
    }

    const k8hookBase = `${webhookBaseUrl()}/atomist/kube/teams`;
    const webhooks = `${k8hookBase}/` + teamIds.join(`,${k8hookBase}/`);
    const k8Config: Configuration = { teamIds, token, environment };
    const kubectlArgs: string[][] = [];
    if (ns) {
        k8Config.kubernetes = {
            mode: "namespace",
        };
        kubectlArgs.push(
            ["create", "secret", `--namespace=${ns}`, "generic", "k8vent", `--from-literal=environment=${environment}`,
                `--from-literal=webhooks=${webhooks}`],
            ["apply", `--namespace=${ns}`, `--filename=${ghRawUrl("k8vent")}/kube/kubectl/namespace-scoped.yaml`],
            ["create", "secret", `--namespace=${ns}`, "generic", "automation",
                `--from-literal=config=${stringify(k8Config)}`],
            ["apply", `--namespace=${ns}`, `--filename=${ghRawUrl("k8-automation")}/assets/kubectl/namespace-scoped.yaml`],
        );
    } else {
        kubectlArgs.push(
            ["apply", `--filename=${ghRawUrl("k8vent")}/kube/kubectl/cluster-wide.yaml`],
            ["create", "secret", "--namespace=k8vent", "generic", "k8vent", `--from-literal=environment=${environment}`,
                `--from-literal=webhooks=${webhooks}`],
            ["apply", `--filename=${ghRawUrl("k8-automation")}/assets/kubectl/cluster-wide.yaml`],
            ["create", "secret", "--namespace=k8-automation", "generic", "automation",
                `--from-literal=config=${stringify(k8Config)}`],
        );
    }

    for (const args of kubectlArgs) {
        try {
            execFileSync("kubectl", args, { stdio: "inherit", env: process.env });
        } catch (e) {
            console.error(`Command 'kubectl ${args.join(" ")}' failed: ${e.message}`);
            return Promise.resolve(e.status as number);
        }
    }

    return Promise.resolve(0);
}
