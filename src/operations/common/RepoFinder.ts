import { HandlerContext } from "../../HandlerContext";
import { RepoId } from "./RepoId";

/**
 * A function that knows how to find RepoIds from a context
 */
export type RepoFinder = (context: HandlerContext) => Promise<RepoId[]>;
