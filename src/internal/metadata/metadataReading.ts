import * as GraphQL from "../../graph/graphQL";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
    IngestorMetadata,
    isCommandHandlerMetadata,
    isEventHandlerMetadata,
    isIngestorMetadata,
    MappedParameterDeclaration,
    SecretDeclaration,
} from "./metadata";

/**
 * Extract metadata from a handler instance. We need an
 * instance to pull the decorator data from
 * @param r handler instance
 * @return {any}
 */
export function metadataFromInstance(r: any): CommandHandlerMetadata | EventHandlerMetadata | IngestorMetadata {
    if (isEventHandlerMetadata(r)) {
        return addName(r);
    } else if (isIngestorMetadata(r)) {
        return addName(r);
    } else if (isCommandHandlerMetadata(r)) {
        return addName(r);
    } else {
        return metadataFromDecorator(r);
    }
}

function addName(r: CommandHandlerMetadata | EventHandlerMetadata | IngestorMetadata):
    CommandHandlerMetadata | EventHandlerMetadata | IngestorMetadata {
     if (!r.name) {
         r.name = r.constructor.name;
     }
     return r;
}

function metadataFromDecorator(r: any): CommandHandlerMetadata | EventHandlerMetadata | IngestorMetadata {
    switch (r.__kind) {
        case "command-handler" :
            return {
                name: r.__name,
                description: r.__description,
                tags: r.__tags,
                intent: r.__intent,
                parameters: r.__parameters ? r.__parameters.map(p => {
                    if (!p.display_name) {
                        p.display_name = p.name;
                    }
                    // Make this optional parameter explicit
                    p.displayable = p.displayable !== false;
                    p.default_value = r[p.name];
                    if (p.default_value) {
                        // right now the bot only supports string parameter values
                        p.default_value = p.default_value.toString();
                    }
                    return p;
                }) : [],
                mapped_parameters: mappedParameterMetadataFromInstance(r),
                secrets: secretsMetadataFromInstance(r),
            };
        case "event-handler" :
            // Validate subscription
            const errors = GraphQL.validateQuery(r.__subscription);
            if (errors.length > 0) {
                throw new Error(`Validation of GraphQL subscription for event handler '${r.__name}' failed\n\n` +
                    `${GraphQL.prettyPrintErrors(errors, r.__subscription)}`);
            }
            // Remove any linebreaks and spaces from those subscription
            const subscription = GraphQL.inlineQuery(r.__subscription);
            const subscriptionName = GraphQL.operationName(subscription);

            return {
                name: r.__name,
                description: r.__description,
                tags: r.__tags,
                subscription,
                subscriptionName,
                secrets: secretsMetadataFromInstance(r),
            };
        case "ingestor" :
            return {
                name: r.__name,
                description: r.__description,
                tags: r.__tags,
                route: r.__route,
            };
        default :
            throw new Error(`Unsupported automation '${r.constructor.name}'`);
    }
}

function secretsMetadataFromInstance(r: any): SecretDeclaration[] {
    return r.__secrets ? r.__secrets.map(s => ({name: s.name, path: s.path })) : [];
}

function mappedParameterMetadataFromInstance(r: any): MappedParameterDeclaration[] {
    return r.__mappedParameters ? r.__mappedParameters.map(mp =>
        ({local_key: mp.localKey, foreign_key: mp.foreignKey})) : [];
}
