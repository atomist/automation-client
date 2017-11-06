
export interface Choice {
    value: string;
    description?: string;
}

/**
 * Represents a choice of exactly one or some strings from a fixed list of choices
 */
export interface Chooser {

    /**
     * Whether the user must pick exactly one choice. In this case,
     * binds to string. Otherwise binds to string[]
     */
    pickOne: boolean;

    choices: Choice[];
}

/**
 * Constant for "freeChoices" type. Indicates that valid input is any number of strings, without validation.
 * Useful in accepting input from other systems that perform their own validation.
 * Binds to string[].
 */
export const FreeChoices = "freeChoices";

export type ParameterType = "string" | "number" | "boolean" | Chooser | "freeChoices";

/**
 * Parameter to a command handler.
 * Parameter values are always captured as strings,
 * but different types can narrow the required input.
 */
export interface Parameter {

    name: string;
    description?: string;

    pattern?: string;
    required: boolean;

    displayable?: boolean;

    // TODO why does this come back wrong in annotation?
    valid_input?: string;
    max_length?: number;
    min_length?: number;
    display_name?: string;
    default_value?: string;

    /**
     * Specify the type if this is not a string.
     */
    type?: ParameterType;

    group?: Group;

    tags?: string[];

    order?: number;
}

/**
 * Addtional information about parameters
 */
export interface Group {
    readonly name: string;
    readonly description?: string;
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
