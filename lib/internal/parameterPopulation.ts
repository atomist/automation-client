import * as _ from "lodash";
import { Configuration } from "../configuration";
import {
    AutomationMetadata,
    Chooser,
    CommandHandlerMetadata,
    FreeChoices,
    ParameterType,
} from "../metadata/automationMetadata";
import { Arg } from "./invoker/Payload";

/**
 * Populate the parameters of the command handler instance,
 * performing type coercion if necessary
 * @param instanceToPopulate parameters instance (may be handler instance itself)
 * @param hm handler metadata
 * @param args string args
 */
export function populateParameters(instanceToPopulate: any, hm: CommandHandlerMetadata, args: Arg[]) {
    (args || []).forEach(arg => {
        if (arg.value !== undefined) {
            const parameter = hm.parameters.find(p => p.name === arg.name);
            if (parameter) {
                _.update(instanceToPopulate, parameter.name, () => computeValue(parameter, arg.value));
            }
        }
    });
}

export function populateValues(instanceToPopulate: any, am: AutomationMetadata, configuration: Configuration) {
    (am.values || []).forEach(v => {
        let configValue;
        if (!v.path || v.path.length === 0) {
            configValue = configuration;
        } else {
            configValue = _.get(configuration, v.path);
        }
        if (!configValue && v.required) {
            throw new Error(`Required @Value '${v.path}' in '${
                instanceToPopulate.constructor.name}' is not available in configuration`);
        } else {
            _.update(instanceToPopulate, v.name, () => computeValue(
                { name: v.name, type: v.type as any as ParameterType }, configValue));
        }
    });
}

function computeValue(parameter: { name: string, type?: ParameterType }, value: any) {
    let newValue = value;
    // Convert type if necessary
    switch (parameter.type) {
        case "string":
        case undefined:
            // It's a string. Keep the value the same
            break;
        case FreeChoices:
            // It's a string array. Keep the value the same
            break;
        case "boolean":
            if (typeof value !== "boolean") {
                newValue = value === "true" || value === "yes" || value === "1";
            }
            break;
        case "number":
            if (typeof value === "string") {
                newValue = parseInt(value, 10);
            } else if (typeof value === "number") {
                break;
            } else {
                throw new Error(`Parameter '${parameter.name}' has invalid value, but is numeric`);
            }
            break;
        default:
            /* tslint:disable:deprecation */
            // It's a Chooser
            const chooser = parameter.type as Chooser;
            if (chooser.pickOne) {
                if (typeof value !== "string") {
                    throw new Error(`Parameter '${parameter.name}' has invalid value, but should be string`);
                }
            } else {
                if (typeof value.value === "string") {
                    throw new Error(`Parameter '${parameter.name}' has string value, but should be array`);
                }
            }
            /* tslint:enable:deprecation */
            break;
    }
    return newValue;
}
