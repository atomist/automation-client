export function isPromise(a: any): a is Promise<any> {
    return a && !!(a as Promise<any>).then;
}

/**
 * Go asynch if we're not already there
 * @param {Promise<T> | T} what
 * @return {Promise<T>}
 */
export function toPromiseOf<T>(what: T | Promise<T>): Promise<T> {
    return isPromise(what) ?
        what :
        Promise.resolve(what);
}
