import * as asyncHooks from "async_hooks";

const namespaces: { [key: string]: Namespace } = {};

/**
 * Create a new namespace
 */
export function create() {
    return namespace;
}

/**
 * Set AutomationContext into the namespace of the current execution
 * @param context
 */
export function set(context: AutomationContext): void {
    namespace.set("context", context);
}

/**
 * Get AutomationContext from the namespace of the current execution
 */
export function get(): AutomationContext {
    return namespace.get("context");
}

/**
 * Context of the current command or event handler execution
 */
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

/**
 * Internal mapping from async execution ids to AutomationContext instances
 */
class Namespace {

    constructor(public readonly context = {}) {
    }

    public run<T>(fn: () => T): T {
        const id = asyncHooks.executionAsyncId();
        this.context[id] = {};
        return fn();
    }

    public set(key: string, val: any): void {
        const id = asyncHooks.executionAsyncId();
        if (this.context[id]) {
            this.context[id][key] = val;
        }
    }

    public get(key: string): any {
        const id = asyncHooks.executionAsyncId();
        if (this.context[id]) {
            return this.context[id][key];
        } else {
            return undefined;
        }
    }
}

/**
 * Registers the internal async hooks on the namespace
 * @param nsp
 */
function createHooks(nsp: Namespace): void {
    function init(asyncId, type, triggerId, resource) {
        if (nsp.context[triggerId]) {
            nsp.context[asyncId] = nsp.context[triggerId];
        }
    }

    function destroy(asyncId): void {
        delete nsp.context[asyncId];
    }

    const asyncHook = asyncHooks.createHook({ init, destroy });

    asyncHook.enable();
}

/**
 * Create a new Namespace instance of the given name
 * @param name
 */
function createNamespace(name): Namespace {
    if (namespaces[name]) {
        throw new Error(`Namespace '${name}' already exists`);
    }

    const nsp = new Namespace();
    namespaces[name] = nsp;

    createHooks(nsp);

    return nsp;
}

/**
 * Create the default namespace used by command and event handler executions
 */
const namespace = createNamespace("automation-client");
