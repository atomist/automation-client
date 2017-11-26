import * as _ from "lodash";
import * as GraphQL from "../../graph/graphQL";
import { HandleCommand } from "../../HandleCommand";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
    MappedParameterDeclaration,
    Parameter,
    SecretDeclaration,
} from "../../metadata/automationMetadata";
import * as decorators from "./decoratorSupport";
import { isCommandHandlerMetadata, isEventHandlerMetadata } from "./metadata";

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

function addName(r: CommandHandlerMetadata | EventHandlerMetadata):
    CommandHandlerMetadata | EventHandlerMetadata {
     if (!r.name) {
         r.name = r.constructor.name;
     }
     return r;
}

function metadataFromDecorator(h: any, params: any): CommandHandlerMetadata | EventHandlerMetadata {
    switch (params.__kind) {
        case "command-handler" :
            return {
                name: params.__name,
                description: params.__description,
                tags: params.__tags ? params.__tags : [],
                intent: params.__intent ? params.__intent : [],
                parameters: parametersFromInstance(params),
                mapped_parameters: mappedParameterMetadataFromInstance(params),
                secrets: secretsMetadataFromInstance(params),
            };
    case "parameters" :
        return {
            name: h.__name,
            description: h.__description,
            tags: h.__tags ? h.__tags : [],
            intent: h.__intent ? h.__intent : [],
            parameters: parametersFromInstance(params),
            mapped_parameters: mappedParameterMetadataFromInstance(params),
            secrets: secretsMetadataFromInstance(params),
        };
        case "event-handler" :
            // Remove any linebreaks and spaces from those subscription
            const subscription = GraphQL.inlineQuery(params.__subscription);
            const subscriptionName = GraphQL.operationName(subscription);

            return {
                name: h.__name,
                description: h.__description,
                tags: h.__tags ? h.__tags : [],
                subscription,
                subscriptionName,
                secrets: secretsMetadataFromInstance(h),
            };
        default :
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

    const allParameters = directParams.concat(nestedParameters);
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
        };

        // Make this optional parameter explicit
        if (parameter.default_value) {
            // right now the bot only supports string parameter values
            parameter.default_value = parameter.default_value.toString();
        }
        return parameter;
    }) : [];
}

function secretsMetadataFromInstance(r: any, prefix: string = ""): SecretDeclaration[] {
    const directSecrets = !!r && r.__secrets ? r.__secrets.map(s => ({name: prefix + s.name, path: s.path })) : [];
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => !!nestedFieldInfo[1])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .map(nestedFieldInfo => secretsMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".")),
    );
    return directSecrets.concat(nestedParameters);
}

function mappedParameterMetadataFromInstance(r: any, prefix: string = ""): MappedParameterDeclaration[] {
    const directMappedParams = !!r && r.__mappedParameters ? r.__mappedParameters.map(mp =>
        ({local_key: prefix + mp.localKey, foreign_key: mp.foreignKey})) : [];
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => !!nestedFieldInfo[1])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .map(nestedFieldInfo => mappedParameterMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".")),
    );
    return directMappedParams.concat(nestedParameters);
}
