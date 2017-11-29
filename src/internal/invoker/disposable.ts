import { HandlerContext } from "../../HandlerContext";
import { logger } from "../util/logger";

export function registerDisposable(ctx: HandlerContext): (callback: () => Promise<void>, description?: string) => void {
    return (callback: () => Promise<void>, description: string) => {
        if ((ctx as any).__disposables) {
            (ctx as any).__disposables.push({ how: callback, what: description });
        } else {
            const disposables = [{ how: callback, what: description }];
            (ctx as any).__disposables = disposables;
        }
    };
}

export function dispose(ctx: HandlerContext): () => Promise<void> {
    return () => {
        if ((ctx as any).__disposables) {
            function both(f1: Disposable, f2: Disposable) {
                return {
                    how: () => f1.how()
                        .then(() => f2.how()
                            .catch(error => {
                                logger.warn("Failed to release resource %s: %s", f2.what, error);
                            }))
                    , what: f1.what + " and " + f1.what,
                };
            }

            const disposeEverything = (ctx as any).__disposables
                .reduce(both, { how: () => Promise.resolve(), what: "inconceivable" });
            return disposeEverything.how()
                .then(result => {
                    delete (ctx as any).__disposables;
                    return result;
                });
        } else {
            return Promise.resolve();
        }
    };
}

interface Disposable {

    how: () => Promise<void>;

    what: string;
}
