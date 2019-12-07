import * as _ from "lodash";
import { HandleCommand } from "../../HandleCommand";
import * as GraphQL from "../../internal/graph/graphQL";
import {
    Choice,
    CommandHandlerMetadata,
    EventHandlerMetadata,
    MappedParameterDeclaration,
    Options,
    Parameter,
    SecretDeclaration,
    ValueDeclaration,
} from "../../metadata/automationMetadata";
import * as decorators from "./decoratorSupport";
import {
    isCommandHandlerMetadata,
    isEventHandlerMetadata,
} from "./metadata";

/**
 * Extract metadata from a handler instance. We need an
 * instance to pull the decorator data from
 * @param h handler instance
 * @return {any}
 */
export function metadataFromInstance(h: any): CommandHandlerMetadata | EventHandlerMetadata {
    let md = null;
    if (isEventHandlerMetadata(h)) {
        md = addName(h);
    } else if (isCommandHandlerMetadata(h)) {
        md = addName(h);
    } else {
        // We need to find the instance from which to extract metadata.
        // It will be the handler itself unless it implements the optional freshParametersInstance method
        const knowsHowToMakeMyParams = h as HandleCommand;
        if (!!knowsHowToMakeMyParams.freshParametersInstance) {
            const paramsInstance = knowsHowToMakeMyParams.freshParametersInstance();
            if (!paramsInstance.__kind) {
                paramsInstance.__kind = "parameters";
            }
            md = metadataFromDecorator(h, paramsInstance);
        } else {
            md = metadataFromDecorator(h, h);
        }
    }
    // Clone metadata as otherwise we mess with previous created instances
    return _.cloneDeep(md);
}

function addName(r: CommandHandlerMetadata | EventHandlerMetadata): CommandHandlerMetadata | EventHandlerMetadata {
    if (!r.name) {
        r.name = r.constructor.name;
    }
    return r;
}

function metadataFromDecorator(h: any, params: any): CommandHandlerMetadata | EventHandlerMetadata {
    switch (params.__kind) {
        case "command-handler":
            return {
                name: params.__name,
                description: params.__description,
                tags: params.__tags ? params.__tags : [],
                intent: params.__intent ? params.__intent : [],
                auto_submit: params.__autoSubmit,
                parameters: parametersFromInstance(params),
                mapped_parameters: mappedParameterMetadataFromInstance(params),
                secrets: secretsMetadataFromInstance(params),
                values: valueMetadataFromInstance(params),
            };
        case "parameters":
            return {
                name: h.__name,
                description: h.__description,
                tags: h.__tags ? h.__tags : [],
                intent: h.__intent ? h.__intent : [],
                auto_submit: h.__autoSubmit,
                parameters: parametersFromInstance(params),
                mapped_parameters: mappedParameterMetadataFromInstance(params),
                secrets: secretsMetadataFromInstance(params),
                values: valueMetadataFromInstance(params),
            };
        case "event-handler":
            // Remove any linebreaks and spaces from those subscription
            const subscriptionOrFunction = params.__subscription;
            const subscription = GraphQL.inlineQuery(GraphQL.replaceOperationName(
                typeof subscriptionOrFunction === "string" ? subscriptionOrFunction : subscriptionOrFunction(),
                h.__name));
            const subscriptionName = GraphQL.operationName(subscription);

            return {
                name: h.__name,
                description: h.__description,
                tags: h.__tags ? h.__tags : [],
                subscription,
                subscriptionName,
                secrets: secretsMetadataFromInstance(h),
                values: valueMetadataFromInstance(h),
            };
        default:
            throw new Error(`Unsupported automation '${params.constructor.name}'`);
    }
}

