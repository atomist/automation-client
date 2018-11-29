import {
    HandleCommand,
    SelfDescribingHandleCommand,
} from "./HandleCommand";
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import { metadataFromInstance } from "./internal/metadata/metadataReading";
import {
    generateHash,
    toStringArray,
} from "./internal/util/string";
import {
    CommandHandlerMetadata,
    MappedParameterDeclaration,
    Parameter,
    SecretDeclaration,
    Tag,
    ValueDeclaration,
} from "./metadata/automationMetadata";
import { registerCommand } from "./scan";
import {
    Maker,
    toFactory,
} from "./util/constructionUtils";

/**
 * Handle the given command. Parameters will have been set on a fresh
 * parameters instance before invocation
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained,
 * messages can be sent etc.
 * @return a Promise of a HandlerResult, containing a status code, or anything else representing
 * success.
 */
export type OnCommand<P = undefined> =
    (ctx: HandlerContext, parameters: P) => Promise<HandlerResult> | Promise<any>;

/**
 * Create a HandleCommand instance with the appropriate metadata wrapping
 * the given function
 * @param h handle function
 * @param factory construction function
 * @param {string} name can be omitted if the function isn't exported
 * @param {string} description
 * @param {string[]} intent
 * @param {Tag[]} tags
 * @return {HandleCommand<P>}
 */
export function commandHandlerFrom<P>(h: OnCommand<P>,
                                      factory: Maker<P>,
                                      name: string = h.name || `Command${generateHash(h.toString())}`,
                                      description: string = name,
                                      intent: string | string[] = [],
                                      tags: string | string[] = [],
                                      autoSubmit: boolean = false): HandleCommand<P> & CommandHandlerMetadata {
    const handler = new FunctionWrappingCommandHandler(name, description, h, factory, tags, intent, autoSubmit);
    registerCommand(handler);
    return handler;
}

class FunctionWrappingCommandHandler<P> implements SelfDescribingHandleCommand<P> {

    public parameters: Parameter[];

    // tslint:disable-next-line:variable-name
    public mapped_parameters: MappedParameterDeclaration[];

    public secrets?: SecretDeclaration[];
    public values?: ValueDeclaration[];
    public intent?: string[];
    public tags?: Tag[];
    // tslint:disable-next-line:variable-name
    public auto_submit: boolean;

    constructor(public name: string,
                public description: string,
                private h: OnCommand<P>,
                private parametersFactory: Maker<P>,
        // tslint:disable-next-line:variable-name
                private _tags: string | string[] = [],
        // tslint:disable-next-line:variable-name
                private _intent: string | string[] = [],
                private autoSubmit: boolean = false) {
        const newParamInstance = this.freshParametersInstance();
        const md = metadataFromInstance(newParamInstance) as CommandHandlerMetadata;
        this.parameters = md.parameters;
        this.mapped_parameters = md.mapped_parameters;
        this.values = md.values;
        this.secrets = md.secrets;
        this.intent = toStringArray(_intent);
        this.tags = toStringArray(_tags).map(t => ({ name: t, description: t }));
        this.auto_submit = autoSubmit;
    }

    public freshParametersInstance(): P {
        return toFactory(this.parametersFactory)();
    }

    public handle(ctx: HandlerContext, params: P) {
        return this.h(ctx, params);
    }
}
