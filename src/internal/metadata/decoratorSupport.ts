import {
    Group,
    ParameterType,
} from "../../metadata/automationMetadata";
import {
    registerCommand,
    registerEvent,
} from "../../scan";

export interface BaseParameter {
    readonly pattern?: RegExp;
    readonly required?: boolean;
    readonly description?: string;
    readonly displayName?: string;
    readonly validInput?: string;
    readonly displayable?: boolean;
    readonly maxLength?: number;
    readonly minLength?: number;
    readonly type?: ParameterType;
    readonly order?: number;
    readonly group?: Group;
}

export interface Parameter extends BaseParameter {
    readonly name: string;
    // readonly default?: string;
}

function set_metadata(obj: any, key: string, value: any) {
    let target = obj;
    if (obj.prototype !== undefined) {
        // should only be true for class Decorators
        target = obj.prototype;
    }
    Object.defineProperty(target, key,
        {
            value,
            writable: false,
            enumerable: false,
            configurable: false,
        });
}

function get_metadata(obj: any, key: string) {
    if (obj == null) {
        return null;
    }
    let desc = Object.getOwnPropertyDescriptor(obj, key);
    if ((desc == null || desc === undefined) && (Object.getPrototypeOf(obj) !== undefined)) {
        desc = get_metadata(Object.getPrototypeOf(obj), key);
    }
    if (desc != null && desc !== undefined) {
        return desc.value;
    }
    return null;
}

export function declareParameter(target: any, propertyKey: string, details: BaseParameter) {
    let params: any[] = get_metadata(target, "__parameters");
    if (params == null) {
        params = [];
    } else {
        // remove any that have the same name already (i.e. if folk are calling declareParameter)
        // use a cheeky method so that we can reuse the same array
        const found: any[] = params.filter(p => p.name === propertyKey);
        if (found != null && found.length > 0) {
            const index = params.indexOf(found[0]);
            params.splice(index, 1);
        }
    }
    const copy: any = { ...details };
    // Make required = true the default
    copy.required = (copy.required !== undefined) ? copy.required : true;
    copy.name = propertyKey;
    params.push(copy);

    // merge parameters from parent if it has some
    let parent = Object.getPrototypeOf(target);
    while (parent != null) {
        const protoParams: any[] = get_metadata(parent, "__parameters");
        if (protoParams != null) {
            protoParams.forEach(protoParam => {
                // if we don't already have a parameter with the same name
                if (!params.some(param => param.name === protoParam.name)) {
                    params.push(protoParam);
                }
            });
        }
        parent = Object.getPrototypeOf(parent);
    }

    set_metadata(target, "__parameters", params);
    return target;
}

export function declareMappedParameter(target: any, name: string, uri: string, required: boolean) {
    let params = get_metadata(target, "__mappedParameters");
    if (params == null) {
        params = [];
    } else {
        // remove any that have the same name already (i.e. if folk are calling declareParameter)
        // use a cheeky method so that we can reuse the same array
        const found: any[] = params.filter(p => p.localKey === name);
        if (found != null && found.length > 0) {
            const index = params.indexOf(found[0]);
            params.splice(index, 1);
        }
    }
    const param = { name, uri, required };
    params.push(param);

    // merge mapped_parameters from parent if it has some
    let parent = Object.getPrototypeOf(target);
    while (parent != null) {
        const protoParams: any[] = get_metadata(parent, "__mappedParameters");
        if (protoParams != null) {
            protoParams.forEach(protoParam => {
                // if we don't already have a parameter with the same name
                if (!params.some(p => p.name === protoParam.name)) {
                    params.push(protoParam);
                }
            });
        }
        parent = Object.getPrototypeOf(parent);
    }

    set_metadata(target, "__mappedParameters", params);
    return target;
}

export function declareSecret(target: any, name: string, uri: string) {
    let params = get_metadata(target, "__secrets");
    if (params == null) {
        params = [];
    } else {
        // remove any that have the same name already (i.e. if folk are calling declareParameter)
        // use a cheeky method so that we can reuse the same array
        const found: any[] = params.filter(p => p.name === name);
        if (found != null && found.length > 0) {
            const index = params.indexOf(found[0]);
            params.splice(index, 1);
        }
    }
    const param = { name, uri };
    params.push(param);

    // merge secrets from parent if it has some
    let parent = Object.getPrototypeOf(target);
    while (parent != null) {
        const protoParams: any[] = get_metadata(parent, "__secrets");
        if (protoParams != null) {
            protoParams.forEach(protoParam => {
                // if we don't already have a parameter with the same name
                if (!params.some(p => p.name === protoParam.name)) {
                    params.push(protoParam);
                }
            });
        }
        parent = Object.getPrototypeOf(parent);
    }

    set_metadata(target, "__secrets", params);
    return target;
}

export function declareCommandHandler(obj: any, description: string, autoSubmit: boolean, intent?: string[]) {
    declareRug(obj, "command-handler", description);
    declareIntent(obj, intent);
    if (autoSubmit) {
        declareAutoSubmit(obj, autoSubmit);
    }
    registerCommand(obj);
    return obj;
}

export function declareParameters(obj: any) {
    set_metadata(obj, "__name", obj.prototype.constructor.name);
    set_metadata(obj, "__kind", "parameters");
    return obj;
}

type RugKind = "command-handler" | "event-handler";

function declareRug(obj: any, kind: RugKind, description: string) {
    set_metadata(obj, "__description", description);
    set_metadata(obj, "__name", obj.prototype.constructor.name);
    set_metadata(obj, "__kind", kind);
}

export function declareEventHandler(
    obj: any, description: string, subscription: string) {
    declareRug(obj, "event-handler", description);
    set_metadata(obj, "__subscription", subscription);
    registerEvent(obj);
    return obj;
}

export function declareTags(target: any, tags: string[]) {
    set_metadata(target, "__tags", tags.map(t => ({ name: t, description: t })));
    return target;
}

export function declareIntent(target: any, intent: string[]) {
    set_metadata(target, "__intent", intent);
    return target;
}

export function declareAutoSubmit(target: any, autoSubmit: boolean) {
    set_metadata(target, "__autoSubmit", autoSubmit);
    return target;
}
