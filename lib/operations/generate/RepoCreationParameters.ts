import { Credentialed } from "../common/params/Credentialed";
import { RemoteLocator } from "../common/params/RemoteLocator";

/**
 * Parameters common to all generators that create new repositories
 */
export interface RepoCreationParameters extends Credentialed, RemoteLocator {

    description: string;

    visibility: "public" | "private";

}
