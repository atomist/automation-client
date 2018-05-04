import * as _ from "lodash";
import { automationClientInstance } from "../automationClient";
import { Configuration } from "../configuration";
import {
    AutomationMetadata,
    Chooser,
    CommandHandlerMetadata,
    FreeChoices,
    Parameter,
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
    args.forEach(arg => {
        if (arg.value !== undefined) {
            const parameter = hm.parameters.find(p => p.name === arg.name);
            if (parameter) {
                _.update(instanceToPopulate, parameter.name, () => computeValue(parameter, arg));
            }
        }
    });
}

export function populateValues(instanceToPopulate: any, am: AutomationMetadata, configuration: Configuration) {
    (am.values || []).forEach(v => {
        const configValue = _.get({ configuration }, `${v.root}.${v.path}`);
        if (!configValue && v.required) {
            throw new Error(`Required @Value '${v.root}.${v.path}' in '${
                instanceToPopulate.constructor.name}' is not available in configuration`);
        } else {
            _.update(instanceToPopulate, v.name, () => configValue);
        }
    });
}

function computeValue(parameter: Parameter, arg: Arg) {
    let value;
    // Convert type if necessary
    switch (parameter.type) {
        case undefined:
            // It's a string. Keep the value the same
            value = arg.value;
            break;
        case FreeChoices:
            // It's a string array. Keep the value the same
            value = arg.value;
            break;
        case "boolean":
            if (typeof arg.value === "boolean") {
                value = arg.value;
            } else {
                value = arg.value === "true";
            }
            break;
        case "number":
            if (typeof arg.value === "string") {
                value = parseInt(arg.value, 10);
            } else {
                throw new Error(`Parameter '${parameter.name}' has array value, but is numeric`);
            }
            break;
        default:
            // It's a Chooser
            const chooser = parameter.type as Chooser;
            if (chooser.pickOne) {
                if (typeof arg.value !== "string") {
                    throw new Error(`Parameter '${parameter.name}' has array value, but should be string`);
                }
                // Treat as a string
                value = arg.value;
            } else {
                if (typeof arg.value === "string") {
                    throw new Error(`Parameter '${parameter.name}' has string value, but should be array`);
                }
                // It's an array
                value = arg.value;
            }
            break;
    }
    return value;
}
