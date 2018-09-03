/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import axios, { AxiosPromise } from "axios";
import * as stringify from "json-stringify-safe";
import { WrapOptions } from "retry";
import {
    DefaultRetryOptions,
    doWithRetry,
} from "./util/retry";

/**
 * Scheme and hostname (authority) of the Atomist webhook URL.
 */
export function webhookBaseUrl(): string {
    return process.env.ATOMIST_WEBHOOK_BASEURL || "https://webhook.atomist.com";
}

/**
 * Atomist webhooks supported by these functions.
 */
export type AtomistWebhookType = "application" | "build" | "link-image";

/**
 * Post payload to the Atomist webhook URL.  It will retry
 * several times.
 *
 * @param webhook type of webhook
 * @param payload object to post
 * @param workspaceId Atomist team ID
 * @param retryOptions change default retry options
 * @return response of post operation
 */
export function postAtomistWebhook(
    webhook: AtomistWebhookType,
    payload: any,
    workspaceId: string,
    retryOptions: WrapOptions = DefaultRetryOptions,
): AxiosPromise<any> {

    const url = `${webhookBaseUrl()}/atomist/${webhook}/teams/${workspaceId}`;
    const desc = `posting '${stringify(payload)}' to '${url}'`;
    return doWithRetry(() => axios.post(url, payload), desc, retryOptions);
}

/**
 * Atomist generic build webhook payload repository structure.
 */
export interface AtomistBuildRepository {
    owner_name: string;
    name: string;
}

/**
 * Atomist generic build trigger types.
 */
export type AtomistBuildType = "cron" | "pull_request" | "push" | "tag" | "manual";

/**
 * Atomist generic build statuses.
 */
export type AtomistBuildStatus = "started" | "failed" | "error" | "passed" | "canceled";

/**
 * Atomist generic build post payload structure.
 */
export interface AtomistBuild {
    repository: AtomistBuildRepository;
    number?: number;
    name?: string;
    compare_url?: string;
    type: AtomistBuildType;
    pull_request_number?: number;
    build_url?: string;
    status: AtomistBuildStatus;
    id?: string;
    commit: string;
    tag?: string;
    branch?: string;
    provider?: string;
}

/**
 * Atomist link image commit information structure.
 */
export interface AtomistLinkImageGit {
    owner: string;
    repo: string;
    sha: string;
}

/**
 * Atomist link image image information structure.
 */
export interface AtomistLinkImageDocker {
    image: string;
}

/**
 * Atomist link image post payload structure.
 */
export interface AtomistLinkImage {
    git: AtomistLinkImageGit;
    docker: AtomistLinkImageDocker;
    type: "link-image";
}
