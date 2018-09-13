export function isPromise(a: any): a is Promise<any> {
    return a && !!(a as Promise<any>).then;
}
