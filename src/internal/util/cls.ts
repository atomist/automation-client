import {
    createNamespace,
    getNamespace,
    Namespace,
} from "continuation-local-storage";

// create the local storage namespace
createNamespace("automation-client");

export function init(): Namespace {
    return getNamespace("automation-client");
}

export function set(context: AutomationContext) {
    if (init().active) {
        init().set("context", context);
    }
}

export function get(): AutomationContext {
    if (init().active) {
        return init().get("context");
    }
    return null;
}

export interface AutomationContext {

    correlationId: string;
    workspaceId: string;
    workspaceName: string;
    operation: string;
    name: string;
    version: string;
    invocationId: string;
    ts: number;

}