function parametersFromInstance(r: any, prefix: string = ""): Parameter[] {
    const directParams = directParameters(r, prefix);
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => !!nestedFieldInfo[1])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .map(nestedFieldInfo => parametersFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".")),
    );

    const allParameters = directParams.concat(nestedParameters).map(p => {
        if (!!p.type && p.type !== "boolean" && p.type !== "number" && p.type !== "string" && p.type !== "freeChoices") {
            const chooser = p.type as any;

            let kind: "single" | "multiple" = "single";
            if (chooser.pickOne !== undefined && chooser.pickOne !== null) {
                kind = chooser.pickOne ? "single" : "multiple";
            } else if (chooser.kind !== undefined && chooser.kind !== null) {
                kind = chooser.kind;
            }

            let options: Choice[] = [];
            if (chooser.choices !== undefined && chooser.choices !== null) {
                options = chooser.choices;
            } else if (chooser.options !== undefined && chooser.options !== null) {
                options = chooser.options;
            }

            options = options.map(o => ({ value: o.value, description: o.description || o.value }));

            const newChooser: Options = {
                kind,
                options,
            };
            return {
                ...p,
                type: newChooser,
            };
        } else {
            return p;
        }
    });
    return allParameters.sort((p1, p2) => {
        const o1 = p1.order || Number.MAX_SAFE_INTEGER;
        const o2 = p2.order || Number.MAX_SAFE_INTEGER;
        return o1 - o2;
    });
}

function directParameters(r: any, prefix: string) {
    return !!r && r.__parameters ? (r.__parameters as decorators.Parameter[]).map(p => {
        const nameToUse = prefix + p.name;
        const parameter: Parameter = {
            name: nameToUse,
            pattern: p.pattern ? p.pattern.source : "^.*$",
            description: p.description,
            required: p.required,
            group: p.group,
            displayable: p.displayable !== false,
            type: p.type,
            max_length: p.maxLength,
            min_length: p.minLength,
            valid_input: p.validInput,
            default_value: r[p.name],
            display_name: p.displayName ? p.displayName : nameToUse,
            order: p.order,
            control: p.control,
        };

        // Make this optional parameter explicit
        if (parameter.default_value) {
            // right now the bot only supports string parameter values
            parameter.default_value = parameter.default_value.toString();
        }
        return parameter;
    }) : [];
}

function secretsMetadataFromInstance(r: any, prefix: string = "", visited: any[] = []): SecretDeclaration[] {
    visited.push(r);
    const directSecrets = !!r && r.__secrets ? r.__secrets.map(s => ({ name: prefix + s.name, uri: s.uri })) : [];
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => !!nestedFieldInfo[1])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .filter(nestedFieldInfo => !visited.includes(nestedFieldInfo[1]))
        .map(nestedFieldInfo => secretsMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".", visited)),
    );
    return directSecrets.concat(nestedParameters);
}

function mappedParameterMetadataFromInstance(r: any, prefix: string = "", visited: any[] = []): MappedParameterDeclaration[] {
    visited.push(r);
    const directMappedParams = !!r && r.__mappedParameters ? r.__mappedParameters.map(mp =>
        ({
            name: prefix + mp.name,
            uri: mp.uri,
            required: mp.required !== false,
        })) : [];
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => !!nestedFieldInfo[1])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .filter(nestedFieldInfo => !visited.includes(nestedFieldInfo[1]))
        .map(nestedFieldInfo => mappedParameterMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".", visited)),
    );
    return directMappedParams.concat(nestedParameters);
}

function valueMetadataFromInstance(r: any, prefix: string = "", visited: any[] = []): ValueDeclaration[] {
    visited.push(r);
    const directValues = !!r && r.__values ? r.__values.map(mp =>
        ({
            name: prefix + mp.name,
            path: mp.value.path,
            required: mp.value.required !== false,
            type: mp.value.type ? mp.value.type : "string",
        })) : [];
    const nestedValues = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => !!nestedFieldInfo[1])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .filter(nestedFieldInfo => !visited.includes(nestedFieldInfo[1]))
        .map(nestedFieldInfo => valueMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".", visited)),
    );
    return directValues.concat(nestedValues);
}
