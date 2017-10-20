import { ActionResult, isActionResult, successOn, failureOn } from "./ActionResult";

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
            const ed1: TAction<T> = toAction(c1);
            const ed2: TAction<T> = toAction(c2);
            return p => {
                let firstResult;
                try {
                    firstResult = ed1(p)
                } catch (error) {
                    return Promise.resolve(failureOn(p, error, c1))
                }

                return ed1(p).then(r1 => {
                    console.log("Applied action " + c1.toString());
                    let secondResult;
                    try {
                        secondResult = ed2(r1.target);
                    } catch (err) {
                        return Promise.resolve(failureOn(p, err, c2))
                    }
                    return secondResult.then(r2 => {
                        // console.log("Applied action " + c2.toString());
                        return {
                            ...r1, // the clojure ppl will LOVE this (I love it)
                            ...r2,
                        };
                    });;
                })
            }
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
