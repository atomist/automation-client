import { HandleCommand } from "./HandleCommand";
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import {
    CommandHandlerMetadata,
    MappedParameterDeclaration,
    Parameter,
    SecretDeclaration,
    Tag,
} from "./internal/metadata/metadata";
import { metadataFromInstance } from "./internal/metadata/metadataReading";

export interface ParametersFactory<P> {

    new(): P;

}

/**
 * Handle the given command. Parameters will have been set on the object
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained
 * @return {Promise<HandlerResult>} result containing status and any command-specific data
 */
export type Handler<P = undefined> =
    (ctx: HandlerContext, parameters: P) => Promise<HandlerResult>;

/**
 * Create a HandleCommand instance with the appropriate metadata wrapping
 * the given function
 * @param {Handler<P>} h
 * @param {ParametersFactory<P>} factory
 * @param {string} name
 * @param {string} description
 * @param {string[]} intent
 * @param {Tag[]} tags
 * @return {HandleCommand<P>}
 */
export function commandHandlerFrom<P>(h: Handler<P>,
                                      factory: ParametersFactory<P>,
                                      name: string, description: string,
                                      intent: string[] = [],
                                      tags: Tag[] = []): HandleCommand<P> & CommandHandlerMetadata {
    return new FunctionWrappingCommandHandler(name, description, h, factory, tags, intent);
}

class FunctionWrappingCommandHandler<P> implements HandleCommand<P>, CommandHandlerMetadata {

    public parameters: Parameter[];

    // tslint:disable-next-line:variable-name
    public mapped_parameters: MappedParameterDeclaration[];

    public secrets?: SecretDeclaration[];

    constructor(public name: string, public description: string,
                private h: Handler<P>,
                private parametersFactory: ParametersFactory<P>,
                public tags: Tag[] = [],
                public intent: string[] = []) {
        const newParamInstance = new parametersFactory();
        const md = metadataFromInstance(newParamInstance) as CommandHandlerMetadata;
        this.parameters = md.parameters;
        this.mapped_parameters = md.mapped_parameters;
        this.secrets = md.secrets;
    }

    public handle(ctx: HandlerContext, params: P): Promise<HandlerResult> {
        const handlerResult = this.h(ctx, params);
        if (!handlerResult) {
            return Promise.reject(
                `Error: Function Handler [${this.name}] returned null or undefined: Probably a user coding error`);
        }
        return handlerResult;
    }
}
