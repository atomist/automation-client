import {
    BaseParameter,
    declareCommandHandler,
    declareEventHandler,
    declareIngestor,
    declareMappedParameter,
    declareParameter,
    declareSecret,
    declareTags,
} from "./internal/metadata/decoratorSupport";

/**
 * Decorator for parameters. Adds to object properties
 */
export function Parameter(details: BaseParameter) {
    return (target: any, propertyKey: string) => {
        declareParameter(target, propertyKey, details);
    };
}

/**
 * Map a local field to some other configuration item in a different system
 */
export function MappedParameter(foreignKey: string) {
    return (target: any, localKey: string) => {
        declareMappedParameter(target, localKey, foreignKey);
    };
}

/**
 * Declare a secret a Rug wants to use
 */
export function Secret(path: string) {
    return (target: any, name: string) => {
        declareSecret(target, name, path);
    };
}

export function CommandHandler(description: string, intent?: string[] | string) {
    return (obj: any) => { declareCommandHandler(obj, description, intent); };
}

export function Ingestor(
    description: string,
    route?: string) {
    return (obj: object) => { declareIngestor(obj, description, route); };
}

export function EventHandler(
    description: string,
    subscription?: string) {
    return (obj: object) => {
            declareEventHandler(obj, description, subscription);
    };
}

/**
 * Decorator for tags. Sets tags on the class
 */
export function Tags(...tags: string[]) {
    return (target: any) => {
        declareTags(target, tags);
    };
}
