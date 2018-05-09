import { TargetsParams } from "./TargetsParams";

/**
 *  Resolve from a Mapped parameter or from a supplied repos regex if no repo mapping
 */
export type FallbackParams = TargetsParams & { repos: string };
