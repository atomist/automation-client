import { ActionResult, isActionResult, successOn } from "./ActionResult";

export type TOp<T> = (p: T) => Promise<T>;

export type TAction<T> = (t: T) => Promise<ActionResult<T>>;

export type Chainable<T> = TAction<T> | TOp<T>;

/**
 * Chain the actions, in the given order
 * @param {ProjectEditor} steps
 * @return {ProjectEditor}
 */
export function actionChain<T>(...steps: Array<Chainable<T>>): TAction<T> {
    return steps.length === 0 ?
        NoAction :
        steps.reduce((c1, c2) => {
            const ed1: TAction<T> = toAction(c1); // why would c1 be an array?
            const ed2: TAction<T> = toAction(c2);
            return p =>
                (ed1(p) // what if not successful??
                    .then(r1 => {
                        // console.log("Applied action " + c1.toString());
                        return ed2(r1.target)
                            .then(r2 => {
                                // console.log("Applied action " + c2.toString());
                                return {
                                    ...r1, // the clojure ppl will LOVE this (I love it)
                                    ...r2,
                                };
                            });
                    }));
        }) as TAction<T>;
}

function toAction<T>(link: Chainable<T>): TAction<T> {
    return t => (link as TOp<T>)(t) // how about a nice catch with a failure ??
        .then(r => {
            // See what it returns
            return isActionResult(r) ?
                r :
                successOn(r);
        });
}

/**
 * Useful starting point for chaining
 */
export const NoAction: TAction<any> = t => Promise.resolve(successOn(t));
