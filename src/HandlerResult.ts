/**
 * Result of a handler. Can be extended to include further,
 * command-specific, data
 */
export interface HandlerResult {

    /**
     * 0 is success
     */
    code: number;
}

export const Success: HandlerResult = {
    code: 0,
};

export const Failure: HandlerResult = {
    code: 1,
};
