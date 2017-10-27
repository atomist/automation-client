import { SelfDescribingHandleCommand } from "./HandleCommand";
import {
    HandleCommand,
    HandlerContext,
    HandlerResult,
} from "./Handlers";
import { metadataFromInstance } from "./internal/metadata/metadataReading";
import { toStringArray } from "./internal/util/string";
import {
    CommandHandlerMetadata,
    MappedParameterDeclaration,
    Parameter,
    SecretDeclaration,
    Tag,
} from "./metadata/automationMetadata";
import { registerCommand } from "./scan";

export interface ParametersConstructor<P> {

    new(): P;

}

/**
 * Handle the given command. Parameters will have been set on a fresh
 * parameters instance before invocation
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained,
 * messages can be sent etc.
 * @return {Promise<HandlerResult>} result containing status and any command-specific data
 */
export type OnCommand<P = undefined> =
    (ctx: HandlerContext, parameters: P) => Promise<HandlerResult>;

/**
 * Create a HandleCommand instance with the appropriate metadata wrapping
 * the given function
 * @param {OnCommand<P>} h
 * @param {ParametersConstructor<P>} factory
 * @param {string} name can be omitted if the function isn't exported
 * @param {string} description
 * @param {string[]} intent
 * @param {Tag[]} tags
 * @return {HandleCommand<P>}
 */
export function commandHandlerFrom<P>(h: OnCommand<P>,
                                      factory: ParametersConstructor<P>,
                                      name: string = h.name,
                                      description: string = name,
                                      intent: string | string[] = [],
                                      tags: string | string[] = []): HandleCommand<P> & CommandHandlerMetadata {
    if (!name) {
        throw new Error(`Cannot derive name from function '${h}': Provide name explicitly`);
    }
    const handler = new FunctionWrappingCommandHandler(name, description, h, factory, tags, intent);
    registerCommand(handler);
    return handler;
}

class FunctionWrappingCommandHandler<P> implements SelfDescribingHandleCommand<P> {

    public parameters: Parameter[];

    // tslint:disable-next-line:variable-name
    public mapped_parameters: MappedParameterDeclaration[];

    public secrets?: SecretDeclaration[];
    public intent?: string[];
    public tags?: Tag[];

    constructor(public name: string,
                public description: string,
                private h: OnCommand<P>,
                private parametersFactory: ParametersConstructor<P>,
                // tslint:disable-next-line:variable-name
                private _tags: string | string[] = [],
                // tslint:disable-next-line:variable-name
                private _intent: string | string[] = []) {
        const newParamInstance = this.freshParametersInstance();
        const md = metadataFromInstance(newParamInstance) as CommandHandlerMetadata;
        this.parameters = md.parameters;
        this.mapped_parameters = md.mapped_parameters;
        this.secrets = md.secrets;
        this.intent = toStringArray(_intent);
        this.tags = toStringArray(_tags).map(t => ({ name: t, description: t}) );
    }

    public freshParametersInstance(): P {
        return new this.parametersFactory();
    }

    public handle(ctx: HandlerContext, params: P): Promise<HandlerResult> {
        const handlerResult = this.h(ctx, params);
        if (!handlerResult) {
            return Promise.reject(
                `Error: Function Handler '${this.name}' returned null or undefined: Probably a user coding error`);
        }
        return handlerResult;
    }
}
