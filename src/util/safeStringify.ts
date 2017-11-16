/**
 * Prevent JSON.stringify from crashing your program with a TypeError
 * on circular references
 */
export function safeStringify(obj: any, opts?: { replacer?: any, spaces?: number, name?: string }): string {
    const fullOpts = opts || {}; // not null
    try {
        if (fullOpts.spaces !== undefined) {
            return JSON.stringify(obj, opts.replacer || null, fullOpts.spaces);
        } else {
            // I don't want to mess with whatever the default is for spaces
            return JSON.stringify(obj, fullOpts.replacer || null);
        }
    } catch (e) {
        if (fullOpts.name && e.message.indexOf("Converting circular structure") >= 0) {
            return `(can't stringify circular reference in ${fullOpts.name})`;
        }
        return `failed stringify: ${e.message}`;
    }
}
