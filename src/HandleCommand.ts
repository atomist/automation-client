import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import { CommandHandlerMetadata } from "./internal/metadata/metadata";
import { Handler } from "./handler";

// tslint:disable-next-line:interface-over-type-literal
export type Parameters = {};

/**
 * Interface for class-based command handlers.
 * These combine the parameters with the command. A fresh
 * instance will be created for every invocation. Prefer using the
 * parameters object to "this" in implementations of the handle method.
 */
export interface HandleCommand<P = any> {

    /**
     * Handler function for this command
     */
    handle: Handler<P>;

    /**
     * If this method is implemented, it returns a fresh parameters instance
     * to use for this class. Otherwise will use the class itself as its parameters.
     * @return {P}
     */
    freshParametersInstance?(): P;

}

export type SelfDescribingHandleCommand<P = any> = HandleCommand<P> & CommandHandlerMetadata;
