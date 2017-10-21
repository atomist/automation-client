
export type ParameterType = "string" | "number" | "boolean";

/**
 * Parameter to a command handler
 */
export interface Parameter {

    name: string;
    description?: string;
    pattern?: string;
    required: boolean;
    displayable?: boolean;

    // TODO why does this come back wrong in annotation?
    validInput?: string;
    max_length?: number;
    min_length?: number;
    display_name?: string;
    default_value?: string;

    /**
     * Specify the type if this is not a string.
     */
    type?: ParameterType;
}

/**
 * Tag attached to an automation
 */
export interface Tag {
    name: string;
    description: string;
}

/**
 * Common metadata to all automations
 */
export interface AutomationMetadata {

    name: string;
    description: string;
    tags?: Tag[];
}

export interface MappedParameterDeclaration {

    local_key: string;
    foreign_key: string;
}

export interface SecretDeclaration {

    name: string;
    path: string;
}

export interface EventHandlerMetadata extends AutomationMetadata {

    subscriptionName: string;
    subscription: string;

    secrets?: SecretDeclaration[];
}

export interface IngestorMetadata extends AutomationMetadata {

    route: string;
}

/**
 * Command handler metadata. Includes parameters and intent,
 * allowing invocation from both or by other methods such as command line
 * or REST
 */
export interface CommandHandlerMetadata extends AutomationMetadata {

    intent?: string[];
    parameters?: Parameter[];

    mapped_parameters?: MappedParameterDeclaration[];
    secrets?: SecretDeclaration[];
}
