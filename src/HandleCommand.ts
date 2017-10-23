import { CommandHandlerMetadata } from "./metadata/automationMetadata";
import { OnCommand } from "./onCommand";

/**
 * Interface for class-based command handlers.
 * These combine the parameters with the command. A fresh
 * instance will be created for every invocation. Prefer using the
 * parameters object to "this" in implementations of the handle method.
 */
export interface HandleCommand<P = any> {

    /**
     * OnCommand function for this command
     */
    handle: OnCommand<P>;

    /**
     * If this method is implemented, it returns a fresh parameters instance
     * to use for this class. Otherwise will use the class itself as its parameters.
     * @return {P}
     */
    freshParametersInstance?(): P;

}

export type SelfDescribingHandleCommand<P = any> = HandleCommand<P> & CommandHandlerMetadata;
