
/**
 * Interface for a no-arg function that can create an instance of the given type
 */
export type Factory<T> = () => T;

/**
 * Interface for objects with a no-arg constructor
 */
export type Constructor<T> = new() => T;

/**
 * A no-arg constructor or a no-arg function that can create
 * type T
 */
export type Maker<T> = Factory<T> | Constructor<T>;

/**
 * Convert a factory function with no arguments or a class with a no arg
 * constructor to a factory function
 * @param {Maker<T>} fact
 * @return {Factory<T>}
 */
export function toFactory<T>(fact: Maker<T>): Factory<T> {
    const detyped = fact as any;
    try {
        const chf = () => new detyped();
        // Try it to see if it works
        chf();
        return chf;
    } catch (e) {
        // If we didn't succeed in using the constructor, try the other way
        return detyped;
    }
}
