import { Configuration } from "../../configuration";
import { AutomationMetadata } from "../../metadata/automationMetadata";

/**
 * Extension for consumers to process the handlers metadata before it gets registered
 * with the Atomist API.
 * Note: This can be useful to re-write secrets used on command and event handlers to
 * be sourced from local configuration values. In that case one would remove an existing
 * secret value from the metadata and add a new value to it.
 */
export interface AutomationMetadataProcessor {
    process<T extends AutomationMetadata>(metadata: T, configuration: Configuration): T;
}

/**
 * Default AutomationMetadataProcessor that just passes through the given metadata instance.
 */
export class PassThroughMetadataProcessor implements AutomationMetadataProcessor {

    public process<T extends AutomationMetadata>(metadata: T, configuration: Configuration): T {
        return metadata;
    }
}
