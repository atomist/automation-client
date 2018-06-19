import * as config from "config";
import { SecretResolver } from "../../spi/env/SecretResolver";
import { logger } from "../util/logger";
import { hideString } from "../util/string";

const AtomistPrefix = "atomist://";

/**
 * Local secrets: Resolve using config (resolves to /config directory).
 * Throw exception if not found.
 */
export class NodeConfigSecretResolver implements SecretResolver {

    public resolve(key: string): string {
        const resolved = key.startsWith(AtomistPrefix) ?
            config.get<string>(key.replace(AtomistPrefix, "")) :
            config.get<string>(key);
        if (!resolved) {
            throw new Error(`Failed to resolve '${key}'`);
        } else {
            logger.debug(`Resolved '${key}' to '${hideString(resolved)}'`);
            return resolved;
        }
    }
}
