
/**
 * Resolve the given secret.
 */
export interface SecretResolver {

    resolve(key: string): string;
}
