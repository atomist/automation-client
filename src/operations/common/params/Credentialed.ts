
import { ProjectOperationCredentials } from "../ProjectOperationCredentials";

/**
 * Implemented by parameters that carry ProjectOperationCredentials.
 * Hides whether they are tokens etc.
 */
export interface Credentialed {

    credentials: ProjectOperationCredentials;

}
