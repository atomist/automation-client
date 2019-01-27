import { Options } from "./automationMetadata";

export function someOf(...values: string[]): Options {
    return {
        kind: "multiple",
        options: values.map(value => ({ value })),
    };
}

export function oneOf(...values: string[]): Options {
    return {
        kind: "single",
        options: values.map(value => ({ value })),
    };
}
