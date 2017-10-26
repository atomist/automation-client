
import * as impl from "../../util/gitHub";

/**
 * Exported only for backward compatible. Use util package.
 * @type {(token: string, user: string, repo: string, path: string) => Promise<boolean>}
 */
export const hasFile = impl.hasFile;
