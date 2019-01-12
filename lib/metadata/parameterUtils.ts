import { Chooser } from "./automationMetadata";

export function someOf(...values: string[]): Chooser {
    return {
        kind: "multiple",
        options: values.map(value => ({ value })),
    };
}

export function oneOf(...values: string[]): Chooser {
    return {
        kind: "single",
        options: values.map(value => ({ value })),
    };
}
