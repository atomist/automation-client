import { Rugs } from "../../metadata/metadata";

export function prepareRegistration(metadata: Rugs): any {
    const payload = JSON.stringify(metadata, function replacer(key, value) {
        if (key === "keywords") {
            return undefined;
        } else if (key === "subscriptionName") {
            return undefined;
        } else if (key === "secrets") {
            return value.map(v => v.path);
        } else if (key === "ingestors") {
            return undefined;
        } else if (value instanceof RegExp) {
            return value.source;
        } else {
            return value;
        }
    }, 2);

    const registration = JSON.parse(payload) as any;
    registration.events = metadata.events.map(e =>
        ({ subscription: e.subscription, secrets: e.secrets.map(s => s.path) }));
    return registration;
}
