import * as logform from "logform";

const redactions: Array<{ redacted: RegExp; replacement: string }> = [];

/**
 * Prepare the logging to exclude something.
 * If you know you're about to, say, spawn a process that will get printed
 * to the log and will reveal something secret, then prepare the logger to
 * exclude that secret thing.
 *
 * Pass a regular expression that will match the secret thing and very little else.
 */
export function addRedaction(redacted: RegExp, suggestedReplacement?: string): void {
    const replacement = suggestedReplacement || "[REDACTED]";
    redactions.push({ redacted, replacement });
}

export function redact(message: string): string {
    let output = message;
    redactions.forEach(r => {
        output = typeof output === "string" ? output.replace(r.redacted, r.replacement) : output;
    });
    return output;
}

export function redactLog(logInfo: logform.TransformableInfo): logform.TransformableInfo {
    let output = logInfo.message;
    redactions.forEach(r => {
        output = typeof output === "string" ? output.replace(r.redacted, r.replacement) : output;
    });
    return { ...logInfo, message: output };
}
