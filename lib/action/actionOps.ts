import {
    ActionResult,
    failureOn,
    isActionResult,
    successOn,
} from "./ActionResult";

export type TOp<T> = (p: T) => Promise<T>;

export type TAction<T> = (t: T) => Promise<ActionResult<T>>;

export type Chainable<T> = TAction<T> | TOp<T>;

/**
 * Chain the actions, in the given order
 * @param {ProjectEditor} steps
 * @return {ProjectEditor}
 */
export function actionChain<T>(...steps: Array<Chainable<T>>): TAction<T> {
    return actionChainWithCombiner((r1, r2) => ({
        ...r1, // the clojure ppl will LOVE this (I love it)
        ...r2,
    }), ...steps);
}

export function actionChainWithCombiner<T, R extends ActionResult<T> = ActionResult<T>>(
    combiner: (a: R, b: R) => R,
    ...steps: Array<Chainable<T>>): TAction<T> {
    return steps.length === 0 ?
        NoAction :
        steps.reduce((c1, c2) => {
            const ed1: TAction<T> = toAction(c1);
            const ed2: TAction<T> = toAction(c2);
            return p => ed1(p).then(r1 => {
                // console.log("Applied action " + c1.toString());
                if (!r1.success) { return r1; } else {
                    return ed2(r1.target).then(r2 => {
                        // console.log("Applied action " + c2.toString());
                        const combinedResult: any = combiner((r1 as R), (r2 as R));
                        return combinedResult;
                    });
                }
            });
        }) as TAction<T>; // Consider adding R as a type parameter to TAction
}

function toAction<T>(link: Chainable<T>): TAction<T> {
    return p => {
        try {
            const oneOrTheOther: Promise<T | ActionResult<T>> =
                (link as TOp<T>)(p);
            return oneOrTheOther
                .catch(err => failureOn(p, err, link))
                .then(r => {
                    // See what it returns
                    return isActionResult(r) ?
                        r :
                        successOn(r) as ActionResult<T>;
                });
        } catch (error) {
            // console.error("Failure: " + error.message);
            return Promise.resolve(failureOn(p, error, link));
        }
    };
}

/**
 * Useful starting point for chaining
 */
export const NoAction: TAction<any> = t => Promise.resolve(successOn(t));
