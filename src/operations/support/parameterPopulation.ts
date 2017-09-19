import { HandleCommand } from "../../HandleCommand";
import { Arg } from "../../internal/invoker/Payload";
import { CommandHandlerMetadata } from "../../internal/metadata/metadata";

/**
 * Populate the parameters of the command handler instance,
 * performing type coercion if necessary
 * @param h handler instance
 * @param hm handler metadata
 * @param args string args
 */
export function populateParameters(h: HandleCommand, hm: CommandHandlerMetadata, args: Arg[]) {
    args.forEach(arg => {
        if (arg.value !== undefined) {
            const parameter = hm.parameters.find(p => p.name === arg.name);
            if (parameter) {
                // Convert type if necessary
                let value;
                switch (parameter.type) {
                    case "boolean":
                        value = arg.value === "true";
                        break;
                    case "number":
                        value = parseInt(arg.value, 10);
                        break;
                    default:
                        value = arg.value;
                        break;
                }
                h[arg.name] = value;
            }
        }
    });
}
