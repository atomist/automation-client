import { createNamespace, getNamespace } from "continuation-local-storage";

// create the local storage namespace
createNamespace("automation-client");

export function init() {
    return getNamespace("automation-client");
}

export function set(context: AutomationContext) {
    init().set("context", context);
}

export function get(): AutomationContext {
    return init().get("context");
}

export interface AutomationContext {

    correlationId: string;
    teamId: string;
    operation: string;
    name: string;
    version: string;
    invocationId: string;
}
