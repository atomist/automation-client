export function config(key: string) {
    try {
        const c = require("config");
        return c.get(key);
    } catch (err) {
        // Ignore this error
    }
    return undefined;
}
