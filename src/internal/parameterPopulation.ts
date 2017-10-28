import { Chooser, CommandHandlerMetadata } from "../metadata/automationMetadata";
import { Arg } from "./invoker/Payload";

/**
 * Populate the parameters of the command handler instance,
 * performing type coercion if necessary
 * @param h parameters instance (may be handler instance itself)
 * @param hm handler metadata
 * @param args string args
 */
export function populateParameters(h: any, hm: CommandHandlerMetadata, args: Arg[]) {
    args.forEach(arg => {
        if (arg.value !== undefined) {
            const parameter = hm.parameters.find(p => p.name === arg.name);
            if (parameter) {
                // Convert type if necessary
                let value;
                switch (parameter.type) {
                    case undefined :
                        // It's a string
                        value = arg.value;
                        break;
                    case "boolean":
                        value = arg.value === "true";
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
                h[arg.name] = value;
            }
        }
    });
}
