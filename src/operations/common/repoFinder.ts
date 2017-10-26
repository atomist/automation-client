import { HandlerContext } from "../../HandlerContext";
import { RepoRef } from "./RepoId";

/**
 * A function that knows how to find RepoIds from a context
 */
export type RepoFinder = (context: HandlerContext) => Promise<RepoRef[]>;
