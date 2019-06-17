import * as mmh3 from "murmurhash3js";
import * as uuid from "uuid/v4";

export function hideString(value) {
    if (!value) {
        return value;
    }

    if (typeof value === "string") {
        let newValue = "";
        for (let i = 0; i < value.length; i++) {
            if (i === 0) {
                newValue = value.charAt(0);
            } else if (i < value.length - 1) {
                newValue += "*";
            } else {
                newValue += value.slice(-1);
            }
        }
        return newValue;
    } else if (Array.isArray(value)) {
        return value.map(hideString);
    }
    return value;
}

export function guid() {
    return uuid();
}

export function findLine(str, idx) {
    const first = str.substring(0, idx);
    const last = str.substring(idx);

    const firstNewLine = first.lastIndexOf("\n");

    let secondNewLine = last.indexOf("\n");

    if (secondNewLine === -1) {
        secondNewLine = last.length;
    }
    return str.substring(firstNewLine + 1, idx + secondNewLine);
}

export function toStringArray(strings: string | string[]): string[] {
    if (strings) {
        if (Array.isArray(strings)) {
            return strings;
        } else {
            return [strings];
        }
    } else {
        return [];
    }
}

export function obfuscateJson(key: string, value: any) {
    if (key === "keywords") {
        return value;
    } else if (/token|password|jwt|url|secret|authorization|key|cert|pass|user/i.test(key)) {
        return hideString(value);
    } else if (key === "commands") {
        return undefined;
    } else if (key === "events") {
        return undefined;
    } else if (key === "ingesters") {
        return undefined;
    } else if (key === "listeners") {
        return undefined;
    } else if (key === "customizers") {
        return undefined;
    } else if (key === "postProcessors") {
        return undefined;
    } else if (key === "goal" || key === "goals") {
        return undefined;
    } else if (key.startsWith("_")) {
        return undefined;
    }
    return value;
}

export function replacer(key: string, value: any) {
    if (key === "secrets" && value) {
        return value.map(v => ({ uri: v.uri, value: hideString(v.value) }));
    } else if (/token|password|jwt|url|secret|authorization|key|cert|pass|user/i.test(key)) {
        return hideString(value);
    } else {
        return value;
    }
}

export function generateHash(url: string): string {
    return mmh3.x86.hash32(url);
}
