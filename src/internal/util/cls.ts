import * as asyncHooks from "async_hooks";

const namespaces = {};

export function create() {
    return namespace;
}

export function set(context: AutomationContext) {
    namespace.set("context", context);
}

export function get(): AutomationContext {
    return namespace.get("context");
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

class Namespace {

    constructor(private readonly context = {}) {
    }

    public run(fn) {
        const id = asyncHooks.executionAsyncId();
        this.context[id] = {};
        fn();
    }

    public set(key, val) {
        const id = asyncHooks.executionAsyncId();
        if (this.context[id]) {
            this.context[id][key] = val;
        }
    }

    public get(key) {
        const id = asyncHooks.executionAsyncId();
        if (this.context[id]) {
            return this.context[id][key];
        } else {
            return undefined;
        }
    }
}

function createHooks(nsp) {
    function init(asyncId, type, triggerId, resource) {
        if (nsp.context[triggerId]) {
            nsp.context[asyncId] = nsp.context[triggerId];
        }
    }

    function destroy(asyncId) {
        delete nsp.context[asyncId];
    }

    const asyncHook = asyncHooks.createHook({ init, destroy });

    asyncHook.enable();
}

function createNamespace(name) {
    if (namespaces[name]) {
        throw new Error(`Namespace '${name}' already exists`);
    }

    const nsp = new Namespace();
    namespaces[name] = nsp;

    createHooks(nsp);

    return nsp;
}

const namespace = createNamespace("automation-client");
