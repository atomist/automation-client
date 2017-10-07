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

export interface HandlerError extends HandlerResult {

    /**
     * The stack trace of the error
     */
    stack?: any;

}

export const Success: HandlerResult = {
    code: 0,
};

export const Failure: HandlerResult = {
    code: 1,
};

export function failure(err: Error): HandlerError {
    return { code: 1, message: err.message, stack: err.stack };
}
