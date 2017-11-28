import { logger } from "../util/logger";

export interface ReleaseStep { how: () => Promise<void>; what: string; }

export interface ResourceRecovery {
    releaseSteps?: ReleaseStep[];
}

export function addReleaseStep(ctx: ResourceRecovery, release: ReleaseStep): void {
    if (!ctx.releaseSteps) { // this is atomic in Node, right?
        ctx.releaseSteps = [];
    }
    ctx.releaseSteps.push(release);
}

export function callReleaseSteps(ctx: ResourceRecovery): Promise<void> {
    if (ctx.releaseSteps) {
        function both(f1: ReleaseStep, f2: ReleaseStep) {
            return {
                how: () => f1.how()
                    .then(() => f2.how()
                        .catch(error => {
                            logger.warn("Failed to release resource %s: %s", f2.what, error);
                        }))
                , what: f1.what + " and " + f1.what,
            };
        }

        const releaseEverything = ctx.releaseSteps
            .reduce(both, { how: () => Promise.resolve(), what: "inconceivable" });
        return releaseEverything.how();
    } else {
        return Promise.resolve();
    }
}
