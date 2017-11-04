/**
 * Result of a handler. Can be extended to include further,
 * command-specific, data
 */
export interface HandlerResult {
    /**
     * 0 is success
     */
    code: number;

    /**
     * The simple text message describing the result
     */
    message?: string;
}

/**
 * The result of a command invocation returns a redirect URL that can be
 * presented to the invoker of the command in different ways: eg. HTTP redirect
 * or a slack message with the link.
 */
export interface RedirectResult extends HandlerResult {

    /**
     * The redirect url
     */
    redirect: string;
}

export interface HandlerError extends HandlerResult {

    /**
     * The stack trace of the error
     */
    stack?: any;
}

export const Success: HandlerResult = {
    code: 0,
};

export const SuccessPromise = Promise.resolve(Success);

export const Failure: HandlerResult = {
    code: 1,
};

export const FailurePromise = Promise.resolve(Failure);

export function failure(err: Error): HandlerError {
    return { code: 1, message: err.message, stack: err.stack };
}
