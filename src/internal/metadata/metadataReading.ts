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
 * @param r handler instance
 * @return {any}
 */
export function metadataFromInstance(r: any): CommandHandlerMetadata | EventHandlerMetadata {
    let md = null;
    if (isEventHandlerMetadata(r)) {
        md = addName(r);
    } else if (isCommandHandlerMetadata(r)) {
        md = addName(r);
    } else {
        // We need to find the instance from which to extract metadata.
        // It will be the handler itself unless it implements the optional freshParametersInstance method
        const knowsHowToMakeMyParams = r as HandleCommand;
        if (!!knowsHowToMakeMyParams.freshParametersInstance) {
            const newInstance = knowsHowToMakeMyParams.freshParametersInstance();
            newInstance.__kind = "parameters";
            md = metadataFromDecorator(newInstance);
        } else {
            md = metadataFromDecorator(r);
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

function metadataFromDecorator(r: any): CommandHandlerMetadata | EventHandlerMetadata {
    switch (r.__kind) {
        case "command-handler" : case "parameters" :
            return {
                name: r.__name,
                description: r.__description,
                tags: r.__tags ? r.__tags : [],
                intent: r.__intent ? r.__intent : [],
                parameters: parametersFromInstance(r),
                mapped_parameters: mappedParameterMetadataFromInstance(r),
                secrets: secretsMetadataFromInstance(r),
            };
        case "event-handler" :
            // Remove any linebreaks and spaces from those subscription
            const subscription = GraphQL.inlineQuery(r.__subscription);
            const subscriptionName = GraphQL.operationName(subscription);

            return {
                name: r.__name,
                description: r.__description,
                tags: r.__tags ? r.__tags : [],
                subscription,
                subscriptionName,
                secrets: secretsMetadataFromInstance(r),
            };
        default :
            throw new Error(`Unsupported automation '${r.constructor.name}'`);
    }
}

function parametersFromInstance(r: any, prefix: string = ""): Parameter[] {
    const directParams = directParameters(r, prefix);
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
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
    return r.__parameters ? (r.__parameters as decorators.Parameter[]).map(p => {
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
    const directSecrets = r.__secrets ? r.__secrets.map(s => ({name: prefix + s.name, path: s.path })) : [];
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .map(nestedFieldInfo => secretsMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".")),
    );
    return directSecrets.concat(nestedParameters);
}

function mappedParameterMetadataFromInstance(r: any, prefix: string = ""): MappedParameterDeclaration[] {
    const directMappedParams = r.__mappedParameters ? r.__mappedParameters.map(mp =>
        ({local_key: prefix + mp.localKey, foreign_key: mp.foreignKey})) : [];
    const nestedParameters = _.flatten(Object.keys(r)
        .map(key => [key, r[key]])
        .filter(nestedFieldInfo => typeof nestedFieldInfo[1] === "object")
        .map(nestedFieldInfo => mappedParameterMetadataFromInstance(nestedFieldInfo[1], prefix + nestedFieldInfo[0] + ".")),
    );
    return directMappedParams.concat(nestedParameters);
}
