import { ActionResult } from "../../action/ActionResult";

export interface Configurable {

    /**
     * Sets the given user and email as the running git commands
     * @param {string} user
     * @param {string} email
     */
    setUserConfig(user: string, email: string): Promise<ActionResult<this>>;

}
