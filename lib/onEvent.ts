import {
    EventFired,
    HandleEvent,
    SelfDescribingHandleEvent,
} from "./HandleEvent";
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import * as GraphQL from "./internal/graph/graphQL";
import { metadataFromInstance } from "./internal/metadata/metadataReading";
import {
    generateHash,
    toStringArray,
} from "./internal/util/string";
import {
    EventHandlerMetadata,
    SecretDeclaration,
    Tag,
    ValueDeclaration,
} from "./metadata/automationMetadata";
import { registerEvent } from "./scan";
import {
    Maker,
    toFactory,
} from "./util/constructionUtils";

/**
 * Handle the given event.
 * @param e event we're matching on
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained if it's
 * necessary to run further queries.
 * @param params secrets and mapped parameters are available through this
 * @return {Promise<HandlerResult>} result containing status and any command-specific data
 */
export type OnEvent<T = any, P = any> =
    (e: EventFired<T>, ctx: HandlerContext, params: P) => Promise<HandlerResult>;

/**
 * Create a HandleEvent instance with the appropriate metadata wrapping
 * the given function
 * @param {OnEvent<T, P>} h
 * @param {Maker<P>} factory
 * @param {string} subscription
 * @param {string} name
 * @param {string} description
 * @param {string | string[]} tags
 * @returns {HandleEvent<T, P> & EventHandlerMetadata}
 */
export function eventHandlerFrom<T, P>(h: OnEvent<T, P>,
                                       factory: Maker<P>,
                                       subscription: string,
                                       name: string = h.name || `Event${generateHash(h.toString())}`,
                                       description: string = name,
                                       tags: string | string[] = []): HandleEvent<T, P> & EventHandlerMetadata {
    const handler = new FunctionWrappingEventHandler(name, description, h, factory, subscription, tags);
    registerEvent(handler);
    return handler;

}

class FunctionWrappingEventHandler<T, P> implements SelfDescribingHandleEvent<T, P> {

    public secrets?: SecretDeclaration[];
    public values?: ValueDeclaration[];
    public tags?: Tag[];
    public subscription: string;
    public subscriptionName: string;

    constructor(public name: string,
                public description: string,
                private readonly h: OnEvent<T, P>,
                private readonly parametersFactory: Maker<P>,
                // tslint:disable-next-line:variable-name
                private readonly _subscription: string,
                // tslint:disable-next-line:variable-name
                private readonly _tags: string | string[] = []) {
        const newParamInstance = this.freshParametersInstance();
        const md = metadataFromInstance(newParamInstance) as EventHandlerMetadata;
        this.values = md.values;
        this.secrets = md.secrets;
        this.tags = toStringArray(_tags).map(t => ({ name: t, description: t }));

        this.subscription = GraphQL.inlineQuery(GraphQL.replaceOperationName(this._subscription, this.name));
        this.subscriptionName = GraphQL.operationName(this.subscription);
    }

    public freshParametersInstance(): P {
        return toFactory(this.parametersFactory)();
    }

    public handle(e: EventFired<T>, ctx: HandlerContext, params: P) {
        return this.h(e, ctx, params);
    }
}
