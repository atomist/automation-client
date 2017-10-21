export type Factory<T> = () => T;

export interface Constructor<T> {

    new(): T;
}

export type Maker<T> = Factory<T> | Constructor<T>;

export function toFactory<T>(fact: Maker<T>): Factory<T> {
    const detyped = fact as any;
    try {
        const chf = () => new detyped();
        // Try it to see if it works
        chf();
        return chf;
    } catch {
        // If we didn't succeed in using the constructor, try the other way
        return detyped;
    }
}
