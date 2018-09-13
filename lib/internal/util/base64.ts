import * as base64 from "base-64";
import * as utf8 from "utf8";

export function encode(str: string): string {
    const bytes = utf8.encode(str);
    return base64.encode(bytes);
}

export function decode(coded: string): string {
    const decoded: string | number[] = base64.decode(coded);
    return utf8.decode(decoded);
}
