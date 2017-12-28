import * as uuid from "uuid/v4";

export function hideString(value) {
    if (!value) {
        return value;
    }
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
            return strings as string[];
        } else {
            return [strings as string];
        }
    } else {
        return null;
    }
}

export function obfuscateJson(key: string, value: any) {
    if (key === "token" || key === "password" || key === "jwt" || key === "url"
        || key.toLowerCase().indexOf("secret") >= 0) {
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
    }
    return value;
}
