/**
 * Defer loading the config library until it is used.
 */
export function config(key: string): any | undefined {
    try {
        const c = require("config");
        return c.get(key);
    } catch (err) {
        // Ignore this error
    }
    return undefined;
}
