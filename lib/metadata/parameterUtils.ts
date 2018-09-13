import { Chooser } from "./automationMetadata";

export function someOf(...values: string[]): Chooser {
    return {
        pickOne: false,
        choices: values.map(value => ({ value })),
    };
}

export function oneOf(...values: string[]): Chooser {
    return {
        pickOne: true,
        choices: values.map(value => ({ value })),
    };
}
