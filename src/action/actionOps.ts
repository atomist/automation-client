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
            const ed1: TAction<T> = toAction(c1);
            const ed2: TAction<T> = toAction(c2);
            return p =>
                (ed1(p)
                    .then(r1 => {
                        // console.log("Applied action " + c1.toString());
                        return ed2(p)
                            .then(r2 => {
                                // console.log("Applied action " + c2.toString());
                                return {
                                    ...r1,
                                    ...r2,
                                };
                            });
                    }));
        }) as TAction<T>;
}

function toAction<T>(link: Chainable<T>): TAction<T> {
    return link.length === 1 ?
        t => (link as TOp<T>)(t)
            .then(r => {
                // See what it returns
                return isActionResult(r) ?
                    r :
                    successOn(r);
            }) :
        link as TAction<T>;
}

/**
 * Useful starting point for chaining
 */
export const NoAction: TAction<any> = t => Promise.resolve(successOn(t));
