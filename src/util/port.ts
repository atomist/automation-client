import * as portfinder from "portfinder";

/**
 * Scan for and return the first available port in the indicated range.
 * Range defaults to 2866 - 2888.
 * @param start
 * @param end
 */
export function scanFreePort(start: number = 2866, end: number = 2888): Promise<number> {
    return portfinder.getPortPromise({ port: start, stopPort: end });
}

